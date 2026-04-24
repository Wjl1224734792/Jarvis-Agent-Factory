import { HeartIcon, PlayIcon } from "lucide-react";
import { useMemo, useRef } from "react";
import { FeedRefetchFooter } from "@/components/feed-refetch-footer";
import { MasonryFeedSkeleton } from "@/components/page-skeletons";
import { ProfileLink } from "@/components/profile-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VirtualMasonryColumns } from "@/components/virtual-feed";
import { useCircleColumnCount } from "@/hooks/use-circle-column-count";
import { resolveUserAvatarSrc } from "@/lib/avatar-url";
import { cn } from "@/lib/utils";
import {
  CIRCLE_CARD_COLUMN_GAP,
  CIRCLE_FEED_MEDIA_MAX_HEIGHT_CLASS,
  getCircleCardMediaAspectClass,
  partitionCircleFeedShortestColumn
} from "./circle-page-helpers";

const feedTabs = [
  { id: "recommended", label: "推荐" },
  { id: "latest", label: "最新" },
  { id: "following", label: "关注" }
] as const;

export type FeedTab = (typeof feedTabs)[number]["id"];

export type CircleFeedItem = {
  id: string;
  title: string;
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
};

type CirclePageFeedProps = {
  activeTab: FeedTab;
  onChangeTab: (tab: FeedTab) => void;
  posts: CircleFeedItem[];
  openNote: (id: string) => void;
  selectedNoteId: string | null;
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
};

function CircleFeedCard(props: {
  item: CircleFeedItem;
  absoluteIndex: number;
  selectedNoteId: string | null;
  openNote: (id: string) => void;
  formatCount: (value: number) => string;
}) {
  const { item, absoluteIndex, selectedNoteId, openNote, formatCount } = props;
  const previewImage = item.cover?.url ?? item.images[0]?.url ?? null;
  const previewVideo = item.videos[0]?.url ?? null;

  return (
    <button
      className={cn(
        "block w-full overflow-hidden rounded-[1.15rem] bg-transparent text-left transition hover:bg-sky-50/45",
        selectedNoteId === item.id && "bg-sky-50 shadow-[var(--shadow-float)] ring-2 ring-primary/40"
      )}
      onClick={() => openNote(item.id)}
      type="button"
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-[1rem] bg-slate-100",
          CIRCLE_FEED_MEDIA_MAX_HEIGHT_CLASS,
          getCircleCardMediaAspectClass(absoluteIndex)
        )}
      >
        {previewImage ? (
          <img
            alt={item.title}
            className="h-full w-full rounded-[1rem] object-cover"
            src={previewImage}
          />
        ) : previewVideo ? (
          <video
            className="h-full w-full rounded-[1rem] object-cover"
            muted
            playsInline
            preload="metadata"
            src={previewVideo}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-[1rem] bg-slate-100 text-xs text-muted-foreground">
            未设置封面
          </div>
        )}
        {item.videos.length > 0 ? (
          <span className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white">
            <PlayIcon className="size-3.5 fill-current" />
          </span>
        ) : null}
      </div>
      <div className="space-y-1.5 px-3 pb-3 pt-1.5">
        <h2 className="line-clamp-2 text-[0.88rem] leading-[1.32rem] font-semibold text-foreground">
          {item.title}
        </h2>
        <div className="flex items-center justify-between gap-2 text-[0.72rem] text-foreground/58">
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
}

export function CirclePageFeed({
  activeTab,
  onChangeTab,
  posts,
  openNote,
  selectedNoteId,
  isLoading,
  isRefetching,
  isFetchingNextPage,
  isError,
  errorMessage,
  isLoadMoreError = false,
  loadMoreErrorMessage,
  hasMore = false,
  onLoadMore,
  formatCount
}: CirclePageFeedProps) {
  const feedMeasureRef = useRef<HTMLDivElement>(null);
  const columnCount = useCircleColumnCount(undefined, { widthElementRef: feedMeasureRef });
  const columns = useMemo(
    () => partitionCircleFeedShortestColumn(posts, columnCount),
    [posts, columnCount]
  );
  const showFooter = isLoadMoreError || isFetchingNextPage || (isRefetching && !isFetchingNextPage);

  return (
    <div ref={feedMeasureRef} className="w-full min-w-0">
      <div className="border-b border-border/60">
        <div className="flex gap-5 overflow-x-auto whitespace-nowrap">
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
        </div>
      </div>

      {isError ? (
        <Alert className="rounded-none border-0" variant="destructive">
          <AlertTitle>飞友圈加载失败</AlertTitle>
          <AlertDescription>{errorMessage ?? "网络开小差了，请稍后重试。"}</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !isError && posts.length === 0 ? (
        <Alert className="rounded-none border-0">
          <AlertTitle>飞友圈还没有新动态</AlertTitle>
          <AlertDescription>先发一条动态试试。</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? <MasonryFeedSkeleton columnCount={columnCount} count={10} /> : null}

      {posts.length > 0 ? (
        <div className="site-tab-panel w-full space-y-0">
          <VirtualMasonryColumns
            className="w-full"
            columns={columns}
            hasMore={hasMore}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={onLoadMore}
            gap={CIRCLE_CARD_COLUMN_GAP}
            itemKey={({ item }) => item.id}
            renderItem={({ item, absoluteIndex }) => (
              <CircleFeedCard
                absoluteIndex={absoluteIndex}
                formatCount={formatCount}
                item={item}
                openNote={openNote}
                selectedNoteId={selectedNoteId}
              />
            )}
          />
          <FeedRefetchFooter
            errorMessage={
              isLoadMoreError
                ? `${loadMoreErrorMessage ?? "飞友圈加载失败，请稍后重试。"} 继续上滑将自动重试。`
                : undefined
            }
            label={isFetchingNextPage ? "正在加载更多..." : "加载中..."}
            show={showFooter}
            state={isLoadMoreError ? "error" : "loading"}
          />
        </div>
      ) : null}
    </div>
  );
}
