import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";
import CreerEvenementClient from "./CreerEvenementClient";

export default async function CreerEvenementPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const canCreate =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "EVENTS_CREATE" as Feature));
  if (!canCreate) redirect("/app/evenements");

  return <CreerEvenementClient />;
}
