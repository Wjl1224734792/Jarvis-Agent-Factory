import { db, siteSettingsTable } from "@feijia/db";
import { eq } from "drizzle-orm";

const SITE_SETTINGS_ROW_ID = "site_settings_singleton";

export const siteSettingsRepo = {
  async get() {
    const rows = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.id, SITE_SETTINGS_ROW_ID))
      .limit(1);

    return rows[0] ?? null;
  },
  async upsert(input: { postModerationEnabled: boolean }) {
    const existing = await this.get();

    if (existing) {
      await db
        .update(siteSettingsTable)
        .set({
          postModerationEnabled: input.postModerationEnabled,
          updatedAt: new Date()
        })
        .where(eq(siteSettingsTable.id, SITE_SETTINGS_ROW_ID));

      return this.get();
    }

    await db.insert(siteSettingsTable).values({
      id: SITE_SETTINGS_ROW_ID,
      postModerationEnabled: input.postModerationEnabled
    });

    return this.get();
  }
};
