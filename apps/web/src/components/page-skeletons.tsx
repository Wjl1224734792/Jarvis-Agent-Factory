import { SitePanel, SitePanelBody } from "@/components/site-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CIRCLE_CARD_COLUMN_GAP,
  CIRCLE_CARD_COLUMN_WIDTH,
  getCircleCardHeightClass
} from "@/routes/circle-page-helpers";

export const MODEL_GRID_CLASS_NAME =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,11.5rem),1fr))] gap-x-3 gap-y-4";

export const RANKING_GRID_CLASS_NAME =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,17.25rem),1fr))] gap-3";

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
        <Skeleton className="h-9 w-64" />
        {Array.from({ length: props.rows ?? 4 }).map((_, index) => (
          <div className="rounded-[0.95rem] border border-border bg-white p-3" key={index}>
            <div className="grid gap-3 md:grid-cols-[148px_minmax(0,1fr)]">
              <Skeleton className="h-24 rounded-[0.8rem]" />
              <div className="space-y-2.5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-5/6" />
                <Skeleton className="h-3.5 w-2/5" />
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
        <div className="rounded-[0.95rem] border border-border bg-white p-3" key={index}>
          <div className="grid gap-3 md:grid-cols-[148px_minmax(0,1fr)]">
            <Skeleton className="h-24 rounded-[0.8rem]" />
            <div className="space-y-2.5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-3.5 w-2/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MasonryFeedSkeleton(props: { count?: number; columnWidth?: number | string; columnGap?: number | string }) {
  return (
    <div
      className="w-full"
      style={{
        columnWidth: props.columnWidth ?? CIRCLE_CARD_COLUMN_WIDTH,
        columnGap: props.columnGap ?? CIRCLE_CARD_COLUMN_GAP
      }}
    >
      {Array.from({ length: props.count ?? 9 }).map((_, index) => (
        <div
          className="mb-2.5 break-inside-avoid overflow-hidden rounded-[1.15rem] bg-white xl:mx-auto xl:max-w-[13.5rem]"
          key={index}
        >
          <div className="relative overflow-hidden rounded-[1rem] bg-slate-100">
            <Skeleton className={`w-full rounded-[1rem] ${getCircleCardHeightClass(index)}`} />
            {index % 4 === 1 ? (
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
  );
}

export function ModelGridSkeleton(props: { count?: number }) {
  return (
    <div className={MODEL_GRID_CLASS_NAME}>
      {Array.from({ length: props.count ?? 8 }).map((_, index) => (
        <div className="block min-w-0 overflow-hidden bg-white" key={index}>
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="space-y-1.5 px-2.5 pb-2.5 pt-2.5">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4.5 w-4/5" />
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ModelsPageSkeleton(props: { count?: number }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
      <div className="space-y-3 xl:order-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="rounded-[0.95rem] border border-border bg-white p-3" key={index}>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-10 rounded-[0.8rem]" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((__, innerIndex) => (
                  <Skeleton className="h-10 rounded-[0.75rem]" key={innerIndex} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-4 xl:order-1">
        <div className="rounded-[0.95rem] border border-border bg-white p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3.5 w-48" />
              </div>
              <Skeleton className="h-3.5 w-14" />
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <Skeleton className="h-10 rounded-[0.8rem]" />
              <Skeleton className="h-10 w-24 rounded-[0.8rem]" />
            </div>
            <Skeleton className="h-4 w-3/5" />
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
        <div
          className="flex min-w-0 flex-col gap-3 rounded-[0.95rem] border border-border bg-white px-3.5 py-3.5"
          key={index}
        >
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-5 w-4/5" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((__, innerIndex) => (
              <div
                className="grid grid-cols-[1rem_2.75rem_minmax(0,1fr)] items-center gap-2.5 border-t border-border pt-2.5 first:border-t-0 first:pt-0"
                key={innerIndex}
              >
                <Skeleton className="h-4 w-3" />
                <Skeleton className="h-11 w-11 rounded-[0.75rem]" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailPageSkeleton(props: { withRail?: boolean }) {
  return (
    <div className={props.withRail ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]" : "space-y-4"}>
      <div className="space-y-4">
        <Skeleton className="h-8 w-28" />
        <div className="rounded-[0.95rem] border border-border bg-white p-4">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              <Skeleton className="h-[320px] rounded-[0.9rem]" />
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton className="h-16 rounded-[0.7rem]" key={index} />
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="grid gap-2.5 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton className="h-20 rounded-[0.8rem]" key={index} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {props.withRail ? <RailCardSkeleton /> : null}
    </div>
  );
}

export function PublishFormSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <div className="rounded-[0.95rem] border border-border bg-white p-4">
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 rounded-[0.8rem]" />
            <Skeleton className="h-10 rounded-[0.8rem]" />
            <Skeleton className="h-28 rounded-[0.8rem]" />
          </div>
        </div>
        <div className="rounded-[0.95rem] border border-border bg-white p-4">
          <Skeleton className="h-5 w-32" />
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton className="h-24 rounded-[0.8rem]" key={index} />
            ))}
          </div>
        </div>
      </div>
      <RailCardSkeleton rows={3} />
    </div>
  );
}
