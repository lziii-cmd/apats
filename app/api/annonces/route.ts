import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature, AnnouncementTarget } from "@prisma/client";
import { sendEmail } from "@/lib/email";

const VALID_TARGETS: AnnouncementTarget[] = ["ALL", "CATEGORY", "POST"];

// GET /api/annonces — liste des annonces visibles par l'utilisateur
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  // Récupérer le membre pour filtrer les annonces ciblées
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      categoryId: true,
      mandates: {
        where: { isActive: true },
        select: { postId: true },
      },
    },
  });

  const userPostIds = user?.mandates.map((m) => m.postId) ?? [];

  const announcements = await db.announcement.findMany({
    where: {
      OR: [
        { targetType: "ALL" },
        { targetType: "CATEGORY", targetCategoryId: user?.categoryId ?? undefined },
        { targetType: "POST", targetPostId: { in: userPostIds.length ? userPostIds : ["__none__"] } },
        // L'admin et les créateurs voient toutes leurs annonces
        ...(session.role === "ADMIN" ? [{}] : [{ createdById: session.userId }]),
      ],
    },
    include: {
      createdBy: { select: { name: true } },
      targetCategory: { select: { name: true } },
      targetPost: { select: { name: true } },
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
    targetPostId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const { title, content, targetType, targetCategoryId, targetPostId } = body;

  if (!title?.trim() || !content?.trim() || !targetType) {
    return NextResponse.json({ error: "title, content et targetType sont requis." }, { status: 400 });
  }
  if (!VALID_TARGETS.includes(targetType as AnnouncementTarget)) {
    return NextResponse.json({ error: "targetType invalide." }, { status: 400 });
  }
  if (targetType === "CATEGORY" && !targetCategoryId) {
    return NextResponse.json({ error: "targetCategoryId requis pour le ciblage CATEGORY." }, { status: 400 });
  }
  if (targetType === "POST" && !targetPostId) {
    return NextResponse.json({ error: "targetPostId requis pour le ciblage POST." }, { status: 400 });
  }

  const announcement = await db.announcement.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      targetType: targetType as AnnouncementTarget,
      targetCategoryId: targetType === "CATEGORY" ? targetCategoryId : null,
      targetPostId: targetType === "POST" ? targetPostId : null,
      createdById: session.userId,
    },
  });

  // Déterminer les destinataires
  const recipients = await db.user.findMany({
    where: {
      isActive: true,
      role: "MEMBER",
      ...(targetType === "CATEGORY" ? { categoryId: targetCategoryId } : {}),
      ...(targetType === "POST"
        ? { mandates: { some: { postId: targetPostId, isActive: true } } }
        : {}),
    },
    select: { id: true, name: true, email: true },
  });

  // Notifications in-app
  if (recipients.length > 0) {
    await db.notification.createMany({
      data: recipients.map((r) => ({
        userId: r.id,
        type: "announcement",
        title: title.trim(),
        body: content.trim().slice(0, 200),
      })),
    });

    // Emails (silencieux si Resend non configuré)
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
