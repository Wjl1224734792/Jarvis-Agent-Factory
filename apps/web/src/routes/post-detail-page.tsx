import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  MessageSquareTextIcon,
  SendIcon,
  Trash2Icon
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "../features/auth/auth-store";
import { PostCommentThread } from "../features/posts/post-comment-thread";
import { PostInteractionBar } from "../features/posts/post-interaction-bar";
import { apiClient } from "../lib/api-client";

export function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.user);
  const [commentContent, setCommentContent] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postQuery = useQuery({
    queryKey: ["post-detail", id],
    queryFn: () => apiClient.getPostDetail(id),
    enabled: Boolean(id)
  });

  if (!id) {
    return (
      <Alert variant="destructive">
        <AlertTitle>缺少帖子标识</AlertTitle>
        <AlertDescription>当前 URL 不完整，无法加载帖子详情。</AlertDescription>
      </Alert>
    );
  }

  if (postQuery.isLoading) {
    return (
      <Card className="rounded-[1.125rem] border-border/80">
        <CardContent className="px-6 py-8 text-sm text-muted-foreground">
          正在加载帖子详情...
        </CardContent>
      </Card>
    );
  }

  if (postQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>帖子加载失败</AlertTitle>
        <AlertDescription>{postQuery.error.message}</AlertDescription>
      </Alert>
    );
  }

  const item = postQuery.data?.item;

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

  return (
    <main className="flex flex-col gap-8">
      <Button asChild className="w-fit" variant="ghost">
        <Link to={APP_ROUTES.feedHome}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回首页内容流
        </Link>
      </Button>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="flex flex-col gap-5 rounded-[1.25rem] bg-card px-6 py-7 ring-1 ring-border/80 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{item.author.displayName}</Badge>
            <Badge variant="outline">
              {new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}
            </Badge>
            <Badge variant="outline">评论 {item.commentCount}</Badge>
            {item.status !== "published" ? <Badge>{item.status}</Badge> : null}
          </div>

          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {item.title}
            </h1>
            <p className="mt-4 text-base leading-8 text-muted-foreground">{item.content}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {authStatus === "authenticated" && !isAuthor ? (
              <Button
                onClick={() => {
                  setActionError(null);
                  void apiClient
                    .reportPost(item.id, {
                      reason: "疑似广告或不当内容"
                    })
                    .then(() => {
                      void queryClient.invalidateQueries({ queryKey: ["post-detail", id] });
                    })
                    .catch((value: unknown) => {
                      setActionError(value instanceof Error ? value.message : "举报失败");
                    });
                }}
                type="button"
                variant="outline"
              >
                <AlertTriangleIcon data-icon="inline-start" />
                举报
              </Button>
            ) : null}

            {isAuthor ? (
              <Button
                onClick={() => {
                  setActionError(null);
                  void apiClient
                    .deletePost(item.id)
                    .then(() => {
                      void queryClient.invalidateQueries({ queryKey: ["home-feed"] });
                      navigate(APP_ROUTES.feedHome, { replace: true });
                    })
                    .catch((value: unknown) => {
                      setActionError(value instanceof Error ? value.message : "删除帖子失败");
                    });
                }}
                type="button"
                variant="outline"
              >
                <Trash2Icon data-icon="inline-start" />
                删除帖子
              </Button>
            ) : null}
          </div>
        </div>

        {item.images.length > 0 ? (
          <div className="overflow-hidden rounded-[1.25rem] border border-border/80 bg-card shadow-sm">
            <img
              alt={item.images[0]!.fileName}
              className="h-full max-h-[420px] w-full object-cover"
              src={item.images[0]!.url}
            />
          </div>
        ) : (
          <Card className="rounded-[1.25rem] border-border/80 shadow-sm">
            <CardContent className="flex h-full min-h-[260px] items-center justify-center px-6 py-8 text-sm text-muted-foreground">
              这是一条纯文字内容。
            </CardContent>
          </Card>
        )}
      </section>

      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>帖子操作失败</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-6">
          <Card className="rounded-[1.125rem] border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">帖子互动</CardTitle>
              <CardDescription>继续点赞、收藏、分享，或关注作者。</CardDescription>
            </CardHeader>
            <CardContent>
              <PostInteractionBar
                authorId={item.author.id}
                favoriteCount={item.engagement.favoriteCount}
                isPublished={item.status === "published"}
                likeCount={item.engagement.likeCount}
                postId={item.id}
                shareCount={item.engagement.shareCount}
                viewer={item.engagement.viewer}
              />
            </CardContent>
          </Card>

          <Card className="rounded-[1.125rem] border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">发表评论</CardTitle>
              <CardDescription>补充经验、提出异议或继续追问都可以。</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {authStatus !== "authenticated" ? (
                <Alert>
                  <AlertTitle>需要登录</AlertTitle>
                  <AlertDescription>登录后即可参与评论、回复、点赞和关注。</AlertDescription>
                </Alert>
              ) : item.status !== "published" ? (
                <Alert>
                  <AlertTitle>帖子暂不可评论</AlertTitle>
                  <AlertDescription>只有已发布帖子才允许继续评论。</AlertDescription>
                </Alert>
              ) : (
                <>
                  <Textarea
                    aria-label="帖子评论内容"
                    className="min-h-28"
                    onChange={(event) => {
                      setCommentContent(event.target.value);
                    }}
                    placeholder="写下你的看法、补充经验或不同观点。"
                    value={commentContent}
                  />
                  <Button
                    disabled={!commentContent.trim() || isSubmitting}
                    onClick={() => {
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
                            queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
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
                    type="button"
                  >
                    <SendIcon data-icon="inline-start" />
                    {isSubmitting ? "提交中..." : "提交评论"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[1.125rem] border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">评论区</CardTitle>
            <CardDescription>当前共有 {item.commentCount} 条评论。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {item.comments.length > 0 ? (
              <PostCommentThread
                canInteract={canComment}
                comments={item.comments}
                currentUserId={currentUser?.id}
                postId={item.id}
              />
            ) : (
              <Alert>
                <AlertTitle>还没有评论</AlertTitle>
                <AlertDescription>欢迎留下第一条评论。</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
