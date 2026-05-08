import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import MembresAppClient from "./MembresAppClient";

export default async function MembresAppPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const allowed =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEMBERS_VIEW" as never));
  if (!allowed) redirect("/app");

  const [categories, posts] = await Promise.all([
    db.memberCategory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.post.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const canExport =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEMBERS_EXPORT" as never));

  return <MembresAppClient categories={categories} posts={posts} canExport={canExport} />;
}
