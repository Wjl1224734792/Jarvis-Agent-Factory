import type { ModelListItem } from "@feijia/schemas";
import { useMemo } from "react";
import { SitePanel, SitePanelBody } from "@/components/site-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useCircleColumnCount } from "@/hooks/use-circle-column-count";
import { partitionByShortestColumn } from "@/lib/masonry-partition";
import { cn } from "@/lib/utils";
import {
  CIRCLE_CARD_COLUMN_GAP,
  CIRCLE_FEED_MEDIA_MAX_HEIGHT_CLASS,
  getCircleCardMediaAspectClass,
  partitionCircleFeedShortestColumn
} from "@/routes/circle-page-helpers";
import { estimateModelListItemRelativeHeight } from "@/routes/models-page-helpers";

/** 与 {@link estimateModelListItemRelativeHeight} 配合，使骨架瀑布分列与真实列表接近 */
const MODEL_GRID_SKELETON_HEIGHT_PROBE = {
  name: "Placeholder",
  summary: "Typical summary text for skeleton masonry column balance."
} as ModelListItem;

/** 与 rankings-page-helpers 中 RANKING_CARD_MIN_WIDTH_PX（380px ≈ 23.75rem）对齐 */
export const RANKING_GRID_CLASS_NAME =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,23.75rem),1fr))] gap-3";

export function RailCardSkeleton(props: { rows?: number }) {
  return (
    <SitePanel variant="muted">
      <SitePanelBody className="space-y-3">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: props.rows ?? 3 }).map((_, index) => (
          <div className="flex items-center gap-3" key={index}>
            <Skeleton className="h-14 w-14 rounded-[0.75rem]" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </SitePanelBody>
    </SitePanel>
  );
}

