import type { ReactNode } from "react";
import { ImmersivePageShell } from "@/components/immersive-page-shell";
import {
  SitePageEyebrow,
  SitePageHead,
  SitePageTitle,
  SitePanel,
  SitePanelBody
} from "@/components/site-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getCircleCardMediaAspectClass } from "@/routes/circle-page-helpers";

/** 与 [publish-shell.tsx](publish-shell.tsx) 同构：ImmersivePageShell + SitePageHead + 主/侧栏栅格 */
export function PublishShellSkeleton(props: {
  shellClassName?: string;
  gridClassName?: string;
  main: ReactNode;
  aside: ReactNode;
  /** 是否显示描述行骨架 */
  withDescription?: boolean;
}) {
  return (
    <ImmersivePageShell
      className={cn(
        "max-w-[1240px] gap-8 [&_.site-page-head]:gap-3 [&_.site-panel]:border-border/75",
        "[&_.site-panel]:bg-white [&_.site-panel]:shadow-none",
        props.shellClassName
      )}
      header={
        <div className="space-y-6">
          <SitePageHead className="gap-3">
            <SitePageEyebrow className="tracking-[0.22em]">
              <Skeleton className="h-3 w-20 rounded-none" />
            </SitePageEyebrow>
            <SitePageTitle className="text-[2.05rem] md:text-[2.5rem]">
              <Skeleton className="h-10 w-[min(100%,18rem)] rounded-none md:h-12" />
            </SitePageTitle>
            {props.withDescription !== false ? (
              <div className="site-page-description max-w-[54rem] text-sm">
                <Skeleton className="h-4 w-full max-w-[36rem] rounded-none" />
                <Skeleton className="mt-2 h-4 w-full max-w-[28rem] rounded-none" />
              </div>
            ) : null}
          </SitePageHead>
        </div>
      }
    >
      <section
        className={cn(
          "grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]",
          "[&>aside]:space-y-4",
          props.gridClassName
        )}
      >
        <div className="space-y-4">{props.main}</div>
        <aside>{props.aside}</aside>
      </section>
    </ImmersivePageShell>
  );
}

export function PublishArticlePageSkeleton() {
  return (
    <PublishShellSkeleton
      aside={
        <SitePanel variant="muted">
          <SitePanelBody className="space-y-4">
            <Skeleton className="h-3 w-16 rounded-none uppercase tracking-[0.18em]" />
            <Skeleton className="h-48 w-full rounded-[0.9rem]" />
            <Skeleton className="h-3 w-24 rounded-none" />
            <Skeleton className="h-6 w-full rounded-none" />
            <Skeleton className="h-4 w-4/5 rounded-none" />
            <Skeleton className="h-40 w-full rounded-none border border-border/40" />
          </SitePanelBody>
        </SitePanel>
      }
      main={
        <>
          <SitePanel>
            <SitePanelBody className="space-y-4">
              <Skeleton className="h-10 w-full rounded-none" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton className="h-8 w-20 rounded-full" key={index} />
                ))}
              </div>
              <Skeleton className="min-h-24 w-full rounded-none" />
              <Skeleton className="min-h-[280px] w-full rounded-none" />
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24 rounded-none" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Skeleton className="h-32 rounded-[0.9rem]" />
                    <Skeleton className="h-32 rounded-[0.9rem]" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24 rounded-none" />
                  <Skeleton className="h-40 rounded-[0.9rem]" />
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>
          <SitePanel>
            <SitePanelBody className="flex flex-wrap justify-end gap-3">
              <Skeleton className="h-10 w-28 rounded-none" />
              <Skeleton className="h-10 w-20 rounded-none" />
              <Skeleton className="h-10 w-32 rounded-none" />
            </SitePanelBody>
          </SitePanel>
        </>
      }
    />
  );
}

