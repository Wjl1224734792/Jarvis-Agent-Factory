import { ImmersivePageShell } from "@/components/immersive-page-shell";
import {
  FeedStreamSkeleton,
  MasonryFeedSkeleton,
  ModelsPageSkeleton,
  RailCardSkeleton,
  RankingCardGridSkeleton
} from "@/components/page-skeletons";
import { SiteGrid, SitePage, SitePanel, SitePanelBody, SiteRail } from "@/components/site-shell";
import { Skeleton } from "@/components/ui/skeleton";

/** 路由懒加载 fallback 独立模块：避免主应用入口顶层引入所有大骨架。 */

export function RankingsPageRouteSkeleton() {
  return (
    <SitePage className="w-full min-w-0 gap-4">
      <div className="flex flex-wrap items-center gap-4 border-b border-border/60 pb-3">
        <div className="flex min-w-0 gap-5 overflow-x-auto whitespace-nowrap">
          <Skeleton className="h-9 w-24 shrink-0 rounded-none" />
          <Skeleton className="h-9 w-24 shrink-0 rounded-none" />
        </div>
      </div>
      <RankingCardGridSkeleton count={6} />
    </SitePage>
  );
}

/** 飞行器列表路由懒加载 fallback，与页内 ModelsPageSkeleton 一致。 */
export function ModelsPageRouteSkeleton() {
  return (
    <SitePage className="w-full min-w-0 gap-4">
      <ModelsPageSkeleton count={10} />
    </SitePage>
  );
}

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
      <MasonryFeedSkeleton className="mt-4" count={10} />
    </SitePage>
  );
}

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
        <SiteRail className="hidden space-y-2 xl:flex">
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

export function UserProfilePageRouteSkeleton() {
  return (
    <SitePage className="mx-auto w-full max-w-[72rem] gap-4">
      <SitePanel className="overflow-hidden !border-0" variant="floating">
        <div className="relative">
          <Skeleton className="h-40 w-full md:h-48" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
            <div className="flex items-end gap-4">
              <Skeleton className="h-28 w-28 rounded-full bg-white/22 md:h-32 md:w-32" />
              <div className="space-y-2 pb-3">
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full bg-white/22" />
                  <Skeleton className="h-6 w-24 rounded-full bg-white/22" />
                </div>
                <Skeleton className="h-10 w-52 max-w-[min(100%,16rem)] bg-white/28" />
              </div>
            </div>
          </div>
        </div>
        <SitePanelBody className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
            <div className="grid gap-4 md:grid-cols-[9rem_minmax(0,1fr)] md:items-start">
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton className="h-18 rounded-[0.8rem]" key={index} />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-border/70 pt-4">
            <Skeleton className="h-10 w-36 rounded-[0.8rem]" />
            <Skeleton className="h-10 w-36 rounded-[0.8rem]" />
          </div>
        </SitePanelBody>
      </SitePanel>
      <div className="space-y-4">
        <div className="flex gap-6 border-b border-border/70 pb-0">
          <Skeleton className="mb-[-1px] h-9 w-14 rounded-none border-b-2 border-primary/40" />
          <Skeleton className="h-9 w-14 rounded-none opacity-50" />
        </div>
        <Skeleton className="h-[660px] w-full rounded-none bg-white" />
      </div>
    </SitePage>
  );
}

export function PostDetailPageSkeleton() {
  return (
    <ImmersivePageShell
      className="max-w-[900px] gap-8 bg-transparent px-4 pb-8 pt-2 md:px-6 [&_section]:rounded-none"
      header={
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-sm">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-none" />
          </div>
        </div>
      }
    >
      <article className="space-y-6">
        <header className="space-y-4">
          <Skeleton className="h-12 w-full max-w-[14ch] rounded-none md:h-16" />

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
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton className="size-9 shrink-0 rounded-md" key={index} />
            ))}
          </div>
          <Skeleton className="size-9 shrink-0 rounded-md" />
        </div>
      </section>

      <section className="space-y-4 border-t border-border/60 pt-6" id="post-comment-area">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4.5 rounded-none" />
              <Skeleton className="h-5 w-14 rounded-none" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-14 rounded-full" />
              <Skeleton className="h-7 w-14 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-4 w-40 rounded-none" />
        </div>

        <div className="border border-border/70 bg-white px-5 py-5">
          <Skeleton className="h-24 w-full rounded-none" />
        </div>
      </section>
    </ImmersivePageShell>
  );
}

