import { eq } from "drizzle-orm";
import { db, powerTypesTable } from "@feijia/db";

type CreatePowerTypeInput = {
  id: string;
  slug: string;
  name: string;
};

type UpdatePowerTypeInput = {
  slug: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
};

export const powerTypesRepo = {
  async listAll() {
    return db
      .select()
      .from(powerTypesTable)
      .orderBy(powerTypesTable.sortOrder);
  },

  async getById(id: string) {
    const rows = await db
      .select()
      .from(powerTypesTable)
      .where(eq(powerTypesTable.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async create(input: CreatePowerTypeInput) {
    const rows = await db
      .insert(powerTypesTable)
      .values({
        id: input.id,
        slug: input.slug,
        name: input.name,
      })
      .returning();
    return rows[0] ?? null;
  },

  async update(id: string, input: UpdatePowerTypeInput) {
    const rows = await db
      .update(powerTypesTable)
      .set({
        slug: input.slug,
        name: input.name,
        sortOrder: input.sortOrder,
        isEnabled: input.isEnabled,
      })
      .where(eq(powerTypesTable.id, id))
      .returning();
    return rows[0] ?? null;
  },
};
