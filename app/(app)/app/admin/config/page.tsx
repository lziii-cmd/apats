import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import ConfigClient from "./ConfigClient";

export default async function AdminConfigPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/app");

  const config = await db.appConfig.upsert({
    where: { id: "singleton" },
    create: {},
    update: {},
  });

  return <ConfigClient config={config} />;
}
