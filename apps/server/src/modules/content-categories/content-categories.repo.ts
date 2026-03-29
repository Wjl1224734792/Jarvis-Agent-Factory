import { contentCategoriesTable, createId, db } from "@feijia/db";
import { and, eq, inArray } from "drizzle-orm";

const localizedDefaultCategoryNames = {
  news: { next: "资讯", legacy: ["News", "news", "资讯"] },
  review: { next: "评测", legacy: ["Review", "review", "评测"] },
  aerial: { next: "航拍", legacy: ["Aerial", "aerial", "航拍"] },
  tech: { next: "技术", legacy: ["Tech", "tech", "技术"] },
  guide: { next: "指南", legacy: ["Guide", "guide", "指南"] }
} as const;

export const contentCategoriesRepo = {
  async localizeDefaultNames() {
    await Promise.all(
      Object.entries(localizedDefaultCategoryNames).map(([slug, config]) =>
        db
          .update(contentCategoriesTable)
          .set({
            name: config.next
          })
          .where(
            and(
              eq(contentCategoriesTable.slug, slug),
              inArray(contentCategoriesTable.name, config.legacy)
            )
          )
      )
    );
  },
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
