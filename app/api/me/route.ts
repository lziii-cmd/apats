import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/me — données profil de l'utilisateur connecté
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const config = await db.appConfig.findUnique({ where: { id: "singleton" } });
  const academicYear = config?.academicYear ?? "2025-2026";

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      locale: true,
      createdAt: true,
      category: { select: { id: true, name: true, monthlyFee: true } },
      mandates: {
        where: { isActive: true },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          post: { select: { id: true, name: true } },
        },
        orderBy: { startDate: "desc" },
        take: 1,
      },
      memberCards: {
        where: { academicYear },
        select: {
          id: true,
          academicYear: true,
          pricePaid: true,
          paymentMode: true,
          status: true,
        },
      },
      monthlyPayments: {
        where: {
          year: {
            in: academicYear.split("-").map(Number),
          },
        },
        select: {
          id: true,
          month: true,
          year: true,
          amountDue: true,
          amountPaid: true,
          paymentMode: true,
          status: true,
        },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      },
      meetingAttendances: {
        select: {
          attended: true,
          attendanceStatus: true,
          preConfirmed: true,
          meeting: {
            select: {
              id: true,
              title: true,
              type: true,
              date: true,
              status: true,
            },
          },
        },
        orderBy: { meeting: { date: "desc" } },
        take: 20,
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      locale: user.locale,
      createdAt: user.createdAt,
      category: user.category,
      activeMandate: user.mandates[0] ?? null,
    },
    academicYear,
    cardPriceFcfa: config?.cardPriceFcfa ?? 5000,
    card: user.memberCards[0] ?? null,
    monthlyPayments: user.monthlyPayments,
    attendance: user.meetingAttendances,
  });
}