export function RankingDetailPageSkeleton() {
  return (
    <ImmersivePageShell className="max-w-[1100px] gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/75 pb-4">
        <Skeleton className="h-9 w-28 rounded-none" />
        <Skeleton className="size-9 shrink-0 rounded-none" />
      </div>

      <div className="grid gap-4 border border-border/75 bg-white p-4 md:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        <Skeleton className="h-[220px] w-full rounded-none md:h-[300px]" />
        <div className="flex min-w-0 flex-col justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-10 w-full max-w-[min(100%,24rem)] rounded-none md:h-12" />
              <Skeleton className="h-6 w-16 shrink-0 rounded-none" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="border border-border/70 px-4 py-3" key={index}>
                <Skeleton className="h-3 w-16 rounded-none" />
                <Skeleton className="mt-2 h-6 w-20 rounded-none" />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2.5 border-t border-border/70 pt-3">
            <Skeleton className="h-9 w-28 rounded-none" />
            <Skeleton className="h-9 w-28 rounded-none" />
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 pt-4">
        <Skeleton className="mb-3 h-6 w-24 rounded-none" />
        <div className="divide-y divide-border/80 border-t border-border/80">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              className="grid gap-3 bg-white px-4 py-4 md:grid-cols-[44px_88px_minmax(0,1fr)]"
              key={index}
            >
              <Skeleton className="h-8 w-8 rounded-none" />
              <Skeleton className="h-[74px] w-full rounded-none" />
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded-none" />
                  <Skeleton className="h-3 w-32 rounded-none" />
                  <Skeleton className="h-3 w-full max-w-[20rem] rounded-none" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Skeleton className="h-7 w-12 rounded-none" />
                  <Skeleton className="h-3 w-10 rounded-none" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ImmersivePageShell>
  );
}

