import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { EyeIcon, HeartIcon, MessageCircleIcon, TrophyIcon } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BrandIdentity } from "@/components/brand-identity";
import { ModelThumbCover } from "@/components/model-thumb-cover";
import { FeedStreamSkeleton } from "@/components/page-skeletons";
import { SiteGrid, SitePage, SitePanel, SitePanelBody, SiteRail } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VirtualFeed } from "@/components/virtual-feed";
import { useHomeTabStore, type HomeTabState } from "@/store/home-tab-store";
import { getEditorialImage } from "../lib/aviation-media";
import { apiClient } from "../lib/api-client";
import { DETAIL_PAGE_LINK_PROPS } from "../lib/web-routes";
import { cn } from "../lib/utils";
import { useAuthStore } from "../features/auth/auth-store";
import { mergeRankingsByTab } from "./rankings-page-helpers";

const fixedTabs = [
  { id: "recommended", label: "推荐" },
  { id: "latest", label: "最新" },
  { id: "following", label: "关注" }
] as const;

type HomeFeedItem = Awaited<ReturnType<typeof apiClient.listHomeFeed>>["items"][number];

function formatCount(value: number) {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1).replace(/\.0$/, "")}w`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return String(value);
}

function HomeFeedCard({ item, index }: { item: HomeFeedItem; index: number }) {
  return (
    <article className="bg-white px-3 py-2.5 transition duration-200 hover:bg-sky-50/55">
      <Link
        className="grid grid-cols-[minmax(0,1fr)_148px] items-start gap-3"
        {...DETAIL_PAGE_LINK_PROPS}
        to={APP_ROUTES.postDetail.replace(":id", item.id)}
      >
        <div className="flex min-h-[96px] min-w-0 flex-col">
          <div className="flex items-start gap-2">
            <h2 className="line-clamp-2 max-w-[30rem] text-[1rem] leading-[1.25] font-semibold text-foreground">
              {item.title}
            </h2>
            {item.author.role === "admin" ? <Badge variant="secondary">官方</Badge> : null}
          </div>

          <p className="mt-1 line-clamp-2 max-w-[34rem] text-[0.82rem] leading-[1.35rem] text-foreground/72">
            {item.contentPreview}
          </p>

          <div className="mt-auto flex items-center gap-3.5 pt-2.5 text-[0.76rem] text-foreground/68">
            <span className="inline-flex items-center gap-1.5">
              <HeartIcon className="size-3.5" />
              {formatCount(item.engagement.likeCount)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircleIcon className="size-3.5" />
              {formatCount(item.commentCount)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <EyeIcon className="size-3.5" />
              {formatCount(item.viewCount)}
            </span>
          </div>
        </div>

        <div className="shrink-0 overflow-hidden bg-slate-100">
          <img
            alt={item.title}
            className="h-[96px] w-full object-cover"
            src={item.images[0]?.url ?? getEditorialImage(item.id, index)}
          />
        </div>
      </Link>
    </article>
  );
}

export function HomePage() {
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated";
  const activeTab = useHomeTabStore((state) => state.activeTab);
  const setActiveTab = useHomeTabStore((state) => state.setActiveTab);

  const feedQuery = useQuery({
    queryKey: [
      "home-shell-feed",
      activeTab.kind === "fixed" ? activeTab.id : "recommended",
      activeTab.kind === "category" ? activeTab.slug : null
    ],
    placeholderData: keepPreviousData,
    queryFn: () =>
      apiClient.listHomeFeed({
        tab: activeTab.kind === "fixed" ? activeTab.id : "recommended",
        categorySlug: activeTab.kind === "category" ? activeTab.slug : undefined
      })
  });

  const modelsQuery = useQuery({
    queryKey: ["home-shell-models"],
    placeholderData: keepPreviousData,
    queryFn: () =>
      apiClient.listModels({
        sort: "hot",
        limit: 3
      })
  });

  const rankingsQuery = useQuery({
    queryKey: ["home-shell-rankings"],
    placeholderData: keepPreviousData,
    queryFn: () => apiClient.listRankings()
  });

  const feedItems = feedQuery.data?.items ?? [];
  const contentCategories = useMemo(() => feedQuery.data?.categories ?? [], [feedQuery.data?.categories]);
  const hotModels = modelsQuery.data?.items ?? [];
  const rankingCards = useMemo(
    () => (rankingsQuery.data ? mergeRankingsByTab(rankingsQuery.data).hot.slice(0, 2) : []),
    [rankingsQuery.data]
  );

  const allTabs = useMemo(
    () => [
      ...fixedTabs.map((tab) => ({
        key: `fixed:${tab.id}`,
        label: tab.label,
        state: { kind: "fixed", id: tab.id } as HomeTabState
      })),
      ...contentCategories.map((item) => ({
        key: `category:${item.slug}`,
        label: item.name,
        state: { kind: "category", slug: item.slug } as HomeTabState
      }))
    ],
    [contentCategories]
  );

  function isActive(tab: HomeTabState) {
    if (tab.kind !== activeTab.kind) {
      return false;
    }

    if (tab.kind === "fixed") {
      return activeTab.kind === "fixed" && tab.id === activeTab.id;
    }

    return activeTab.kind === "category" && tab.slug === activeTab.slug;
  }

  const isFeedLoading = feedQuery.isLoading && !feedQuery.data;
  const isModelsLoading = modelsQuery.isLoading && !modelsQuery.data;
  const isRankingsLoading = rankingsQuery.isLoading && !rankingsQuery.data;

  return (
    <SitePage>
      <SiteGrid className="items-start gap-4" variant="sidebar">
        <div className="mx-auto w-full max-w-[920px] min-w-0">
          <div className="border-b border-border px-1">
            <div className="flex gap-5 overflow-x-auto whitespace-nowrap">
              {allTabs.map((tab) => (
                <button
                  className={cn(
                    "site-tab-trigger relative border-b-2 border-transparent px-0 py-2.5 text-[0.9rem] text-foreground/70 transition-colors",
                    isActive(tab.state) && "border-primary font-semibold text-primary"
                  )}
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.state);
                  }}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <section className="site-tab-panel relative mt-2.5 overflow-hidden bg-white">
              {feedQuery.isError ? (
                <Alert variant="destructive">
                <AlertTitle>首页内容加载失败</AlertTitle>
                <AlertDescription>{feedQuery.error.message}</AlertDescription>
              </Alert>
            ) : null}

            {isFeedLoading ? (
              <div className="p-3">
                <FeedStreamSkeleton rows={4} />
              </div>
            ) : (
              <VirtualFeed
                className="!border-0 bg-transparent"
                data={feedItems}
                emptyState={
                  !feedQuery.isError ? (
                    <Alert className="rounded-none border-0 shadow-none">
                      <AlertTitle>首页还没有公开内容</AlertTitle>
                      <AlertDescription>
                        {isAuthenticated
                          ? "你可以先发布一篇内容。"
                          : "登录后可发布动态和文章。"}
                      </AlertDescription>
                    </Alert>
                  ) : null
                }
                itemKey={(item) => item.id}
                refetchFooterLabel="更新中…"
                renderItem={(item, index) => <HomeFeedCard index={index} item={item} />}
                showRefetchFooter={feedQuery.isRefetching}
                useWindowScroll
              />
            )}
          </section>
        </div>

        <SiteRail className="space-y-2">
          <SitePanel className="bg-white backdrop-blur-none">
            <SitePanelBody className="space-y-2.5">
              <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                <TrophyIcon className="size-4.5 text-primary" />
                热门榜单
              </div>
              {isRankingsLoading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div className="space-y-2" key={index}>
                      <Skeleton className="h-4 w-4/5 rounded-none" />
                      <Skeleton className="h-3.5 w-3/5 rounded-none" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {rankingCards.map((ranking) => (
                    <Link
                      className="block border-b border-border pb-2.5 last:border-b-0"
                      key={ranking.id}
                      {...DETAIL_PAGE_LINK_PROPS}
                      to={APP_ROUTES.rankingDetail.replace(":id", ranking.id)}
                    >
                      <div className="text-sm font-semibold text-foreground">{ranking.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {ranking.items.slice(0, 2).map((item) => item.title).join(" / ")}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </SitePanelBody>
          </SitePanel>

          <SitePanel className="bg-white backdrop-blur-none">
            <SitePanelBody className="space-y-2.5">
              <div className="text-base font-semibold text-foreground">热门机型</div>
              {isModelsLoading ? (
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
              ) : (
                hotModels.map((model, index) => (
                  <Link
                    className="grid grid-cols-[58px_minmax(0,1fr)] items-center gap-2.5 rounded-[calc(var(--radius-control)-0.05rem)] border border-transparent p-1.5 transition hover:border-primary/18 hover:bg-background"
                    key={model.id}
                    {...DETAIL_PAGE_LINK_PROPS}
                    to={APP_ROUTES.modelDetail.replace(":slug", model.slug)}
                  >
                    <ModelThumbCover
                      alt={model.name}
                      className="h-[58px] w-full rounded-[calc(var(--radius-control)-0.15rem)]"
                      coverImageUrl={model.coverImageUrl ?? null}
                      coverVideoUrl={model.coverVideoUrl ?? null}
                      index={index}
                      slug={model.slug}
                      powerType={model.powerType}
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="truncate text-[0.84rem] font-semibold text-foreground">{model.name}</div>
                      <BrandIdentity
                        className="min-w-0 text-[0.72rem] text-muted-foreground"
                        imageClassName="size-3.5 shrink-0"
                        logoUrl={model.brand.logoUrl}
                        name={model.brand.name}
                      />
                      <div className="flex items-center gap-3 text-[0.72rem] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <HeartIcon className="size-3.5" />
                          {formatCount(model.favoriteCount)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircleIcon className="size-3.5" />
                          {formatCount(model.commentCount)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </SitePanelBody>
          </SitePanel>
        </SiteRail>
      </SiteGrid>
    </SitePage>
  );
}
