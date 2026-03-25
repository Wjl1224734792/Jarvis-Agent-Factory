import { contentCategoriesTable, createId, db } from "@feijia/db";
import { eq } from "drizzle-orm";

export const contentCategoriesRepo = {
  async listEnabled() {
    return db
      .select()
      .from(contentCategoriesTable)
      .where(eq(contentCategoriesTable.isEnabled, true))
      .orderBy(contentCategoriesTable.sortOrder, contentCategoriesTable.name);
  },
  async listAll() {
    return db
      .select()
      .from(contentCategoriesTable)
      .orderBy(contentCategoriesTable.sortOrder, contentCategoriesTable.name);
  },
  async findById(id: string) {
    const rows = await db
      .select()
      .from(contentCategoriesTable)
      .where(eq(contentCategoriesTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async findBySlug(slug: string) {
    const rows = await db
      .select()
      .from(contentCategoriesTable)
      .where(eq(contentCategoriesTable.slug, slug))
      .limit(1);

    return rows[0] ?? null;
  },
  async create(input: {
    slug: string;
    name: string;
    sortOrder: number;
    isEnabled: boolean;
  }) {
    const id = createId("ccat");

    await db.insert(contentCategoriesTable).values({
      id,
      slug: input.slug,
      name: input.name,
      sortOrder: input.sortOrder,
      isEnabled: input.isEnabled
    });

    return this.findById(id);
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
      .update(contentCategoriesTable)
      .set({
        slug: input.slug,
        name: input.name,
        sortOrder: input.sortOrder,
        isEnabled: input.isEnabled
      })
      .where(eq(contentCategoriesTable.id, id));

    return this.findById(id);
  }
};