export function ModelDetailPageSkeleton() {
  return (
    <ImmersivePageShell className="max-w-[1180px] gap-6">
      <Skeleton className="h-9 w-32 rounded-none" />

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="space-y-6 border border-border/75 bg-white p-4">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
              <div className="min-w-0 space-y-3">
                <Skeleton className="h-[280px] w-full rounded-none sm:h-[320px] lg:h-[340px]" />
                <div className="flex gap-2 overflow-hidden pb-1">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton className="h-16 w-20 shrink-0 rounded-none" key={index} />
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-10 w-4/5 rounded-none md:h-14" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-24 rounded-none" />
                  <Skeleton className="h-6 w-20 rounded-none" />
                  <Skeleton className="h-6 w-16 rounded-none" />
                </div>
                <Skeleton className="h-3.5 w-full rounded-none" />
                <Skeleton className="h-3.5 w-full rounded-none" />
                <Skeleton className="h-3.5 w-4/5 rounded-none" />
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/25 pt-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton className="h-5 w-16 rounded-none" key={index} />
                  ))}
                  <Skeleton className="ml-auto h-5 w-5 rounded-none max-sm:ml-0" />
                </div>
              </div>
            </div>

            <div className="w-full overflow-x-auto border-y border-border/35">
              <div className="grid min-w-0 w-full grid-cols-2 divide-x divide-y divide-border/35 sm:grid-cols-4 sm:divide-y-0">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    className="flex min-h-12 flex-col items-center justify-center gap-1 px-2 py-2.5 text-center sm:min-h-0"
                    key={index}
                  >
                    <Skeleton className="h-3 w-12 rounded-none" />
                    <Skeleton className="h-4 w-16 rounded-none" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <SitePanel className="rounded-none bg-white">
            <SitePanelBody className="space-y-6">
              {Array.from({ length: 2 }).map((_, sectionIndex) => (
                <div className="space-y-5" key={sectionIndex}>
                  <Skeleton className="h-4 w-28 rounded-none" />
                  <div className="rounded-none border border-border/70">
                    {Array.from({ length: 3 }).map((__, rowIndex) => (
                      <div
                        className={`grid gap-2 px-4 py-3 md:grid-cols-[180px_minmax(0,1fr)] ${
                          rowIndex !== 2 ? "border-b border-border/70" : ""
                        }`}
                        key={rowIndex}
                      >
                        <Skeleton className="h-4 w-20 rounded-none" />
                        <Skeleton className="h-4 w-full max-w-[16rem] rounded-none" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </SitePanelBody>
          </SitePanel>

          <section className="space-y-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4.5 rounded-none" />
                  <Skeleton className="h-5 w-14 rounded-none" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-14 rounded-full" />
                  <Skeleton className="h-7 w-14 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-4 w-36 rounded-none" />
            </div>
            <div className="bg-white px-5 py-5">
              <Skeleton className="h-24 w-full rounded-none" />
            </div>
            <div className="space-y-6 bg-white px-5 py-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div className="flex gap-3" key={index}>
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-32 rounded-none" />
                    <Skeleton className="h-3.5 w-full rounded-none" />
                    <Skeleton className="h-3.5 w-11/12 rounded-none" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-5 xl:max-w-[20rem]">
          <RailCardSkeleton rows={4} />
        </aside>
      </section>
    </ImmersivePageShell>
  );
}

export function RatingTargetDetailPageSkeleton() {
  return (
    <ImmersivePageShell className="max-w-[1120px] gap-6">
      <Skeleton className="h-9 w-32 rounded-none" />

      <div className="grid gap-4 border border-border/80 bg-white p-4 md:grid-cols-[320px_minmax(0,1fr)]">
        <Skeleton className="h-[240px] w-full rounded-none md:h-[280px]" />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40 rounded-none" />
              <Skeleton className="h-10 w-full max-w-[min(100%,28rem)] rounded-none md:h-12" />
              <Skeleton className="h-3.5 w-full rounded-none" />
              <Skeleton className="h-3.5 w-11/12 rounded-none" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-10 w-28 rounded-none" />
              <Skeleton className="h-6 w-40 rounded-none" />
              <Skeleton className="h-4 w-48 rounded-none" />
            </div>

            <div className="border-t border-border/70 pt-4">
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div className="flex items-center gap-3" key={index}>
                    <Skeleton className="h-4 w-8 rounded-none" />
                    <Skeleton className="h-2 flex-1 rounded-none" />
                    <Skeleton className="h-4 w-10 rounded-none" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-9 w-36 rounded-none" />
              <Skeleton className="h-9 w-24 rounded-none" />
              <Skeleton className="size-9 rounded-none" />
            </div>
          </div>

          <div className="space-y-4 border border-border/70 px-4 py-4">
            <Skeleton className="h-3 w-20 rounded-none" />
            <Skeleton className="h-4 w-full rounded-none" />
            <Skeleton className="mt-4 h-3 w-16 rounded-none" />
            <Skeleton className="h-8 w-12 rounded-none" />
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t border-border/60 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-6 w-28 rounded-none" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-14 rounded-full" />
            <Skeleton className="h-7 w-14 rounded-full" />
          </div>
        </div>

        <div className="space-y-3 rounded-none border border-border/70 bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <Skeleton className="h-12 w-40 rounded-none" />
            <Skeleton className="h-10 flex-1 rounded-none" />
          </div>
          <Skeleton className="h-28 w-full rounded-none" />
          <Skeleton className="h-10 w-full max-w-[12rem] rounded-none" />
        </div>

        <div className="space-y-4 bg-white px-4 py-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div className="border-b border-border/60 pb-4 last:border-b-0" key={index}>
              <div className="flex gap-3">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-36 rounded-none" />
                  <Skeleton className="h-3.5 w-full rounded-none" />
                  <Skeleton className="h-3.5 w-4/5 rounded-none" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ImmersivePageShell>
  );
}
