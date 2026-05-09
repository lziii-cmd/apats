import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Feature } from "@prisma/client";
import EvenementsClient from "./EvenementsClient";

export default async function EvenementsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const canCreate =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "EVENTS_CREATE" as Feature));

  const events = await db.event.findMany({
    orderBy: { date: "asc" },
    select: {
      id: true,
      title: true,
      date: true,
      endDate: true,
      location: true,
      description: true,
      responsible: true,
      budget: true,
      _count: { select: { participants: true } },
      participants: {
        where: { userId: session.userId },
        select: { userId: true },
        take: 1,
      },
    },
  });

  const serialized = events.map((e) => ({
    ...e,
    date: e.date.toISOString(),
    endDate: e.endDate?.toISOString() ?? null,
  }));

  return <EvenementsClient events={serialized} canCreate={canCreate} />;
}
