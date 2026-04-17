import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  MessageSquareTextIcon,
  Trash2Icon,
  UserCheckIcon,
  UserPlusIcon
} from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PostDetailPageSkeleton } from "@/components/route-skeletons";
import { ProfileLink } from "@/components/profile-link";
import { ReportActionSheet } from "@/components/report-action-sheet";
import { ImmersivePageShell } from "@/components/immersive-page-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sanitizeHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { useAuthStore } from "../features/auth/auth-store";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { InlineCommentComposer } from "../features/posts/inline-comment-composer";
import { PostCommentThread } from "../features/posts/post-comment-thread";
import { PostInteractionBar } from "../features/posts/post-interaction-bar";
import {
  patchPostAuthorFollowState,
  patchPostCommentCreated,
  patchPostViewCount
} from "../features/posts/post-query-cache";
import { apiClient } from "../lib/api-client";
import { getAvatarImage, getEditorialImage } from "../lib/aviation-media";
import { shouldRecordSessionView } from "../lib/view-session";

function splitContent(content: string) {
  return content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function extractVideoSrcSet(html: string) {
  const sourceSet = new Set<string>();
  const content = html.trim();

  if (!content) {
    return sourceSet;
  }

  if (typeof DOMParser !== "undefined") {
    const documentNode = new DOMParser().parseFromString(content, "text/html");
    const mediaNodes = documentNode.querySelectorAll("video[src], video source[src]");
    for (const node of mediaNodes) {
      const src = node.getAttribute("src")?.trim();
      if (src) {
        sourceSet.add(src);
      }
    }
    return sourceSet;
  }

  for (const match of content.matchAll(/<(?:video|source)\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const src = match[1]?.trim();
    if (src) {
      sourceSet.add(src);
    }
  }

  return sourceSet;
}

export function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.user);
  const promptLogin = useLoginPrompt();
  const [commentContent, setCommentContent] = useState("");
  const [commentSort, setCommentSort] = useState<"latest" | "hot">("latest");
  const [actionError, setActionError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postQuery = useQuery({
    queryKey: ["post-detail", id],
    queryFn: () => apiClient.getPostDetail(id),
    enabled: Boolean(id)
  });

  const item = postQuery.data?.item;
  const paragraphs = splitContent(item?.content ?? "");
  const articleHtml = item?.type === "article" ? item.contentHtml?.trim() ?? "" : "";
  const embeddedVideoSrcSet = useMemo(() => extractVideoSrcSet(articleHtml), [articleHtml]);
  const fallbackVideos = useMemo(() => {
    if (!item || item.type !== "article") {
      return [];
    }

    return item.videos.filter((video) => {
      const src = video.url.trim();
      return src.length > 0 && !embeddedVideoSrcSet.has(src);
    });
  }, [embeddedVideoSrcSet, item]);

  useEffect(() => {
    if (!item || item.status !== "published" || !shouldRecordSessionView("post", item.id)) {
      return;
    }

    void apiClient
      .recordPostView(item.id)
      .then(() => {
        patchPostViewCount(queryClient, item.id);
      })
      .catch(() => {
        // Ignore passive view-record failures to keep detail navigation responsive.
      });
  }, [item, queryClient]);

  if (!id) {
    return (
      <Alert variant="destructive">
        <AlertTitle>缺少帖子标识</AlertTitle>
        <AlertDescription>当前 URL 不完整，无法加载帖子详情。</AlertDescription>
      </Alert>
    );
  }

  if (postQuery.isLoading) {
    return <PostDetailPageSkeleton />;
  }

  if (postQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>帖子加载失败</AlertTitle>
        <AlertDescription>{postQuery.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!item) {
    return (
      <Alert>
        <AlertTitle>当前帖子不可见</AlertTitle>
        <AlertDescription>这条帖子不存在或尚未公开。</AlertDescription>
      </Alert>
    );
  }

  const isAuthor = currentUser?.id === item.author.id;
  const canComment = authStatus === "authenticated" && item.status === "published";
  const isFollowingAuthor = item.engagement.viewer.isFollowingAuthor;
  const isCommentRefreshing = postQuery.isFetching && !postQuery.isLoading && !isSubmitting;

  return (
    <ImmersivePageShell
      className="max-w-[900px] gap-8 bg-transparent px-4 pb-8 pt-2 md:px-6 [&_section]:rounded-none"
      header={
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-sm text-foreground/80">
            <Button
              className="size-8 rounded-full p-0"
            onClick={() => {
              if (window.history.length > 1) {
                void navigate(-1);
                return;
              }

              void navigate(APP_ROUTES.feedHome);
            }}
            type="button"
            variant="ghost"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
            <span className="font-medium">{APP_NAME}</span>
          </div>
        </div>
      }
    >

      <article className="space-y-6">
        <header className="space-y-4">
          <h1 className="max-w-[14ch] text-[2.35rem] leading-[1.02] font-semibold tracking-[-0.05em] text-foreground md:text-[2.9rem]">
            {item.title}
          </h1>

          <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <ProfileLink userId={item.author.id}>
                <Avatar className="size-11" size="lg">
                  <AvatarImage alt={item.author.displayName} src={getAvatarImage(item.author.id)} />
                  <AvatarFallback>{item.author.displayName.slice(0, 1)}</AvatarFallback>
                </Avatar>
              </ProfileLink>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <ProfileLink className="text-sm font-medium text-foreground hover:text-primary" userId={item.author.id}>
                    {item.author.displayName}
                  </ProfileLink>
                  {item.author.role === "admin" ? <Badge variant="secondary">官方</Badge> : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(item.publishedAt ?? item.createdAt).toLocaleDateString("zh-CN")} ·
                  {Math.max(3, Math.ceil(item.content.length / 220))} 分钟阅读
                </div>
              </div>
            </div>

            {!item.engagement.viewer.isAuthor ? (
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
                  const nextIsFollowing = !isFollowingAuthor;
                  setActionError(null);
                  void apiClient
                    .toggleFollow(item.author.id)
                    .then(() => {
                      patchPostAuthorFollowState(queryClient, item.author.id, nextIsFollowing);
                      startTransition(() => {
                        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
                      });
                    })
                    .catch((value: unknown) => {
                      setActionError(value instanceof Error ? value.message : "关注失败");
                    });
                }}
                size="sm"
                type="button"
                variant={isFollowingAuthor ? "outline" : "hero"}
              >
                {isFollowingAuthor ? <UserCheckIcon data-icon="inline-start" /> : <UserPlusIcon data-icon="inline-start" />}
                {isFollowingAuthor ? "已关注" : "关注"}
              </Button>
            ) : null}
          </div>
        </header>

        <div className="overflow-hidden border border-border/70 rounded-none">
          <img
            alt={item.title}
            className="h-[280px] w-full object-cover md:h-[380px]"
            src={item.images[0]?.url ?? getEditorialImage(item.id)}
          />
        </div>

        {item.type === "article" && articleHtml ? (
          <div
              className="text-[1rem] leading-8 text-foreground/82 [&_a]:text-primary [&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/35 [&_blockquote]:pl-5 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_figure]:my-6 [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-[1.55rem] [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-[1.2rem] [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-dashed [&_img]:w-full [&_img]:rounded-[0.95rem] [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border [&_th]:bg-slate-100 [&_th]:px-3 [&_th]:py-2 [&_ul[data-type='taskList']]:list-none [&_ul]:list-disc [&_ul]:pl-6 [&_video]:w-full [&_video]:rounded-[0.95rem]"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(articleHtml) }}
          />
        ) : (
          <div className="space-y-6">
            {paragraphs.map((paragraph, index) => (
              <p className="text-[1rem] leading-8 text-foreground/82" key={`${index}-${paragraph.slice(0, 20)}`}>
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {item.type === "article" && fallbackVideos.length > 0 ? (
          <div className="space-y-4">
            {fallbackVideos.map((video) => (
              <div className="overflow-hidden rounded-[0.95rem] border border-border/70 bg-slate-950" key={video.id}>
                <video className="h-auto w-full" controls preload="metadata" src={video.url} />
              </div>
            ))}
          </div>
        ) : null}
      </article>

      <section className="space-y-5 border-t border-border/60 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PostInteractionBar
            compact
            hideFollow
            iconOnly
            plain
            authorId={item.author.id}
            favoriteCount={item.engagement.favoriteCount}
            isPublished={item.status === "published"}
            likeCount={item.engagement.likeCount}
            postId={item.id}
            shareCount={item.engagement.shareCount}
            sharePath={APP_ROUTES.postDetail.replace(":id", item.id)}
            viewCount={item.viewCount}
            viewer={item.engagement.viewer}
          />

          <div className="flex items-center gap-2">
            {authStatus === "authenticated" && !isAuthor ? (
              <ReportActionSheet
                description="请填写举报理由，并至少上传 1 张证据图。"
                onSubmit={(input) =>
                  apiClient.reportPost(item.id, input).then(() => {
                    void queryClient.invalidateQueries({ queryKey: ["post-detail", id] });
                  })
                }
                title="举报内容"
                trigger={
                  <Button
                    aria-label="举报内容"
                    className={cn(
                      "group inline-flex size-9 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 shadow-none",
                      "hover:!bg-transparent active:translate-y-0",
                      "focus-visible:ring-2 focus-visible:ring-orange-400/45 focus-visible:ring-offset-2"
                    )}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <AlertTriangleIcon
                      className={cn(
                        "size-4 transition-transform duration-150 ease-out",
                        "text-muted-foreground group-hover:text-orange-600 group-active:scale-[0.92]",
                        "dark:group-hover:text-orange-400"
                      )}
                    />
                  </Button>
                }
              />
            ) : null}

            {isAuthor ? (
              <Button
                onClick={() => {
                  setActionError(null);
                  void apiClient
                    .deletePost(item.id)
                    .then(() => {
                      void queryClient.invalidateQueries({ queryKey: ["home-shell-feed"] });
                      void navigate(APP_ROUTES.feedHome, { replace: true });
                    })
                    .catch((value: unknown) => {
                      setActionError(value instanceof Error ? value.message : "删除帖子失败");
                    });
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Trash2Icon className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {actionError ? (
          <Alert className="rounded-none border-border/80 bg-transparent text-foreground" variant="destructive">
            <AlertTitle>帖子操作失败</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}
      </section>

      <section className="space-y-4 border-t border-border/60 pt-6" id="post-comment-area">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <MessageSquareTextIcon className="size-4.5 text-primary" />
              评论区
            </div>
            <div className="flex items-center gap-2">
              {(["latest", "hot"] as const).map((item) => (
                <button
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    commentSort === item
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/70 text-muted-foreground hover:text-foreground"
                  )}
                  key={item}
                  onClick={() => setCommentSort(item)}
                  type="button"
                >
                  {item === "latest" ? "最新" : "热门"}
                </button>
              ))}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">共 {item.commentCount} 条评论</div>
          {isCommentRefreshing ? (
            <div className="text-xs text-muted-foreground">评论区正在更新...</div>
          ) : null}
        </div>

        <div className="border border-border/70 bg-white px-5 py-5">
          {authStatus !== "authenticated" ? (
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
          ) : item.status !== "published" ? (
            <div className="border border-border/60 px-3 py-2 text-sm text-muted-foreground">
              只有已发布的帖子才允许继续评论。
            </div>
          ) : (
            <InlineCommentComposer
              busy={isSubmitting}
              disabled={isSubmitting}
              onChange={setCommentContent}
              onSubmit={() => {
                if (!commentContent.trim()) {
                  return;
                }

                setCommentError(null);
                setIsSubmitting(true);

                void apiClient
                  .createPostComment(item.id, {
                    content: commentContent
                  })
                  .then((payload) => {
                    patchPostCommentCreated(queryClient, item.id, payload.item);
                    setCommentContent("");
                    startTransition(() => {
                      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
                    });
                  })
                  .catch((value: unknown) => {
                    setCommentError(value instanceof Error ? value.message : "评论失败");
                  })
                  .finally(() => {
                    setIsSubmitting(false);
                  });
              }}
              placeholder="写下你的评论..."
              value={commentContent}
            />
          )}

          {commentError ? (
            <Alert className="mt-4" variant="destructive">
              <AlertTitle>评论提交失败</AlertTitle>
              <AlertDescription>{commentError}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <div className="border border-border/70 bg-white">
          {item.comments.length > 0 ? (
            <div className="space-y-0 px-5 py-4">
              <PostCommentThread
                canInteract={canComment}
                className="border-y-0"
                collapsedRootLimit={3}
                comments={item.comments}
                currentUserId={currentUser?.id}
                isRefreshing={isCommentRefreshing}
                postId={item.id}
                showPendingComment={isSubmitting}
                sortOrder={commentSort}
                totalCommentCount={item.commentCount}
              />
            </div>
          ) : (
            <div className="px-5 py-5">
              {isSubmitting ? (
                <PostCommentThread
                  canInteract={canComment}
                  className="border-y-0"
                  comments={[]}
                  currentUserId={currentUser?.id}
                  postId={item.id}
                  showPendingComment
                  sortOrder={commentSort}
                />
              ) : (
                <div className="text-[0.82rem] text-muted-foreground">欢迎留下第一条评论。</div>
              )}
            </div>
          )}
        </div>
      </section>
    </ImmersivePageShell>
  );
}
