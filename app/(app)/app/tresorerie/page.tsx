import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";
import TresorerieClient from "./TresorerieClient";

export default async function TresoreriePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const canView =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "TREASURY_VIEW" as Feature));

  if (!canView) redirect("/app");

  const canManage =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "TREASURY_MANAGE" as Feature));

  const canExport =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "TREASURY_EXPORT" as Feature));

  return <TresorerieClient canManage={canManage} canExport={canExport} />;
}
