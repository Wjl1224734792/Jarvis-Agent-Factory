import { SitePanel, SitePanelBody } from "@/components/site-shell";
import { Skeleton } from "@/components/ui/skeleton";

export const MODEL_GRID_CLASS_NAME =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,13.625rem),1fr))] gap-x-4 gap-y-5";

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
        columnWidth: props.columnWidth ?? "208px",
        columnGap: props.columnGap ?? "12px"
      }}
    >
      {Array.from({ length: props.count ?? 9 }).map((_, index) => (
        <div
          className="mb-3 break-inside-avoid rounded-[0.95rem] border border-border bg-white p-1.5"
          key={index}
        >
          <Skeleton
            className={`w-full rounded-[0.8rem] ${
              index % 3 === 0 ? "h-[14rem]" : index % 3 === 1 ? "h-[11.5rem]" : "h-[13rem]"
            }`}
          />
          <div className="space-y-2 px-2 pb-2.5 pt-2.5">
            <Skeleton className="h-4 w-4/5" />
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-10" />
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
        <div className="block min-w-0 rounded-[0.95rem] border border-border bg-white px-3 py-3" key={index}>
          <Skeleton className="aspect-square w-full rounded-[0.9rem]" />
          <div className="space-y-2 px-0.5 pb-0.5 pt-3">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
      ))}
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
