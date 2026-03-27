import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HeartIcon, MessageCircleIcon, Share2Icon, UserCheckIcon, UserPlusIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ListPageSkeleton } from "@/components/page-skeletons";
import { SitePage } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InlineCommentComposer } from "@/features/posts/inline-comment-composer";
import { PostCommentThread } from "@/features/posts/post-comment-thread";
import { PostInteractionBar } from "@/features/posts/post-interaction-bar";
import { useAuthStore } from "../features/auth/auth-store";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { apiClient } from "../lib/api-client";
import { getAvatarImage, getEditorialImage } from "../lib/aviation-media";

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

  if (feedQuery.isLoading && !selectedNoteId) {
    return <ListPageSkeleton rows={6} />;
  }

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

      {feedQuery.isLoading ? (
        <div className="max-w-[680px]" style={{ columnWidth: "208px", columnGap: "12px" }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="mb-3 break-inside-avoid" key={index}>
              <div
                className={`animate-pulse rounded-[0.85rem] bg-muted ${
                  index % 3 === 0 ? "h-[14rem]" : index % 3 === 1 ? "h-[11.5rem]" : "h-[13rem]"
                }`}
              />
              <div className="mt-2 space-y-2">
                <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {feedQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>飞友圈加载失败</AlertTitle>
          <AlertDescription>{feedQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {!feedQuery.isLoading && !feedQuery.isError && posts.length === 0 ? (
        <Alert>
          <AlertTitle>飞友圈还没有新动态</AlertTitle>
          <AlertDescription>先发一条动态试试。</AlertDescription>
        </Alert>
      ) : null}

      {posts.length > 0 ? (
        <div className="site-tab-panel max-w-[680px]" key={activeTab} style={{ columnWidth: "208px", columnGap: "12px" }}>
          {posts.map((item, index) => (
            <button
              className={`mb-3 block w-full break-inside-avoid overflow-hidden rounded-[0.95rem] border text-left transition ${
                selectedNoteId === item.id
                  ? "border-primary/50 bg-sky-50 shadow-[var(--shadow-float)]"
                  : "border-border bg-white hover:border-primary/30 hover:bg-sky-50/45"
              }`}
              key={item.id}
              onClick={() => openNote(item.id)}
              type="button"
            >
              <div className="overflow-hidden rounded-[0.75rem] bg-slate-100 p-1.5">
                <img
                  alt={item.title}
                  className={`w-full rounded-[0.7rem] object-cover ${
                    index % 3 === 0 ? "h-[14rem]" : index % 3 === 1 ? "h-[11.5rem]" : "h-[13rem]"
                  }`}
                  src={item.images[0]?.url ?? getEditorialImage(item.id, index)}
                />
              </div>
              <div className="space-y-2 px-2.5 pb-2.5 pt-1.5">
                <h2 className="line-clamp-1 text-[0.9rem] leading-[1.35rem] font-semibold text-foreground">
                  {item.title}
                </h2>
                <div className="flex items-center justify-between text-[0.74rem] text-foreground/58">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/46 p-3 backdrop-blur-[2px] transition-opacity"
          onClick={closeNote}
        >
          <div
            className="relative flex h-[min(88vh,720px)] w-full max-w-[1180px] overflow-hidden rounded-[1rem] bg-background shadow-[0_34px_100px_-42px_rgba(0,0,0,0.48)] transition-transform"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="absolute right-3 top-3 z-20 inline-flex size-8 items-center justify-center rounded-full bg-background/88 text-foreground/72 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.5)] transition hover:bg-background hover:text-foreground"
              onClick={closeNote}
              type="button"
            >
              <XIcon className="size-4" />
            </button>

            <div className="hidden flex-1 bg-black md:block">
              <img
                alt={selectedNote?.title ?? selectedPreview?.title ?? "飞友圈详情"}
                className="h-full w-full object-cover"
                src={selectedNote?.images[0]?.url ?? selectedPreview?.images[0]?.url ?? getEditorialImage(selectedNoteId)}
              />
            </div>

            <div className="flex w-full min-w-0 flex-col bg-white md:w-[405px]">
              <div className="border-b border-border/70 px-4 pb-3.5 pt-4 pr-14">
                {selectedNote ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar size="lg">
                        <AvatarImage alt={selectedNote.author.displayName} src={getAvatarImage(selectedNote.author.id)} />
                        <AvatarFallback>{selectedNote.author.displayName.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {selectedNote.author.displayName}
                        </div>
                        <div className="mt-0.5 text-[0.72rem] text-muted-foreground">
                          {new Date(selectedNote.publishedAt ?? selectedNote.createdAt).toLocaleDateString("zh-CN")}
                        </div>
                        登录后评论
                      </Button>
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
                            .then(() => {
                              return Promise.all([
                                queryClient.invalidateQueries({ queryKey: ["post-detail", selectedNote.id] }),
                                queryClient.invalidateQueries({ queryKey: ["circle-feed"] }),
                                queryClient.invalidateQueries({ queryKey: ["notifications"] })
                              ]);
                            })
                            .catch((reason: unknown) => {
                              setActionError(reason instanceof Error ? reason.message : "关注失败");
                            });
                        }}
                        size="sm"
                        type="button"
                        variant={selectedNote.engagement.viewer.isFollowingAuthor ? "outline" : "hero"}
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
                    <div className="flex min-h-full flex-col justify-between gap-5">
                      <div className="space-y-3">
                        <h1 className="text-[1.2rem] leading-[1.28] font-semibold text-foreground">
                          {selectedNote.title}
                        </h1>
                        <p className="text-[0.88rem] leading-6 text-foreground/72">{selectedNote.content}</p>
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
                              setActionError(reason instanceof Error ? reason.message : "评论失败");
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
                        登录后可参与评论。
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
                        <span className="inline-flex items-center gap-1.5 text-[0.82rem] text-foreground/62">
                          <MessageCircleIcon className="size-4" />
                          {formatCount(selectedNote.commentCount)}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-[0.82rem] text-foreground/62">
                        <Share2Icon className="size-4" />
                        分享
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
