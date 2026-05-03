import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { APP_ROUTES, buildLoginRedirectUrl, resolveSafeRedirectPath } from "@feijia/shared";
import type { RankingListItem } from "@feijia/schemas";
import { EyeIcon, Flame, HeartIcon, LockKeyholeIcon, MessageCircleIcon, TrophyIcon } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandIdentity } from "@/components/brand-identity";
import { FeedRefetchFooter } from "@/components/feed-refetch-footer";
import { ModelThumbCover } from "@/components/model-thumb-cover";
import { FeedStreamSkeleton } from "@/components/page-skeletons";
import { IpLocationText } from "@/components/ip-location-text";
import { ProfileLink } from "@/components/profile-link";
import { SiteGrid, SitePage, SitePanel, SitePanelBody, SiteRail } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VirtualFeed } from "@/components/virtual-feed";
import { TAILWIND_XL_MEDIA, useMatchMedia } from "@/hooks/use-match-media";
import { useHomeTabStore, type HomeTabState } from "@/store/home-tab-store";
import { getEditorialImage } from "../lib/aviation-media";
import {
  combineHomeFeedRequestSignal,
  getHomeFeedQueryKey,
  getHomeFeedErrorDescription,
  HOME_FEED_FETCH_TIMEOUT_MS,
  HOME_FEED_QUERY_GC_TIME_MS,
  HOME_FEED_QUERY_STALE_TIME_MS,
  normalizeHomeFeedCategorySlug,
  resolveHomeFeedPlaceholderData
} from "../lib/home-feed-query";
import { apiClient } from "../lib/api-client";
import { resolveFeedNextCursor } from "../lib/feed-pagination";
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

type HomeFeedPage = Awaited<ReturnType<typeof apiClient.listHomeFeed>>;

