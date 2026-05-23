import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { APP_ROUTES, buildLoginRedirectUrl, resolveSafeRedirectPath } from "@feijia/shared";
import { SitePage } from "@/components/site-shell";
import { useAuthStore } from "@/features/auth/auth-store";
import { CreateCircleModal } from "@/features/circles/create-circle-modal";
import { CreatePostModal } from "@/features/circles/create-post-modal";
import { apiClient } from "@/lib/api-client";
import { resolveFeedNextCursor } from "@/lib/feed-pagination";
import { CirclePageFeed, feedTabs, type CircleFeedItem, type CircleFeedTab, type FeedTab } from "./circle-page-feed";
import { RecommendedCirclesStrip } from "./recommended-circles-strip";

function formatCount(value: number) {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1).replace(/\.0$/, "")}w`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return String(value);
}

export function CirclePage() {
  const navigate = useNavigate();
  const authStatus = useAuthStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<FeedTab>(() => {
    const tab = readTabFromURL();
    return tab && feedTabs.some(t => t.id === tab) ? (tab as FeedTab) : "recommended";
  });

  function readTabFromURL(): string | null {
    return new URLSearchParams(window.location.search).get("tab");
  }

  function syncTabURL(tab: string | null) {
    const params = new URLSearchParams(window.location.search);
    if (tab) {
      params.set("tab", tab);
    } else {
      params.delete("tab");
    }
    const search = params.toString();
    const url = search
      ? `${window.location.pathname}?${search}`
      : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  // 响应浏览器前进/后退时同步 URL 状态
  useEffect(() => {
    function handlePopState() {
      const tabFromURL = readTabFromURL();
      if (tabFromURL && feedTabs.some(t => t.id === tabFromURL)) {
        setActiveTab(tabFromURL as FeedTab);
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // ── 关注圈子列表（REQ-007） ──
  const userCirclesQuery = useQuery({
    queryKey: ["user-circles", currentUser?.id],
    queryFn: () => apiClient.listUserCircles(currentUser!.id),
    enabled: authStatus === "authenticated" && Boolean(currentUser?.id),
  });
  const userCircles = useMemo(() => {
    const items = (userCirclesQuery.data?.items ?? []) as Array<{
      id: string;
      slug: string;
      name: string;
      memberCount: number;
      postCount: number;
      coverImageUrl: string | null;
    }>;
    return items;
  }, [userCirclesQuery.data?.items]);

  /** 关注圈子 Tab 列表 */
  const circleTabs = useMemo<CircleFeedTab[]>(() => {
    if (userCircles.length === 0) return [];
    return userCircles.map((c) => ({
      id: `circle-${c.id}`,
      label: c.name,
      circleId: c.id,
      circleSlug: c.slug,
    }));
  }, [userCircles]);

  const [activeCircleTabId, setActiveCircleTabId] = useState<string | null>(null);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);

  // 获取选中圈子的帖子
  const circlePostsQuery = useQuery({
    queryKey: ["circle-posts", selectedCircleId],
    queryFn: () => apiClient.listCirclePosts(selectedCircleId!, { tab: "latest" }),
    enabled: Boolean(selectedCircleId),
  });

  // ── 主 Feed 查询 ──
  const feedApiTab = activeTab;
  const circleFeedQuery = useInfiniteQuery({
    queryKey: ["circle-feed", feedApiTab],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiClient.listCircleFeed(feedApiTab, {
        cursor: pageParam,
        limit: 20
      }),
    getNextPageParam: (lastPage) => resolveFeedNextCursor(lastPage),
    enabled: true
  });

  const posts = useMemo<CircleFeedItem[]>(
    () => circleFeedQuery.data?.pages.flatMap((feedPage) => feedPage.items) ?? [],
    [circleFeedQuery.data?.pages]
  );

  const isFeedLoading = circleFeedQuery.isLoading && !circleFeedQuery.data;
  const isFeedRefetching = circleFeedQuery.isRefetching;
  const isFeedError = circleFeedQuery.isError && !circleFeedQuery.data;
  const isFeedNextPageError = circleFeedQuery.isFetchNextPageError && posts.length > 0;
  const feedErrorMessage = circleFeedQuery.error instanceof Error ? circleFeedQuery.error.message : undefined;
  const hasMoreFeedItems = Boolean(circleFeedQuery.hasNextPage);
  const isFetchingNextFeedPage = circleFeedQuery.isFetchingNextPage;

  function handleNavigateToLogin() {
    void navigate(
      buildLoginRedirectUrl(APP_ROUTES.webLogin, {
        pathname: resolveSafeRedirectPath({
          candidate: window.location.pathname + window.location.search,
          fallbackPath: APP_ROUTES.feedHome,
          blockedPaths: [APP_ROUTES.webLogin]
        })
      })
    );
  }

  /**
   * 卡片点击导航——优先使用 circle.slug，降级使用 source.url，兜底静默。
   * REQ-005：点击卡片导航到圈子详情页。
   */
  function handleCardClick(post: CircleFeedItem) {
    // 1. 优先使用帖子关联的圈子 slug
    if (post.circle?.slug) {
      void navigate(APP_ROUTES.circleDetail.replace(":slug", post.circle.slug));
      return;
    }
    // 2. 降级：从 source.url 提取圈子路径
    if (post.source?.url?.startsWith("/circles/")) {
      const slug = post.source.url.replace("/circles/", "").split("/")[0];
      if (slug) {
        void navigate(APP_ROUTES.circleDetail.replace(":slug", slug));
        return;
      }
    }
    // 3. 无圈子信息时静默（不抛异常）
  }

  /** 切换关注圈子 Tab */
  function handleChangeCircleTab(tabId: string) {
    setActiveCircleTabId(tabId);
    const circleTab = circleTabs.find((t) => t.id === tabId);
    if (circleTab) {
      setSelectedCircleId(circleTab.circleId);
    } else {
      setSelectedCircleId(null);
    }
  }

  return (
    <SitePage className="gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">飞友圈</h2>
      </div>

      <RecommendedCirclesStrip />

      <CirclePageFeed
        activeTab={activeTab}
        onChangeTab={(tab) => { setActiveTab(tab); syncTabURL(tab); }}
        posts={posts}
        onCardClick={handleCardClick}
        isLoading={isFeedLoading}
        isRefetching={isFeedRefetching}
        isFetchingNextPage={isFetchingNextFeedPage}
        isError={isFeedError}
        errorMessage={feedErrorMessage}
        isLoadMoreError={isFeedNextPageError}
        loadMoreErrorMessage={isFeedNextPageError ? feedErrorMessage : undefined}
        hasMore={hasMoreFeedItems}
        onLoadMore={() => {
          void circleFeedQuery.fetchNextPage();
        }}
        formatCount={formatCount}
        authStatus={authStatus}
        onNavigateToLogin={handleNavigateToLogin}
        circleTabs={circleTabs}
        activeCircleTabId={activeCircleTabId}
        onChangeCircleTab={handleChangeCircleTab}
        circleTabPosts={circlePostsQuery.data?.items ?? []}
        isCircleTabLoading={circlePostsQuery.isLoading}
        circleTabError={circlePostsQuery.error instanceof Error ? circlePostsQuery.error : null}
        circleTabsSelectorProps={
          userCircles.length > 0
            ? {
                circles: userCircles.map(c => ({
                  id: c.id,
                  slug: c.slug,
                  name: c.name,
                  memberCount: c.memberCount,
                  postCount: c.postCount,
                  coverImageUrl: c.coverImageUrl,
                })),
                selectedCircleId,
                onSelectCircle: setSelectedCircleId,
                isLoading: userCirclesQuery.isLoading,
              }
            : undefined
        }
      />

      <CreateCircleModal onCreated={() => { void userCirclesQuery.refetch(); }} />
      <CreatePostModal onCreated={() => { void circleFeedQuery.refetch(); }} />
    </SitePage>
  );
}
