import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import ScannerClient from "./ScannerClient";

type Props = { params: Promise<{ id: string }> };

export default async function ScannerPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const meeting = await db.meeting.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      attendees: { where: { userId: session.userId }, select: { userId: true } },
    },
  });

  if (!meeting) notFound();
  if (meeting.status !== "OPEN") redirect(`/app/reunions/${id}`);

  const isInvited = meeting.attendees.length > 0 || session.role === "ADMIN";
  if (!isInvited) redirect(`/app/reunions/${id}`);

  return <ScannerClient meetingId={meeting.id} meetingTitle={meeting.title} />;
}
