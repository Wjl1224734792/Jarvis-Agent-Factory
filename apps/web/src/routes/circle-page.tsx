import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  MessageCircleIcon,
  PlayIcon,
  UserCheckIcon,
  UserPlusIcon,
  XIcon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MasonryFeedSkeleton } from "@/components/page-skeletons";
import { ProfileLink } from "@/components/profile-link";
import { ReportActionSheet } from "@/components/report-action-sheet";
import { SitePage } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InlineCommentComposer } from "@/features/posts/inline-comment-composer";
import { PostCommentThread } from "@/features/posts/post-comment-thread";
import { PostInteractionBar } from "@/features/posts/post-interaction-bar";
import { cn } from "@/lib/utils";
import { useAuthStore } from "../features/auth/auth-store";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { apiClient } from "../lib/api-client";
import { getAvatarImage, getEditorialImage } from "../lib/aviation-media";
import {
  buildCircleMediaItems,
  CIRCLE_CARD_COLUMN_GAP,
  CIRCLE_CARD_COLUMN_WIDTH,
  getCircleCardHeightClass,
  getLoopedNextIndex,
  getLoopedPrevIndex
} from "./circle-page-helpers";

const feedTabs = [
  { id: "recommended", label: "推荐" },
  { id: "latest", label: "最新" },
  { id: "following", label: "关注" }
] as const;