function formatCount(value: number) {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1).replace(/\.0$/, "")}w`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return String(value);
}

type HomeModelListItem = Awaited<ReturnType<typeof apiClient.listModels>>["items"][number];

function HomeRailPanels({
  rankingCards,
  isRankingsLoading,
  hotModels,
  isModelsLoading
}: {
  rankingCards: RankingListItem[];
  isRankingsLoading: boolean;
  hotModels: HomeModelListItem[];
  isModelsLoading: boolean;
}) {
  return (
    <>
      <SitePanel className="bg-white backdrop-blur-none">
        <SitePanelBody className="space-y-2.5">
          <div className="flex items-center gap-2 text-base font-semibold text-foreground">
            <TrophyIcon className="size-4.5 text-amber-600 dark:text-amber-400" />
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
          <div className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Flame className="size-4.5 text-orange-600 dark:text-orange-400" />
            热门机型
          </div>
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
    </>
  );
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

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] text-muted-foreground">
            <ProfileLink className="hover:text-foreground" userId={item.author.id}>
              {item.author.displayName}
            </ProfileLink>
            <IpLocationText label={item.author.ipLocationLabel} variant="plain" />
          </div>

          {item.source ? (
            <div className="mt-1 text-[0.72rem] text-muted-foreground">
              来源：
              {item.source.url ? (
                <span
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    window.open(item.source?.url ?? "", "_blank", "noopener,noreferrer");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      window.open(item.source?.url ?? "", "_blank", "noopener,noreferrer");
                    }
                  }}
                  role="link"
                  tabIndex={0}
                >
                  {item.source.label}
                </span>
              ) : (
                <span className="text-foreground/78">{item.source.label}</span>
              )}
            </div>
          ) : null}

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
  const navigate = useNavigate();
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated";
  const activeTab = useHomeTabStore((state) => state.activeTab);
  const setActiveTab = useHomeTabStore((state) => state.setActiveTab);
  const feedTab = activeTab.kind === "category" ? "recommended" : activeTab.id;
  const categorySlug = activeTab.kind === "category" ? activeTab.slug : undefined;
  const normalizedCategorySlug = normalizeHomeFeedCategorySlug(categorySlug);
  const homeFeedQueryKey = getHomeFeedQueryKey(feedTab, normalizedCategorySlug);
  const homeFeedQuery = useInfiniteQuery({
    queryKey: homeFeedQueryKey,
    staleTime: HOME_FEED_QUERY_STALE_TIME_MS,
    gcTime: HOME_FEED_QUERY_GC_TIME_MS,
    placeholderData: (previousData, previousQuery) =>
      resolveHomeFeedPlaceholderData(previousData, previousQuery, homeFeedQueryKey),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      apiClient.listHomeFeed(
        {
          tab: feedTab,
          categorySlug: normalizedCategorySlug ?? undefined,
          cursor: pageParam,
          limit: 20
        },
        { signal: combineHomeFeedRequestSignal(signal) }
      ),
    getNextPageParam: (lastPage: HomeFeedPage) => resolveFeedNextCursor(lastPage)
  });

  const contentCategoriesQuery = useQuery({
    queryKey: ["home-content-categories"],
    staleTime: HOME_FEED_QUERY_STALE_TIME_MS,
    gcTime: HOME_FEED_QUERY_GC_TIME_MS,
    placeholderData: keepPreviousData,
    queryFn: () => apiClient.listContentCategories()
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

  const feedItems = homeFeedQuery.data?.pages.flatMap((feedPage) => feedPage.items) ?? [];
  const feedContentCategories = homeFeedQuery.data?.pages[0]?.categories ?? [];
  const contentCategories = contentCategoriesQuery.data?.items ?? feedContentCategories;
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

  const isFeedLoading = homeFeedQuery.isLoading && !homeFeedQuery.data;
  const isFeedError = homeFeedQuery.isError && !homeFeedQuery.data;
  const isFeedNextPageError = homeFeedQuery.isFetchNextPageError && feedItems.length > 0;
  const feedError = homeFeedQuery.error;
  const isFeedRefetching = homeFeedQuery.isRefetching;
  const hasMoreFeedItems = Boolean(homeFeedQuery.hasNextPage);
  const isFetchingNextFeedPage = homeFeedQuery.isFetchingNextPage;
  const showFeedFooter =
    isFeedNextPageError || isFetchingNextFeedPage || (isFeedRefetching && !isFetchingNextFeedPage);
  const isModelsLoading = modelsQuery.isLoading && !modelsQuery.data;
  const isRankingsLoading = rankingsQuery.isLoading && !rankingsQuery.data;
  const isXlViewport = useMatchMedia(TAILWIND_XL_MEDIA);
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
            {feedTab === "following" && authStatus === "anonymous" ? (
              <div className="bg-white px-5 py-12 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                  <LockKeyholeIcon className="size-5 text-muted-foreground" />
                </div>
                <div className="mt-4 text-base font-semibold text-foreground">
                  登录后查看你关注的创作者
                </div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">
                  登录后即可查看你关注的创作者发布的内容。
                </div>
                <Button
                  className="mt-5"
                  onClick={() => {
                    void navigate(
                      buildLoginRedirectUrl(APP_ROUTES.webLogin, {
                        pathname: resolveSafeRedirectPath({
                          candidate: window.location.pathname + window.location.search,
                          fallbackPath: APP_ROUTES.feedHome,
                          blockedPaths: [APP_ROUTES.webLogin]
                        })
                      })
                    );
                  }}
                  size="sm"
                  type="button"
                  variant="hero"
                >
                  去登录
                </Button>
              </div>
            ) : (
              <>
                {isFeedError ? (
                  <Alert variant="destructive">
                    <AlertTitle>首页内容加载失败</AlertTitle>
                    <AlertDescription>
                      {getHomeFeedErrorDescription(feedError, HOME_FEED_FETCH_TIMEOUT_MS)}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {isFeedLoading ? (
                  <div className="p-3">
                    <FeedStreamSkeleton rows={4} />
                  </div>
                ) : (
                  <>
                    <VirtualFeed
                      className="!border-0 bg-transparent"
                      data={feedItems}
                      hasMore={hasMoreFeedItems}
                      isFetchingNextPage={isFetchingNextFeedPage}
                      onLoadMore={() => {
                        void homeFeedQuery.fetchNextPage();
                      }}
                      emptyState={
                        !isFeedError ? (
                          <Alert className="rounded-none border-0 shadow-none">
                            <AlertTitle>
                              {feedTab === "following"
                                ? "没有关注的创作者发布的内容"
                                : "首页还没有公开内容"}
                            </AlertTitle>
                            <AlertDescription>
                              {feedTab === "following"
                                ? "去关注一些创作者吧。"
                                : isAuthenticated
                                  ? "你可以先发布一篇内容。"
                                  : "登录后可发布动态和文章。"}
                            </AlertDescription>
                          </Alert>
                        ) : null
                      }
                      itemKey={(item) => item.id}
                      renderItem={(item, index) => <HomeFeedCard index={index} item={item} />}
                      useWindowScroll
                    />
                    <FeedRefetchFooter
                      errorMessage={
                        isFeedNextPageError
                          ? `${getHomeFeedErrorDescription(feedError, HOME_FEED_FETCH_TIMEOUT_MS)} 继续上滑将自动重试。`
                          : undefined
                      }
                      label={isFetchingNextFeedPage ? "正在加载更多..." : "加载中..."}
                      show={showFeedFooter}
                      state={isFeedNextPageError ? "error" : "loading"}
                    />
                  </>
                )}
              </>
            )}
          </section>
        </div>

        {isXlViewport ? (
          <SiteRail className="space-y-2">
            <HomeRailPanels
              hotModels={hotModels}
              isModelsLoading={isModelsLoading}
              isRankingsLoading={isRankingsLoading}
              rankingCards={rankingCards}
            />
          </SiteRail>
        ) : null}
      </SiteGrid>
    </SitePage>
  );
}
