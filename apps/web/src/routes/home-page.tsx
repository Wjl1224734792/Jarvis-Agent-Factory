import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  EyeIcon,
  FlameIcon,
  HeartIcon,
  ImageIcon,
  MessageCircleIcon,
  PlaySquareIcon,
  Rows3Icon,
  Share2Icon,
  SquarePenIcon,
  BookmarkIcon,
  UsersIcon
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SiteGrid, SitePage, SitePanel, SitePanelBody, SiteRail } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "../features/auth/auth-store";
import { PostCommentThread } from "../features/posts/post-comment-thread";
import { PostInteractionBar } from "../features/posts/post-interaction-bar";
import { apiClient } from "../lib/api-client";
import { getAvatarImage, getEditorialImage, getModelImage } from "../lib/aviation-media";

const feedTabs = [
  { id: "recommended", label: "推荐", icon: FlameIcon },
  { id: "following", label: "关注", icon: UsersIcon },
  { id: "latest", label: "最新", icon: Rows3Icon }
] as const;

const spotlightTopics = ["资讯", "测评", "航拍", "技术"] as const;

type FeedTab = (typeof feedTabs)[number]["id"];

function articleViewCount(likeCount: number, commentCount: number, shareCount: number) {
  return Math.max(likeCount * 12 + commentCount * 8 + shareCount * 10, 18);
}

