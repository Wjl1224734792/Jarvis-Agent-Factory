import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { FlameIcon, HeartIcon, MessageCircleIcon, SparklesIcon, UsersIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SitePage, SitePanel, SitePanelBody } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "../features/auth/auth-store";
import { apiClient } from "../lib/api-client";
import { getAvatarImage, getEditorialImage } from "../lib/aviation-media";

const feedTabs = [
  { id: "recommended", label: "热门", icon: FlameIcon },
  { id: "latest", label: "最新", icon: SparklesIcon },
  { id: "following", label: "关注", icon: UsersIcon }
] as const;

type FeedTab = (typeof feedTabs)[number]["id"];

export function CirclePage() {
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated";
  const [activeTab, setActiveTab] = useState<FeedTab>("recommended");

  const feedQuery = useQuery({
    queryKey: ["circle-feed", activeTab],
    queryFn: () => apiClient.listCircleFeed(activeTab)
  });

  const posts = feedQuery.data?.items ?? [];
  const activeAuthors = useMemo(() => {
    return posts
      .map((item) => item.author)
      .filter((author, index, source) => source.findIndex((entry) => entry.id === author.id) === index)
      .slice(0, 6);
  }, [posts]);

  return (
    <SitePage className="gap-6">
      <div className="flex items-center justify-between gap-4">
        <Tabs
          onValueChange={(value) => {
            setActiveTab(value as FeedTab);
          }}
          value={activeTab}
        >
          <TabsList className="w-full justify-start gap-6 overflow-x-auto" variant="line">
            {feedTabs.map((item) => (
              <TabsTrigger className="px-0 text-base" key={item.id} value={item.id}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="hidden items-center gap-2 md:flex">
          {activeAuthors.map((author) => (
            <Avatar key={author.id} size="sm">
              <AvatarImage alt={author.displayName} src={getAvatarImage(author.id)} />
              <AvatarFallback>{author.displayName.slice(0, 1)}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>

      <SitePanel variant="muted">
        <SitePanelBody className="flex items-center justify-between gap-4 py-4">
          <div>
            <div className="text-sm uppercase tracking-[0.24em] text-primary">Moments</div>
            <div className="mt-1 text-lg font-semibold text-foreground">飞友圈动态流</div>
          </div>
          <div className="text-sm text-muted-foreground">飞友圈现在只消费 `moment` 动态内容。</div>
        </SitePanelBody>
      </SitePanel>

      {feedQuery.isLoading ? (
        <div className="[column-gap:16px]" style={{ columnWidth: "240px" }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="mb-4 break-inside-avoid overflow-hidden rounded-[0.75rem] bg-white" key={index}>
              <div className={`w-full animate-pulse bg-muted ${index % 3 === 0 ? "h-[17rem]" : index % 3 === 1 ? "h-[21rem]" : "h-[19rem]"}`} />
              <div className="space-y-3 px-3 pb-3 pt-3">
                <div className="h-8 w-4/5 animate-pulse rounded bg-muted" />
                <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
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
          <AlertTitle>飞友圈还没有新内容</AlertTitle>
          <AlertDescription>
            {isAuthenticated
              ? "可以切换标签，或发布你的第一条飞行动态。"
              : "登录后加入飞友圈，和其他飞友一起分享航拍、试飞与即时观察。"}
          </AlertDescription>
        </Alert>
      ) : null}

      {posts.length > 0 ? (
        <div className="[column-gap:16px]" style={{ columnWidth: "240px" }}>
          {posts.map((item, index) => (
            <article
              className="mb-4 break-inside-avoid overflow-hidden rounded-[0.75rem] border border-border/60 bg-white"
              key={item.id}
            >
              <Link className="block" to={APP_ROUTES.postDetail.replace(":id", item.id)}>
                <img
                  alt={item.title}
                  className={`w-full object-cover ${index % 3 === 0 ? "h-[16rem]" : index % 3 === 1 ? "h-[19rem]" : "h-[17rem]"}`}
                  src={item.images[0]?.url ?? getEditorialImage(item.id, index)}
                />

                <div className="space-y-3 p-3">
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarImage alt={item.author.displayName} src={getAvatarImage(item.author.id)} />
                      <AvatarFallback>{item.author.displayName.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{item.author.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.publishedAt ?? item.createdAt).toLocaleDateString("zh-CN")}
                      </div>
                    </div>
                  </div>

                  <h2 className="line-clamp-2 text-[0.96rem] leading-6 font-medium text-foreground">{item.title}</h2>

                  <div className="flex flex-wrap items-center gap-4 text-[0.8rem] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <HeartIcon className="size-3.5" />
                      {item.engagement.likeCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircleIcon className="size-3.5" />
                      {item.commentCount}
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </SitePage>
  );
}
