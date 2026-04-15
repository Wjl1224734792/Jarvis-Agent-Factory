type MediaRecord = {
  url: string;
};

export type CircleMediaItem = {
  kind: "image" | "video";
  url: string;
  label: string;
};

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

export const CIRCLE_CARD_COLUMN_WIDTH = "13.35rem";
export const CIRCLE_CARD_COLUMN_GAP = "8px";

function estimateCardRelativeHeight(absoluteIndex: number): number {
  const wh = masonryAspectRatioWh[absoluteIndex % masonryAspectRatioWh.length];
  const imageHeight = 1 / wh;
  return imageHeight + CARD_META_RELATIVE_HEIGHT;
}

export type CircleFeedColumnCell<T> = {
  item: T;
  absoluteIndex: number;
};

/** 按索引轮转落列（第 i 条进 i % columnCount 列），保证从左到右、从上到下的阅读顺序 */
export function partitionCircleFeedIntoColumns<T>(items: T[], columnCount: number): CircleFeedColumnCell<T>[][] {
  const n = Math.max(1, Math.floor(columnCount));
  const columns: CircleFeedColumnCell<T>[][] = Array.from({ length: n }, () => []);

  for (let absoluteIndex = 0; absoluteIndex < items.length; absoluteIndex += 1) {
    columns[absoluteIndex % n].push({
      item: items[absoluteIndex],
      absoluteIndex
    });
  }

  return columns;
}

/** 按估算高度放入当前最短列（小红书式瀑布），absoluteIndex 与封面比例一致 */
export function partitionCircleFeedShortestColumn<T>(items: T[], columnCount: number): CircleFeedColumnCell<T>[][] {
  const n = Math.max(1, Math.floor(columnCount));
  const columns: CircleFeedColumnCell<T>[][] = Array.from({ length: n }, () => []);
  const scores = new Array(n).fill(0);

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

export function getCircleCardMediaAspectClass(index: number) {
  return masonryAspectClasses[index % masonryAspectClasses.length];
}

export function getCircleColumnCount(viewportWidth: number) {
  if (viewportWidth < 640) {
    return 1;
  }

  if (viewportWidth < 960) {
    return 2;
  }

  if (viewportWidth < 1280) {
    return 3;
  }

  if (viewportWidth < 1536) {
    return 4;
  }

  return 5;
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
