import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  CompassIcon,
  EyeIcon,
  HeartIcon,
  MessageCircleIcon,
  SquarePenIcon,
  TrophyIcon
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FeedStreamSkeleton } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteGrid, SitePage, SitePanel, SitePanelBody, SiteRail } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "../features/auth/auth-store";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { useHomeTabStore, type HomeTabState } from "@/store/home-tab-store";
import { apiClient } from "../lib/api-client";
import { getEditorialImage, getModelImage } from "../lib/aviation-media";

const fixedTabs = [
  { id: "recommended", label: "推荐" },
  { id: "latest", label: "最新" },
  { id: "following", label: "关注" }
] as const;

function articleViewCount(likeCount: number, commentCount: number, shareCount: number) {
  return Math.max(likeCount * 12 + commentCount * 8 + shareCount * 10, 18);
}

function formatCount(value: number) {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1).replace(/\.0$/, "")}w`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return String(value);
}

export function HomePage() {
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated";
  const promptLogin = useLoginPrompt();
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
    queryFn: () => apiClient.listModels()
  });

  const rankingsQuery = useQuery({
    queryKey: ["home-shell-rankings"],
    placeholderData: keepPreviousData,
    queryFn: () => apiClient.listRankings()
  });

  const feedItems = feedQuery.data?.items ?? [];
  const contentCategories = useMemo(() => feedQuery.data?.categories ?? [], [feedQuery.data?.categories]);
  const hotModels = modelsQuery.data?.items.slice(0, 3) ?? [];
  const rankingCards = rankingsQuery.data?.community.slice(0, 2) ?? [];

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
  const isFeedRefreshing = feedQuery.isFetching && !isFeedLoading;
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
              <>
                {feedItems.map((item, index) => (
                  <article
                    className="border-b border-border bg-white px-3 py-2.5 transition duration-200 hover:bg-sky-50/55 first:border-t last:border-b-0"
                    key={item.id}
                  >
                    <Link
                      className="grid gap-3 md:grid-cols-[148px_minmax(0,1fr)] md:items-start"
                      to={APP_ROUTES.postDetail.replace(":id", item.id)}
                    >
                      <div className="overflow-hidden bg-slate-100">
                        <img
                          alt={item.title}
                          className="h-[96px] w-full object-cover"
                          src={item.images[0]?.url ?? getEditorialImage(item.id, index)}
                        />
                      </div>

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
                            {formatCount(
                              articleViewCount(
                                item.engagement.likeCount,
                                item.commentCount,
                                item.engagement.shareCount
                              )
                            )}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}

                {!feedQuery.isError && feedItems.length === 0 ? (
                  <Alert className="rounded-none">
                    <AlertTitle>首页还没有公开内容</AlertTitle>
                    <AlertDescription>
                      {isAuthenticated ? "你可以先发布一篇内容。" : "登录后可发布动态和文章。"}
                    </AlertDescription>
                  </Alert>
                ) : null}
              </>
            )}

            {isFeedRefreshing ? (
              <div className="absolute inset-0 z-10 bg-background/78 px-3 py-3 backdrop-blur-[1px]">
                <FeedStreamSkeleton rows={4} />
              </div>
            ) : null}
          </section>
        </div>

        <SiteRail className="space-y-2">
          <SitePanel variant="muted">
            <SitePanelBody className="space-y-2.5">
              <div className="text-base font-semibold text-foreground">发布入口</div>
              <Button asChild className="w-full" variant="hero">
                <Link
                  onClick={(event) => {
                    if (isAuthenticated) {
                      return;
                    }
                    event.preventDefault();
                    promptLogin({
                      title: "登录后才能创建内容",
                      description: "发布文章前请先登录。"
                    });
                  }}
                  to={APP_ROUTES.publishArticle}
                >
                  <SquarePenIcon data-icon="inline-start" />
                  发布文章
                </Link>
              </Button>
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="muted">
            <SitePanelBody className="space-y-2.5">
              <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                <CompassIcon className="size-4.5 text-primary" />
                飞友圈
              </div>
              <Button asChild className="w-full" size="sm" variant="outline">
                <Link to={APP_ROUTES.flightCircle}>进入飞友圈</Link>
              </Button>
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="muted">
            <SitePanelBody className="space-y-2.5">
              <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                <TrophyIcon className="size-4.5 text-primary" />
                热门榜单
              </div>
              {isRankingsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div className="space-y-2 border-b border-border pb-2.5 last:border-b-0" key={index}>
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-3.5 w-3/5" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {rankingCards.map((ranking) => (
                    <Link
                      className="block border-b border-border pb-2.5 last:border-b-0"
                      key={ranking.id}
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

          <SitePanel variant="muted">
            <SitePanelBody className="space-y-2.5">
              <div className="text-base font-semibold text-foreground">热门机型</div>
              {isModelsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div className="grid grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-2.5" key={index}>
                      <Skeleton className="h-[58px] w-full rounded-[calc(var(--radius-control)-0.15rem)]" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-20" />
                        <Skeleton className="h-3 w-14" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                      <Skeleton className="h-5 w-8" />
                    </div>
                  ))}
                </div>
              ) : (
                hotModels.map((model, index) => (
                  <Link
                    className="grid grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[calc(var(--radius-control)-0.05rem)] border border-transparent p-1.5 transition hover:border-primary/18 hover:bg-background"
                    key={model.id}
                    to={APP_ROUTES.modelDetail.replace(":slug", model.slug)}
                  >
                    <img
                      alt={model.name}
                      className="h-[58px] w-full rounded-[calc(var(--radius-control)-0.15rem)] object-cover"
                      src={getModelImage(model.slug, model.powerType, index)}
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="truncate text-[0.84rem] font-semibold text-foreground">{model.name}</div>
                      <div className="text-[0.72rem] text-muted-foreground">{model.brand.name}</div>
                      <div className="text-[0.72rem] text-muted-foreground">{model.reviewSummary.totalReviews} 条评测</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[1.05rem] font-semibold leading-none text-foreground">
                        {model.reviewSummary.totalReviews}
                      </div>
                      <div className="mt-1 text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">评论</div>
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
