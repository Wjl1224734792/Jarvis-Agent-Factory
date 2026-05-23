/**
 * 推荐配置缓存层 — 启动时加载 DB 配置，提供同步访问接口。
 * 当管理员更新配置后，调用 refresh() 刷新缓存。
 */
import type { RecommendationParams } from "@feijia/schemas";
import { recommendationRepo } from "./recommendation.repo";

const DEFAULT_PARAMS: RecommendationParams = {
  articleHalfLifeHours: 36,
  momentHalfLifeHours: 18,
  interactionWeight: 0.58,
  preferenceBoostWeight: 5,
  modelViewWeight: 0.5,
  modelSearchWeight: 2.0,
  modelRankingRefWeight: 8.0,
  discoveryHours: 6,
  discoveryBoost: 1.2,
};

let cachedParams: RecommendationParams = { ...DEFAULT_PARAMS };

export async function refreshRecommendationConfig(): Promise<void> {
  const settings = await recommendationRepo.getSettings();
  cachedParams = { ...DEFAULT_PARAMS, ...settings.params };
}

export function getRecommendationConfig(): Readonly<RecommendationParams> {
  return cachedParams;
}

// 便捷函数：读具体参数，优先 DB 配置，fallback 到环境变量
export function getArticleHalfLifeHours(): number {
  return cachedParams.articleHalfLifeHours;
}

export function getMomentHalfLifeHours(): number {
  return cachedParams.momentHalfLifeHours;
}

export function getInteractionWeight(): number {
  return cachedParams.interactionWeight;
}

export function getPreferenceBoostWeight(): number {
  return cachedParams.preferenceBoostWeight;
}

export function getModelViewWeight(): number {
  return cachedParams.modelViewWeight;
}

export function getModelSearchWeight(): number {
  return cachedParams.modelSearchWeight;
}

export function getModelRankingRefWeight(): number {
  return cachedParams.modelRankingRefWeight;
}

export function getDiscoveryHours(): number {
  return cachedParams.discoveryHours;
}

export function getDiscoveryBoost(): number {
  return cachedParams.discoveryBoost;
}
