import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  EyeIcon,
  Trash2Icon,
  UserCheckIcon,
  UserPlusIcon
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DetailPageSkeleton } from "@/components/page-skeletons";
import { ProfileLink } from "@/components/profile-link";
import { ReportActionSheet } from "@/components/report-action-sheet";
import { SitePage } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sanitizeHtml } from "@/lib/sanitize";
import { useAuthStore } from "../features/auth/auth-store";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { InlineCommentComposer } from "../features/posts/inline-comment-composer";
import { PostCommentThread } from "../features/posts/post-comment-thread";
import { PostInteractionBar } from "../features/posts/post-interaction-bar";
import { apiClient } from "../lib/api-client";
import { getAvatarImage, getEditorialImage } from "../lib/aviation-media";

function postViewCount(likeCount: number, commentCount: number, shareCount: number) {
  return Math.max(likeCount * 14 + commentCount * 9 + shareCount * 12, 24);
}

function splitContent(content: string) {
  return content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postQuery = useQuery({
    queryKey: ["post-detail", id],
    queryFn: () => apiClient.getPostDetail(id),
    enabled: Boolean(id)
  });

  const item = postQuery.data?.item;
  const paragraphs = splitContent(item?.content ?? "");
  const articleHtml = item?.type === "article" ? item.contentHtml?.trim() ?? "" : "";

  if (!id) {
    return (
      <Alert variant="destructive">
        <AlertTitle>缺少帖子标识</AlertTitle>
        <AlertDescription>当前 URL 不完整，无法加载帖子详情。</AlertDescription>
      </Alert>
    );
  }

  if (postQuery.isLoading) {
    return <DetailPageSkeleton />;
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
    <SitePage className="mx-auto w-full max-w-[840px] gap-8 bg-white px-4 pb-28 pt-2 md:px-6">
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
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

        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <EyeIcon className="size-3.5" />
          {postViewCount(item.engagement.likeCount, item.commentCount, item.engagement.shareCount)}
        </div>
      </div>

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
                  setActionError(null);
                  void apiClient
                    .toggleFollow(item.author.id)
                    .then(() => {
                      return Promise.all([
                        queryClient.invalidateQueries({ queryKey: ["post-detail", id] }),
                        queryClient.invalidateQueries({ queryKey: ["home-shell-feed"] }),
                        queryClient.invalidateQueries({ queryKey: ["circle-feed"] }),
                        queryClient.invalidateQueries({ queryKey: ["notifications"] })
                      ]);
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

        <div className="overflow-hidden rounded-[0.95rem]">
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
      </article>

      <section className="space-y-5 border-t border-border/60 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PostInteractionBar
            compact
            hideFollow
            hideShare
            iconOnly
            plain
            authorId={item.author.id}
            favoriteCount={item.engagement.favoriteCount}
            isPublished={item.status === "published"}
            likeCount={item.engagement.likeCount}
            postId={item.id}
            shareCount={item.engagement.shareCount}
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
                  <Button size="sm" type="button" variant="ghost">
                    <AlertTriangleIcon className="size-4" />
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

      <section className="space-y-4 border-t border-border/60 pt-6">
        <div className="space-y-1">
          <div className="text-lg font-semibold text-foreground">评论 {item.commentCount}</div>
          {isCommentRefreshing ? (
            <div className="text-xs text-muted-foreground">评论区正在更新...</div>
          ) : null}
        </div>

        {item.comments.length > 0 ? (
          <PostCommentThread
            canInteract={canComment}
            comments={item.comments}
            currentUserId={currentUser?.id}
            isRefreshing={isCommentRefreshing}
            postId={item.id}
            showPendingComment={isSubmitting}
          />
        ) : (
          <div className="space-y-3 border-y border-border/70 py-4">
            {isSubmitting ? (
              <PostCommentThread
                canInteract={canComment}
                comments={[]}
                currentUserId={currentUser?.id}
                postId={item.id}
                showPendingComment
              />
            ) : (
              <div className="text-sm text-muted-foreground">欢迎留下第一条评论。</div>
            )}
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/96 px-4 pb-4 pt-3 backdrop-blur md:px-6 xl:left-[calc(var(--shell-sidebar-width)+2rem)]">
        <div className="mx-auto w-full max-w-[840px]">
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

                setActionError(null);
                setIsSubmitting(true);

                void apiClient
                  .createPostComment(item.id, {
                    content: commentContent
                  })
                  .then(() => {
                    setCommentContent("");
                    return Promise.all([
                      queryClient.invalidateQueries({ queryKey: ["post-detail", id] }),
                      queryClient.invalidateQueries({ queryKey: ["home-shell-feed"] }),
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
              placeholder="写下你的评论..."
              value={commentContent}
            />
          )}
        </div>
      </div>
    </SitePage>
  );
}
