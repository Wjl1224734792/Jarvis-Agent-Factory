type MediaRecord = {
  url: string;
};

export type CircleMediaItem = {
  kind: "image" | "video";
  url: string;
  label: string;
};

/**
 * @deprecated 瀑布流卡片布局——Feed 已改为贴吧式扁平列表（TASK-003），此区域仅被榜单页引用。
 * 后续榜单页迁移后可整体移除。
 */
/** 竖版封面（高大于宽），Web 端用 3:4～4:5 一带，比 9:16 更矮、一屏可多行；随索引轮换保留轻微错落感 */
const masonryAspectClasses = [
  "aspect-[3/4]",
  "aspect-[4/5]",
  "aspect-[5/7]",
  "aspect-[2/3]",
  "aspect-[7/10]"
] as const;

/** 与上表一一对应：CSS aspect-ratio 的 width/height */
const masonryAspectRatioWh = [3 / 4, 4 / 5, 5 / 7, 2 / 3, 7 / 10] as const;

/** 卡片在「宽度归一化为 1」时，标题+作者+点赞区近似高度（与封面估算相加用于最短列） */
const CARD_META_RELATIVE_HEIGHT = 0.42;

/** 与下列 gap 像素值对应，用于需要 rem 的样式时（根字号 16px 时约 16rem≈256px） */
export const CIRCLE_CARD_COLUMN_WIDTH = "16rem";

export const CIRCLE_CARD_COLUMN_GAP = "8px";

/** 与 `CIRCLE_CARD_COLUMN_GAP` 一致，供列数公式使用 */
export const CIRCLE_CARD_COLUMN_GAP_PX = 8;

/** 目标单列宽度（px）：网格按此与间距推算列数，避免宽屏仅 3 列导致卡片过宽 */
export const CIRCLE_CARD_IDEAL_WIDTH_PX = 256;

/** 单列过窄时再减列；过宽时再加列（在最大列数内） */
export const CIRCLE_CARD_SOFT_MIN_WIDTH_PX = 200;
export const CIRCLE_CARD_SOFT_MAX_WIDTH_PX = 320;

/** 飞友圈至少两列，避免单列下过宽、封面竖版比例显得过高 */
export const CIRCLE_FEED_MIN_COLUMNS = 2;

/** 榜单页瀑布流允许单列（极窄屏） */
export const RANKING_GRID_MIN_COLUMNS = 1;

/** 与瀑布流 masonry 分区上限一致 */
export const CIRCLE_FEED_MAX_COLUMNS = 8;

/** 封面区最大高度（与竖版 aspect 同时生效，避免图区过长） */
export const CIRCLE_FEED_MEDIA_MAX_HEIGHT_CLASS = "max-h-[min(22rem,70vh)]";

function normalizeCircleColumnCount(columnCount: number): number {
  return Math.max(CIRCLE_FEED_MIN_COLUMNS, Math.max(1, Math.floor(columnCount)));
}

function estimateCardRelativeHeight(absoluteIndex: number): number {
  const wh = masonryAspectRatioWh[absoluteIndex % masonryAspectRatioWh.length];
  const imageHeight = 1 / wh;
  return imageHeight + CARD_META_RELATIVE_HEIGHT;
}

export type CircleFeedColumnCell<T> = {
  item: T;
  absoluteIndex: number;
};

/**
 * @deprecated 瀑布流列分区——Feed 已改为贴吧式扁平列表（TASK-003），此函数仅被榜单页引用。
 */
/** 按索引轮转落列（第 i 条进 i % columnCount 列），保证从左到右、从上到下的阅读顺序 */
export function partitionCircleFeedIntoColumns<T>(items: T[], columnCount: number): CircleFeedColumnCell<T>[][] {
  const n = normalizeCircleColumnCount(columnCount);
  const columns: CircleFeedColumnCell<T>[][] = Array.from({ length: n }, () => []);

  for (let absoluteIndex = 0; absoluteIndex < items.length; absoluteIndex += 1) {
    columns[absoluteIndex % n].push({
      item: items[absoluteIndex],
      absoluteIndex
    });
  }

  return columns;
}

/**
 * @deprecated 瀑布流最短列分区——Feed 已改为贴吧式扁平列表（TASK-003），此函数仅被榜单页引用。
 */