export function ListPageSkeleton(props: { rows?: number; withRail?: boolean }) {
  return (
    <div className={props.withRail ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_17.5rem]" : "space-y-3"}>
      <div className="space-y-3">
        <Skeleton className="h-9 w-64 rounded-none" />
        {Array.from({ length: props.rows ?? 4 }).map((_, index) => (
          <div className="rounded-none bg-white p-3" key={index}>
            <div className="grid gap-3 md:grid-cols-[148px_minmax(0,1fr)]">
              <Skeleton className="h-24 rounded-none" />
              <div className="space-y-2.5">
                <Skeleton className="h-5 w-3/4 rounded-none" />
                <Skeleton className="h-3.5 w-full rounded-none" />
                <Skeleton className="h-3.5 w-5/6 rounded-none" />
                <Skeleton className="h-3.5 w-2/5 rounded-none" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {props.withRail ? (
        <div className="space-y-2">
          <RailCardSkeleton />
          <RailCardSkeleton rows={2} />
        </div>
      ) : null}
    </div>
  );
}

export function FeedStreamSkeleton(props: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: props.rows ?? 4 }).map((_, index) => (
        <div className="rounded-none bg-white p-3" key={index}>
          <div className="grid gap-3 md:grid-cols-[148px_minmax(0,1fr)]">
            <Skeleton className="h-24 rounded-none" />
            <div className="space-y-2.5">
              <Skeleton className="h-5 w-3/4 rounded-none" />
              <Skeleton className="h-3.5 w-full rounded-none" />
              <Skeleton className="h-3.5 w-5/6 rounded-none" />
              <Skeleton className="h-3.5 w-2/5 rounded-none" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MasonryFeedSkeleton(props: {
  count?: number;
  columnCount?: number;
  columnGap?: number | string;
  className?: string;
}) {
  const count = props.count ?? 9;
  const columnGap = props.columnGap ?? CIRCLE_CARD_COLUMN_GAP;
  const columnCount = useCircleColumnCount(props.columnCount);

  const skeletonColumns = useMemo(() => {
    const slots = Array.from({ length: count }, (_, index) => index);
    return partitionCircleFeedShortestColumn(slots, columnCount);
  }, [count, columnCount]);

  return (
    <div
      className={cn("grid w-full min-w-0", props.className)}
      style={{
        gap: columnGap,
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`
      }}
    >
      {skeletonColumns.map((column, colIndex) => (
        <div className="flex min-w-0 flex-col" key={colIndex} style={{ gap: columnGap }}>
          {column.map(({ item: slotIndex, absoluteIndex }) => (
            <div className="overflow-hidden rounded-[1.15rem] bg-white" key={slotIndex}>
              <div className="relative overflow-hidden rounded-[1rem] bg-slate-100">
                <Skeleton
                  className={cn(
                    "w-full rounded-[1rem]",
                    CIRCLE_FEED_MEDIA_MAX_HEIGHT_CLASS,
                    getCircleCardMediaAspectClass(absoluteIndex)
                  )}
                />
                {absoluteIndex % 4 === 1 ? (
                  <div className="absolute right-3 top-3">
                    <Skeleton className="size-7 rounded-full" />
                  </div>
                ) : null}
              </div>
              <div className="space-y-1.5 px-3 pb-3 pt-1.5">
                <Skeleton className="h-4.5 w-4/5" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-6 rounded-full" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                  <Skeleton className="h-3.5 w-8" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ModelCardSkeletonBlock() {
  return (
    <div className="block min-w-0 overflow-hidden bg-white">
      <div className="aspect-[4/3] w-full overflow-hidden">
        <Skeleton className="h-full w-full rounded-none" />
      </div>
      <div className="space-y-1.5 px-2.5 pb-2.5 pt-2.5">
        <div className="space-y-1">
          <Skeleton className="h-4.5 w-[92%] rounded-none" />
          <Skeleton className="h-4.5 w-4/5 rounded-none" />
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <Skeleton className="size-3.5 shrink-0 rounded-none" />
          <Skeleton className="h-3 w-24 max-w-full rounded-none" />
        </div>
        <Skeleton className="h-3.5 w-20 rounded-none" />
        <div className="space-y-1">
          <Skeleton className="h-3.5 w-full rounded-none" />
          <Skeleton className="h-3.5 w-11/12 rounded-none" />
        </div>
      </div>
    </div>
  );
}

export function ModelGridSkeleton(props: { count?: number }) {
  const count = props.count ?? 10;
  const columnCount = useCircleColumnCount();
  const columnGap = CIRCLE_CARD_COLUMN_GAP;

  const skeletonColumns = useMemo(() => {
    const slots = Array.from({ length: count }, (_, index) => index);
    return partitionByShortestColumn(slots, columnCount, (_item, absoluteIndex) =>
      estimateModelListItemRelativeHeight(MODEL_GRID_SKELETON_HEIGHT_PROBE, absoluteIndex)
    );
  }, [count, columnCount]);

  return (
    <div
      className="grid w-full min-w-0"
      style={{
        gap: columnGap,
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`
      }}
    >
      {skeletonColumns.map((column, colIndex) => (
        <div className="flex min-w-0 flex-col" key={colIndex} style={{ gap: columnGap }}>
          {column.map(({ item: slotIndex }) => (
            <ModelCardSkeletonBlock key={slotIndex} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ModelsPageSkeleton(props: { count?: number }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
      <div className="hidden space-y-3 xl:order-2 xl:block xl:sticky xl:top-[5.5rem] xl:self-start">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="rounded-none bg-white p-3" key={index}>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-16 rounded-none" />
                <Skeleton className="h-3 w-10 rounded-none" />
              </div>
              <Skeleton className="h-10 rounded-none" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((__, innerIndex) => (
                  <Skeleton className="h-10 rounded-none" key={innerIndex} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-4 xl:order-1">
        <div className="space-y-3 bg-white px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-5 w-24 rounded-none" />
              <Skeleton className="h-3.5 w-48 rounded-none" />
            </div>
            <Skeleton className="h-8 shrink-0 rounded-none xl:hidden" />
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <Skeleton className="h-10 rounded-none" />
            <Skeleton className="h-10 w-24 rounded-none" />
          </div>
          <div className="flex gap-5 overflow-x-auto border-b border-border/60">
            {Array.from({ length: 3 }).map((_, tabIndex) => (
              <Skeleton className="h-10 w-12 rounded-none" key={tabIndex} />
            ))}
          </div>
        </div>
        <ModelGridSkeleton count={props.count ?? 10} />
      </div>
    </div>
  );
}

export function RankingCardGridSkeleton(props: { count?: number }) {
  return (
    <div className={RANKING_GRID_CLASS_NAME}>
      {Array.from({ length: props.count ?? 6 }).map((_, index) => (
        <div className="flex min-w-0 flex-col gap-3 rounded-none bg-white px-3.5 py-3.5" key={index}>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-20 rounded-none" />
            <Skeleton className="h-5 w-4/5 rounded-none" />
          </div>
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 3 }).map((__, innerIndex) => (
              <div
                className="grid grid-cols-[1rem_2.75rem_minmax(0,1fr)] items-center gap-2.5"
                key={innerIndex}
              >
                <Skeleton className="h-4 w-3 rounded-none" />
                <Skeleton className="h-11 w-11 rounded-none" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-full rounded-none" />
                  <Skeleton className="h-3 w-20 rounded-none" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export {
  PublishArticlePageSkeleton,
  PublishAircraftPageSkeleton,
  PublishBrandPageSkeleton,
  PublishMomentPageSkeleton,
  PublishShellSkeleton,
  PublishStatusPageSkeleton,
  RankingEditorPageSkeleton
} from "@/components/publish-skeletons";