export function PublishMomentPageSkeleton() {
  return (
    <PublishShellSkeleton
      aside={
        <SitePanel variant="muted">
          <SitePanelBody className="space-y-4">
            <Skeleton className="h-3 w-16 rounded-none uppercase tracking-[0.18em]" />
            <div className="mx-auto w-full max-w-54 space-y-1.5">
              <Skeleton className={cn("w-full rounded-[1rem]", getCircleCardMediaAspectClass(0))} />
              <div className="space-y-1 px-0.5 pt-1.5">
                <Skeleton className="h-3.5 w-4/5 rounded-none" />
                <Skeleton className="h-3 w-full rounded-none" />
              </div>
            </div>
          </SitePanelBody>
        </SitePanel>
      }
      main={
        <>
          <SitePanel>
            <SitePanelBody className="space-y-4">
              <Skeleton className="h-5 w-12 rounded-none" />
              <Skeleton className="h-4 w-full max-w-[32rem] rounded-none" />
              <Skeleton className="min-h-32 w-full rounded-[1rem]" />
              <Skeleton className="h-10 w-full rounded-none" />
              <Skeleton className="min-h-[120px] w-full rounded-none" />
            </SitePanelBody>
          </SitePanel>
          <SitePanel>
            <SitePanelBody className="flex flex-wrap justify-end gap-3">
              <Skeleton className="h-10 w-20 rounded-none" />
              <Skeleton className="h-10 w-32 rounded-none" />
            </SitePanelBody>
          </SitePanel>
        </>
      }
    />
  );
}

export function PublishAircraftPageSkeleton() {
  return (
    <PublishShellSkeleton
      gridClassName="xl:grid-cols-[minmax(0,1fr)_22rem]"
      shellClassName="mx-auto w-full max-w-[76rem] gap-4"
      aside={
        <SitePanel variant="muted">
          <SitePanelBody className="space-y-4">
            <Skeleton className="h-3 w-20 rounded-none uppercase tracking-[0.18em]" />
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <Skeleton className="h-6 w-3/4 rounded-none" />
            <div className="space-y-2 border-t border-border/60 pt-3">
              <Skeleton className="h-4 w-full rounded-none" />
              <Skeleton className="h-4 w-5/6 rounded-none" />
              <Skeleton className="h-3 w-2/3 rounded-none" />
            </div>
          </SitePanelBody>
        </SitePanel>
      }
      main={
        <>
          <SitePanel>
            <SitePanelBody className="space-y-4">
              <Skeleton className="h-3 w-32 rounded-none" />
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,13.5rem)] md:items-start">
                <Skeleton className="aspect-[4/3] min-h-[12rem] w-full rounded-[0.95rem] sm:min-h-[14rem]" />
                <div className="space-y-2 md:border-l md:border-border/50 md:pl-4">
                  <Skeleton className="h-4 w-40 rounded-none" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-9 w-24 rounded-none" />
                    <Skeleton className="h-4 w-16 rounded-none" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-20 w-20 rounded-md" />
                    <Skeleton className="h-20 w-20 rounded-md" />
                  </div>
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>
          <SitePanel>
            <SitePanelBody className="space-y-5">
              <Skeleton className="h-3 w-28 rounded-none" />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 rounded-none" />
                  <Skeleton className="h-10 w-full rounded-none" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 rounded-none" />
                  <Skeleton className="h-10 w-full rounded-none" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16 rounded-none" />
                  <Skeleton className="h-10 w-full rounded-none" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 rounded-none" />
                  <Skeleton className="h-10 w-full rounded-none" />
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>
          <SitePanel>
            <SitePanelBody className="flex flex-wrap justify-end gap-3">
              <Skeleton className="h-10 w-28 rounded-none" />
              <Skeleton className="h-10 w-36 rounded-none" />
            </SitePanelBody>
          </SitePanel>
        </>
      }
    />
  );
}

