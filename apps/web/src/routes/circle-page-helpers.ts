type MediaRecord = {
  url: string;
};

export type CircleMediaItem = {
  kind: "image" | "video";
  url: string;
  label: string;
};

const masonryHeightClasses = [
  "h-[18rem]",
  "h-[21rem]",
  "h-[19rem]",
  "h-[22.5rem]",
  "h-[20rem]"
] as const;

export const CIRCLE_CARD_COLUMN_WIDTH = "14.75rem";
export const CIRCLE_CARD_COLUMN_GAP = "16px";

export function getCircleCardHeightClass(index: number) {
  return masonryHeightClasses[index % masonryHeightClasses.length];
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
        url: videos[0]!.url,
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
