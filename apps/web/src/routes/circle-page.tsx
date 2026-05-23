import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  APP_ROUTES,
  buildLoginRedirectUrl,
  resolveSafeRedirectPath,
} from '@feijia/shared';
import { SitePage } from '@/components/site-shell';
import { useAuthStore } from '@/features/auth/auth-store';
import { CreateCircleModal } from '@/features/circles/create-circle-modal';
import { CreatePostModal } from '@/features/circles/create-post-modal';
import { FlatPostItem } from '@/features/circles/flat-post-item';
import type { CircleFeedItem } from '@/features/circles/flat-post-item';
import { XSlidePanel } from '@/features/circles/x-slide-panel';
import { useSlidePanelURLSync } from '@/features/circles/use-slide-panel-url-sync';
import { useSlidePanelStore } from '@/features/circles/use-slide-panel-store';
import { RecommendedCirclesStrip } from './recommended-circles-strip';
import { CircleTabSelector } from './circle-tab-selector';
import { apiClient } from '@/lib/api-client';
import { resolveFeedNextCursor } from '@/lib/feed-pagination';
import { VirtualFeed } from '@/components/virtual-feed';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LockKeyholeIcon } from 'lucide-react';

// ── Tab 定义（仅推荐 + 关注，移除"最新"） ──

const feedTabs = [
  { id: 'recommended', label: '推荐' },
  { id: 'following', label: '关注' },
] as const;

type FeedTab = (typeof feedTabs)[number]['id'];

// ── URL 读写工具 ──

function readTabFromURL(): string | null {
  return new URLSearchParams(window.location.search).get('tab');
}

function syncTabURL(tab: string) {
  const params = new URLSearchParams(window.location.search);
  params.set('tab', tab);
  const search = params.toString();
  const url = search
    ? `${window.location.pathname}?${search}`
    : window.location.pathname;
  window.history.replaceState(null, '', url);
}

// ── 主组件 ──

