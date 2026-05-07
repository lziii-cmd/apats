import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// PATCH /api/admin/mandates/[id] — modifier les dates d'un mandat
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body?.startDate && !body?.endDate && !body?.postId) {
    return NextResponse.json(
      { error: "Au moins un champ à modifier est requis (startDate, endDate, postId)." },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (body.startDate) data.startDate = new Date(body.startDate);
  if (body.endDate) data.endDate = new Date(body.endDate);
  if (body.postId) data.postId = body.postId;

  try {
    const mandate = await db.mandate.update({
      where: { id },
      data,
      include: { post: { select: { id: true, name: true } } },
    });
    return NextResponse.json(mandate);
  } catch {
    return NextResponse.json({ error: "Mandat introuvable." }, { status: 404 });
  }
}

// DELETE /api/admin/mandates/[id] — clore un mandat (isActive → false)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const mandate = await db.mandate.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json(mandate);
  } catch {
    return NextResponse.json({ error: "Mandat introuvable." }, { status: 404 });
  }
}
