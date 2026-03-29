import { brandsTable, createId, db } from "@feijia/db";
import { eq, sql } from "drizzle-orm";

export const brandsRepo = {
  async list() {
    return db.select().from(brandsTable).orderBy(brandsTable.sortOrder, brandsTable.name);
  },
  async create(input: {
    slug: string;
    name: string;
    logoUrl: string | null;
    categoryId: string | null;
    sortOrder: number;
    isEnabled: boolean;
  }) {
    const id = createId("brand");
    const rows = await db
      .select({
        maxSortOrder: sql<number>`coalesce(max(${brandsTable.sortOrder}), 0)`
      })
      .from(brandsTable);
    const nextSortOrder = Number(rows[0]?.maxSortOrder ?? 0) + 1;

    await db.insert(brandsTable).values({
      id,
      slug: input.slug,
      name: input.name,
      logoUrl: input.logoUrl ?? null,
      categoryId: input.categoryId,
      sortOrder: nextSortOrder,
      isEnabled: input.isEnabled
    });

    const created = await db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.id, id))
      .limit(1);

    return created[0]!;
  },
  async update(
    id: string,
    input: {
      slug: string;
      name: string;
      logoUrl: string | null;
      categoryId: string | null;
      sortOrder: number;
      isEnabled: boolean;
    }
  ) {
    await db
      .update(brandsTable)
      .set({
        slug: input.slug,
        name: input.name,
        logoUrl: input.logoUrl ?? null,
        categoryId: input.categoryId,
        sortOrder: input.sortOrder,
        isEnabled: input.isEnabled
      })
      .where(eq(brandsTable.id, id));

    const updated = await db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.id, id))
      .limit(1);

    return updated[0] ?? null;
  }
};
