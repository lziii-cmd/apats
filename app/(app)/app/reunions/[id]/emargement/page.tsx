import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Feature } from "@prisma/client";
import EmargementClient from "./EmargementClient";

type Props = { params: Promise<{ id: string }> };

export default async function EmargementPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const canAttend =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEETINGS_ATTENDANCE" as Feature));
  if (!canAttend) redirect("/app/reunions");

  const { id } = await params;

  const meeting = await db.meeting.findUnique({
    where: { id },
    select: {
      id: true, title: true, date: true, status: true, qrCode: true,
      attendees: {
        select: {
          userId: true, attended: true, attendanceStatus: true,
          user: { select: { id: true, name: true } },
        },
        orderBy: { user: { name: "asc" } },
      },
    },
  });

  if (!meeting) notFound();

  return (
    <EmargementClient
      meeting={{ ...meeting, date: meeting.date.toISOString() }}
    />
  );
}
