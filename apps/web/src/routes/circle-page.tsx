import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EyeIcon,
  FlameIcon,
  HeartIcon,
  MessageCircleIcon,
  SendIcon,
  SparklesIcon,
  UsersIcon,
  XIcon
} from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SitePage, SitePanel, SitePanelBody } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "../features/auth/auth-store";
import { PostInteractionBar } from "../features/posts/post-interaction-bar";
import { apiClient } from "../lib/api-client";
import { getAvatarImage, getEditorialImage } from "../lib/aviation-media";

const feedTabs = [
  { id: "recommended", label: "热门", icon: FlameIcon },
  { id: "latest", label: "最新", icon: SparklesIcon },
  { id: "following", label: "关注", icon: UsersIcon }
] as const;

type FeedTab = (typeof feedTabs)[number]["id"];
type PostDetail = Awaited<ReturnType<typeof apiClient.getPostDetail>>["item"];
type CommentNode = PostDetail["comments"][number];

function CompactCommentList({
  comments,
  depth = 0
}: {
  comments: CommentNode[];
  depth?: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      {comments.map((comment) => (
        <div key={comment.id}>
          <div
            className="flex items-start gap-3"
            style={{ paddingLeft: `${Math.min(depth, 3) * 18}px` }}
          >
            <Avatar size="sm">
              <AvatarImage alt={comment.author.displayName} src={getAvatarImage(comment.author.id)} />
              <AvatarFallback>{comment.author.displayName.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{comment.author.displayName}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.updatedAt).toLocaleDateString("zh-CN", {
                    month: "2-digit",
                    day: "2-digit"
                  })}
                </span>
              </div>
              <p className="mt-1 text-sm leading-7 text-foreground/86">{comment.content}</p>
            </div>
          </div>

          {comment.replies.length > 0 ? (
            <div className="mt-3">
              <CompactCommentList comments={comment.replies} depth={depth + 1} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function CirclePage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const authStatus = useAuthStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.user);
  const isAuthenticated = authStatus === "authenticated";
  const [activeTab, setActiveTab] = useState<FeedTab>("recommended");
  const [commentContent, setCommentContent] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const noteId = searchParams.get("note");

  const feedQuery = useQuery({
    queryKey: ["circle-feed", activeTab],
    queryFn: () => apiClient.listHomeFeed(activeTab)
  });

  const detailQuery = useQuery({
    queryKey: ["circle-detail", noteId],
    queryFn: () => apiClient.getPostDetail(noteId ?? ""),
    enabled: Boolean(noteId)
  });

  const posts = feedQuery.data?.items ?? [];
  const post = detailQuery.data?.item;
  const canComment = isAuthenticated && post?.status === "published";

  const activeAuthors = useMemo(() => {
    return posts
      .map((item) => item.author)
      .filter((author, index, source) => source.findIndex((entry) => entry.id === author.id) === index)
      .slice(0, 6);
  }, [posts]);

  function openPost(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set("note", id);
    setSearchParams(next);
  }

  function closePost() {
    const next = new URLSearchParams(searchParams);
    next.delete("note");
    setSearchParams(next);
    setCommentContent("");
    setActionError(null);
    setIsComposerOpen(false);
  }

  return (
    <SitePage>
      <Tabs
        onValueChange={(value) => {
          setActiveTab(value as FeedTab);
        }}
        value={activeTab}
      >
        <TabsList className="w-full justify-start overflow-x-auto gap-8 px-1" variant="line">
          {feedTabs.map((item) => {
            return (
              <TabsTrigger className="px-0 text-base" key={item.id} value={item.id}>
                {item.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {feedQuery.isLoading ? (
        <div className="[column-gap:16px]" style={{ columnWidth: "220px" }}>
          {Array.from({ length: 12 }).map((_, index) => (
            <div className="mb-4 break-inside-avoid" key={index}>
              <div className="w-full max-w-[236px] min-w-[210px] overflow-hidden rounded-[1.15rem] bg-background shadow-[0_10px_28px_-24px_rgba(15,23,42,0.22)]">
                <div className={`w-full animate-pulse bg-muted ${index % 3 === 0 ? "h-[17rem]" : index % 3 === 1 ? "h-[21rem]" : "h-[19rem]"}`} />
                <div className="space-y-3 px-3 pb-3 pt-3">
                  <div className="h-8 w-4/5 animate-pulse rounded bg-muted" />
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-20 animate-pulse rounded bg-muted" />
                    <div className="h-5 w-12 animate-pulse rounded bg-muted" />
                  </div>
                </div>
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
          <AlertTitle>圈子里还没有新内容</AlertTitle>
          <AlertDescription>
            {isAuthenticated
              ? "试试切到其他标签，或者发布你的第一条飞行动态。"
              : "登录后加入飞友圈，和其他飞行爱好者一起分享航拍、试飞与行业见闻。"}
          </AlertDescription>
        </Alert>
      ) : null}

      {posts.length > 0 ? (
        <div className="[column-gap:16px]" style={{ columnWidth: "220px" }}>
          {posts.map((item, index) => (
            <article className="mb-4 break-inside-avoid" key={item.id}>
              <div className="w-full max-w-[236px] min-w-[210px] overflow-hidden rounded-[1rem] bg-background shadow-[0_10px_24px_-22px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_-24px_rgba(15,23,42,0.22)]">
                <button className="block w-full text-left" onClick={() => openPost(item.id)} type="button">
                  <div className="overflow-hidden rounded-[0.9rem] px-2 pt-2">
                    <img
                      alt={item.title}
                      className={`w-full rounded-[0.85rem] object-cover ${index % 3 === 0 ? "h-[15rem]" : index % 3 === 1 ? "h-[18rem]" : "h-[16.5rem]"}`}
                      src={item.images[0]?.url ?? getEditorialImage(item.id, index)}
                    />
                  </div>
                </button>

                <div className="space-y-2.5 bg-background px-3 pb-3 pt-2.5">
                  <button className="block w-full text-left" onClick={() => openPost(item.id)} type="button">
                    <h2 className="line-clamp-2 text-[0.9rem] leading-[1.4] font-medium text-foreground">
                      {item.title}
                    </h2>
                  </button>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar size="sm">
                        <AvatarImage alt={item.author.displayName} src={getAvatarImage(item.author.id)} />
                        <AvatarFallback>{item.author.displayName.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div className="truncate text-[0.74rem] font-medium text-foreground">
                        {item.author.displayName}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[0.76rem] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <HeartIcon className="size-3.25" />
                        {item.engagement.likeCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircleIcon className="size-3.25" />
                        {item.commentCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {noteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/62 p-4 backdrop-blur-sm">
          <div className="grid h-[min(90vh,900px)] w-full max-w-[1380px] overflow-hidden rounded-[1.05rem] bg-background shadow-[0_40px_120px_-48px_rgba(15,23,42,0.52)] xl:grid-cols-[minmax(0,1fr)_460px]">
            <div className="overflow-hidden bg-background">
              {detailQuery.isLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  正在加载动态...
                </div>
              ) : detailQuery.isError ? (
                <div className="flex h-full items-center justify-center p-8 text-sm text-destructive">
                  {detailQuery.error.message}
                </div>
              ) : (
                <img
                  alt={post?.title ?? "post"}
                  className="h-full w-full object-contain"
                  src={post?.images[0]?.url ?? getEditorialImage(noteId)}
                />
              )}
            </div>

            <div className="flex min-h-0 flex-col border-l border-border/70 bg-background">
              {post ? (
                <>
                  <div className="flex items-center justify-between gap-4 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage alt={post.author.displayName} src={getAvatarImage(post.author.id)} />
                        <AvatarFallback>{post.author.displayName.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-[0.96rem] font-semibold text-foreground">{post.author.displayName}</div>
                        <div className="text-[0.78rem] text-muted-foreground">飞友动态</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button className="px-4" size="sm" type="button" variant="hero">
                        关注
                      </Button>
                      <Button onClick={closePost} size="icon-lg" type="button" variant="ghost">
                        <XIcon />
                        <span className="sr-only">关闭</span>
                      </Button>
                    </div>
                  </div>

                  <div className="border-b border-border/70 px-4 pb-4">
                    <h2 className="text-[1.28rem] leading-tight font-semibold tracking-[-0.02em] text-foreground">
                      {post.title}
                    </h2>
                    <p className="mt-3 whitespace-pre-wrap text-[0.88rem] leading-6 text-foreground/86">
                      {post.content}
                    </p>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                    <div className="mb-3 text-[0.78rem] text-muted-foreground">共 {post.commentCount} 条评论</div>

                    <div className="space-y-3">
                      {post.comments.length > 0 ? (
                        <CompactCommentList comments={post.comments} />
                      ) : (
                        <Alert>
                          <AlertTitle>还没有评论</AlertTitle>
                          <AlertDescription>欢迎留下第一条评论。</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border/70 px-4 py-4">
                    <div className="mb-3 flex items-center justify-end gap-4">
                      <PostInteractionBar
                        compact
                        hideFollow
                        iconOnly
                        plain
                        authorId={post.author.id}
                        favoriteCount={post.engagement.favoriteCount}
                        isPublished={post.status === "published"}
                        likeCount={post.engagement.likeCount}
                        postId={post.id}
                        shareCount={post.engagement.shareCount}
                        viewer={post.engagement.viewer}
                      />
                    </div>

                    {canComment ? (
                      isComposerOpen ? (
                        <div className="flex items-end gap-3">
                          <Textarea
                            className="min-h-18 text-sm"
                            onChange={(event) => setCommentContent(event.target.value)}
                            placeholder="说点什么..."
                            value={commentContent}
                          />
                          <Button
                            disabled={!commentContent.trim() || isSubmitting}
                            onClick={() => {
                              setActionError(null);
                              setIsSubmitting(true);

                              void apiClient
                                .createPostComment(post.id, { content: commentContent })
                                .then(() => {
                                  setCommentContent("");
                                  setIsComposerOpen(false);
                                  return Promise.all([
                                    queryClient.invalidateQueries({ queryKey: ["circle-detail", noteId] }),
                                    queryClient.invalidateQueries({ queryKey: ["post-detail", post.id] }),
                                    queryClient.invalidateQueries({ queryKey: ["circle-feed"] }),
                                    queryClient.invalidateQueries({ queryKey: ["notifications"] })
                                  ]);
                                })
                                .catch((value: unknown) => {
                                  setActionError(value instanceof Error ? value.message : "评论失败");
                                })
                                .finally(() => {
                                  setIsSubmitting(false);
                                });
                            }}
                            size="icon-lg"
                            type="button"
                          >
                            <SendIcon />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="flex w-full items-center gap-3 rounded-full bg-surface-2 px-4 py-3 text-left text-sm text-muted-foreground transition hover:bg-surface-3"
                          onClick={() => setIsComposerOpen(true)}
                          type="button"
                        >
                          <Avatar className="bg-muted" size="sm">
                            <AvatarFallback>{currentUser?.displayName?.slice(0, 1) ?? "我"}</AvatarFallback>
                          </Avatar>
                          <span>说点什么...</span>
                        </button>
                      )
                    ) : null}

                    {actionError ? (
                      <Alert className="mt-4" variant="destructive">
                        <AlertTitle>评论失败</AlertTitle>
                        <AlertDescription>{actionError}</AlertDescription>
                      </Alert>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </SitePage>
  );
}
