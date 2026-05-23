import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { APP_ROUTES } from '@feijia/shared';
import { ArrowLeftIcon, UsersIcon, MessageCircleIcon } from 'lucide-react';
import { SitePage } from '@/components/site-shell';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/features/auth/auth-store';
import { useLoginPrompt } from '@/features/auth/use-login-prompt';
import { CreatePostModal } from '@/features/circles/create-post-modal';
import { FlatPostItem } from '@/features/circles/flat-post-item';
import type { CircleFeedItem } from '@/features/circles/flat-post-item';
import { XSlidePanel } from '@/features/circles/x-slide-panel';
import { useSlidePanelURLSync } from '@/features/circles/use-slide-panel-url-sync';
import { useSlidePanelStore } from '@/features/circles/use-slide-panel-store';
import { apiClient } from '@/lib/api-client';
import { resolveUserAvatarSrc } from '@/lib/avatar-url';
import { VirtualFeed } from '@/components/virtual-feed';

// ── 帖子数据转换：listCirclePosts 返回原始字段，需映射为 CircleFeedItem ──

/**
 * 将 listCirclePosts API 返回的原始帖子对象转换为前端 CircleFeedItem 格式。
 * 与 http-client 中的 mapCircleFeedItem 逻辑一致（因该函数未导出，此处复制）。
 */
function mapCirclePostToFeedItem(raw: Record<string, unknown>): CircleFeedItem {
  const parseJsonArray = (value: unknown): Array<{ url?: string | null }> => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? (parsed as Array<{ url?: string | null }>) : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? (value as Array<{ url?: string | null }>) : [];
  };

  const author = (raw.author ?? {}) as Record<string, unknown>;
  const circle = (raw.circle ?? null) as Record<string, unknown> | null;

  return {
    id: (raw.id as string) ?? '',
    title: (raw.title as string) ?? '',
    contentPreview: (raw.content as string | null) ?? null,
    source: null,
    cover: null,
    images: parseJsonArray(raw.images),
    videos: parseJsonArray(raw.videos),
    author: {
      id: (author.id as string) ?? '',
      displayName: (author.displayName as string) ?? '',
      avatarUrl: (author.avatarUrl as string | null) ?? null,
      ipLocationLabel: (author.ipLocationLabel as string | null) ?? null,
    },
    engagement: {
      likeCount: Number(raw.likeCount) || 0,
      commentCount: Number(raw.commentCount) || 0,
    },
    circle: circle
      ? {
          id: (circle.id as string) ?? '',
          slug: (circle.slug as string) ?? '',
          name: (circle.name as string) ?? '',
        }
      : null,
    createdAt: (raw.createdAt as string | null) ?? null,
  };
}

// ── 每页加载数量 ──

const PAGE_SIZE = 20;

// ── 骨架屏 ──

function CircleDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[680px] px-4">
      {/* 圈子信息骨架 */}
      <div className="animate-pulse rounded-xl border border-border/60 p-6">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-1/3 rounded bg-gray-200" />
            <div className="h-3 w-2/3 rounded bg-gray-200" />
          </div>
        </div>
        <div className="mt-4 flex gap-4">
          <div className="h-4 w-16 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
        </div>
        <div className="mt-4 h-8 w-24 rounded-lg bg-gray-200" />
      </div>

      {/* 帖子列表骨架 */}
      <div className="mt-6 space-y-0 divide-y divide-border/40">
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
    </div>
  );
}

// ── 主组件 ──

/**
 * 圈子详情页。
 *
 * 顶部展示圈子信息（头像/名称/简介/成员数/帖子数/关注按钮），
 * 下方使用 FlatPostItem 渲染帖子列表，点击帖子触发 SlidePanel。
 * 与推荐/关注流保持一致的单列布局（max-w-[680px]）。
 */
