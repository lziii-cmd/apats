import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature, AnnouncementTarget } from "@prisma/client";
import { sendEmail } from "@/lib/email";

const VALID_TARGETS: AnnouncementTarget[] = [
  "ALL", "CATEGORY", "POST", "BUREAU", "HORS_BUREAU", "SELECT",
];

// GET /api/annonces — liste filtrée selon l'appartenance de l'utilisateur
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      categoryId: true,
      mandates: { where: { isActive: true }, select: { postId: true } },
    },
  });

  const userPostIds = user?.mandates.map((m) => m.postId) ?? [];
  const hasMandate = userPostIds.length > 0;

  const announcements = await db.announcement.findMany({
    where: {
      OR: [
        { targetType: "ALL" },
        { targetType: "CATEGORY", targetCategoryId: user?.categoryId ?? undefined },
        {
          targetType: "POST",
          targetPosts: {
            some: { postId: { in: userPostIds.length ? userPostIds : ["__none__"] } },
          },
        },
        ...(hasMandate ? [{ targetType: "BUREAU" as AnnouncementTarget }] : []),
        ...(!hasMandate ? [{ targetType: "HORS_BUREAU" as AnnouncementTarget }] : []),
        { targetType: "SELECT", targetRecipients: { some: { userId: session.userId } } },
        ...(session.role === "ADMIN"
          ? [{}]
          : [{ createdById: session.userId }]),
      ],
    },
    include: {
      createdBy: { select: { name: true } },
      targetCategory: { select: { name: true } },
      targetPosts: { select: { post: { select: { name: true } } } },
      _count: { select: { targetRecipients: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(announcements);
}

// POST /api/annonces
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const canCreate =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "ANNOUNCEMENTS_CREATE" as Feature));
  if (!canCreate) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  let body: {
    title?: string;
    content?: string;
    targetType?: string;
    targetCategoryId?: string;
    targetPostIds?: string[];
    targetUserIds?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const { title, content, targetType, targetCategoryId, targetPostIds, targetUserIds } = body;

  if (!title?.trim() || !content?.trim() || !targetType) {
    return NextResponse.json({ error: "title, content et targetType sont requis." }, { status: 400 });
  }
  if (!VALID_TARGETS.includes(targetType as AnnouncementTarget)) {
    return NextResponse.json({ error: "targetType invalide." }, { status: 400 });
  }
  if (targetType === "CATEGORY" && !targetCategoryId) {
    return NextResponse.json({ error: "targetCategoryId requis pour le ciblage CATEGORY." }, { status: 400 });
  }
  if (targetType === "POST" && (!targetPostIds || targetPostIds.length === 0)) {
    return NextResponse.json({ error: "targetPostIds requis pour le ciblage POST." }, { status: 400 });
  }
  if (targetType === "SELECT" && (!targetUserIds || targetUserIds.length === 0)) {
    return NextResponse.json({ error: "targetUserIds requis pour le ciblage SELECT." }, { status: 400 });
  }

  const announcement = await db.announcement.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      targetType: targetType as AnnouncementTarget,
      targetCategoryId: targetType === "CATEGORY" ? targetCategoryId : null,
      targetPosts:
        targetType === "POST"
          ? { create: (targetPostIds as string[]).map((postId) => ({ postId })) }
          : undefined,
      targetRecipients:
        targetType === "SELECT"
          ? { create: (targetUserIds as string[]).map((userId) => ({ userId })) }
          : undefined,
      createdById: session.userId,
    },
  });

  // Déterminer les destinataires pour notifications + emails
  const where: Parameters<typeof db.user.findMany>[0] = {
    where: {
      isActive: true,
      role: "MEMBER",
      ...(targetType === "CATEGORY" ? { categoryId: targetCategoryId } : {}),
      ...(targetType === "POST"
        ? { mandates: { some: { postId: { in: targetPostIds as string[] }, isActive: true } } }
        : {}),
      ...(targetType === "BUREAU"
        ? { mandates: { some: { isActive: true } } }
        : {}),
      ...(targetType === "HORS_BUREAU"
        ? { NOT: { mandates: { some: { isActive: true } } } }
        : {}),
      ...(targetType === "SELECT" ? { id: { in: targetUserIds as string[] } } : {}),
    },
    select: { id: true, name: true, email: true },
  };

  const recipients = await db.user.findMany(where as Parameters<typeof db.user.findMany>[0]);

  if (recipients.length > 0) {
    await db.notification.createMany({
      data: recipients.map((r) => ({
        userId: r.id,
        type: "announcement",
        title: title.trim(),
        body: content.trim().slice(0, 200),
      })),
    });

    for (const r of recipients) {
      await sendEmail({
        to: r.email,
        subject: `[APATS] ${title.trim()}`,
        text: `Bonjour ${r.name},\n\n${content.trim()}\n\nCordialement,\nL'Amicale des PATs`,
      }).catch(() => {});
    }
  }

  return NextResponse.json(announcement, { status: 201 });
}
