import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Feature } from "@prisma/client";
import EvenementDetailClient from "./EvenementDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function EvenementDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const canCreate =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "EVENTS_CREATE" as Feature));

  const { id } = await params;

  const event = await db.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      date: true,
      endDate: true,
      location: true,
      description: true,
      responsible: true,
      budget: true,
      createdBy: { select: { id: true, name: true } },
      participants: {
        select: { userId: true, user: { select: { id: true, name: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
  });

  if (!event) notFound();

  const isParticipating = event.participants.some((p) => p.userId === session.userId);

  return (
    <EvenementDetailClient
      event={{
        ...event,
        date: event.date.toISOString(),
        endDate: event.endDate?.toISOString() ?? null,
      }}
      isParticipating={isParticipating}
      canCreate={canCreate}
    />
  );
}