export function CircleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const isAuthenticated = useAuthStore((s) => s.status === 'authenticated');
  const promptLogin = useLoginPrompt();

  // ── SlidePanel URL 同步 ──
  useSlidePanelURLSync();

  // ── 圈子详情查询 ──
  const circleQuery = useQuery({
    queryKey: ['circle', slug],
    queryFn: () => apiClient.getCircleDetail(slug!),
    enabled: Boolean(slug),
  });

  const circle = circleQuery.data?.item as Record<string, unknown> | null;
  const circleId = (circle?.id as string) ?? null;

  // ── 帖子列表（offset 分页） ──
  const postsQuery = useInfiniteQuery({
    queryKey: ['circle-posts', circleId],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      apiClient.listCirclePosts(circleId ?? '', {
        tab: 'latest',
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, page) => sum + page.items.length, 0);
      return lastPage.items.length >= PAGE_SIZE ? totalFetched : undefined;
    },
    enabled: Boolean(circleId),
  });

  const posts = useMemo<CircleFeedItem[]>(
    () =>
      postsQuery.data?.pages.flatMap((page) =>
        page.items.map(mapCirclePostToFeedItem)
      ) ?? [],
    [postsQuery.data?.pages]
  );

  // ── 帖子点击 → 打开 SlidePanel ──
  const handlePostClick = useCallback((postId: string) => {
    useSlidePanelStore.getState().open(postId);
  }, []);

  // ── 关注/已关注/圈主 按钮逻辑 ──
  function handleJoinLeave() {
    if (!isAuthenticated) {
      promptLogin({
        title: '登录后才能关注圈子',
        description: '关注圈子前请先登录。',
      });
      return;
    }
    if (!circleId) return;
    void (async () => {
      try {
        if (circle?.viewerRole) {
          await apiClient.leaveCircle(circleId);
        } else {
          await apiClient.joinCircle(circleId);
        }
        void circleQuery.refetch();
      } catch {
        // 静默处理，避免 UI 抖动
      }
    })();
  }

  // ── 加载中：骨架屏 ──
  if (circleQuery.isLoading) {
    return (
      <SitePage className="bg-gray-50">
        <CircleDetailSkeleton />
      </SitePage>
    );
  }

  // ── 错误态 ──
  if (circleQuery.isError) {
    return (
      <SitePage className="bg-gray-50">
        <div className="mx-auto max-w-[680px] px-4 py-12 text-center">
          <p className="text-sm text-red-500">
            {circleQuery.error?.message ?? '加载失败，请稍后重试'}
          </p>
          <Link
            className="mt-3 inline-block text-sm text-primary hover:underline"
            to={APP_ROUTES.flightCircle}
          >
            返回飞友圈
          </Link>
        </div>
      </SitePage>
    );
  }

  // ── 圈子不存在 → 404 ──
  if (!circle) {
    return (
      <SitePage className="bg-gray-50">
        <div className="mx-auto max-w-[680px] px-4 py-12 text-center">
          <p className="text-base font-semibold text-foreground">圈子不存在</p>
          <p className="mt-2 text-sm text-muted-foreground">
            该圈子可能已被删除或不存在。
          </p>
          <Link
            className="mt-4 inline-block text-sm text-primary hover:underline"
            to={APP_ROUTES.flightCircle}
          >
            返回飞友圈
          </Link>
        </div>
      </SitePage>
    );
  }

  // ── 帖子流状态 ──
  const isPostsLoading = postsQuery.isLoading && !postsQuery.data;
  const isPostsRefetching = postsQuery.isRefetching;
  const isPostsError = postsQuery.isError && !postsQuery.data;
  const isPostsNextPageError =
    postsQuery.isFetchNextPageError && posts.length > 0;
  const postsErrorMessage =
    postsQuery.error instanceof Error
      ? postsQuery.error.message
      : undefined;
  const hasMorePosts = Boolean(postsQuery.hasNextPage);
  const isFetchingNextPosts = postsQuery.isFetchingNextPage;

  // ── 关注按钮文案 ──
  function getFollowButtonLabel() {
    if (!isAuthenticated) return '登录后关注';
    const role = circle?.viewerRole as string | undefined;
    if (role === 'owner') return '圈主';
    if (role) return '已关注';
    return (circle?.joinMode as string) === 'free' ? '关注' : '申请加入';
  }

  return (
    <SitePage className="bg-gray-50">
      <div className="mx-auto w-full max-w-[680px]">
        {/* ── 返回导航 ── */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            to={APP_ROUTES.flightCircle}
          >
            <ArrowLeftIcon className="size-4" />
            返回
          </Link>
        </div>

        {/* ── 圈子信息区 ── */}
        <div className="rounded-xl border border-border/60 bg-white p-6">
          <div className="flex items-start gap-4">
            {/* 圈子头像 */}
            <Avatar className="size-16 shrink-0">
              <AvatarImage
                alt={(circle.name as string) ?? ''}
                src={resolveUserAvatarSrc(circle.coverImageUrl as string | null)}
              />
              <AvatarFallback className="text-lg">
                {((circle.name as string) ?? '?')[0]}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              {/* 圈子名称 */}
              <h1 className="text-xl font-bold text-foreground">
                {circle.name as string}
              </h1>

              {/* 圈子简介 */}
              {circle.description ? (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {circle.description as string}
                </p>
              ) : null}

              {/* 统计数据 */}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <UsersIcon className="size-4" />
                  {circle.memberCount as number} 成员
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircleIcon className="size-4" />
                  {circle.postCount as number} 帖子
                </span>
              </div>
            </div>
          </div>

          {/* 关注/已关注按钮 */}
          <div className="mt-4 flex justify-end">
            <Button
              disabled={(circle.viewerRole as string) === 'owner'}
              onClick={handleJoinLeave}
              size="sm"
              variant={
                (circle.viewerRole as string) === 'owner' || circle.viewerRole
                  ? 'outline'
                  : 'hero'
              }
            >
              {getFollowButtonLabel()}
            </Button>
          </div>
        </div>

        {/* ── 帖子列表 ── */}
        <div className="mt-4 min-w-0">
          {/* 错误态 */}
          {isPostsError ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-red-500">
                {postsErrorMessage ?? '帖子加载失败，请稍后重试'}
              </p>
              <Button
                className="mt-2"
                onClick={() => void postsQuery.refetch()}
                size="sm"
                type="button"
                variant="outline"
              >
                重试
              </Button>
            </div>
          ) : null}

          {/* 加载骨架屏 */}
          {isPostsLoading ? (
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

          {/* 空状态 */}
          {!isPostsLoading && posts.length === 0 && !isPostsError ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                暂无帖子，来发第一贴吧
              </p>
            </div>
          ) : null}

          {/* 帖子列表（贴吧式扁平布局） */}
          {posts.length > 0 ? (
            <div className="w-full">
              <VirtualFeed
                className="border-0 bg-transparent"
                data={posts}
                hasMore={hasMorePosts}
                isFetchingNextPage={isFetchingNextPosts}
                itemKey={(item: CircleFeedItem) => item.id}
                onLoadMore={() => {
                  void postsQuery.fetchNextPage();
                }}
                renderItem={(item: CircleFeedItem) => (
                  <FlatPostItem
                    key={item.id}
                    onPostClick={handlePostClick}
                    post={item}
                    showSourceCircle={false}
                  />
                )}
                refetchFooterErrorMessage={
                  isPostsNextPageError
                    ? `${postsErrorMessage ?? '加载失败，请稍后重试。'} 继续上滑将自动重试。`
                    : undefined
                }
                refetchFooterLabel={
                  isFetchingNextPosts ? '正在加载更多...' : '加载中...'
                }
                refetchFooterState={isPostsNextPageError ? 'error' : 'loading'}
                showRefetchFooter={
                  isPostsNextPageError ||
                  isFetchingNextPosts ||
                  (isPostsRefetching && !isFetchingNextPosts)
                }
                useWindowScroll
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* SlidePanel -- 帖子详情右侧滑入面板 */}
      <XSlidePanel />

      {/* 发帖弹窗（预设当前圈子） */}
      <CreatePostModal
        onCreated={() => {
          void postsQuery.refetch();
        }}
        preselectedCircleId={circleId ?? undefined}
        preselectedCircleName={(circle.name as string) ?? undefined}
      />
    </SitePage>
  );
}
