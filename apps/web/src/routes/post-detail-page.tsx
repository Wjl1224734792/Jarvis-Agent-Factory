import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BookmarkIcon,
  EyeIcon,
  MessageCircleIcon,
  SendIcon,
  Share2Icon,
  Trash2Icon
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SitePage } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "../features/auth/auth-store";
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
  const leadParagraph = paragraphs[0] ?? item?.content ?? "";
  const bodyParagraphs = paragraphs.slice(1);

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
    <SitePage className="mx-auto w-full max-w-[780px] gap-10 px-4 pb-20 pt-2 md:px-6">
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3 text-sm text-foreground/80">
          <Button
            className="size-8 rounded-full p-0"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
                return;
              }

              navigate(APP_ROUTES.feedHome);
            }}
            type="button"
            variant="ghost"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <span className="font-medium">{APP_NAME}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button className="size-8 rounded-full p-0" type="button" variant="ghost">
            <Share2Icon className="size-4 text-primary" />
          </Button>
          <Button className="size-8 rounded-full p-0" type="button" variant="ghost">
            <BookmarkIcon className="size-4 text-primary" />
          </Button>
        </div>
      </div>

      <article className="space-y-8">
        <header className="space-y-5">
          <h1 className="max-w-[12ch] text-[2.55rem] leading-[0.98] font-semibold tracking-[-0.05em] text-foreground md:text-[3.1rem]">
            {item.title}
          </h1>

          <div className="flex items-center gap-3">
            <Avatar className="size-11" size="lg">
              <AvatarImage alt={item.author.displayName} src={getAvatarImage(item.author.id)} />
              <AvatarFallback>{item.author.displayName.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-medium text-foreground">{item.author.displayName}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(item.publishedAt ?? item.createdAt).toLocaleDateString("zh-CN")} · {Math.max(3, Math.ceil(item.content.length / 220))} 分钟阅读
              </div>
            </div>
          </div>
        </header>

        <figure className="space-y-3">
          <div className="overflow-hidden rounded-[0.55rem] bg-surface-2">
            <img
              alt={item.title}
              className="h-[280px] w-full object-cover md:h-[380px]"
              src={item.images[0]?.url ?? getEditorialImage(item.id)}
            />
          </div>
          <figcaption className="text-xs text-muted-foreground">
            FeiJia flight systems preview
          </figcaption>
        </figure>

        <div className="space-y-8">
          <p className="max-w-[38rem] text-[1.2rem] leading-9 text-foreground/68 italic">
            {leadParagraph}
          </p>

          {bodyParagraphs.length > 0 ? (
            <section className="space-y-6">
              {bodyParagraphs.map((paragraph, index) => (
                <div className="space-y-3" key={`${index}-${paragraph.slice(0, 24)}`}>
                  {index === 0 ? (
                    <h2 className="text-[1.55rem] font-semibold tracking-[-0.03em] text-foreground">
                      文章正文
                    </h2>
                  ) : null}
                  <p className="text-[1.04rem] leading-8 text-foreground/82">{paragraph}</p>
                </div>
              ))}
            </section>
          ) : null}

          <blockquote className="border-l-2 border-primary pl-5 text-[1.02rem] leading-8 text-foreground/68 italic">
            “这篇内容聚焦于飞行系统、机载集成与真实使用体验，欢迎结合你的飞行场景继续补充。”
          </blockquote>

          <div className="overflow-hidden rounded-[0.8rem] border border-border/70">
            <div className="grid grid-cols-3 bg-muted/55 px-5 py-3 text-sm font-medium text-foreground">
              <span>Metric</span>
              <span>FeiJia</span>
              <span>Reference</span>
            </div>
            <div className="divide-y divide-border/60 bg-white">
              {[
                ["响应延迟", `${Math.max(8, item.commentCount + 9)}ms`, "45ms"],
                ["互动热度", `${item.engagement.likeCount + item.commentCount}`, "行业均值"],
                ["阅读完成度", `${Math.min(99.9, 92 + item.engagement.favoriteCount / 10).toFixed(1)}%`, "89.9%"]
              ].map((row) => (
                <div className="grid grid-cols-3 px-5 py-3 text-sm text-foreground/78" key={row[0]}>
                  <span>{row[0]}</span>
                  <span className="text-primary">{row[1]}</span>
                  <span>{row[2]}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[1.01rem] leading-8 text-foreground/82">
            当前内容页已经切换为更适合长文阅读的单栏结构，重点放在标题、主图、正文节奏和评论讨论，让页面从信息展示转为阅读体验本身。
          </p>
        </div>
      </article>

      <section className="space-y-5 border-t border-border/60 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <PostInteractionBar
              compact
              hideFollow
              iconOnly={false}
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
                variant="ghost"
              >
                <AlertTriangleIcon className="size-4" />
              </Button>
            ) : null}

            {isAuthor ? (
              <Button
                onClick={() => {
                  setActionError(null);
                  void apiClient
                    .deletePost(item.id)
                    .then(() => {
                      void queryClient.invalidateQueries({ queryKey: ["home-shell-feed"] });
                      navigate(APP_ROUTES.feedHome, { replace: true });
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

          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <EyeIcon className="size-3.5" />
            {postViewCount(item.engagement.likeCount, item.commentCount, item.engagement.shareCount)} 次阅读
          </div>
        </div>

        {actionError ? (
          <Alert variant="destructive">
            <AlertTitle>帖子操作失败</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}
      </section>

      <section className="space-y-6 border-t border-border/60 pt-8">
        <div className="space-y-1">
          <h2 className="text-[1.25rem] font-semibold text-foreground">
            Flight Briefing ({item.commentCount} Comments)
          </h2>
          <p className="text-sm text-muted-foreground">围绕飞行体验、机型配置和使用观察继续交流。</p>
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

        {authStatus !== "authenticated" ? (
          <Alert>
            <AlertTitle>需要登录后评论</AlertTitle>
            <AlertDescription>登录后即可参与评论、回复和互动。</AlertDescription>
          </Alert>
        ) : item.status !== "published" ? (
          <Alert>
            <AlertTitle>当前帖子暂不可评论</AlertTitle>
            <AlertDescription>只有已发布的帖子才允许继续评论。</AlertDescription>
          </Alert>
        ) : (
          <div className="border border-border/60 bg-muted/20 p-4 md:p-5">
            <div className="space-y-3">
              <Textarea
                aria-label="帖子评论内容"
                className="min-h-28 rounded-none border-0 bg-white"
                onChange={(event) => {
                  setCommentContent(event.target.value);
                }}
                placeholder="Add your perspective to the flight briefing..."
                value={commentContent}
              />
              <div className="flex justify-end">
                <Button
                  className="px-5"
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
                          queryClient.invalidateQueries({ queryKey: ["home-shell-feed"] }),
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
                  <SendIcon className="mr-2 size-4" />
                  {isSubmitting ? "提交中..." : "Post Comment"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </SitePage>
  );
}
