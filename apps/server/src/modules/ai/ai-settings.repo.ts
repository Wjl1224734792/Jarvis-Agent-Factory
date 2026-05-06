import { db, siteSettingsTable } from "@feijia/db";
import { eq } from "drizzle-orm";

const SITE_SETTINGS_ROW_ID = "site_settings_singleton";

/**
 * AI 配置持久化层 — 读写 site_settings 表的 aiSettings JSON 字段。
 * 与 site-settings.repo.ts 操作同一张表，但只关注 aiSettings 列。
 */
export const aiSettingsRepo = {
  /**
   * 读取 site_settings 行中的 aiSettings JSON 字符串。
   * @returns aiSettings JSON 字符串，无配置时返回 null。
   */
  async getAiSettingsJson(): Promise<string | null> {
    const rows = await db
      .select({ aiSettings: siteSettingsTable.aiSettings })
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.id, SITE_SETTINGS_ROW_ID))
      .limit(1);

    return rows[0]?.aiSettings ?? null;
  },

  /**
   * 更新 site_settings 行中的 aiSettings 字段。
   * 若行不存在则插入新行（仅设置 aiSettings）。
   * @param json - 序列化后的 AI 配置 JSON 字符串。
   */
  async upsertAiSettingsJson(json: string): Promise<void> {
    const existing = await db
      .select({ id: siteSettingsTable.id })
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.id, SITE_SETTINGS_ROW_ID))
      .limit(1);

    if (existing[0]) {
      await db
        .update(siteSettingsTable)
        .set({ aiSettings: json, updatedAt: new Date() })
        .where(eq(siteSettingsTable.id, SITE_SETTINGS_ROW_ID));
      return;
    }

    await db.insert(siteSettingsTable).values({
      id: SITE_SETTINGS_ROW_ID,
      aiSettings: json
    });
  }
};
