import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { BellIcon, Clock3Icon, PenSquareIcon, Settings2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { VirtualFeed } from "@/components/virtual-feed";
import { SitePage, SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "../../lib/api-client";
import { getAvatarImage, getProfileBanner } from "../../lib/aviation-media";
import { useAuthStore } from "./auth-store";
import { profileVisibilityLabel } from "./profile-settings-state";

type ProfileTab = "activity" | "favorites";
type ContentItem = Awaited<ReturnType<typeof apiClient.listUserContent>>["items"][number];

const profileTabs: Array<{ value: ProfileTab; label: string }> = [
  { value: "activity", label: "内容" },
  { value: "favorites", label: "收藏" }
];

function ProfilePageSkeleton() {
  return (
    <SitePage>
      <SitePanel className="overflow-hidden">
        <Skeleton className="h-44 w-full md:h-52" />
        <SitePanelBody className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)]">
          <Skeleton className="-mt-12 h-24 w-24 rounded-[0.8rem]" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-full" />
          </div>
        </SitePanelBody>
      </SitePanel>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton className="h-18 rounded-[0.8rem]" key={index} />
        ))}
      </div>
      <Skeleton className="h-10 w-36 rounded-[0.8rem]" />
      <Skeleton className="h-[32rem] rounded-[0.9rem]" />
    </SitePage>
  );
}

function MetricStrip(props: { label: string; value: number }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 border border-border/70 bg-surface-2/72 px-4 py-3">
      <div className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">{props.label}</div>
      <div className="text-lg font-semibold text-foreground">{props.value}</div>
    </div>
  );
}

function getContentMeta(item: ContentItem) {
  switch (item.type) {
    case "post":
      return {
        label: item.postType === "article" ? "文章" : "动态",
        href: APP_ROUTES.postDetail.replace(":id", item.id),
        title: item.title,
        summary: item.contentPreview
      };
    case "favorite-post":
      return {
        label: item.postType === "article" ? "收藏文章" : "收藏动态",
        href: APP_ROUTES.postDetail.replace(":id", item.id),
        title: item.title,
        summary: item.contentPreview
      };
    case "favorite-model":
      return {
        label: "收藏机型",
        href: APP_ROUTES.modelDetail.replace(":slug", item.model.slug),
        title: item.model.name,
        summary: "这款机型已经加入收藏列表。"
      };
    case "ranking":
      return {
        label: "榜单",
        href: APP_ROUTES.rankingDetail.replace(":id", item.id),
        title: item.title,
        summary: item.description
      };
    case "aircraft":
      return {
        label: "飞行器投稿",
        href: null,
        title: item.modelName,
        summary: item.summary ?? "已提交机型资料，等待进一步审核或发布。"
      };
    case "review":
      return {
        label: "机型评论",
        href: APP_ROUTES.modelDetail.replace(":slug", item.model.slug),
        title: item.model.name,
        summary: item.content ?? "只留下了评分，没有补充长评。"
      };
  }
}