export function PublishBrandPageSkeleton() {
  return (
    <PublishShellSkeleton
      aside={
        <SitePanel variant="highlight">
          <SitePanelBody className="space-y-4">
            <Skeleton className="size-6 rounded-none" />
            <Skeleton className="h-6 w-48 rounded-none" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded-none" />
              <Skeleton className="h-4 w-11/12 rounded-none" />
            </div>
          </SitePanelBody>
        </SitePanel>
      }
      main={
        <>
          <SitePanel>
            <SitePanelBody className="space-y-5">
              <div className="grid gap-4 md:grid-cols-[144px_minmax(0,1fr)] md:items-stretch">
                <Skeleton className="min-h-36 w-full rounded-[1rem] md:h-full md:min-h-0" />
                <div className="min-w-0 space-y-4">
                  <Skeleton className="h-10 w-full rounded-none" />
                  <Skeleton className="h-10 w-full rounded-none" />
                </div>
              </div>
              <Skeleton className="min-h-36 w-full rounded-none" />
            </SitePanelBody>
          </SitePanel>
          <SitePanel>
            <SitePanelBody className="flex flex-wrap justify-end gap-3">
              <Skeleton className="h-10 w-40 rounded-none" />
              <Skeleton className="h-10 w-36 rounded-none" />
            </SitePanelBody>
          </SitePanel>
        </>
      }
    />
  );
}

/** 投稿结果页（aircraft 拉取中）与 [publish-status-page.tsx](publish-status-page.tsx) 成功态栅格对齐 */
export function PublishStatusPageSkeleton() {
  return (
    <PublishShellSkeleton
      aside={
        <SitePanel variant="muted">
          <SitePanelBody className="space-y-4">
            <Skeleton className="size-6 rounded-none" />
            <Skeleton className="h-6 w-36 rounded-none" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded-none" />
              <Skeleton className="h-4 w-11/12 rounded-none" />
            </div>
            <Skeleton className="h-16 w-full rounded-[0.85rem]" />
          </SitePanelBody>
        </SitePanel>
      }
      main={
        <SitePanel>
          <SitePanelBody className="grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
            <Skeleton className="min-h-[220px] w-full rounded-[0.9rem]" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-40 rounded-full" />
              <Skeleton className="h-10 w-full max-w-[24rem] rounded-none" />
              <Skeleton className="h-4 w-full rounded-none" />
              <Skeleton className="h-4 w-5/6 rounded-none" />
              <div className="flex flex-wrap gap-3">
                <Skeleton className="h-10 w-32 rounded-none" />
                <Skeleton className="h-10 w-28 rounded-none" />
              </div>
            </div>
          </SitePanelBody>
        </SitePanel>
      }
    />
  );
}

export function RankingEditorPageSkeleton() {
  return (
    <PublishShellSkeleton
      aside={
        <SitePanel variant="muted">
          <SitePanelBody className="space-y-4">
            <Skeleton className="h-3 w-16 rounded-none uppercase tracking-[0.18em]" />
            <Skeleton className="h-[220px] w-full rounded-[0.95rem]" />
            <Skeleton className="h-7 w-full rounded-none" />
            <div className="space-y-3 border-t border-border/60 pt-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="border-b border-border/60 pb-3 last:border-b-0" key={index}>
                  <Skeleton className="h-4 w-4/5 rounded-none" />
                  <Skeleton className="mt-1 h-3 w-1/2 rounded-none" />
                </div>
              ))}
            </div>
          </SitePanelBody>
        </SitePanel>
      }
      main={
        <>
          <SitePanel>
            <SitePanelBody className="space-y-4">
              <Skeleton className="h-5 w-40 rounded-none" />
              <Skeleton className="h-10 w-full rounded-none" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40 rounded-none" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-8 w-28 rounded-full" />
                  <Skeleton className="h-8 w-36 rounded-full" />
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>
          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-28 rounded-none" />
                <Skeleton className="h-9 w-36 rounded-none" />
              </div>
              <div className="rounded-[0.9rem] border border-border/70 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-16 rounded-none" />
                  <div className="flex gap-1.5">
                    <Skeleton className="size-8 rounded-none" />
                    <Skeleton className="size-8 rounded-none" />
                  </div>
                </div>
                <Skeleton className="mt-3 h-10 w-full rounded-none" />
                <Skeleton className="mt-2 h-10 w-full rounded-none" />
              </div>
              <Skeleton className="h-40 w-full rounded-[0.85rem]" />
            </SitePanelBody>
          </SitePanel>
          <SitePanel>
            <SitePanelBody className="flex flex-wrap justify-end gap-3">
              <Skeleton className="h-10 w-24 rounded-none" />
              <Skeleton className="h-10 w-36 rounded-none" />
            </SitePanelBody>
          </SitePanel>
        </>
      }
    />
  );
}
