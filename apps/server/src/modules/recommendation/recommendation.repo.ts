import type { RecommendationSettings } from "@feijia/schemas";
import { db, siteSettingsTable } from "@feijia/db";
import { eq } from "drizzle-orm";

const DEFAULT_SETTINGS: RecommendationSettings = {
  enabledContentTypes: {
    article: true,
    circlePost: true,
    model: true,
    ranking: true,
  },
  contentTypeWeights: {
    article: 1.0,
    circlePost: 1.1,
    model: 0.9,
    ranking: 0.8,
  },
  params: {
    articleHalfLifeHours: 36,
    momentHalfLifeHours: 18,
    interactionWeight: 0.58,
    preferenceBoostWeight: 5,
    modelViewWeight: 0.5,
    modelSearchWeight: 2.0,
    modelRankingRefWeight: 8.0,
    discoveryHours: 6,
    discoveryBoost: 1.2,
  },
};

export const recommendationRepo = {
  async getSettings(): Promise<RecommendationSettings> {
    const row = await db
      .select({ recommendationConfig: siteSettingsTable.recommendationConfig })
      .from(siteSettingsTable)
      .limit(1);
    if (!row[0]?.recommendationConfig) return { ...DEFAULT_SETTINGS };
    try {
      const parsed: unknown = JSON.parse(row[0].recommendationConfig);
      return { ...DEFAULT_SETTINGS, ...(parsed as Record<string, unknown>) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },

  async updateSettings(input: Record<string, unknown>): Promise<RecommendationSettings> {
    const current = await this.getSettings();
    const inputEnabled = (input.enabledContentTypes ?? {}) as Record<string, unknown>;
    const inputWeights = (input.contentTypeWeights ?? {}) as Record<string, unknown>;
    const inputParams = (input.params ?? {}) as Record<string, unknown>;
    const merged: RecommendationSettings = {
      enabledContentTypes: { ...current.enabledContentTypes, ...inputEnabled },
      contentTypeWeights: { ...current.contentTypeWeights, ...inputWeights },
      params: { ...current.params, ...inputParams },
    };
    await db
      .update(siteSettingsTable)
      .set({ recommendationConfig: JSON.stringify(merged) })
      .where(eq(siteSettingsTable.id, "default"));
    return merged;
  },
};
