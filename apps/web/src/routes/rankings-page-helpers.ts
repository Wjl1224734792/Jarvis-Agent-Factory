import type { RankingListItem } from "@feijia/schemas";

/**
 * 榜单卡片单列最小宽度（px），与 page-skeletons 中 RANKING_GRID_CLASS_NAME 的 23.75rem 一致。
 * 提高后可减少宽屏下列数，避免排行预览行标题被挤压。
 */
export const RANKING_CARD_MIN_WIDTH_PX = 380;

/** 卡片宽度归一化为 1 时的相对高度，用于瀑布流最短列估算 */
export function estimateRankingListItemRelativeHeight(ranking: RankingListItem, _absoluteIndex: number): number {
  const previewRows = Math.min(3, ranking.items.length);
  const titleBlock = 1.15;
  const metaLine = 0.42;
  /** 预览行含两行标题（line-clamp-2），略高于单行 */
  const previewRow = 1.12;
  const divider = 0.35;
  return titleBlock + metaLine + divider + previewRows * previewRow + 0.5;
}

function toTimestamp(value: string) {
  return new Date(value).getTime();
}

export function mergeRankingsByTab(data: {
  official: RankingListItem[];
  community: RankingListItem[];
}) {
  const merged = [...data.official, ...data.community];

  return {
    latest: [...merged].sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt))
  };
}
