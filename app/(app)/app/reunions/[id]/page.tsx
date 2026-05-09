import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Feature } from "@prisma/client";
import ReunionDetailClient from "./ReunionDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function ReunionDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const canCreate =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEETINGS_CREATE" as Feature));

  const canAttend =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEETINGS_ATTENDANCE" as Feature));

  const { id } = await params;

  const meeting = await db.meeting.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      title: true,
      date: true,
      endTime: true,
      location: true,
      speakers: true,
      agenda: true,
      qrCode: true,
      status: true,
      createdBy: { select: { id: true, name: true } },
      attendees: {
        select: {
          userId: true,
          preConfirmed: true,
          attended: true,
          attendanceStatus: true,
          user: { select: { id: true, name: true } },
        },
        orderBy: { user: { name: "asc" } },
      },
    },
  });

  if (!meeting) notFound();

  const myAttendee = meeting.attendees.find((a) => a.userId === session.userId);

  const serialized = {
    ...meeting,
    date: meeting.date.toISOString(),
    endTime: meeting.endTime?.toISOString() ?? null,
  };

  return (
    <ReunionDetailClient
      meeting={serialized}
      myAttendee={myAttendee ?? null}
      canCreate={canCreate}
      canAttend={canAttend}
    />
  );
}
