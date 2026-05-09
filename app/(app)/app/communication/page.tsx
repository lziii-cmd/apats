import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";
import { db } from "@/lib/db";
import CommunicationClient from "./CommunicationClient";

export default async function CommunicationPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const canCreate =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "ANNOUNCEMENTS_CREATE" as Feature));

  const [categories, posts, members] = await Promise.all([
    db.memberCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.post.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { isActive: true, role: "MEMBER" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <CommunicationClient
      canCreate={canCreate}
      isAdmin={session.role === "ADMIN"}
      currentUserId={session.userId}
      categories={categories}
      posts={posts}
      members={members}
    />
  );
}
