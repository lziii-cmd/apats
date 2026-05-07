import { db } from "@/lib/db";
import CategoriesClient from "./CategoriesClient";

export default async function CategoriesPage() {
  const categories = await db.memberCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return <CategoriesClient categories={categories} />;
}
