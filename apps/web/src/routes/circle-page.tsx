import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HeartIcon, MessageCircleIcon, Share2Icon, StarIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SitePage } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InlineCommentComposer } from "@/features/posts/inline-comment-composer";
import { PostCommentThread } from "@/features/posts/post-comment-thread";
import { PostInteractionBar } from "@/features/posts/post-interaction-bar";
import { useAuthStore } from "../features/auth/auth-store";
import { apiClient } from "../lib/api-client";
import { getAvatarImage, getEditorialImage } from "../lib/aviation-media";

const feedTabs = [
  { id: "recommended", label: "鎺ㄨ崘" },
  { id: "latest", label: "鏈€鏂?" },
  { id: "following", label: "鍏虫敞" }
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<FeedTab>("recommended");
  const [commentContent, setCommentContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedNoteId = searchParams.get("note");
  const feedQuery = useQuery({
    queryKey: ["circle-feed", activeTab],
    queryFn: () => apiClient.listCircleFeed(activeTab)
  });
  const noteQuery = useQuery({
    queryKey: ["post-detail", selectedNoteId],
    queryFn: () => apiClient.getPostDetail(selectedNoteId!),
    enabled: Boolean(selectedNoteId)
  });

  const posts = feedQuery.data?.items ?? [];
  const selectedPreview = useMemo(
    () => posts.find((item) => item.id === selectedNoteId) ?? null,
    [posts, selectedNoteId]
  );
  const selectedNote = noteQuery.data?.item ?? null;
  const canComment = authStatus === "authenticated" && selectedNote?.status === "published";

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
  }

  return (
    <SitePage className="gap-5">
      <div className="border-b border-border/60">
        <div className="flex gap-7 overflow-x-auto whitespace-nowrap">
          {feedTabs.map((tab) => (
            <button
              className={`border-b-2 px-0 py-3 text-[1rem] transition-colors ${
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

      {feedQuery.isLoading ? (
        <div className="[column-gap:18px]" style={{ columnWidth: "252px" }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="mb-5 break-inside-avoid" key={index}>
              <div
                className={`animate-pulse rounded-[0.9rem] bg-muted ${
                  index % 3 === 0 ? "h-[22rem]" : index % 3 === 1 ? "h-[18rem]" : "h-[20rem]"
                }`}
              />
              <div className="mt-3 space-y-2">
                <div className="h-5 w-4/5 animate-pulse rounded bg-muted" />
                <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {feedQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>椋炲弸鍦堝姞杞藉け璐?</AlertTitle>
          <AlertDescription>{feedQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {!feedQuery.isLoading && !feedQuery.isError && posts.length === 0 ? (
        <Alert>
          <AlertTitle>椋炲弸鍦堣繕娌℃湁鏂板姩鎬?</AlertTitle>
          <AlertDescription>鍏堝彂涓€鏉″姩鎬侊紝鎴栬€呭垏鎹㈡爣绛剧湅鍒殑鍐呭銆?</AlertDescription>
        </Alert>
      ) : null}

      {posts.length > 0 ? (
        <div className="[column-gap:18px]" style={{ columnWidth: "252px" }}>
          {posts.map((item, index) => (
            <button
              className="mb-5 block w-full break-inside-avoid text-left"
              key={item.id}
              onClick={() => openNote(item.id)}
              type="button"
            >
              <div className="overflow-hidden rounded-[0.9rem]">
                <img
                  alt={item.title}
                  className={`w-full object-cover ${
                    index % 3 === 0 ? "h-[22rem]" : index % 3 === 1 ? "h-[18rem]" : "h-[20rem]"
                  }`}
                  src={item.images[0]?.url ?? getEditorialImage(item.id, index)}
                />
              </div>
              <div className="mt-3 space-y-1.5">
                <h2 className="line-clamp-2 text-[1rem] leading-6 font-medium text-foreground">
                  {item.title}
                </h2>
                <p className="line-clamp-2 text-[0.86rem] leading-6 text-foreground/68">
                  {item.contentPreview}
                </p>
                <div className="flex items-center justify-between pt-1 text-[0.8rem] text-foreground/56">
                  <span>{item.author.displayName}</span>
                  <span className="inline-flex items-center gap-1">
                    <HeartIcon className="size-3.5" />
                    {formatCount(item.engagement.likeCount)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {selectedNoteId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/42 p-4 backdrop-blur-[2px] transition-opacity"
          onClick={closeNote}
        >
          <div
            className="relative flex h-[min(88vh,760px)] w-full max-w-[1260px] overflow-hidden rounded-[1.25rem] bg-background shadow-[0_40px_120px_-48px_rgba(0,0,0,0.45)] transition-transform"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="absolute right-4 top-4 z-20 inline-flex size-9 items-center justify-center rounded-full bg-background/88 text-foreground/72 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.5)] transition hover:bg-background hover:text-foreground"
              onClick={closeNote}
              type="button"
            >
              <XIcon className="size-4.5" />
            </button>

            <div className="hidden flex-1 bg-black md:block">
              <img
                alt={selectedNote?.title ?? selectedPreview?.title ?? "椋炲弸鍦堣鎯?"}
                className="h-full w-full object-cover"
                src={
                  selectedNote?.images[0]?.url ??
                  selectedPreview?.images[0]?.url ??
                  getEditorialImage(selectedNoteId)
                }
              />
            </div>

            <div className="flex w-full min-w-0 flex-col bg-white md:w-[430px]">
              <div className="border-b border-border/60 px-5 pb-4 pt-5 pr-16">
                {selectedNote ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="size-11" size="lg">
                      <AvatarImage
                        alt={selectedNote.author.displayName}
                        src={getAvatarImage(selectedNote.author.id)}
                      />
                      <AvatarFallback>{selectedNote.author.displayName.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {selectedNote.author.displayName}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(
                          selectedNote.publishedAt ?? selectedNote.createdAt
                        ).toLocaleDateString("zh-CN")}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 overflow-y-auto px-5 py-5">
                  {noteQuery.isLoading ? (
                    <div className="space-y-4">
                      <div className="h-7 w-3/5 animate-pulse rounded bg-muted" />
                      <div className="h-5 w-full animate-pulse rounded bg-muted" />
                      <div className="h-5 w-5/6 animate-pulse rounded bg-muted" />
                    </div>
                  ) : null}

                  {noteQuery.isError ? (
                    <Alert variant="destructive">
                      <AlertTitle>鍔ㄦ€佽鎯呭姞杞藉け璐?</AlertTitle>
                      <AlertDescription>{noteQuery.error.message}</AlertDescription>
                    </Alert>
                  ) : null}

                  {selectedNote ? (
                    <div className="flex min-h-full flex-col justify-between gap-6">
                      <div className="space-y-3">
                        <h1 className="text-[1.35rem] leading-[1.3] font-semibold text-foreground">
                          {selectedNote.title}
                        </h1>
                        <p className="text-[0.96rem] leading-8 text-foreground/72">
                          {selectedNote.content}
                        </p>
                      </div>

                      <div className="border-t border-border/60 pt-4">
                        <div className="mb-4 text-sm font-semibold text-foreground">
                          璇勮 {selectedNote.commentCount}
                        </div>
                        {selectedNote.comments.length > 0 ? (
                          <PostCommentThread
                            canInteract={canComment}
                            comments={selectedNote.comments}
                            currentUserId={currentUser?.id}
                            postId={selectedNote.id}
                          />
                        ) : (
                          <div className="text-sm text-muted-foreground">杩樻病鏈夎瘎璁恒€?</div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {selectedNote ? (
                  <div className="border-t border-border/60 bg-white px-4 pb-4 pt-3">
                    {actionError ? (
                      <Alert className="mb-3" variant="destructive">
                        <AlertTitle>璇勮澶辫触</AlertTitle>
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
                                reason instanceof Error ? reason.message : "璇勮澶辫触"
                              );
                            })
                            .finally(() => {
                              setIsSubmitting(false);
                            });
                        }}
                        placeholder="璇寸偣浠€涔?.."
                        value={commentContent}
                      />
                    ) : (
                      <div className="border border-border/60 px-3 py-2 text-sm text-muted-foreground">
                        鐧诲綍鍚庡彲鍙備笌璇勮銆?
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
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
                        <span className="inline-flex items-center gap-1.5 text-sm text-foreground/62">
                          <MessageCircleIcon className="size-4" />
                          {formatCount(selectedNote.commentCount)}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-sm text-foreground/62">
                        <Share2Icon className="size-4" />
                        鍒嗕韩
                      </span>
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
