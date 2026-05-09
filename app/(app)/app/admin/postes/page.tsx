import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Feature } from "@prisma/client";
import PostesClient from "./PostesClient";

export const dynamic = "force-dynamic";

export default async function AdminPostesPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/app");

  const posts = await db.post.findMany({
    orderBy: { name: "asc" },
    include: {
      permissions: { select: { feature: true, granted: true } },
      _count: { select: { mandates: true } },
    },
  });

  const allFeatures = Object.values(Feature);

  return <PostesClient posts={posts} allFeatures={allFeatures} />;
}