/** 按估算高度放入当前最短列（小红书式瀑布），absoluteIndex 与封面比例一致 */
export function partitionCircleFeedShortestColumn<T>(items: T[], columnCount: number): CircleFeedColumnCell<T>[][] {
  const n = normalizeCircleColumnCount(columnCount);
  const columns: CircleFeedColumnCell<T>[][] = Array.from({ length: n }, () => []);
  const scores: number[] = Array.from({ length: n }, () => 0);

  for (let absoluteIndex = 0; absoluteIndex < items.length; absoluteIndex += 1) {
    let targetCol = 0;
    let minScore = scores[0];
    for (let c = 1; c < n; c += 1) {
      if (scores[c] < minScore) {
        minScore = scores[c];
        targetCol = c;
      }
    }

    columns[targetCol].push({
      item: items[absoluteIndex],
      absoluteIndex
    });
    scores[targetCol] += estimateCardRelativeHeight(absoluteIndex);
  }

  return columns;
}

/**
 * @deprecated 瀑布流封面宽高比——Feed 已改为贴吧式扁平列表（TASK-003），此函数仅被发布页引用。
 */
export function getCircleCardMediaAspectClass(index: number) {
  return masonryAspectClasses[index % masonryAspectClasses.length];
}

function circleColumnWidthForCount(contentWidthPx: number, columnCount: number, gapPx: number): number {
  if (columnCount <= 0) {
    return 0;
  }

  return (contentWidthPx - (columnCount - 1) * gapPx) / columnCount;
}

/**
 * 按内容区可用宽度与目标单列宽度推算列数（用于 `repeat(n, minmax(0,1fr))` 铺满时的观感上限）。
 * `minColumns` 默认 {@link CIRCLE_FEED_MIN_COLUMNS}；榜单等可传 {@link RANKING_GRID_MIN_COLUMNS} 允许单列。
 * 无可用宽度时返回夹在 `[1, maxCols]` 的 `minColumns`。
 */
export function getCircleColumnCountForContentWidth(
  contentWidthPx: number,
  minColumns: number = CIRCLE_FEED_MIN_COLUMNS
): number {
  const gap = CIRCLE_CARD_COLUMN_GAP_PX;
  const maxCols = CIRCLE_FEED_MAX_COLUMNS;
  const minCols = Math.min(Math.max(1, minColumns), maxCols);
  const ideal = CIRCLE_CARD_IDEAL_WIDTH_PX;
  const softMin = CIRCLE_CARD_SOFT_MIN_WIDTH_PX;
  const softMax = CIRCLE_CARD_SOFT_MAX_WIDTH_PX;

  const w = Math.max(0, contentWidthPx);
  if (w <= 0) {
    return minCols;
  }

  let n = Math.ceil((w + gap) / (ideal + gap));
  n = Math.max(minCols, Math.min(maxCols, n));

  let cardW = circleColumnWidthForCount(w, n, gap);

  while (cardW > softMax && n < maxCols) {
    n += 1;
    cardW = circleColumnWidthForCount(w, n, gap);
  }

  while (cardW < softMin && n > minCols) {
    n -= 1;
    cardW = circleColumnWidthForCount(w, n, gap);
  }

  return n;
}

/** 按视口或内容区宽度推算列数；未测量容器时可用 `window.innerWidth` 近似。 */
export function getCircleColumnCount(widthPx: number, minColumns: number = CIRCLE_FEED_MIN_COLUMNS) {
  return getCircleColumnCountForContentWidth(widthPx, minColumns);
}

export function buildCircleMediaItems(input: {
  title: string;
  images?: MediaRecord[];
  videos?: MediaRecord[];
}) {
  const videos = input.videos ?? [];
  if (videos.length > 0) {
    return [
      {
        kind: "video" as const,
        url: videos[0].url,
        label: input.title
      }
    ] satisfies CircleMediaItem[];
  }

  return (input.images ?? []).map((image, index) => ({
    kind: "image" as const,
    url: image.url,
    label: `${input.title} ${index + 1}`
  }));
}

export function getLoopedNextIndex(currentIndex: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return (currentIndex + 1) % total;
}

export function getLoopedPrevIndex(currentIndex: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return (currentIndex - 1 + total) % total;
}
