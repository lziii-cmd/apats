import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Feature } from "@prisma/client";
import CreerReunionClient from "./CreerReunionClient";

export default async function CreerReunionPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const canCreate =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "MEETINGS_CREATE" as Feature));
  if (!canCreate) redirect("/app/reunions");

  const membres = await db.user.findMany({
    where: { isActive: true, role: "MEMBER" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <CreerReunionClient membres={membres} />;
}
