import { createId, db, aircraftCategoriesTable } from "@feijia/db";
import { eq } from "drizzle-orm";

export const categoriesRepo = {
  async list() {
    return db
      .select()
      .from(aircraftCategoriesTable)
      .orderBy(aircraftCategoriesTable.sortOrder, aircraftCategoriesTable.name);
  },
  async create(input: {
    slug: string;
    name: string;
    sortOrder: number;
    isEnabled: boolean;
  }) {
    const id = createId("cat");

    await db.insert(aircraftCategoriesTable).values({
      id,
      slug: input.slug,
      name: input.name,
      sortOrder: input.sortOrder,
      isEnabled: input.isEnabled
    });

    const created = await db
      .select()
      .from(aircraftCategoriesTable)
      .where(eq(aircraftCategoriesTable.id, id))
      .limit(1);

    return created[0]!;
  },
  async update(
    id: string,
    input: {
      slug: string;
      name: string;
      sortOrder: number;
      isEnabled: boolean;
    }
  ) {
    await db
      .update(aircraftCategoriesTable)
      .set({
        slug: input.slug,
        name: input.name,
        sortOrder: input.sortOrder,
        isEnabled: input.isEnabled
      })
      .where(eq(aircraftCategoriesTable.id, id));

    const updated = await db
      .select()
      .from(aircraftCategoriesTable)
      .where(eq(aircraftCategoriesTable.id, id))
      .limit(1);

    return updated[0] ?? null;
  }
};