type FeedTab = (typeof feedTabs)[number]["id"];

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
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.user);
  const promptLogin = useLoginPrompt();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<FeedTab>("recommended");
  const [commentContent, setCommentContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const selectedNoteId = searchParams.get("note");
  const feedQuery = useQuery({
    queryKey: ["circle-feed", activeTab],
    placeholderData: keepPreviousData,
    queryFn: () => apiClient.listCircleFeed(activeTab)
  });
  const noteQuery = useQuery({
    queryKey: ["post-detail", selectedNoteId],
    queryFn: () => {
      if (!selectedNoteId) {
        throw new Error("Missing note id");
      }
      return apiClient.getPostDetail(selectedNoteId);
    },
    enabled: Boolean(selectedNoteId)
  });

  const posts = useMemo(() => feedQuery.data?.items ?? [], [feedQuery.data?.items]);
  const selectedPreview = useMemo(
    () => posts.find((item) => item.id === selectedNoteId) ?? null,
    [posts, selectedNoteId]
  );
  const selectedNote = noteQuery.data?.item ?? null;
  const displayNote = selectedNote ?? selectedPreview;
  const mediaItems = useMemo(
    () =>
      buildCircleMediaItems({
        title: displayNote?.title ?? "飞友圈详情",
        images: displayNote?.images,
        videos: displayNote?.videos
      }),
    [displayNote]
  );
  const activeMedia = mediaItems[selectedMediaIndex] ?? mediaItems[0] ?? null;
  const canComment = authStatus === "authenticated" && selectedNote?.status === "published";

  useEffect(() => {
    setSelectedMediaIndex(0);
  }, [selectedNoteId]);

  useEffect(() => {
    if (selectedMediaIndex < mediaItems.length) {
      return;
    }

    setSelectedMediaIndex(0);
  }, [mediaItems.length, selectedMediaIndex]);

  function openNote(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set("note", id);
    setSearchParams(next);
  }

  function closeNote() {
    const next = new URLSearchParams(searchParams);
    next.delete("note");
    setSearchParams(next);
    setCommentContent("");
    setActionError(null);
    setSelectedMediaIndex(0);
  }

  const isFeedLoading = feedQuery.isLoading && !feedQuery.data;
  const isFeedRefreshing = feedQuery.isFetching && !isFeedLoading;

  return (
    <SitePage className="gap-4">
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
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {feedQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>飞友圈加载失败</AlertTitle>
          <AlertDescription>{feedQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {!isFeedLoading && !feedQuery.isError && posts.length === 0 ? (
        <Alert>
          <AlertTitle>飞友圈还没有新动态</AlertTitle>
          <AlertDescription>先发一条动态试试。</AlertDescription>
        </Alert>
      ) : null}

      {isFeedLoading ? <MasonryFeedSkeleton count={10} /> : null}

      {posts.length > 0 ? (
        <div
          className="site-tab-panel relative w-full"
          style={{ columnWidth: CIRCLE_CARD_COLUMN_WIDTH, columnGap: CIRCLE_CARD_COLUMN_GAP }}
        >
          {posts.map((item, index) => {
            const previewImage =
              item.images[0]?.url ??
              getEditorialImage(item.id, index);

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
                <div className="relative overflow-hidden rounded-[1rem] bg-slate-100 p-1">
                  <img
                    alt={item.title}
                    className={cn(
                      "w-full rounded-[0.92rem] object-cover",
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

          {isFeedRefreshing ? (
            <div className="absolute inset-0 z-10 bg-background/78 p-1.5 backdrop-blur-[1px]">
              <MasonryFeedSkeleton count={10} />
            </div>
          ) : null}
        </div>
      ) : null}

      {selectedNoteId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/46 p-3 backdrop-blur-[2px] transition-opacity"
          onClick={closeNote}
        >
          <div
            className="relative flex h-[min(92vh,860px)] w-full max-w-[1220px] flex-col overflow-hidden rounded-[1rem] bg-background shadow-[0_34px_100px_-42px_rgba(0,0,0,0.48)] md:flex-row"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="absolute right-3 top-3 z-30 inline-flex size-8 items-center justify-center rounded-full bg-background/88 text-foreground/72 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.5)] transition hover:bg-background hover:text-foreground"
              onClick={closeNote}
              type="button"
            >
              <XIcon className="size-4" />
            </button>

            <div className="relative flex min-h-[320px] flex-1 items-center justify-center bg-black md:min-h-0">
              {activeMedia?.kind === "video" ? (
                <video
                  className="h-full max-h-full w-full object-contain"
                  controls
                  preload="metadata"
                  src={activeMedia.url}
                />
              ) : activeMedia ? (
                <img
                  alt={activeMedia.label}
                  className="h-full max-h-full w-full object-contain"
                  src={activeMedia.url}
                />
              ) : (
                <img
                  alt={displayNote?.title ?? "飞友圈详情"}
                  className="h-full max-h-full w-full object-contain"
                  src={getEditorialImage(selectedNoteId)}
                />
              )}

              {mediaItems.length > 1 ? (
                <>
                  <div className="absolute right-14 top-3 z-20 rounded-full bg-black/40 px-3 py-1 text-sm font-medium text-white">
                    {selectedMediaIndex + 1}/{mediaItems.length}
                  </div>
                  <button
                    className="absolute left-3 top-1/2 z-20 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/38 text-white transition hover:bg-black/55"
                    onClick={() => {
                      setSelectedMediaIndex((current) =>
                        getLoopedPrevIndex(current, mediaItems.length)
                      );
                    }}
                    type="button"
                  >
                    <ChevronLeftIcon className="size-5" />
                  </button>
                  <button
                    className="absolute right-3 top-1/2 z-20 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/38 text-white transition hover:bg-black/55"
                    onClick={() => {
                      setSelectedMediaIndex((current) =>
                        getLoopedNextIndex(current, mediaItems.length)
                      );
                    }}
                    type="button"
                  >
                    <ChevronRightIcon className="size-5" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/28 px-3 py-2">
                    {mediaItems.map((item, index) => (
                      <button
                        aria-label={`查看第 ${index + 1} 张${item.kind === "video" ? "视频" : "图片"}`}
                        className={cn(
                          "size-2 rounded-full bg-white/45 transition",
                          selectedMediaIndex === index && "bg-white"
                        )}
                        key={`${item.kind}-${item.url}-${index}`}
                        onClick={() => setSelectedMediaIndex(index)}
                        type="button"
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex w-full min-w-0 flex-col bg-white md:w-[420px]">
              <div className="border-b border-border/70 px-4 pb-3.5 pt-4 pr-14">
                {selectedNote ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <ProfileLink userId={selectedNote.author.id}>
                        <Avatar size="lg">
                          <AvatarImage
                            alt={selectedNote.author.displayName}
                            src={selectedNote.author.avatarUrl ?? getAvatarImage(selectedNote.author.id)}
                          />
                          <AvatarFallback>{selectedNote.author.displayName.slice(0, 1)}</AvatarFallback>
                        </Avatar>
                      </ProfileLink>
                      <div className="min-w-0">
                        <ProfileLink
                          className="truncate text-sm font-semibold text-foreground hover:text-primary"
                          userId={selectedNote.author.id}
                        >
                          {selectedNote.author.displayName}
                        </ProfileLink>
                        <div className="mt-0.5 text-[0.72rem] text-muted-foreground">
                          {new Date(
                            selectedNote.publishedAt ?? selectedNote.createdAt
                          ).toLocaleDateString("zh-CN")}
                        </div>
                      </div>
                    </div>

                    {!selectedNote.engagement.viewer.isAuthor ? (
                      <Button
                        className="rounded-full"
                        onClick={() => {
                          if (
                            !promptLogin({
                              title: "登录后才能关注作者",
                              description: "关注前请先登录。"
                            })
                          ) {
                            return;
                          }

                          setActionError(null);
                          void apiClient
                            .toggleFollow(selectedNote.author.id)
                            .then(() =>
                              Promise.all([
                                queryClient.invalidateQueries({
                                  queryKey: ["post-detail", selectedNote.id]
                                }),
                                queryClient.invalidateQueries({ queryKey: ["circle-feed"] }),
                                queryClient.invalidateQueries({ queryKey: ["notifications"] })
                              ])
                            )
                            .catch((reason: unknown) => {
                              setActionError(
                                reason instanceof Error ? reason.message : "操作失败，请稍后重试。"
                              );
                            });
                        }}
                        size="sm"
                        type="button"
                        variant={
                          selectedNote.engagement.viewer.isFollowingAuthor ? "outline" : "hero"
                        }
                      >
                        {selectedNote.engagement.viewer.isFollowingAuthor ? (
                          <UserCheckIcon data-icon="inline-start" />
                        ) : (
                          <UserPlusIcon data-icon="inline-start" />
                        )}
                        {selectedNote.engagement.viewer.isFollowingAuthor ? "已关注" : "关注"}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {noteQuery.isLoading ? (
                    <div className="space-y-4">
                      <div className="h-6 w-3/5 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                    </div>
                  ) : null}

                  {noteQuery.isError ? (
                    <Alert variant="destructive">
                      <AlertTitle>动态详情加载失败</AlertTitle>
                      <AlertDescription>{noteQuery.error.message}</AlertDescription>
                    </Alert>
                  ) : null}

                  {selectedNote ? (
                    <div className="flex flex-col gap-5">
                      <div className="space-y-3">
                        <h1 className="text-[1.2rem] leading-[1.28] font-semibold text-foreground">
                          {selectedNote.title}
                        </h1>
                        <p className="text-[0.88rem] leading-6 text-foreground/72">
                          {selectedNote.content}
                        </p>
                      </div>

                      <div className="border-t border-border pt-3.5">
                        <div className="mb-3 text-[0.84rem] font-semibold text-foreground">
                          评论区 {selectedNote.commentCount}
                        </div>
                        {selectedNote.comments.length > 0 ? (
                          <PostCommentThread
                            canInteract={canComment}
                            comments={selectedNote.comments}
                            currentUserId={currentUser?.id}
                            postId={selectedNote.id}
                          />
                        ) : (
                          <div className="text-[0.82rem] text-muted-foreground">还没有评论。</div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {selectedNote ? (
                  <div className="border-t border-border bg-white px-4 pb-3.5 pt-3">
                    {actionError ? (
                      <Alert className="mb-3" variant="destructive">
                        <AlertTitle>评论失败</AlertTitle>
                        <AlertDescription>{actionError}</AlertDescription>
                      </Alert>
                    ) : null}

                    {canComment ? (
                      <InlineCommentComposer
                        busy={isSubmitting}
                        disabled={false}
                        onChange={setCommentContent}
                        onSubmit={() => {
                          if (!commentContent.trim()) {
                            return;
                          }

                          setActionError(null);
                          setIsSubmitting(true);
                          void apiClient
                            .createPostComment(selectedNote.id, {
                              content: commentContent
                            })
                            .then(() => {
                              setCommentContent("");
                              return Promise.all([
                                queryClient.invalidateQueries({
                                  queryKey: ["post-detail", selectedNote.id]
                                }),
                                queryClient.invalidateQueries({ queryKey: ["circle-feed"] })
                              ]);
                            })
                            .catch((reason: unknown) => {
                              setActionError(
                                reason instanceof Error ? reason.message : "操作失败，请稍后重试。"
                              );
                            })
                            .finally(() => {
                              setIsSubmitting(false);
                            });
                        }}
                        placeholder="说点什么..."
                        value={commentContent}
                      />
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => {
                          promptLogin({
                            title: "登录后才能评论",
                            description: "评论前请先登录。"
                          });
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        登录后评论
                      </Button>
                    )}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-3">
                        <PostInteractionBar
                          compact
                          hideFollow
                          iconOnly
                          plain
                          authorId={selectedNote.author.id}
                          favoriteCount={selectedNote.engagement.favoriteCount}
                          isPublished={selectedNote.status === "published"}
                          likeCount={selectedNote.engagement.likeCount}
                          postId={selectedNote.id}
                          shareCount={selectedNote.engagement.shareCount}
                          viewer={selectedNote.engagement.viewer}
                        />
                        <span className="inline-flex items-center gap-1.5 text-[0.82rem] text-foreground/62">
                          <MessageCircleIcon className="size-4" />
                          {formatCount(selectedNote.commentCount)}
                        </span>
                      </div>

                      {authStatus === "authenticated" && currentUser?.id !== selectedNote.author.id ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <ReportActionSheet
                            description="请填写举报理由，并至少上传 1 张证据图。"
                            onSubmit={(input) =>
                              apiClient.reportPost(selectedNote.id, input).then(() => {
                                void queryClient.invalidateQueries({ queryKey: ["post-detail", selectedNote.id] });
                                void queryClient.invalidateQueries({ queryKey: ["circle-feed"] });
                              })
                            }
                            title="举报内容"
                            trigger={
                              <Button aria-label="举报内容" size="sm" type="button" variant="ghost">
                                <AlertTriangleIcon className="size-4" />
                              </Button>
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </SitePage>
  );
}
