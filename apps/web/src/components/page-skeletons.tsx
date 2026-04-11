import { ImmersivePageShell } from "@/components/immersive-page-shell";
import { SiteGrid, SitePage, SitePanel, SitePanelBody, SiteRail } from "@/components/site-shell";
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
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-1.5 px-2.5 pb-2.5 pt-2.5">
            <Skeleton className="h-3 w-14 rounded-none" />
            <Skeleton className="h-4.5 w-4/5 rounded-none" />
            <Skeleton className="h-3.5 w-2/5 rounded-none" />
            <Skeleton className="h-3.5 w-full rounded-none" />
            <Skeleton className="h-3.5 w-4/5 rounded-none" />
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
        <div className="rounded-none bg-white p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-5 w-24 rounded-none" />
                <Skeleton className="h-3.5 w-48 rounded-none" />
              </div>
              <Skeleton className="h-3.5 w-14 rounded-none" />
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <Skeleton className="h-10 rounded-none" />
              <Skeleton className="h-10 w-24 rounded-none" />
            </div>
            <Skeleton className="h-4 w-3/5 rounded-none" />
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

/** 懒加载 chunk 等待期间，与榜单页 SitePage + Tab 行 + 卡片栅格一致 */
export function RankingsPageRouteSkeleton() {
  return (
    <SitePage className="mx-auto w-full max-w-[72rem] gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-3">
        <div className="flex gap-5 overflow-x-auto whitespace-nowrap">
          <Skeleton className="h-9 w-24 shrink-0 rounded-none" />
          <Skeleton className="h-9 w-24 shrink-0 rounded-none" />
        </div>
        <Skeleton className="h-8 w-28 shrink-0 rounded-full" />
      </div>
      <RankingCardGridSkeleton count={6} />
    </SitePage>
  );
}

/** 懒加载 chunk 等待期间，与飞友圈 Tab 行 + MasonryFeedSkeleton 一致 */
export function CirclePageRouteSkeleton() {
  return (
    <SitePage className="gap-4">
      <div className="border-b border-border/60">
        <div className="flex gap-5 overflow-x-auto whitespace-nowrap">
          <Skeleton className="h-9 w-16 shrink-0 rounded-none" />
          <Skeleton className="h-9 w-16 shrink-0 rounded-none" />
          <Skeleton className="h-9 w-16 shrink-0 rounded-none" />
        </div>
      </div>
      <MasonryFeedSkeleton count={10} />
    </SitePage>
  );
}

/** 懒加载 chunk 等待期间，与首页 SiteGrid 双栏 + FeedStreamSkeleton + 右侧两栏一致 */
export function HomePageRouteSkeleton() {
  return (
    <SitePage>
      <SiteGrid className="items-start gap-4" variant="sidebar">
        <div className="mx-auto w-full max-w-[920px] min-w-0">
          <div className="border-b border-border px-1">
            <div className="flex gap-5 overflow-x-auto whitespace-nowrap">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton className="h-9 w-14 shrink-0 rounded-none" key={index} />
              ))}
            </div>
          </div>
          <section className="site-tab-panel relative mt-2.5 overflow-hidden bg-white">
            <div className="p-3">
              <FeedStreamSkeleton rows={4} />
            </div>
          </section>
        </div>
        <SiteRail className="space-y-2">
          <SitePanel variant="muted">
            <SitePanelBody className="space-y-2.5">
              <Skeleton className="h-5 w-24 rounded-none" />
              <div className="flex flex-col gap-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div className="space-y-2" key={index}>
                    <Skeleton className="h-4 w-4/5 rounded-none" />
                    <Skeleton className="h-3.5 w-3/5 rounded-none" />
                  </div>
                ))}
              </div>
            </SitePanelBody>
          </SitePanel>
          <SitePanel variant="muted">
            <SitePanelBody className="space-y-2.5">
              <Skeleton className="h-5 w-24 rounded-none" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div className="grid grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-2.5" key={index}>
                    <Skeleton className="h-[58px] w-full rounded-none" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-20 rounded-none" />
                      <Skeleton className="h-3 w-14 rounded-none" />
                      <Skeleton className="h-3 w-12 rounded-none" />
                    </div>
                    <Skeleton className="h-5 w-8 rounded-none" />
                  </div>
                ))}
              </div>
            </SitePanelBody>
          </SitePanel>
        </SiteRail>
      </SiteGrid>
    </SitePage>
  );
}

