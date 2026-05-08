import { db } from "@/lib/db";
import MembresClient from "./MembresClient";

export default async function MembresPage() {
  const [membres, categories, posts] = await Promise.all([
    db.user.findMany({
      where: { role: "MEMBER" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        locale: true,
        isActive: true,
        createdAt: true,
        category: { select: { id: true, name: true, monthlyFee: true } },
        mandates: {
          where: { isActive: true },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            post: { select: { id: true, name: true } },
          },
          take: 1,
        },
      },
    }),
    db.memberCategory.findMany({ orderBy: { name: "asc" } }),
    db.post.findMany({ orderBy: { name: "asc" } }),
  ]);

  return <MembresClient membres={membres} categories={categories} posts={posts} />;
}
