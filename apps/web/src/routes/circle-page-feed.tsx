import { HeartIcon, LockKeyholeIcon, PlayIcon } from "lucide-react";
import { memo, useCallback } from "react";
import { ProfileLink } from "@/components/profile-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { VirtualFeed } from "@/components/virtual-feed";
import { resolveUserAvatarSrc } from "@/lib/avatar-url";
import { getEditorialImage } from "@/lib/aviation-media";
import { CircleTabSelector } from "./circle-tab-selector";

export const feedTabs = [
  { id: "recommended", label: "推荐" },
  { id: "latest", label: "最新" },
  { id: "following", label: "关注" }
] as const;

export type FeedTab = (typeof feedTabs)[number]["id"];

/** 动态 Tab 类型——关注圈子 Tab 使用 */
export type CircleFeedTab = {
  id: string;
  label: string;
  circleId: string;
  circleSlug: string;
};

export type CircleFeedItem = {
  id: string;
  title: string;
  source?: {
    label: string;
    url?: string | null;
  } | null;
  cover?: { url?: string | null } | null;
  images: Array<{ url?: string | null }>;
  videos: Array<{ url?: string | null }>;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    ipLocationLabel?: string | null;
  };
  engagement: {
    likeCount: number;
  };
  /** 圈子信息——circle 帖子 Tab 时填充，主 Feed 可能为空 */
  circle?: {
    id: string;
    slug: string;
    name: string;
  } | null;
};

type CirclePageFeedProps = {
  activeTab: FeedTab;
  onChangeTab: (tab: FeedTab) => void;
  posts: CircleFeedItem[];
  /** 卡片点击回调——改为导航而非弹窗 */
  onCardClick: (post: CircleFeedItem) => void;
  isLoading: boolean;
  isRefetching: boolean;
  isFetchingNextPage: boolean;
  isError: boolean;
  errorMessage?: string;
  isLoadMoreError?: boolean;
  loadMoreErrorMessage?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  formatCount: (value: number) => string;
  authStatus: "idle" | "loading" | "authenticated" | "anonymous";
  onNavigateToLogin: () => void;
  /** 关注圈子 Tab 列表（REQ-007） */
  circleTabs?: CircleFeedTab[];
  /** 当前激活的关注圈子 Tab ID */
  activeCircleTabId?: string | null;
  /** 切换关注圈子 Tab */
  onChangeCircleTab?: (tabId: string) => void;
  /** 关注圈子 Tab 的帖子 */
  circleTabPosts?: CircleFeedItem[];
  /** 关注圈子 Tab 是否加载中 */
  isCircleTabLoading?: boolean;
  /** 关注圈子 Tab 错误 */
  circleTabError?: Error | null;
  /** 关注圈子选择器数据 */
  circleTabsSelectorProps?: {
    circles: Array<{
      id: string;
      slug: string;
      name: string;
      memberCount: number;
      postCount: number;
      coverImageUrl: string | null;
    }>;
    selectedCircleId: string | null;
    onSelectCircle: (circleId: string) => void;
    isLoading: boolean;
  };
};

/**
 * 飞友圈 Feed 单列时间线卡片。
 * 全宽布局，固定 16:9 封面比例，点击导航到圈子详情页。
 */
