import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";
import * as XLSX from "xlsx";

// GET /api/membres/export — export Excel
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const allowed =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEMBERS_EXPORT" as Feature));
  if (!allowed) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const membres = await db.user.findMany({
    where: { role: "MEMBER" },
    orderBy: { name: "asc" },
    select: {
      name: true,
      email: true,
      createdAt: true,
      category: { select: { name: true, monthlyFee: true } },
      mandates: {
        where: { isActive: true },
        orderBy: { startDate: "desc" },
        take: 1,
        select: {
          startDate: true,
          endDate: true,
          post: { select: { name: true } },
        },
      },
    },
  });

  const rows = membres.map((m) => {
    const mandat = m.mandates[0];
    return {
      "Nom complet": m.name,
      "Email": m.email,
      "Catégorie": m.category?.name ?? "—",
      "Cotisation mensuelle (FCFA)": m.category?.monthlyFee ?? 0,
      "Poste actuel": mandat?.post.name ?? "—",
      "Mandat début": mandat ? new Date(mandat.startDate).toLocaleDateString("fr-FR") : "—",
      "Mandat fin": mandat ? new Date(mandat.endDate).toLocaleDateString("fr-FR") : "—",
      "Membre depuis": new Date(m.createdAt).toLocaleDateString("fr-FR"),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Membres");

  // Largeur colonnes auto
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, 15),
  }));
  ws["!cols"] = colWidths;

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="membres-apats-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
