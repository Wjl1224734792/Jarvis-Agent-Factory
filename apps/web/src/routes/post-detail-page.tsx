import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  EyeIcon,
  MessageSquareTextIcon,
  SendIcon,
  Trash2Icon
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  SiteGrid,
  SitePage,
  SitePanel,
  SitePanelBody,
  SiteRail
} from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "../features/auth/auth-store";
import { PostCommentThread } from "../features/posts/post-comment-thread";
import { PostInteractionBar } from "../features/posts/post-interaction-bar";
import { apiClient } from "../lib/api-client";
import { getAvatarImage, getEditorialImage } from "../lib/aviation-media";

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
      <Card className="rounded-[1.9rem] border-border/80 bg-card/94">
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
    <SitePage>
      <Button asChild className="w-fit rounded-full" variant="ghost">
        <Link to={APP_ROUTES.flightCircle}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回飞友圈
        </Link>
      </Button>

      <SiteGrid variant="sidebar">
        <div className="flex flex-col gap-6">
          <SitePanel className="overflow-hidden">
            <div className="overflow-hidden border-b border-border/80">
              <img
                alt={item.title}
                className="h-[420px] w-full object-cover"
                src={item.images[0]?.url ?? getEditorialImage(item.id)}
              />
            </div>

            <SitePanelBody className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {item.status === "published" ? "PUBLISHED" : item.status.toUpperCase()}
                </Badge>
                <Badge variant="outline">评论 {item.commentCount}</Badge>
              </div>

              <div className="flex items-center gap-4">
                <Avatar size="lg">
                  <AvatarImage alt={item.author.displayName} src={getAvatarImage(item.author.id)} />
                  <AvatarFallback>{item.author.displayName.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-lg font-semibold text-foreground">{item.author.displayName}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}
                  </div>
                </div>
              </div>

              <h1 className="text-[2.8rem] font-semibold leading-tight tracking-tight text-foreground">
                {item.title}
              </h1>
              <p className="text-base leading-8 text-muted-foreground">{item.content}</p>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/80 pt-5">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <EyeIcon className="size-4" />
                  {Math.max(
                    item.engagement.likeCount * 14 + item.commentCount * 9 + item.engagement.shareCount * 12,
                    24
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PostInteractionBar
                    compact
                    hideFollow
                    iconOnly
                    authorId={item.author.id}
                    favoriteCount={item.engagement.favoriteCount}
                    isPublished={item.status === "published"}
                    likeCount={item.engagement.likeCount}
                    postId={item.id}
                    shareCount={item.engagement.shareCount}
                    viewer={item.engagement.viewer}
                  />

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
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <AlertTriangleIcon />
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
                            navigate(APP_ROUTES.flightCircle, { replace: true });
                          })
                          .catch((value: unknown) => {
                            setActionError(value instanceof Error ? value.message : "删除帖子失败");
                          });
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Trash2Icon />
                    </Button>
                  ) : null}
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Commentary</div>
                  <div className="mt-2 text-3xl font-semibold text-foreground">发表评论</div>
                </div>
                <div className="text-sm text-muted-foreground">共 {item.commentCount} 条评论</div>
              </div>

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
                    className="min-h-32"
                    onChange={(event) => {
                      setCommentContent(event.target.value);
                    }}
                    placeholder="写下你的看法、补充经验或不同观点。"
                    value={commentContent}
                  />
                  <div className="flex justify-end">
                    <Button
                      className="px-6"
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
                  </div>
                </>
              )}

              {actionError ? (
                <Alert variant="destructive">
                  <AlertTitle>帖子操作失败</AlertTitle>
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              ) : null}
            </SitePanelBody>
          </SitePanel>
        </div>

        <SiteRail>
          <Card variant="muted">
            <CardContent className="space-y-5">
              <div>
                <div className="text-sm uppercase tracking-[0.28em] text-muted-foreground">Thread</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">评论区</div>
              </div>

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

          <Card variant="muted">
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-xl font-semibold text-foreground">
                <MessageSquareTextIcon className="size-5 text-primary" />
                阅读建议
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                如果这是一条测试记录或机型心得，建议继续补充飞行环境、机型配置与时间信息，方便后续引用。
              </p>
            </CardContent>
          </Card>
        </SiteRail>
      </SiteGrid>
    </SitePage>
  );
}
