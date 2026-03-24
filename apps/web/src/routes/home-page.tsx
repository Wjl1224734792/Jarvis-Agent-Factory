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
  UsersIcon
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
        <div className="flex min-w-0 flex-col gap-[var(--page-gap)]">
          <SitePanel variant="muted">
            <SitePanelBody className="flex flex-wrap items-center justify-between gap-4">
              <Tabs
                onValueChange={(value) => {
                  setActiveTab(value as FeedTab);
                }}
                value={activeTab}
              >
                <TabsList className="w-full justify-start overflow-x-auto" variant="pills">
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

              <div className="site-chip-row">
                {spotlightTopics.map((topic) => (
                  <Badge key={topic} variant="eyebrow">
                    {topic}
                  </Badge>
                ))}
              </div>
            </SitePanelBody>
          </SitePanel>

          {feedQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index}>
                  <Card className="mx-auto max-w-[15.5rem]" variant="muted">
                    <CardContent className="space-y-4">
                      <div className="h-6 w-28 animate-pulse rounded bg-muted" />
                      <div className={`w-full animate-pulse rounded-[calc(var(--radius-panel)-0.2rem)] bg-muted ${index % 2 === 0 ? "h-44" : "h-56"}`} />
                      <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </CardContent>
                  </Card>
                  </div>
              ))}
            </div>
          ) : null}

          {feedQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>首页内容加载失败</AlertTitle>
              <AlertDescription>{feedQuery.error.message}</AlertDescription>
            </Alert>
          ) : null}

          {feedItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {feedItems.map((item, index) => (
                <div key={item.id}>
                  <Card
                    className="mx-auto max-w-[15.5rem] overflow-hidden"
                    variant={index % 3 === 0 ? "default" : "muted"}
                  >
                    <button
                      className="block w-full text-left"
                      onClick={() => openArticle(item.id)}
                      type="button"
                    >
                      <div className="overflow-hidden border-b border-border/80 bg-surface-2">
                        <img
                          alt={item.title}
                          className={`w-full object-cover transition duration-500 hover:scale-[1.03] ${index % 3 === 0 ? "h-[11rem]" : index % 3 === 1 ? "h-[14rem]" : "h-[10rem]"}`}
                          src={item.images[0]?.url ?? getEditorialImage(item.id, index)}
                        />
                      </div>
                    </button>

                    <CardContent className="space-y-3 pt-3">
                      <div className="min-h-0">
                        <button className="block w-full text-left" onClick={() => openArticle(item.id)} type="button">
                          <h2 className="text-[0.98rem] leading-snug font-semibold tracking-[-0.02em] text-foreground">
                            {item.title}
                          </h2>
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          <AvatarImage alt={item.author.displayName} src={getAvatarImage(item.author.id)} />
                          <AvatarFallback>{item.author.displayName.slice(0, 1)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate text-[0.82rem] font-medium text-foreground">
                            {item.author.displayName}
                          </div>
                          <div className="text-[0.74rem] text-muted-foreground">
                            {new Date(item.publishedAt ?? item.createdAt).toLocaleString("zh-CN", {
                              hour12: false
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <EyeIcon className="size-3.5" />
                          {Math.max(
                            item.engagement.likeCount * 12 + item.commentCount * 8 + item.engagement.shareCount * 10,
                            18
                          )}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1.5">
                            <HeartIcon className="size-3.5" />
                            {item.engagement.likeCount}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <MessageCircleIcon className="size-3.5" />
                            {item.commentCount}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Share2Icon className="size-3.5" />
                            {item.engagement.shareCount}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : null}

          {!feedQuery.isLoading && !feedQuery.isError && feedItems.length === 0 ? (
            <Alert>
              <AlertTitle>首页还没有内容</AlertTitle>
              <AlertDescription>
                {isAuthenticated
                  ? "切换到飞友圈浏览动态，或直接发布你的第一条飞行记录。"
                  : `${APP_NAME} 还没有公开内容，登录后可以先发布一条动态。`}
              </AlertDescription>
            </Alert>
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
          <div className="grid h-[min(88vh,860px)] w-full max-w-[1360px] overflow-hidden rounded-[1.75rem] bg-background shadow-[0_40px_120px_-48px_rgba(15,23,42,0.5)] xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.7fr)]">
            <div className="overflow-hidden bg-surface-2">
              {articleDetailQuery.isLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  正在加载文章...
                </div>
              ) : articleDetailQuery.isError ? (
                <div className="flex h-full items-center justify-center p-8 text-sm text-destructive">
                  {articleDetailQuery.error.message}
                </div>
              ) : (
                <img
                  alt={articleItem?.title ?? "article cover"}
                  className="h-full w-full object-cover"
                  src={articleItem?.images[0]?.url ?? getEditorialImage(articleId)}
                />
              )}
            </div>

            <div className="flex min-h-0 flex-col">
              <div className="flex items-center justify-between gap-4 border-b border-border/80 px-6 py-5">
                <div className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Article</div>
                <Button onClick={closeArticle} size="sm" type="button" variant="ghost">
                  关闭
                </Button>
              </div>

              {articleItem ? (
                <>
                  <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
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
                      <Button size="sm" type="button" variant="hero">
                        关注
                      </Button>
                    </div>

                    <div className="mt-6 space-y-5">
                      <h2 className="text-[2rem] leading-tight font-semibold tracking-[-0.04em] text-foreground">
                        {articleItem.title}
                      </h2>
                      <p className="whitespace-pre-wrap text-base leading-8 text-foreground/88">
                        {articleItem.content}
                      </p>
                    </div>

                    <div className="mt-8 border-t border-border/80 pt-6">
                      <div className="text-lg font-semibold text-foreground">评论区</div>
                      <div className="mt-1 text-sm text-muted-foreground">共 {articleItem.commentCount} 条评论</div>

                      <div className="mt-5">
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
                    </div>
                  </div>

                  <div className="border-t border-border/80 px-6 py-4">
                    <div className="mb-4">
                      <PostInteractionBar
                        authorId={articleItem.author.id}
                        compact
                        favoriteCount={articleItem.engagement.favoriteCount}
                        isPublished={articleItem.status === "published"}
                        likeCount={articleItem.engagement.likeCount}
                        postId={articleItem.id}
                        shareCount={articleItem.engagement.shareCount}
                        viewer={articleItem.engagement.viewer}
                      />
                    </div>

                    {isAuthenticated && articleItem.status === "published" ? (
                      <div className="flex items-end gap-3">
                        <Textarea
                          className="min-h-20"
                          onChange={(event) => setArticleComment(event.target.value)}
                          placeholder="说点什么..."
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
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </SitePage>
  );
}
