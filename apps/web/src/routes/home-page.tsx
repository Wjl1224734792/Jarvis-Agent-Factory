import { useQuery } from "@tanstack/react-query";
import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  BookmarkIcon,
  CompassIcon,
  EyeIcon,
  HeartIcon,
  MessageCircleIcon,
  Share2Icon,
  SquarePenIcon,
  TrophyIcon
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SiteGrid, SitePage, SitePanel, SitePanelBody, SiteRail } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "../features/auth/auth-store";
import { apiClient } from "../lib/api-client";
import { getEditorialImage, getModelImage } from "../lib/aviation-media";

const fixedTabs = [
  { id: "recommended", label: "推荐" },
  { id: "latest", label: "最新" },
  { id: "following", label: "关注" }
] as const;

type FixedTabId = (typeof fixedTabs)[number]["id"];
type HomeTabState = { kind: "fixed"; id: FixedTabId } | { kind: "category"; slug: string };

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
  const [activeTab, setActiveTab] = useState<HomeTabState>({
    kind: "fixed",
    id: "recommended"
  });

  const feedQuery = useQuery({
    queryKey: [
      "home-shell-feed",
      activeTab.kind === "fixed" ? activeTab.id : "recommended",
      activeTab.kind === "category" ? activeTab.slug : null
    ],
    queryFn: () =>
      apiClient.listHomeFeed({
        tab: activeTab.kind === "fixed" ? activeTab.id : "recommended",
        categorySlug: activeTab.kind === "category" ? activeTab.slug : undefined
      })
  });

  const modelsQuery = useQuery({
    queryKey: ["home-shell-models"],
    queryFn: () => apiClient.listModels()
  });

  const rankingsQuery = useQuery({
    queryKey: ["home-shell-rankings"],
    queryFn: () => apiClient.listRankings()
  });

  const feedItems = feedQuery.data?.items ?? [];
  const contentCategories = feedQuery.data?.categories ?? [];
  const hotModels = modelsQuery.data?.items.slice(0, 3) ?? [];
  const rankingCards = rankingsQuery.data?.community.slice(0, 2) ?? [];

  const allTabs = useMemo(
    () => [
      ...fixedTabs.map((tab) => ({ key: `fixed:${tab.id}`, label: tab.label, state: { kind: "fixed", id: tab.id } as HomeTabState })),
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

  return (
    <SitePage>
      <SiteGrid className="items-start gap-8" variant="sidebar">
        <div className="mx-auto w-full max-w-[980px] min-w-0">
          <div className="border-b border-border/60 px-1">
            <div className="flex gap-7 overflow-x-auto whitespace-nowrap">
              {allTabs.map((tab) => (
                <button
                  className={cn(
                    "relative border-b-2 border-transparent px-0 py-3 text-[0.98rem] text-foreground/68 transition-colors",
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

          <section className="mt-4">
            {feedQuery.isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div className="border-b border-border/60 py-4" key={index}>
                    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                      <div className="h-[140px] animate-pulse rounded-[0.85rem] bg-muted" />
                      <div className="space-y-3">
                        <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                        <div className="flex gap-5 pt-3">
                          {Array.from({ length: 5 }).map((__, metricIndex) => (
                            <div className="h-4 w-12 animate-pulse rounded bg-muted" key={metricIndex} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              : null}

            {feedQuery.isError ? (
              <Alert variant="destructive">
                <AlertTitle>首页内容加载失败</AlertTitle>
                <AlertDescription>{feedQuery.error.message}</AlertDescription>
              </Alert>
            ) : null}

            {feedItems.map((item, index) => (
              <article className="border-b border-border/60 py-4 last:border-b-0" key={item.id}>
                <Link
                  className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-start"
                  to={APP_ROUTES.postDetail.replace(":id", item.id)}
                >
                  <div className="overflow-hidden rounded-[0.9rem] bg-slate-100">
                    <img
                      alt={item.title}
                      className="h-[140px] w-full object-cover md:h-[148px]"
                      src={item.images[0]?.url ?? getEditorialImage(item.id, index)}
                    />
                  </div>

                  <div className="flex min-h-[140px] min-w-0 flex-col">
                    <h2 className="line-clamp-2 max-w-[31rem] text-[1.25rem] leading-[1.25] font-semibold tracking-[-0.03em] text-foreground md:text-[1.45rem]">
                      {item.title}
                    </h2>

                    <p className="mt-2 line-clamp-3 max-w-[36rem] text-[0.94rem] leading-7 text-foreground/72">
                      {item.contentPreview}
                    </p>

                    <div className="mt-auto flex items-center gap-5 pt-4 text-[0.88rem] text-foreground/72">
                      <span className="inline-flex items-center gap-1.5">
                        <HeartIcon className="size-4" />
                        {formatCount(item.engagement.likeCount)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MessageCircleIcon className="size-4" />
                        {formatCount(item.commentCount)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <BookmarkIcon className="size-4" />
                        {formatCount(item.engagement.favoriteCount)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <EyeIcon className="size-4" />
                        {formatCount(
                          articleViewCount(
                            item.engagement.likeCount,
                            item.commentCount,
                            item.engagement.shareCount
                          )
                        )}
                      </span>
                      <span className="ml-auto inline-flex items-center justify-center">
                        <Share2Icon className="size-4.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}

            {!feedQuery.isLoading && !feedQuery.isError && feedItems.length === 0 ? (
              <Alert>
                <AlertTitle>首页还没有公开内容</AlertTitle>
                <AlertDescription>
                  {isAuthenticated
                    ? "可以先切换到飞友圈浏览动态，或直接发布你的第一篇文章。"
                    : `${APP_NAME} 还没有公开内容，登录后可以先发布一条动态。`}
                </AlertDescription>
              </Alert>
            ) : null}
          </section>
        </div>

        <SiteRail className="space-y-4">
          <SitePanel variant="muted">
            <SitePanelBody className="space-y-4">
              <div className="text-lg font-semibold text-foreground">发布入口</div>
              <p className="text-sm leading-7 text-muted-foreground">
                文章、动态、飞行器和榜单分别独立发布，避免混在同一套表单里。
              </p>
              <Button asChild className="w-full" variant="hero">
                <Link to={APP_ROUTES.publishArticle}>
                  <SquarePenIcon data-icon="inline-start" />
                  发布文章
                </Link>
              </Button>
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="muted">
            <SitePanelBody className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <CompassIcon className="size-4.5 text-primary" />
                飞友圈
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                图片优先的动态流和弹窗详情页现在都集中在飞友圈。
              </p>
              <Button asChild className="w-full" size="sm" variant="outline">
                <Link to={APP_ROUTES.flightCircle}>进入飞友圈</Link>
              </Button>
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="muted">
            <SitePanelBody className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <TrophyIcon className="size-4.5 text-primary" />
                热门榜单
              </div>
              <div className="space-y-3">
                {rankingCards.map((ranking) => (
                  <Link
                    className="block border-b border-border/60 pb-3 last:border-b-0"
                    key={ranking.id}
                    to={APP_ROUTES.rankingDetail.replace(":id", ranking.id)}
                  >
                    <div className="text-sm font-semibold text-foreground">{ranking.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {ranking.items
                        .slice(0, 2)
                        .map((item) => item.title)
                        .join(" / ")}
                    </div>
                  </Link>
                ))}
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="muted">
            <SitePanelBody className="space-y-3">
              <div className="text-lg font-semibold text-foreground">飞行器库</div>
              {hotModels.map((model, index) => (
                <Link
                  className="grid grid-cols-[72px_minmax(0,1fr)] gap-3"
                  key={model.id}
                  to={APP_ROUTES.modelDetail.replace(":slug", model.slug)}
                >
                  <img
                    alt={model.name}
                    className="h-[72px] w-full rounded-[0.75rem] object-cover"
                    src={getModelImage(model.slug, model.powerType, index)}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{model.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {model.brand.name} · {model.ratingSummary.averageScore.toFixed(1)}
                    </div>
                  </div>
                </Link>
              ))}
            </SitePanelBody>
          </SitePanel>
        </SiteRail>
      </SiteGrid>
    </SitePage>
  );
}
