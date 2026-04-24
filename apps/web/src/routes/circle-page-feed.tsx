import { HeartIcon, PlayIcon } from "lucide-react";
import { useMemo, useRef } from "react";
import { FeedRefetchFooter } from "@/components/feed-refetch-footer";
import { MasonryFeedSkeleton } from "@/components/page-skeletons";
import { ProfileLink } from "@/components/profile-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  { id: "recommended", label: "\u63a8\u8350" },
  { id: "latest", label: "\u6700\u65b0" },
  { id: "following", label: "\u5173\u6ce8" }
] as const;

export type FeedTab = (typeof feedTabs)[number]["id"];

const loadMoreLabels: Record<FeedTab, string> = {
  recommended: "\u52a0\u8f7d\u66f4\u591a\u63a8\u8350",
  latest: "\u52a0\u8f7d\u66f4\u591a\u6700\u65b0",
  following: "\u52a0\u8f7d\u66f4\u591a\u5173\u6ce8"
};

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
            {"\u672a\u8bbe\u7f6e\u5c01\u9762"}
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
          <AlertTitle>{"\u98de\u53cb\u5708\u52a0\u8f7d\u5931\u8d25"}</AlertTitle>
          <AlertDescription>{errorMessage ?? "\u7f51\u7edc\u5f00\u5c0f\u5dee\u4e86\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002"}</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !isError && posts.length === 0 ? (
        <Alert className="rounded-none border-0">
          <AlertTitle>{"\u98de\u53cb\u5708\u8fd8\u6ca1\u6709\u65b0\u52a8\u6001"}</AlertTitle>
          <AlertDescription>{"\u5148\u53d1\u4e00\u6761\u52a8\u6001\u8bd5\u8bd5\u3002"}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? <MasonryFeedSkeleton columnCount={columnCount} count={10} /> : null}

      {posts.length > 0 ? (
        <div className="site-tab-panel w-full space-y-0">
          <VirtualMasonryColumns
            className="w-full"
            columns={columns}
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
          <FeedRefetchFooter show={isRefetching && !isFetchingNextPage} />
          {hasMore ? (
            <div className="flex justify-center border-t border-border/70 bg-white px-3 py-4">
              <Button disabled={isFetchingNextPage} onClick={onLoadMore} type="button" variant="outline">
                {isFetchingNextPage ? "\u52a0\u8f7d\u4e2d..." : loadMoreLabels[activeTab]}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