export function HomePage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const authStatus = useAuthStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.user);
  const isAuthenticated = authStatus === "authenticated";
  const [activeTab, setActiveTab] = useState<FeedTab>("recommended");
  const [articleComment, setArticleComment] = useState("");
  const [articleError, setArticleError] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const articleId = searchParams.get("article");

  const feedQuery = useQuery({
    queryKey: ["home-shell-feed", activeTab],
    queryFn: () => apiClient.listHomeFeed(activeTab)
  });

  const modelsQuery = useQuery({
    queryKey: ["home-shell-models"],
    queryFn: () => apiClient.listModels()
  });

  const rankingsQuery = useQuery({
    queryKey: ["home-shell-rankings"],
    queryFn: () => apiClient.listRankings()
  });

  const articleDetailQuery = useQuery({
    queryKey: ["home-article-detail", articleId],
    queryFn: () => apiClient.getPostDetail(articleId ?? ""),
    enabled: Boolean(articleId)
  });

  const recommendedAuthors = useMemo(() => {
    const authors =
      feedQuery.data?.items.map((item) => item.author).filter((author, index, source) => {
        return source.findIndex((entry) => entry.id === author.id) === index;
      }) ?? [];

    return authors.slice(0, 2);
  }, [feedQuery.data?.items]);

  const feedItems = feedQuery.data?.items ?? [];
  const hotModels = modelsQuery.data?.items.slice(0, 2) ?? [];
  const risingTopics = rankingsQuery.data?.official.items.slice(0, 3) ?? [];
  const articleItem = articleDetailQuery.data?.item;

  function openArticle(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set("article", id);
    setSearchParams(next);
  }

  function closeArticle() {
    const next = new URLSearchParams(searchParams);
    next.delete("article");
    setSearchParams(next);
    setArticleComment("");
    setArticleError(null);
  }

  return (
    <SitePage>
      <SiteGrid variant="sidebar">
        <div className="flex min-w-0 flex-col gap-0 overflow-hidden rounded-[1rem] border border-border/70 bg-background shadow-[0_10px_26px_-24px_rgba(15,23,42,0.16)]">
          <div className="border-b border-border/70 px-5 py-4">
            <Tabs
              onValueChange={(value) => {
                setActiveTab(value as FeedTab);
              }}
              value={activeTab}
            >
              <TabsList className="w-full justify-start overflow-x-auto" variant="line">
                {feedTabs.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TabsTrigger key={item.id} value={item.id}>
                      <Icon data-icon="inline-start" />
                      {item.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          {feedQuery.isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div className="border-b border-border/70 px-5 py-6 last:border-b-0" key={index}>
                  <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
                    <div className="h-32 animate-pulse rounded-[0.9rem] bg-muted" />
                    <div className="space-y-3">
                      <div className="h-8 w-5/6 animate-pulse rounded bg-muted" />
                      <div className="h-5 w-full animate-pulse rounded bg-muted" />
                      <div className="h-5 w-4/5 animate-pulse rounded bg-muted" />
                      <div className="flex gap-4 pt-2">
                        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            : null}

          {feedQuery.isError ? (
            <div className="px-5 py-5">
              <Alert variant="destructive">
                <AlertTitle>首页内容加载失败</AlertTitle>
                <AlertDescription>{feedQuery.error.message}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          {feedItems.map((item, index) => (
            <article className="border-b border-border/70 px-5 py-6 last:border-b-0" key={item.id}>
              <button className="block w-full text-left" onClick={() => openArticle(item.id)} type="button">
                <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)] md:items-start">
                  <div className="overflow-hidden rounded-[0.95rem] bg-surface-2">
                    <img
                      alt={item.title}
                      className="h-32 w-full object-cover"
                      src={item.images[0]?.url ?? getEditorialImage(item.id, index)}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>{item.author.displayName}</span>
                      <span>·</span>
                      <span>
                        {new Date(item.publishedAt ?? item.createdAt).toLocaleString("zh-CN", {
                          hour12: false
                        })}
                      </span>
                      <Badge variant="eyebrow">{spotlightTopics[index % spotlightTopics.length]}</Badge>
                    </div>

                    <h2 className="mt-3 text-[2rem] leading-tight font-semibold tracking-[-0.03em] text-foreground">
                      {item.title}
                    </h2>

                    <p className="mt-4 line-clamp-3 text-[1.05rem] leading-8 text-foreground/82">
                      {item.contentPreview}
                      <span className="ml-2 text-primary">阅读全文</span>
                    </p>
                  </div>
                </div>
              </button>

              <div className="mt-5 flex flex-wrap items-center gap-5 text-[0.98rem] text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <HeartIcon className="size-4" />
                  喜欢 {item.engagement.likeCount}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MessageCircleIcon className="size-4" />
                  {item.commentCount} 条评论
                </span>
                <span className="inline-flex items-center gap-2">
                  <BookmarkIcon className="size-4" />
                  {item.engagement.favoriteCount}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Share2Icon className="size-4" />
                  分享
                </span>
                <span className="ml-auto inline-flex items-center gap-2">
                  <EyeIcon className="size-4" />
                  {articleViewCount(
                    item.engagement.likeCount,
                    item.commentCount,
                    item.engagement.shareCount
                  )}
                </span>
              </div>
            </article>
          ))}

          {!feedQuery.isLoading && !feedQuery.isError && feedItems.length === 0 ? (
            <div className="px-5 py-5">
              <Alert>
                <AlertTitle>首页还没有内容</AlertTitle>
                <AlertDescription>
                  {isAuthenticated
                    ? "切换到飞友圈浏览动态，或直接发布你的第一条飞行记录。"
                    : `${APP_NAME} 还没有公开内容，登录后可以先发布一条动态。`}
                </AlertDescription>
              </Alert>
            </div>
          ) : null}
        </div>

        <SiteRail>
          <SitePanel variant="highlight">
            <SitePanelBody className="space-y-5">
              <div>
                <div className="text-3xl font-semibold leading-tight">开启你的飞行记录</div>
                <p className="mt-3 text-sm leading-7 text-panel-highlight-foreground/80">
                  分享你的最新作品，连接全球飞友社区。
                </p>
              </div>
              <Button asChild size="xl" variant="panel">
                <Link to={APP_ROUTES.compose}>
                  <SquarePenIcon data-icon="inline-start" />
                  立即发布
                </Link>
              </Button>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                {[
                  { label: "图片", icon: ImageIcon },
                  { label: "视频", icon: PlaySquareIcon },
                  { label: "长文", icon: Rows3Icon }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div className="rounded-[calc(var(--radius-panel)-0.3rem)] bg-white/10 px-3 py-4" key={item.label}>
                      <Icon className="mx-auto size-5" />
                      <div className="mt-2">{item.label}</div>
                    </div>
                  );
                })}
              </div>
            </SitePanelBody>
          </SitePanel>

          <Card variant="default">
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xl font-semibold text-foreground">热门机型</div>
                <Button asChild size="sm" variant="ghost">
                  <Link to={APP_ROUTES.models}>查看全部</Link>
                </Button>
              </div>
              {hotModels.map((model, index) => (
                <div className="flex items-center gap-3" key={model.id}>
                  <img
                    alt={model.name}
                    className="h-16 w-22 rounded-[calc(var(--radius-control)+0.1rem)] object-cover"
                    src={getModelImage(model.slug, model.powerType, index)}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold text-foreground">{model.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {model.brand.name} · {model.category.name}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card variant="default">
            <CardContent className="space-y-4">
              <div className="text-xl font-semibold text-foreground">实时飙升榜</div>
              {risingTopics.map((item) => (
                <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3" key={item.model.slug}>
                  <div className="text-3xl font-semibold italic text-primary/40">
                    {item.rank.toString().padStart(2, "0")}
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-foreground">{item.model.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {item.totalReviews.toLocaleString("zh-CN")} 条真实点评
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card variant="muted">
            <CardContent className="space-y-4">
              <div className="text-xl font-semibold text-foreground">推荐飞友</div>
              {recommendedAuthors.map((author) => (
                <div className="flex items-center justify-between gap-3" key={author.id}>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar>
                      <AvatarImage alt={author.displayName} src={getAvatarImage(author.id)} />
                      <AvatarFallback>{author.displayName.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-base font-medium text-foreground">
                        {author.displayName}
                      </div>
                      <div className="text-sm text-muted-foreground">资深航拍飞手</div>
                    </div>
                  </div>
                  <Button size="sm" variant="panel">
                    关注
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </SiteRail>
      </SiteGrid>

      {articleId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/62 p-4 backdrop-blur-sm">
          <div className="grid h-[min(88vh,900px)] w-full max-w-[1440px] overflow-hidden rounded-[1.5rem] bg-background shadow-[0_40px_120px_-48px_rgba(15,23,42,0.5)] xl:grid-cols-[minmax(0,1fr)_420px]">
            {articleItem ? (
              <>
                <div className="min-h-0 overflow-y-auto border-r border-border/70 bg-background">
                  <div className="mx-auto max-w-[820px] px-8 py-8">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar size="lg">
                          <AvatarImage alt={articleItem.author.displayName} src={getAvatarImage(articleItem.author.id)} />
                          <AvatarFallback>{articleItem.author.displayName.slice(0, 1)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-lg font-semibold text-foreground">{articleItem.author.displayName}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(articleItem.publishedAt ?? articleItem.createdAt).toLocaleString("zh-CN", {
                              hour12: false
                            })}
                          </div>
                        </div>
                      </div>
                      <Button onClick={closeArticle} size="sm" type="button" variant="ghost">
                        关闭
                      </Button>
                    </div>

                    <div className="mt-8">
                      <h2 className="text-[2.4rem] leading-tight font-semibold tracking-[-0.04em] text-foreground">
                        {articleItem.title}
                      </h2>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <Badge variant="eyebrow">长文</Badge>
                        <span>{articleViewCount(articleItem.engagement.likeCount, articleItem.commentCount, articleItem.engagement.shareCount)} 浏览</span>
                        <span>{articleItem.commentCount} 条评论</span>
                      </div>
                    </div>

                    <div className="mt-8 overflow-hidden rounded-[1.1rem] bg-surface-2">
                      <img
                        alt={articleItem.title}
                        className="w-full object-cover"
                        src={articleItem.images[0]?.url ?? getEditorialImage(articleId)}
                      />
                    </div>

                    <article className="prose prose-slate mt-8 max-w-none">
                      <p className="whitespace-pre-wrap text-[1.06rem] leading-9 text-foreground/88">
                        {articleItem.content}
                      </p>
                    </article>
                  </div>
                </div>

                <div className="flex min-h-0 flex-col bg-background">
                  <div className="border-b border-border/70 px-5 py-5">
                    <div className="text-lg font-semibold text-foreground">评论区</div>
                    <div className="mt-1 text-sm text-muted-foreground">共 {articleItem.commentCount} 条评论</div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                    {articleItem.comments.length > 0 ? (
                      <PostCommentThread
                        canInteract={isAuthenticated && articleItem.status === "published"}
                        comments={articleItem.comments}
                        currentUserId={currentUser?.id}
                        postId={articleItem.id}
                      />
                    ) : (
                      <Alert>
                        <AlertTitle>还没有评论</AlertTitle>
                        <AlertDescription>欢迎留下第一条评论。</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="border-t border-border/70 px-5 py-4">
                    <div className="mb-4 flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <HeartIcon className="size-4" />
                        喜欢 {articleItem.engagement.likeCount}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <BookmarkIcon className="size-4" />
                        收藏 {articleItem.engagement.favoriteCount}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Share2Icon className="size-4" />
                        分享 {articleItem.engagement.shareCount}
                      </span>
                    </div>

                    {isAuthenticated && articleItem.status === "published" ? (
                      <div className="flex items-end gap-3">
                        <Textarea
                          className="min-h-20"
                          onChange={(event) => setArticleComment(event.target.value)}
                          placeholder="写下你的评论..."
                          value={articleComment}
                        />
                        <Button
                          disabled={!articleComment.trim() || isSubmittingComment}
                          onClick={() => {
                            setArticleError(null);
                            setIsSubmittingComment(true);

                            void apiClient
                              .createPostComment(articleItem.id, { content: articleComment })
                              .then(() => {
                                setArticleComment("");
                                return Promise.all([
                                  queryClient.invalidateQueries({ queryKey: ["home-article-detail", articleId] }),
                                  queryClient.invalidateQueries({ queryKey: ["post-detail", articleItem.id] }),
                                  queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
                                  queryClient.invalidateQueries({ queryKey: ["notifications"] })
                                ]);
                              })
                              .catch((value: unknown) => {
                                setArticleError(value instanceof Error ? value.message : "评论失败");
                              })
                              .finally(() => {
                                setIsSubmittingComment(false);
                              });
                          }}
                          type="button"
                        >
                          发送
                        </Button>
                      </div>
                    ) : null}

                    {articleError ? (
                      <Alert className="mt-4" variant="destructive">
                        <AlertTitle>评论失败</AlertTitle>
                        <AlertDescription>{articleError}</AlertDescription>
                      </Alert>
                    ) : null}
                  </div>
                </div>
              </>
            ) : articleDetailQuery.isLoading ? (
              <div className="col-span-2 flex h-full items-center justify-center text-sm text-muted-foreground">
                正在加载文章...
              </div>
            ) : (
              <div className="col-span-2 flex h-full items-center justify-center p-8 text-sm text-destructive">
                {articleDetailQuery.error?.message}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </SitePage>
  );
}
