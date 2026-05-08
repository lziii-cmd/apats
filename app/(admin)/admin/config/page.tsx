import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import ConfigClient from "./ConfigClient";

export default async function ConfigPage() {
  await getTranslations("admin.config");

  const config = await db.appConfig.upsert({
    where: { id: "singleton" },
    create: {},
    update: {},
  });

  return <ConfigClient config={config} />;
}
