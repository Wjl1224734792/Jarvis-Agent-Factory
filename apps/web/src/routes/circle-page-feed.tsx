import { PlayIcon, HeartIcon } from "lucide-react";
import { MasonryFeedSkeleton } from "@/components/page-skeletons";
import { ProfileLink } from "@/components/profile-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { getAvatarImage, getEditorialImage } from "@/lib/aviation-media";
import {
  CIRCLE_CARD_COLUMN_GAP,
  CIRCLE_CARD_COLUMN_WIDTH,
  getCircleCardHeightClass
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
  images: Array<{ url?: string | null }>;
  videos: Array<{ url?: string | null }>;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
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
  isRefreshing: boolean;
  isError: boolean;
  errorMessage?: string;
  formatCount: (value: number) => string;
};

export function CirclePageFeed({
  activeTab,
  onChangeTab,
  posts,
  openNote,
  selectedNoteId,
  isLoading,
  isRefreshing,
  isError,
  errorMessage,
  formatCount
}: CirclePageFeedProps) {
  return (
    <>
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
        <Alert variant="destructive">
          <AlertTitle>飞友圈加载失败</AlertTitle>
          <AlertDescription>{errorMessage ?? "网络开小差了"}</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !isError && posts.length === 0 ? (
        <Alert>
          <AlertTitle>飞友圈还没有新动态</AlertTitle>
          <AlertDescription>先发一条动态试试。</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? <MasonryFeedSkeleton count={10} /> : null}

      {posts.length > 0 ? (
        <div
          className="site-tab-panel relative w-full"
          style={{ columnWidth: CIRCLE_CARD_COLUMN_WIDTH, columnGap: CIRCLE_CARD_COLUMN_GAP }}
        >
          {posts.map((item, index) => {
            const previewImage =
              item.images[0]?.url ?? getEditorialImage(item.id, index);

            return (
              <button
                className={`mb-2.5 block w-full break-inside-avoid overflow-hidden rounded-[1.15rem] text-left transition xl:mx-auto xl:max-w-[13.5rem] ${
                  selectedNoteId === item.id
                    ? "bg-sky-50 shadow-[var(--shadow-float)] ring-2 ring-primary/40"
                    : "bg-white hover:bg-sky-50/45"
                }`}
                key={item.id}
                onClick={() => openNote(item.id)}
                type="button"
              >
                <div className="relative overflow-hidden rounded-[1rem] bg-slate-100">
                  <img
                    alt={item.title}
                    className={cn(
                      "w-full rounded-[1rem] object-cover",
                      getCircleCardHeightClass(index)
                    )}
                    src={previewImage}
                  />
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
                        <AvatarImage
                          alt={item.author.displayName}
                          src={item.author.avatarUrl ?? getAvatarImage(item.author.id)}
                        />
                        <AvatarFallback>{item.author.displayName.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <ProfileLink className="truncate hover:text-foreground" userId={item.author.id}>
                        {item.author.displayName}
                      </ProfileLink>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1">
                      <HeartIcon className="size-3.5" />
                      {formatCount(item.engagement.likeCount)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}

          {isRefreshing ? (
            <div className="absolute inset-0 z-10 bg-background/78 p-1.5 backdrop-blur-[1px]">
              <MasonryFeedSkeleton count={10} />
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
