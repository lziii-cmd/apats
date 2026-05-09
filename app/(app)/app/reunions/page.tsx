import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Feature } from "@prisma/client";
import ReunionsClient from "./ReunionsClient";

export default async function ReunionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const canCreate =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEETINGS_CREATE" as Feature));

  const meetings = await db.meeting.findMany({
    orderBy: { date: "desc" },
    select: {
      id: true,
      type: true,
      title: true,
      date: true,
      endTime: true,
      location: true,
      status: true,
      _count: { select: { attendees: true } },
      attendees: {
        where: { userId: session.userId },
        select: { preConfirmed: true },
        take: 1,
      },
    },
  });

  const serialized = meetings.map((m) => ({
    ...m,
    date: m.date.toISOString(),
    endTime: m.endTime?.toISOString() ?? null,
  }));

  return <ReunionsClient meetings={serialized} canCreate={canCreate} currentUserId={session.userId} />;
}
