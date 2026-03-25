import { useQuery } from "@tanstack/react-query";
import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  BookmarkIcon,
  EyeIcon,
  HeartIcon,
  ImageIcon,
  MessageCircleIcon,
  PlaySquareIcon,
  Rows3Icon,
  Share2Icon,
  SquarePenIcon
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SiteGrid, SitePage, SitePanel, SitePanelBody, SiteRail } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "../features/auth/auth-store";
import { apiClient } from "../lib/api-client";
import { getAvatarImage, getEditorialImage, getModelImage } from "../lib/aviation-media";

const feedTabs = [
  { id: "recommended", label: "推荐" },
  { id: "following", label: "关注" },
  { id: "latest", label: "最新" }
] as const;

const topicTabs = ["资讯", "测评", "航拍", "技术", "指南"] as const;

type FeedTab = (typeof feedTabs)[number]["id"];

function articleViewCount(likeCount: number, commentCount: number, shareCount: number) {
  return Math.max(likeCount * 12 + commentCount * 8 + shareCount * 10, 18);
}

function formatCount(value: number) {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1).replace(/\.0$/, "")}w`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return String(value);
}

export function HomePage() {
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated";
  const [activeTab, setActiveTab] = useState<FeedTab>("recommended");
  const [activeTopic, setActiveTopic] = useState<(typeof topicTabs)[number]>("资讯");

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

  return (
    <SitePage>
      <SiteGrid className="items-start" variant="sidebar">
        <div className="mx-auto w-full max-w-[980px] min-w-0">
          <div className="border-b border-border/60 px-1">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-1 overflow-x-auto">
              {feedTabs.map((tab) => (
                <button
                  className={`border-b-[3px] px-0 py-4 text-[1.05rem] font-semibold transition-colors md:text-[1.08rem] ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-foreground/82 hover:text-foreground"
                  }`}
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                  }}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}

              {topicTabs.map((topic) => (
                <button
                  className={`px-0 py-4 text-[1.02rem] transition-colors ${
                    activeTopic === topic
                      ? "font-medium text-foreground"
                      : "text-foreground/72 hover:text-foreground"
                  }`}
                  key={topic}
                  onClick={() => {
                    setActiveTopic(topic);
                  }}
                  type="button"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          <section className="mt-5 overflow-hidden bg-white">
            <div>
              {feedQuery.isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div className="border-b border-border/60 px-4 py-7 last:border-b-0 md:px-5" key={index}>
                      <div className="grid gap-5 md:grid-cols-[268px_minmax(0,1fr)] md:items-start">
                        <div className="h-[176px] animate-pulse rounded-[0.2rem] bg-muted" />
                        <div className="space-y-4">
                          <div className="h-10 w-4/5 animate-pulse rounded bg-muted" />
                          <div className="h-6 w-full animate-pulse rounded bg-muted" />
                          <div className="h-6 w-5/6 animate-pulse rounded bg-muted" />
                          <div className="flex gap-6 pt-4">
                            {Array.from({ length: 5 }).map((__, itemIndex) => (
                              <div className="h-5 w-14 animate-pulse rounded bg-muted" key={itemIndex} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                : null}

              {feedQuery.isError ? (
                <div className="px-4 py-6 md:px-5">
                  <Alert variant="destructive">
                    <AlertTitle>首页内容加载失败</AlertTitle>
                    <AlertDescription>{feedQuery.error.message}</AlertDescription>
                  </Alert>
                </div>
              ) : null}

              {feedItems.map((item, index) => (
                <article
                  className="border-b border-border/60 px-4 py-7 last:border-b-0 md:px-5"
                  key={item.id}
                >
                  <Link
                    className="grid gap-5 md:grid-cols-[268px_minmax(0,1fr)] md:items-start"
                    to={APP_ROUTES.postDetail.replace(":id", item.id)}
                  >
                    <div className="overflow-hidden rounded-[0.15rem] bg-slate-100">
                      <img
                        alt={item.title}
                        className="h-[176px] w-full object-cover"
                        src={item.images[0]?.url ?? getEditorialImage(item.id, index)}
                      />
                    </div>

                    <div className="flex min-h-[176px] min-w-0 flex-col">
                      <h2 className="max-w-[33rem] text-[1.65rem] leading-[1.2] font-semibold tracking-[-0.04em] text-foreground md:text-[1.95rem]">
                        {item.title}
                      </h2>

                      <p className="mt-4 line-clamp-3 max-w-[34rem] text-[1rem] leading-8 text-foreground/78 md:text-[1.08rem]">
                        {item.contentPreview}
                      </p>

                      <div className="mt-auto pt-7 flex flex-wrap items-center gap-x-8 gap-y-3 text-[0.98rem] text-foreground/78">
                        <span className="inline-flex items-center gap-2">
                          <HeartIcon className="size-4" />
                          {formatCount(item.engagement.likeCount)}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <MessageCircleIcon className="size-4" />
                          {formatCount(item.commentCount)}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <BookmarkIcon className="size-4" />
                          {formatCount(item.engagement.favoriteCount)}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <EyeIcon className="size-4" />
                          {formatCount(
                            articleViewCount(
                              item.engagement.likeCount,
                              item.commentCount,
                              item.engagement.shareCount
                            )
                          )}
                        </span>
                        <span className="ml-auto inline-flex items-center text-foreground/72">
                          <Share2Icon className="size-5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}

              {!feedQuery.isLoading && !feedQuery.isError && feedItems.length === 0 ? (
                <div className="px-4 py-6 md:px-5">
                  <Alert>
                    <AlertTitle>首页还没有内容</AlertTitle>
                    <AlertDescription>
                      {isAuthenticated
                        ? "可以切换到飞友圈浏览动态，或直接发布你的第一条飞行记录。"
                        : `${APP_NAME} 还没有公开内容，登录后可以先发布一条动态。`}
                    </AlertDescription>
                  </Alert>
                </div>
              ) : null}
            </div>
          </section>
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
    </SitePage>
  );
}