const CircleFeedCard = memo(function CircleFeedCard(props: {
  item: CircleFeedItem;
  onCardClick: (post: CircleFeedItem) => void;
  formatCount: (value: number) => string;
}) {
  const { item, onCardClick, formatCount } = props;
  const previewImage = item.cover?.url ?? item.images[0]?.url ?? getEditorialImage(item.id, 0);
  const previewVideo = item.videos[0]?.url ?? null;

  return (
    <button
      className="block w-full overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition hover:shadow-md"
      onClick={() => onCardClick(item)}
      type="button"
    >
      <div className="relative w-full aspect-video overflow-hidden bg-slate-100">
        {previewVideo ? (
          <video
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
            src={previewVideo}
          />
        ) : (
          <img
            alt={item.title}
            className="h-full w-full object-cover"
            src={previewImage}
          />
        )}
        {item.videos.length > 0 ? (
          <span className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full bg-black/55 text-white">
            <PlayIcon className="size-4 fill-current" />
          </span>
        ) : null}
      </div>
      <div className="space-y-2 px-4 pb-4 pt-3">
        <h2 className="line-clamp-2 text-[0.92rem] leading-[1.35rem] font-semibold text-foreground">
          {item.title}
        </h2>
        {item.source ? (
          <div className="text-[0.75rem] text-muted-foreground">
            来源：
            {item.source.url ? (
              <span
                className="text-primary underline-offset-4 hover:underline"
                onClick={(event) => {
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
        <div className="flex items-center justify-between gap-2 text-[0.75rem] text-foreground/58">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="size-6" size="sm">
              <AvatarImage alt={item.author.displayName} src={resolveUserAvatarSrc(item.author.avatarUrl)} />
              <AvatarFallback>{item.author.displayName.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <ProfileLink className="block truncate hover:text-foreground" userId={item.author.id}>
                {item.author.displayName}
              </ProfileLink>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1">
            <HeartIcon className="size-3.5" />
            {formatCount(item.engagement.likeCount)}
          </span>
        </div>
      </div>
    </button>
  );
});

CircleFeedCard.displayName = "CircleFeedCard";

function mapCirclePostToFeedItem(post: Record<string, unknown>): CircleFeedItem {
  const parseJsonArray = (value: unknown): unknown[] => {
    if (typeof value === "string") {
      try { return JSON.parse(value) as unknown[]; } catch { return []; }
    }
    return Array.isArray(value) ? value : [];
  };
  const images = parseJsonArray(post.images);
  const videos = parseJsonArray(post.videos);
  const circleSlug = typeof post.circleSlug === "string" ? post.circleSlug : undefined;
  const circleName = typeof post.circleName === "string" ? post.circleName : "";
  return {
    ...post,
    images,
    videos,
    source: circleSlug
      ? { label: circleName, url: `/circles/${circleSlug}` }
      : undefined,
  } as CircleFeedItem;
}

export { mapCirclePostToFeedItem };

export function CirclePageFeed({
  activeTab,
  onChangeTab,
  posts,
  onCardClick,
  isLoading,
  isRefetching,
  isFetchingNextPage,
  isError,
  errorMessage,
  isLoadMoreError = false,
  loadMoreErrorMessage,
  hasMore = false,
  onLoadMore,
  formatCount,
  authStatus,
  onNavigateToLogin,
  circleTabs,
  activeCircleTabId,
  onChangeCircleTab,
  circleTabPosts,
  isCircleTabLoading,
  circleTabError,
  circleTabsSelectorProps
}: CirclePageFeedProps) {
  const showFooter = isLoadMoreError || isFetchingNextPage || (isRefetching && !isFetchingNextPage);

  const feedItemKey = useCallback(
    (item: CircleFeedItem, _index: number) => item.id,
    []
  );
  const feedRenderItem = useCallback(
    (item: CircleFeedItem, _index: number) => (
      <div className="px-4 py-2" key={item.id}>
        <CircleFeedCard
          formatCount={formatCount}
          item={item}
          onCardClick={onCardClick}
        />
      </div>
    ),
    [formatCount, onCardClick]
  );

  /** 判断当前是否在某个圈子 Tab 下 */
  const isCircleTabActive = activeCircleTabId != null && activeTab === "following";

  return (
    <div className="w-full min-w-0">
      {/* Tab 栏 */}
      <div className="border-b border-border/60">
        <div className="flex gap-4 overflow-x-auto whitespace-nowrap px-4">
          {feedTabs.map((tab) => (
            <button
              className={`site-tab-trigger border-b-2 px-0 py-2.5 text-[0.92rem] transition-colors ${
                activeTab === tab.id
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-foreground/62 hover:text-foreground"
              }`}
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
          {/* 关注圈子动态 Tab（REQ-007） */}
          {circleTabs?.map((circleTab) => (
            <button
              className={`site-tab-trigger border-b-2 px-0 py-2.5 text-[0.92rem] transition-colors ${
                activeCircleTabId === circleTab.id
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-foreground/62 hover:text-foreground"
              }`}
              key={circleTab.id}
              onClick={() => onChangeCircleTab?.(circleTab.id)}
              type="button"
            >
              {circleTab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 关注圈子选择器 */}
      {circleTabsSelectorProps && isCircleTabActive && (
        <div className="px-4 pt-3">
          <CircleTabSelector
            circles={circleTabsSelectorProps.circles}
            isLoading={circleTabsSelectorProps.isLoading}
            onSelect={circleTabsSelectorProps.onSelectCircle}
            selectedCircleId={circleTabsSelectorProps.selectedCircleId}
          />
        </div>
      )}

      {/* 关注圈子 Tab 内容 */}
      {isCircleTabActive ? (
        <>
          {isCircleTabLoading ? (
            <div className="space-y-4 px-4 pt-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div className="animate-pulse rounded-2xl bg-white ring-1 ring-black/5" key={i}>
                  <div className="aspect-video w-full rounded-t-2xl bg-slate-200" />
                  <div className="space-y-2 p-4">
                    <div className="h-4 w-3/4 rounded bg-slate-200" />
                    <div className="h-3 w-1/2 rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : circleTabError ? (
            <Alert className="mx-4 mt-4 rounded-none border-0" variant="destructive">
              <AlertTitle>圈子帖子加载失败</AlertTitle>
              <AlertDescription>
                {circleTabError.message ?? "网络开小差了，请稍后重试。"}
              </AlertDescription>
            </Alert>
          ) : (circleTabPosts?.length ?? 0) === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="text-base font-semibold text-foreground">
                该圈子暂无帖子
              </div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                快来发布第一条帖子吧。
              </div>
            </div>
          ) : (
            <VirtualFeed
              className="border-0 bg-transparent"
              data={circleTabPosts ?? []}
              hasMore={false}
              isFetchingNextPage={false}
              itemKey={feedItemKey}
              onLoadMore={undefined}
              renderItem={feedRenderItem}
              useWindowScroll
            />
          )}
        </>
      ) : activeTab === "following" &&
        authStatus === "authenticated" &&
        (!circleTabs || circleTabs.length === 0) &&
        !activeCircleTabId ? (
        /* 未关注任何圈子时的引导提示（REQ-007） */
        <div className="px-5 py-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            <HeartIcon className="size-5 text-muted-foreground" />
          </div>
          <div className="mt-4 text-base font-semibold text-foreground">
            关注圈子查看动态
          </div>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">
            加入感兴趣的圈子，即可在「关注」Tab 下查看圈子专属动态。
          </div>
        </div>
      ) : (activeTab === "following" || activeTab === "latest") &&
        authStatus === "anonymous" ? (
        <div className="bg-white px-5 py-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            <LockKeyholeIcon className="size-5 text-muted-foreground" />
          </div>
          <div className="mt-4 text-base font-semibold text-foreground">
            {activeTab === "following"
              ? "登录后查看你关注的创作者"
              : "登录后浏览最新动态"}
          </div>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">
            {activeTab === "following"
              ? "登录后即可查看你关注的创作者发布的动态。"
              : "登录后即可浏览飞友圈的最新动态。"}
          </div>
          <Button className="mt-5" onClick={onNavigateToLogin} size="sm" type="button" variant="hero">
            去登录
          </Button>
        </div>
      ) : (
        <>
          {isError ? (
            <Alert className="mx-4 mt-4 rounded-none border-0" variant="destructive">
              <AlertTitle>飞友圈加载失败</AlertTitle>
              <AlertDescription>{errorMessage ?? "网络开小差了，请稍后重试。"}</AlertDescription>
            </Alert>
          ) : null}

          {!isLoading && !isError && posts.length === 0 ? (
            <Alert className="mx-4 mt-4 rounded-none border-0">
              <AlertTitle>
                {activeTab === "following"
                  ? "没有关注的创作者发布的动态"
                  : "飞友圈还没有新动态"}
              </AlertTitle>
              <AlertDescription>
                {activeTab === "following"
                  ? "去关注一些创作者吧。"
                  : "先发一条动态试试。"}
              </AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? (
            <div className="space-y-4 px-4 pt-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div className="animate-pulse rounded-2xl bg-white ring-1 ring-black/5" key={i}>
                  <div className="aspect-video w-full rounded-t-2xl bg-slate-200" />
                  <div className="space-y-2 p-4">
                    <div className="h-4 w-3/4 rounded bg-slate-200" />
                    <div className="h-3 w-1/2 rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {posts.length > 0 ? (
            <div className="site-tab-panel mt-2 w-full">
              <VirtualFeed
                className="border-0 bg-transparent"
                data={posts}
                hasMore={hasMore}
                isFetchingNextPage={isFetchingNextPage}
                itemKey={feedItemKey}
                onLoadMore={onLoadMore}
                renderItem={feedRenderItem}
                refetchFooterErrorMessage={
                  isLoadMoreError
                    ? `${loadMoreErrorMessage ?? "飞友圈加载失败，请稍后重试。"} 继续上滑将自动重试。`
                    : undefined
                }
                refetchFooterLabel={isFetchingNextPage ? "正在加载更多..." : "加载中..."}
                refetchFooterState={isLoadMoreError ? "error" : "loading"}
                showRefetchFooter={showFooter}
                useWindowScroll
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
