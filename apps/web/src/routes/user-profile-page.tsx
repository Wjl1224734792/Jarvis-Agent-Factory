import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowRightIcon, CompassIcon, MapPinIcon, UserPlusIcon } from "lucide-react";
import { Navigate, Link, useParams } from "react-router-dom";
import {
  SiteGrid,
  SitePage,
  SitePageDescription,
  SitePageEyebrow,
  SitePageHead,
  SitePageTitle,
  SitePanel,
  SitePanelBody,
  SiteRail
} from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "../features/auth/auth-store";
import { apiClient } from "../lib/api-client";
import { getAvatarImage, getProfileBanner } from "../lib/aviation-media";

function UserProfileSkeleton() {
  return (
    <SitePage>
      <SitePageHead>
        <SitePageEyebrow>个人主页</SitePageEyebrow>
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-4 w-64" />
      </SitePageHead>
      <SitePanel className="overflow-hidden">
        <Skeleton className="h-40 w-full" />
        <SitePanelBody className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_15rem]">
          <Skeleton className="-mt-10 h-24 w-24 rounded-[calc(var(--radius-panel)-0.08rem)]" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton className="h-16 rounded-[calc(var(--radius-panel)-0.18rem)]" key={index} />
            ))}
          </div>
        </SitePanelBody>
      </SitePanel>
    </SitePage>
  );
}