export function PostDetailPageSkeleton() {
  return (
    <ImmersivePageShell className="max-w-[900px] gap-8 bg-transparent px-4 pb-8 pt-2 md:px-6 [&_section]:rounded-none">
      <article className="space-y-6">
        <header className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-24 rounded-none md:h-12" />
            <Skeleton className="h-4 w-full max-w-[14ch] rounded-none" />
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-28 rounded-none" />
                <Skeleton className="h-3 w-40 rounded-none" />
              </div>
            </div>
            <Skeleton className="h-8 w-20 shrink-0 rounded-full" />
          </div>
        </header>

        <div className="overflow-hidden rounded-none border border-border/70">
          <Skeleton className="h-[280px] w-full rounded-none md:h-[380px]" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-4 w-full rounded-none" />
          <Skeleton className="h-4 w-full rounded-none" />
          <Skeleton className="h-4 w-11/12 rounded-none" />
          <Skeleton className="h-4 w-4/5 rounded-none" />
        </div>
      </article>

      <section className="space-y-5 border-t border-border/60 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-4 w-12 rounded-none" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
          <Skeleton className="size-9 shrink-0 rounded-md" />
        </div>
      </section>

      <section className="space-y-4 border-t border-border/60 pt-6" id="post-comment-area">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-6 w-24 rounded-none" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-14 rounded-full" />
            <Skeleton className="h-7 w-14 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-4 w-32 rounded-none" />
        <Skeleton className="min-h-[120px] w-full rounded-none border border-border/70 bg-muted/20" />
        <div className="space-y-4 border border-border/70 bg-white px-5 py-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-28 rounded-none" />
              <Skeleton className="h-3.5 w-full rounded-none" />
              <Skeleton className="h-3.5 w-5/6 rounded-none" />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-24 rounded-none" />
              <Skeleton className="h-3.5 w-full rounded-none" />
            </div>
          </div>
        </div>
      </section>
    </ImmersivePageShell>
  );
}

export function ModelDetailPageSkeleton() {
  return (
    <ImmersivePageShell className="max-w-[1180px] gap-6">
      <Skeleton className="h-9 w-40 rounded-none" />

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="space-y-6 border border-border/75 bg-white p-4">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
              <div className="min-w-0 space-y-3 lg:min-h-0">
                <Skeleton className="h-[280px] w-full rounded-none sm:h-[320px] lg:h-[340px]" />
                <div className="flex gap-2 overflow-hidden">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton className="h-16 w-20 shrink-0 rounded-none" key={index} />
                  ))}
                </div>
              </div>

              <div className="flex min-h-0 min-w-0 flex-col lg:h-full">
                <div className="flex min-h-0 flex-col overflow-hidden lg:h-[340px] lg:max-h-[340px]">
                  <div className="shrink-0 space-y-3">
                    <Skeleton className="h-10 w-4/5 rounded-none md:h-12" />
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-6 w-24 rounded-none" />
                      <Skeleton className="h-6 w-20 rounded-none" />
                      <Skeleton className="h-6 w-16 rounded-none" />
                    </div>
                  </div>
                  <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="min-h-0 flex-1 space-y-2 pr-1">
                      <Skeleton className="h-3.5 w-full rounded-none" />
                      <Skeleton className="h-3.5 w-full rounded-none" />
                      <Skeleton className="h-3.5 w-4/5 rounded-none" />
                    </div>
                    <div className="mt-auto shrink-0 border-t border-border/25 pt-3">
                      <Skeleton className="h-9 w-48 rounded-none md:h-10" />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/25 pt-3">
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-8 w-16 rounded-full" />
                    <Skeleton className="h-8 w-16 rounded-full" />
                    <Skeleton className="h-8 w-16 rounded-full" />
                    <Skeleton className="h-8 w-16 rounded-full" />
                  </div>
                  <Skeleton className="ml-auto h-8 w-8 rounded-none md:ml-0" />
                </div>
              </div>
            </div>

            <div className="w-full overflow-x-auto border-y border-border/35 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="grid min-w-0 w-full grid-cols-2 divide-x divide-y divide-border/35 sm:grid-cols-4 sm:divide-y-0">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    className="flex min-h-12 flex-col items-center justify-center gap-0.5 px-2 py-2.5 text-center sm:min-h-0"
                    key={index}
                  >
                    <Skeleton className="h-3 w-2/3 rounded-none" />
                    <Skeleton className="h-4 w-1/2 rounded-none" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <SitePanel className="rounded-none bg-white">
            <SitePanelBody className="space-y-4">
              <Skeleton className="h-4 w-36 rounded-none" />
              <div className="grid gap-2.5">
                <Skeleton className="h-12 w-full rounded-none border border-border/70" />
                <Skeleton className="h-12 w-full rounded-none border border-border/70" />
              </div>
            </SitePanelBody>
          </SitePanel>
        </div>

        <div className="min-w-0 xl:max-w-[20rem]">
          <RailCardSkeleton rows={4} />
        </div>
      </section>
    </ImmersivePageShell>
  );
}

