import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import CategoriesClient from "./CategoriesClient";

export default async function AdminCategoriesPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/app");

  const categories = await db.memberCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return <CategoriesClient categories={categories} />;
}
