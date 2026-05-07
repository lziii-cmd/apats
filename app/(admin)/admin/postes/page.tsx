import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Feature } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import PostesClient from "./PostesClient";

export const dynamic = "force-dynamic";

export default async function PostesPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const [posts, t] = await Promise.all([
    db.post.findMany({
      orderBy: { name: "asc" },
      include: {
        permissions: { select: { feature: true, granted: true } },
        _count: { select: { mandates: true } },
      },
    }),
    getTranslations("admin.postes"),
  ]);

  const allFeatures = Object.values(Feature);

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>
      <PostesClient posts={posts} allFeatures={allFeatures} />
    </main>
  );
}
