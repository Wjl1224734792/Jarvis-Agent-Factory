type MediaRecord = {
  url: string;
};

export type CircleMediaItem = {
  kind: "image" | "video";
  url: string;
  label: string;
};

/** 竖版封面，均接近 9:16，随索引轮换以保留轻微错落感 */
const masonryAspectClasses = [
  "aspect-[9/16]",
  "aspect-[10/17]",
  "aspect-[11/18]",
  "aspect-[9/15]",
  "aspect-[8/15]"
] as const;

export const CIRCLE_CARD_COLUMN_WIDTH = "13.35rem";
export const CIRCLE_CARD_COLUMN_GAP = "10px";

export type VirtualCircleRow<T> = {
  id: string;
  items: Array<T & { absoluteIndex: number }>;
};

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

  if (viewportWidth < 1400) {
    return 3;
  }

  return 4;
}

export function buildVirtualCircleRows<T extends { id: string }>(
  items: T[],
  columnCount: number
): VirtualCircleRow<T>[] {
  const normalizedColumnCount = Math.max(1, Math.floor(columnCount));
  const rows: VirtualCircleRow<T>[] = [];

  for (let index = 0; index < items.length; index += normalizedColumnCount) {
    const rowItems = items.slice(index, index + normalizedColumnCount).map((item, offset) => ({
      ...item,
      absoluteIndex: index + offset
    }));

    rows.push({
      id: rowItems.map((item) => item.id).join(":"),
      items: rowItems
    });
  }

  return rows;
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