export function CirclePage() {
  const navigate = useNavigate();
  const authStatus = useAuthStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.user);

  // ── SlidePanel URL 同步（popstate + 初始加载） ──
  useSlidePanelURLSync();

  // ── Tab 状态：从 URL 初始化，切换时同步 URL ──
  const [activeTab, setActiveTab] = useState<FeedTab>(() => {
    const tab = readTabFromURL();
    return tab && feedTabs.some(t => t.id === tab)
      ? (tab as FeedTab)
      : 'recommended';
  });

  // 响应浏览器前进/后退时同步 Tab 状态
  useEffect(() => {
    function handlePopState() {
      const tabFromURL = readTabFromURL();
      if (tabFromURL && feedTabs.some(t => t.id === tabFromURL)) {
        setActiveTab(tabFromURL as FeedTab);
      }
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function handleChangeTab(tab: FeedTab) {
    setActiveTab(tab);
    syncTabURL(tab);
  }

  // ── 已关注圈子查询（关注 Tab 下的横滚条数据） ──
  const userCirclesQuery = useQuery({
    queryKey: ['user-circles', currentUser?.id],
    queryFn: () => apiClient.listUserCircles(currentUser!.id),
    enabled: activeTab === 'following' && authStatus === 'authenticated' && !!currentUser?.id,
  });

  const userCircles = useMemo(
    () => (userCirclesQuery.data?.items ?? []) as Array<{
      id: string;
      slug: string;
      name: string;
      memberCount: number;
      postCount: number;
      coverImageUrl: string | null;
    }>,
    [userCirclesQuery.data?.items]
  );

  // ── 登录引导 ──
  function handleNavigateToLogin() {
    void navigate(
      buildLoginRedirectUrl(APP_ROUTES.webLogin, {
        pathname: resolveSafeRedirectPath({
          candidate:
            window.location.pathname + window.location.search,
          fallbackPath: APP_ROUTES.feedHome,
          blockedPaths: [APP_ROUTES.webLogin],
        }),
      })
    );
  }

  // ── 帖子点击回调 → 打开 SlidePanel ──
  function handlePostClick(postId: string) {
    useSlidePanelStore.getState().open(postId);
  }

  // ── 主 Feed 查询 ──
  const feedApiTab = activeTab;
  const circleFeedQuery = useInfiniteQuery({
    queryKey: ['circle-feed', feedApiTab],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiClient.listCircleFeed(feedApiTab, {
        cursor: pageParam,
        limit: 20,
      }),
    getNextPageParam: (lastPage) => resolveFeedNextCursor(lastPage),
    enabled: true,
  });

  const posts = useMemo<CircleFeedItem[]>(
    () =>
      circleFeedQuery.data?.pages.flatMap(feedPage => feedPage.items) ?? [],
    [circleFeedQuery.data?.pages]
  );

  const isFeedLoading = circleFeedQuery.isLoading && !circleFeedQuery.data;
  const isFeedRefetching = circleFeedQuery.isRefetching;
  const isFeedError = circleFeedQuery.isError && !circleFeedQuery.data;
  const isFeedNextPageError =
    circleFeedQuery.isFetchNextPageError && posts.length > 0;
  const feedErrorMessage =
    circleFeedQuery.error instanceof Error
      ? circleFeedQuery.error.message
      : undefined;
  const hasMoreFeedItems = Boolean(circleFeedQuery.hasNextPage);
  const isFetchingNextFeedPage = circleFeedQuery.isFetchingNextPage;

  // ── 关注流空状态判断 ──
  const isFollowingEmpty =
    activeTab === 'following' &&
    authStatus === 'authenticated' &&
    !isFeedLoading &&
    !isFeedError &&
    posts.length === 0;

  // ── 渲染 ──
  return (
    <SitePage className="gap-0 bg-gray-50">
      {/* SLOT: CircleStrip -- TASK-002 填充，推荐/关注 Tab 内容区顶部圈子横滚条 */}
      {activeTab === 'recommended' ? (
        <div className="w-full max-w-[680px] mx-auto">
          <RecommendedCirclesStrip />
        </div>
      ) : activeTab === 'following' && userCircles.length > 0 ? (
        <div className="w-full max-w-[680px] mx-auto">
          <CircleTabSelector
            circles={userCircles}
            isLoading={userCirclesQuery.isLoading}
            onSelect={() => {}}
            selectedCircleId={null}
          />
        </div>
      ) : null}

      {/* Tab 栏 */}
      <div className="w-full max-w-[680px] mx-auto border-b border-border/60">
        <div className="flex gap-4 px-4" role="tablist">
          {feedTabs.map(tab => (
            <button
              aria-selected={activeTab === tab.id}
              className={`site-tab-trigger border-b-2 px-0 py-2.5 text-[0.92rem] transition-colors ${
                activeTab === tab.id
                  ? 'border-primary font-semibold text-primary'
                  : 'border-transparent text-foreground/62 hover:text-foreground'
              }`}
              key={tab.id}
              onClick={() => handleChangeTab(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 内容区 */}
      <div className="w-full min-w-0 max-w-[680px] mx-auto">
        {/* ── 错误态 ── */}
        {isFeedError ? (
          <Alert className="mx-4 mt-4 rounded-none border-0" variant="destructive">
            <AlertTitle>飞友圈加载失败</AlertTitle>
            <AlertDescription>
              {feedErrorMessage ?? '网络开小差了，请稍后重试。'}
            </AlertDescription>
            <Button
              className="mt-2"
              onClick={() => void circleFeedQuery.refetch()}
              size="sm"
              type="button"
              variant="outline"
            >
              重试
            </Button>
          </Alert>
        ) : null}

        {/* ── 加载骨架屏 ── */}
        {isFeedLoading ? (
          <div className="space-y-0 divide-y divide-border/40">
            {Array.from({ length: 5 }).map((_, i) => (
              <div className="flex gap-3 px-4 py-3 animate-pulse" key={i}>
                <div className="size-10 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-full rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* ── 关注流空状态引导 ── */}
        {isFollowingEmpty ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
              <LockKeyholeIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="mt-4 text-base font-semibold text-foreground">
              你还没有关注任何圈子
            </div>
            <div className="mt-2 text-sm leading-6 text-muted-foreground">
              去推荐流发现感兴趣的圈子吧。
            </div>
            <Button
              className="mt-5"
              onClick={() => handleChangeTab('recommended')}
              size="sm"
              type="button"
              variant="hero"
            >
              去推荐流发现圈子
            </Button>
          </div>
        ) : null}

        {/* ── 未登录关注态引导 ── */}
        {activeTab === 'following' && authStatus === 'anonymous' ? (
          <div className="bg-white px-5 py-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
              <LockKeyholeIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="mt-4 text-base font-semibold text-foreground">
              登录后查看你关注的圈子
            </div>
            <div className="mt-2 text-sm leading-6 text-muted-foreground">
              登录后即可查看你关注的圈子发布的动态。
            </div>
            <Button
              className="mt-5"
              onClick={handleNavigateToLogin}
              size="sm"
              type="button"
              variant="hero"
            >
              去登录
            </Button>
          </div>
        ) : null}

        {/* ── 帖子列表（贴吧式扁平布局） ── */}
        {posts.length > 0 ? (
          <div className="site-tab-panel mt-2 w-full">
            <VirtualFeed
              className="border-0 bg-transparent"
              data={posts}
              hasMore={hasMoreFeedItems}
              isFetchingNextPage={isFetchingNextFeedPage}
              itemKey={(item: CircleFeedItem) => item.id}
              onLoadMore={() => {
                void circleFeedQuery.fetchNextPage();
              }}
              renderItem={(item: CircleFeedItem) => (
                <FlatPostItem
                  key={item.id}
                  onPostClick={handlePostClick}
                  post={item}
                  showSourceCircle
                />
              )}
              refetchFooterErrorMessage={
                isFeedNextPageError
                  ? `${feedErrorMessage ?? '飞友圈加载失败，请稍后重试。'} 继续上滑将自动重试。`
                  : undefined
              }
              refetchFooterLabel={
                isFetchingNextFeedPage ? '正在加载更多...' : '加载中...'
              }
              refetchFooterState={isFeedNextPageError ? 'error' : 'loading'}
              showRefetchFooter={
                isFeedNextPageError ||
                isFetchingNextFeedPage ||
                (isFeedRefetching && !isFetchingNextFeedPage)
              }
              useWindowScroll
            />
          </div>
        ) : null}
      </div>

      {/* SlidePanel -- 帖子详情右侧滑入面板 */}
      <XSlidePanel />
      {/* SLOT: PublishModal -- TASK-005 填充，发帖弹窗 */}
      {/* FAB 发布按钮由全局 WebPublishFab 渲染（web-top-nav.tsx），样式已统一 */}

      <CreateCircleModal
        onCreated={() => {
          void circleFeedQuery.refetch();
        }}
      />
      <CreatePostModal
        onCreated={() => {
          void circleFeedQuery.refetch();
        }}
      />
    </SitePage>
  );
}