export function RatingTargetDetailPageSkeleton() {
  return (
    <ImmersivePageShell className="max-w-[1120px] gap-6">
      <Skeleton className="h-9 w-40 rounded-none" />

      <div className="grid gap-4 border border-border/80 bg-white p-4 md:grid-cols-[320px_minmax(0,1fr)]">
        <Skeleton className="h-[240px] w-full rounded-none md:min-h-[200px]" />
        <div className="flex min-w-0 flex-col justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-5 w-40 rounded-none" />
            <Skeleton className="h-10 w-4/5 rounded-none md:h-12" />
            <Skeleton className="h-4 w-full rounded-none" />
            <Skeleton className="h-4 w-11/12 rounded-none" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-8 w-36 rounded-none" />
              <Skeleton className="h-12 w-28 rounded-none" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border/70 pt-3">
            <Skeleton className="h-9 w-24 rounded-none" />
            <Skeleton className="h-9 w-24 rounded-none" />
            <Skeleton className="ml-auto h-9 w-9 rounded-none md:ml-0" />
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t border-border/60 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-6 w-28 rounded-none" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-14 rounded-full" />
            <Skeleton className="h-7 w-14 rounded-full" />
          </div>
        </div>
        <div className="space-y-3 rounded-none border border-border/70 bg-white p-4">
          <Skeleton className="h-4 w-24 rounded-none" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton className="size-10 rounded-none" key={index} />
            ))}
          </div>
          <Skeleton className="min-h-[88px] w-full rounded-none border border-border/60" />
          <Skeleton className="h-10 w-28 rounded-none" />
        </div>
        <div className="space-y-3 border border-border/70 bg-white px-5 py-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-28 rounded-none" />
              <Skeleton className="h-3.5 w-full rounded-none" />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-24 rounded-none" />
              <Skeleton className="h-3.5 w-5/6 rounded-none" />
            </div>
          </div>
        </div>
      </div>
    </ImmersivePageShell>
  );
}

export function DetailPageSkeleton(props: { withRail?: boolean }) {
  return (
    <div className={props.withRail ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]" : "space-y-6"}>
      <div className="space-y-6">
        <div className="border-b border-border/75 pb-4">
          <Skeleton className="h-8 w-36 rounded-none" />
        </div>
        <div className="rounded-none border border-border/75 bg-white p-4">
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3">
              <Skeleton className="h-[320px] rounded-none" />
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton className="h-16 rounded-none" key={index} />
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-36 rounded-none" />
              <Skeleton className="h-12 w-3/4 rounded-none" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="grid gap-2.5 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton className="h-20 rounded-none" key={index} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-none border border-border/75 bg-white p-5">
          <div className="space-y-3">
            <Skeleton className="h-5 w-40 rounded-none" />
            <Skeleton className="h-4 w-full rounded-none" />
            <Skeleton className="h-4 w-11/12 rounded-none" />
            <Skeleton className="h-4 w-10/12 rounded-none" />
          </div>
        </div>
      </div>
      {props.withRail ? <RailCardSkeleton rows={4} /> : null}
    </div>
  );
}

export function PublishFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-6 border-b border-border/75 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-sm" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-16 rounded-none" />
              <Skeleton className="h-4 w-28 rounded-none" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="space-y-2 text-right">
              <Skeleton className="ml-auto h-3.5 w-14 rounded-none" />
              <Skeleton className="ml-auto h-4 w-20 rounded-none" />
            </div>
            <Skeleton className="size-11 rounded-sm" />
          </div>
        </div>
        <div>
          <Skeleton className="h-4 w-24 rounded-none" />
          <Skeleton className="mt-3 h-11 w-72 rounded-none" />
          <Skeleton className="mt-2 h-4 w-3/5 rounded-none" />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
        <div className="rounded-none border border-border bg-white p-4">
          <div className="space-y-3">
            <Skeleton className="h-5 w-40 rounded-none" />
            <Skeleton className="h-10 rounded-sm" />
            <Skeleton className="h-10 rounded-sm" />
            <Skeleton className="h-28 rounded-none" />
          </div>
        </div>
        <div className="rounded-none border border-border bg-white p-4">
          <Skeleton className="h-5 w-32 rounded-none" />
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton className="h-24 rounded-none" key={index} />
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-none border border-border bg-white p-4">
          <div className="space-y-3">
            <Skeleton className="h-5 w-32 rounded-none" />
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton className="h-20 rounded-none" key={index} />
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
