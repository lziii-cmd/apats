import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Feature } from "@prisma/client";
import CotisationsClient from "./CotisationsClient";

export default async function CotisationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const canManage =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "COTISATIONS_MANAGE" as Feature));

  const canView =
    canManage ||
    (await hasPermission(session.userId, "COTISATIONS_VIEW" as Feature));

  const canConfirm =
    session.role === "ADMIN" ||
    (await hasPermission(session.userId, "COTISATIONS_CONFIRM" as Feature));

  return (
    <CotisationsClient
      currentUserId={session.userId}
      isAdmin={session.role === "ADMIN"}
      canView={canView}
      canManage={canManage}
      canConfirm={canConfirm}
    />
  );
}