export function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const currentUser = useAuthStore((state) => state.user);
  const userId = params.id ?? "";

  const profileQuery = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => apiClient.getUserProfile(userId),
    enabled: Boolean(userId)
  });

  const contentQuery = useQuery({
    queryKey: ["user-content", userId],
    queryFn: () => apiClient.listUserContent(userId),
    enabled: Boolean(userId)
  });

  if (currentUser?.id && currentUser.id === userId) {
    return <Navigate replace to={APP_ROUTES.webProfile} />;
  }

  if (!userId || (profileQuery.isLoading && !profileQuery.data)) {
    return <UserProfileSkeleton />;
  }

  if (profileQuery.isError || !profileQuery.data?.item) {
    return (
      <Alert variant="destructive">
        <AlertTitle>个人主页加载失败</AlertTitle>
        <AlertDescription>
          {profileQuery.isError ? profileQuery.error.message : "找不到这位飞友。"}
        </AlertDescription>
      </Alert>
    );
  }

  const profile = profileQuery.data.item;
  const contentItems = contentQuery.data?.items ?? [];

  return (
    <SitePage>
      <SitePageHead>
        <SitePageEyebrow>飞友主页</SitePageEyebrow>
        <SitePageTitle>{profile.user.displayName} 的主页</SitePageTitle>
        <SitePageDescription>
          这里展示公开的个人摘要与近期内容。自己的完整个人中心仍然在“我的主页”里查看。
        </SitePageDescription>
      </SitePageHead>

      <SitePanel className="overflow-hidden" variant="floating">
        <div className="relative h-40 overflow-hidden border-b border-border/80">
          <img
            alt={`${profile.user.displayName} 顶部横幅`}
            className="h-full w-full object-cover"
            src={getProfileBanner(profile.user.displayName)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/48 via-slate-900/14 to-transparent" />
        </div>
        <SitePanelBody className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_15rem] lg:items-end">
          <Avatar className="-mt-10 size-24 rounded-[calc(var(--radius-panel)-0.08rem)] ring-4 ring-white" size="lg">
            <AvatarImage
              alt={profile.user.displayName}
              src={profile.user.avatarUrl ?? getAvatarImage(profile.user.id)}
            />
            <AvatarFallback>{profile.user.displayName.slice(0, 1)}</AvatarFallback>
          </Avatar>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="eyebrow">公开主页</Badge>
              <Badge variant="outline">{profile.viewer.isFollowing ? "已关注" : "未关注"}</Badge>
            </div>
            <div className="space-y-1.5">
              <div className="text-[1.9rem] font-semibold tracking-[-0.04em] text-foreground">
                {profile.user.displayName}
              </div>
              <div className="text-sm text-muted-foreground">
                当前公开展示近期文章、动态与测评内容。
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {[
                { label: "关注者", value: profile.followerCount },
                { label: "关注中", value: profile.followingCount },
                { label: "收藏", value: profile.favoriteCount },
                { label: "公开内容", value: profile.postCount },
                { label: "创建榜单", value: profile.rankingCount },
                { label: "飞行器投稿", value: profile.aircraftCount }
              ].map((item) => (
                <div
                  className="rounded-[calc(var(--radius-panel)-0.18rem)] border border-border/75 bg-surface-2/78 px-4 py-3"
                  key={item.label}
              >
                <div className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  {item.label}
                </div>
                <div className="mt-1.5 text-xl font-semibold text-foreground">{item.value}</div>
              </div>
            ))}
          </div>
        </SitePanelBody>
      </SitePanel>

      <SiteGrid variant="sidebar">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">近期内容</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                  {contentQuery.isLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton className="h-18 rounded-[calc(var(--radius-panel)-0.18rem)]" key={index} />
                    ))
                  ) : contentItems.length > 0 ? (
                    contentItems.map((item) =>
                      item.type === "post" || item.type === "favorite-post" ? (
                        <Link
                          className="block rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/70 bg-background/70 px-4 py-4 transition hover:border-primary/18 hover:bg-accent/56"
                          key={`${item.type}-${item.id}`}
                          to={APP_ROUTES.postDetail.replace(":id", item.id)}
                        >
                          <div className="text-sm font-medium text-foreground">
                            {item.type === "favorite-post"
                              ? `收藏 · ${item.postType === "article" ? "文章" : "动态"}`
                              : item.postType === "article"
                                ? "文章"
                                : "动态"}{" "}
                            · {item.title}
                          </div>
                          <div className="mt-2 text-sm leading-6 text-muted-foreground">{item.contentPreview}</div>
                        </Link>
                      ) : item.type === "ranking" ? (
                        <div
                          className="block rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/70 bg-background/70 px-4 py-4"
                          key={`${item.type}-${item.id}`}
                        >
                          <div className="text-sm font-medium text-foreground">榜单 · {item.title}</div>
                          <div className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</div>
                        </div>
                      ) : item.type === "aircraft" ? (
                        <div
                          className="block rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/70 bg-background/70 px-4 py-4"
                          key={`${item.type}-${item.id}`}
                        >
                          <div className="text-sm font-medium text-foreground">飞行器投稿 · {item.modelName}</div>
                          <div className="mt-2 text-sm leading-6 text-muted-foreground">
                            {item.summary ?? "还没有补充简介。"}
                          </div>
                        </div>
                      ) : (
                        <Link
                          className="block rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/70 bg-background/70 px-4 py-4 transition hover:border-primary/18 hover:bg-accent/56"
                      key={`${item.type}-${item.id}`}
                      to={APP_ROUTES.modelDetail.replace(":slug", item.model.slug)}
                    >
                      <div className="text-sm font-medium text-foreground">
                        机型评测 · {item.model.name}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.content ?? "只做了快速评分。"}
                      </div>
                    </Link>
                  )
                )
              ) : (
                <Alert>
                  <AlertTitle>还没有公开内容</AlertTitle>
                  <AlertDescription>这位飞友暂时还没有公开的文章、动态或测评。</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        <SiteRail>
          <Card variant="muted">
            <CardHeader>
              <CardTitle>公开摘要</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-[calc(var(--radius-panel)-0.2rem)] bg-background/72 px-4 py-4">
                <div className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  <MapPinIcon className="size-4 text-primary" />
                  页面类型
                </div>
                <div className="mt-1.5 text-sm font-medium text-foreground">他人公开主页</div>
              </div>
              <div className="rounded-[calc(var(--radius-panel)-0.2rem)] bg-background/72 px-4 py-4">
                <div className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  <CompassIcon className="size-4 text-primary" />
                  当前关系
                </div>
                <div className="mt-1.5 text-sm font-medium text-foreground">
                  {profile.viewer.isFollowing ? "你已关注对方" : "尚未关注"}
                </div>
              </div>
              {!profile.viewer.isFollowing ? (
                <Button className="w-full" disabled type="button" variant="outline">
                  <UserPlusIcon data-icon="inline-start" />
                  关注能力整理中
                </Button>
              ) : null}
              <Button asChild className="w-full" type="button" variant="hero">
                <Link to={APP_ROUTES.webProfile}>
                  返回我的主页
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </SiteRail>
      </SiteGrid>
    </SitePage>
  );
}
