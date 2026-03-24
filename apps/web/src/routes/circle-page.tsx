import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  ArrowRightIcon,
  FlameIcon,
  HashIcon,
  MessagesSquareIcon,
  SparklesIcon,
  UsersIcon
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

function postDetailPath(id: string) {
  return APP_ROUTES.postDetail.replace(":id", id);
}

export function CirclePage() {
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated";
  const [activeTab, setActiveTab] = useState<FeedTab>("recommended");

  const feedQuery = useQuery({
    queryKey: ["circle-feed", activeTab],
    queryFn: () => apiClient.listHomeFeed(activeTab)
  });

  const hotTopics = useMemo(
    () => [
      { title: "#2024珠海航展现场直播", meta: "2.4w 讨论 · 85w 阅读" },
      { title: "#C919交付进度追踪", meta: "1.1w 讨论 · 32w 阅读" },
      { title: "#全球最美航线征集", meta: "8.2k 讨论 · 15w 阅读" },
      { title: "#模拟飞行入门指南", meta: "5.4k 讨论 · 12w 阅读" }
    ],
    []
  );

  const activeFriends = useMemo(() => {
    const authors =
      feedQuery.data?.items.map((item) => item.author).filter((author, index, source) => {
        return source.findIndex((entry) => entry.id === author.id) === index;
      }) ?? [];

    return authors.slice(0, 3);
  }, [feedQuery.data?.items]);

  return (
    <SitePage>
      <SitePanel variant="muted">
        <SitePanelBody>
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
        </SitePanelBody>
      </SitePanel>

      <SiteGrid variant="sidebar">
        <div className="flex min-w-0 flex-col gap-[var(--page-gap)]">
          {feedQuery.isLoading
            ? Array.from({ length: 2 }).map((_, index) => (
                <Card key={index} variant="muted">
                  <CardContent className="space-y-4">
                    <div className="h-12 w-48 animate-pulse rounded-full bg-muted" />
                    <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    <div className="h-80 w-full animate-pulse rounded-[calc(var(--radius-panel)-0.2rem)] bg-muted" />
                  </CardContent>
                </Card>
              ))
            : null}

          {feedQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>飞友圈加载失败</AlertTitle>
              <AlertDescription>{feedQuery.error.message}</AlertDescription>
            </Alert>
          ) : null}

          {feedQuery.isSuccess && feedQuery.data.items.length === 0 ? (
            <Alert>
              <AlertTitle>圈子里还没有新内容</AlertTitle>
              <AlertDescription>
                {isAuthenticated
                  ? "试试切到其他标签，或者发布你的第一条飞行动态。"
                  : "登录后加入飞友圈，和其他飞行爱好者一起分享航拍、试飞与行业见闻。"}
              </AlertDescription>
            </Alert>
          ) : null}

          {feedQuery.data?.items.map((item, index) => (
            <SitePanel key={item.id} variant="default">
              <SitePanelBody className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar size="lg">
                      <AvatarImage alt={item.author.displayName} src={getAvatarImage(item.author.id)} />
                      <AvatarFallback>{item.author.displayName.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-xl font-semibold text-foreground">
                        {item.author.displayName}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {new Date(item.publishedAt ?? item.createdAt).toLocaleString("zh-CN", {
                          hour12: false
                        })}
                        · 航空摄影爱好者
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="panel">
                    关注
                  </Button>
                </div>

                <div>
                  <h2 className="text-[2rem] leading-tight font-semibold tracking-[-0.04em] text-foreground">
                    {item.title}
                  </h2>
                  <p className="mt-4 text-base leading-8 text-muted-foreground">
                    {item.contentPreview}
                  </p>
                </div>

                <div className="overflow-hidden rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/80 bg-surface-2">
                  <img
                    alt={item.title}
                    className="h-[340px] w-full object-cover"
                    src={item.images[0]?.url ?? getEditorialImage(item.id, index)}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <PostInteractionBar
                    authorId={item.author.id}
                    compact
                    favoriteCount={item.engagement.favoriteCount}
                    isPublished={item.status === "published"}
                    likeCount={item.engagement.likeCount}
                    postId={item.id}
                    shareCount={item.engagement.shareCount}
                    viewer={item.engagement.viewer}
                  />
                  <Button asChild variant="panel">
                    <Link to={postDetailPath(item.id)}>
                      查看详情
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                </div>
              </SitePanelBody>
            </SitePanel>
          ))}
        </div>

        <SiteRail>
          <Card variant="default">
            <CardContent className="space-y-5">
              <div className="flex items-center gap-3 text-xl font-semibold text-foreground">
                <HashIcon className="size-5 text-primary" />
                热门话题
              </div>
              {hotTopics.map((topic) => (
                <div key={topic.title}>
                  <div className="text-lg font-semibold text-foreground">{topic.title}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{topic.meta}</div>
                </div>
              ))}
              <Button asChild className="w-full" variant="panel">
                <Link to={APP_ROUTES.rankings}>查看更多</Link>
              </Button>
            </CardContent>
          </Card>

          <Card variant="default">
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-xl font-semibold text-foreground">
                <UsersIcon className="size-5 text-primary" />
                活跃飞友
              </div>
              {activeFriends.map((author) => (
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
                      <div className="text-sm text-muted-foreground">资深航拍玩家</div>
                    </div>
                  </div>
                  <Button size="sm" variant="panel">
                    关注
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <SitePanel variant="highlight">
            <SitePanelBody className="space-y-5">
              <Badge variant="eyebrow">热门活动</Badge>
              <div className="text-[2rem] leading-tight font-semibold">
                Winter Wing-Ding 航空摄影大赛
              </div>
              <p className="text-sm leading-7 text-panel-highlight-foreground/82">
                参与赢取飞行装备与年度曝光位，让你的作品进入本周首页推荐区。
              </p>
              <Button asChild variant="panel">
                <Link to={APP_ROUTES.compose}>
                  立即报名
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </SitePanelBody>
          </SitePanel>

          <Card variant="ghost">
            <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
              <MessagesSquareIcon className="size-5 text-primary" />
              更多圈子功能会继续补入精选专题、图集模式与飞友联机讨论。
            </CardContent>
          </Card>
        </SiteRail>
      </SiteGrid>
    </SitePage>
  );
}