function ContentFeedRow({ item }: { item: ContentItem }) {
  const meta = getContentMeta(item);
  const row = (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[7rem_minmax(0,1fr)_8.5rem] md:items-start">
      <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-start md:gap-1">
        <Badge variant="outline">{meta.label}</Badge>
        <span className="text-[0.72rem] text-muted-foreground">
          {new Date(item.updatedAt).toLocaleDateString("zh-CN")}
        </span>
      </div>
      <div className="min-w-0 space-y-1.5">
        <div className="truncate text-[0.95rem] font-semibold text-foreground">{meta.title}</div>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{meta.summary}</p>
      </div>
      <div className="flex items-center gap-2 text-[0.72rem] text-muted-foreground md:justify-end">
        <Clock3Icon className="size-3.5" />
        {new Date(item.updatedAt).toLocaleString("zh-CN", { hour12: false })}
      </div>
    </div>
  );

  if (!meta.href) {
    return row;
  }

  return (
    <Link className="block transition hover:bg-accent/28" to={meta.href}>
      {row}
    </Link>
  );
}

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<ProfileTab>("activity");

  const currentProfileQuery = useQuery({
    queryKey: ["current-user-profile", user?.id],
    queryFn: () => apiClient.getCurrentUserProfile(),
    enabled: Boolean(user)
  });
  const profileQuery = useQuery({
    queryKey: ["self-profile", user?.id],
    queryFn: () => apiClient.getUserProfile(user!.id),
    enabled: Boolean(user)
  });
  const contentQuery = useQuery({
    queryKey: ["self-profile-content", user?.id],
    queryFn: () => apiClient.listUserContent(user!.id),
    enabled: Boolean(user)
  });

  const favoriteItems = useMemo(
    () =>
      (contentQuery.data?.items ?? []).filter(
        (item) => item.type === "favorite-post" || item.type === "favorite-model"
      ),
    [contentQuery.data?.items]
  );
  const activityItems = useMemo(
    () =>
      (contentQuery.data?.items ?? []).filter(
        (item) => item.type !== "favorite-post" && item.type !== "favorite-model"
      ),
    [contentQuery.data?.items]
  );

  if (!user) {
    return <ProfilePageSkeleton />;
  }

  const profile = profileQuery.data?.item;
  const settings = currentProfileQuery.data?.item;
  const displayName = settings?.displayName ?? user.displayName;
  const avatarUrl = settings?.avatarUrl ?? user.avatarUrl ?? getAvatarImage(user.id);
  const bio = settings?.bio ?? "还没有填写个人简介。";

  if ((profileQuery.isLoading && !profile) || (currentProfileQuery.isLoading && !settings)) {
    return <ProfilePageSkeleton />;
  }

  return (
    <SitePage className="mx-auto w-full max-w-[72rem] gap-4">
      <SitePanel className="overflow-hidden" variant="floating">
        <div className="relative h-40 overflow-hidden border-b border-border/80 md:h-48">
          <img
            alt={`${displayName} 顶部横幅`}
            className="h-full w-full object-cover"
            src={getProfileBanner(displayName)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/58 via-slate-900/18 to-transparent" />
        </div>

        <SitePanelBody className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
            <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-end">
              <Avatar className="-mt-10 size-22 rounded-[0.9rem] ring-4 ring-white md:size-24" size="lg">
                <AvatarImage alt={displayName} src={avatarUrl} />
                <AvatarFallback>{displayName.slice(0, 1)}</AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {settings?.profileVisibility ? (
                    <Badge variant="outline">{profileVisibilityLabel(settings.profileVisibility)}</Badge>
                  ) : null}
                </div>
                <div className="text-[1.8rem] font-semibold tracking-[-0.04em] text-foreground md:text-[2.15rem]">
                  {displayName}
                </div>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{bio}</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <MetricStrip label="关注者" value={profile?.followerCount ?? 0} />
              <MetricStrip label="关注中" value={profile?.followingCount ?? 0} />
              <MetricStrip label="收藏" value={profile?.favoriteCount ?? 0} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-border/70 pt-4">
            <Button asChild size="sm" variant="panel">
              <Link to={APP_ROUTES.webSettings}>
                <Settings2Icon data-icon="inline-start" />
                修改资料
              </Link>
            </Button>
            <Button asChild size="sm" variant="panel">
              <Link to={APP_ROUTES.notifications}>
                <BellIcon data-icon="inline-start" />
                查看消息
              </Link>
            </Button>
            <Button asChild size="sm" variant="hero">
              <Link to={APP_ROUTES.compose}>
                <PenSquareIcon data-icon="inline-start" />
                去发布内容
              </Link>
            </Button>
          </div>
        </SitePanelBody>
      </SitePanel>

      {profileQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>个人主页加载失败</AlertTitle>
          <AlertDescription>{profileQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {currentProfileQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>个人设置加载失败</AlertTitle>
          <AlertDescription>{currentProfileQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs onValueChange={(value) => setActiveTab(value as ProfileTab)} value={activeTab}>
        <TabsList variant="line">
          {profileTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent className="space-y-4" value="activity">
          <VirtualFeed
            data={activityItems}
            emptyState={
              <div className="border border-border/70 bg-white px-5 py-5 text-sm text-muted-foreground">
                还没有公开内容。
              </div>
            }
            height={660}
            itemKey={(item) => `${item.type}-${item.id}`}
            renderItem={(item) => <ContentFeedRow item={item} />}
          />
        </TabsContent>

        <TabsContent className="space-y-4" value="favorites">
          <VirtualFeed
            data={favoriteItems}
            emptyState={
              <div className="border border-border/70 bg-white px-5 py-5 text-sm text-muted-foreground">
                还没有收藏内容。
              </div>
            }
            height={660}
            itemKey={(item) => `${item.type}-${item.id}`}
            renderItem={(item) => <ContentFeedRow item={item} />}
          />
        </TabsContent>
      </Tabs>
    </SitePage>
  );
}
