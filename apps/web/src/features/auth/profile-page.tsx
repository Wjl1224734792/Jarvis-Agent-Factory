import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  ArrowRightIcon,
  BellIcon,
  CompassIcon,
  MapPinIcon,
  PenSquareIcon,
  ShieldCheckIcon,
  UserRoundIcon
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "../../lib/api-client";
import { getAvatarImage, getEditorialImage, getProfileBanner } from "../../lib/aviation-media";
import { useAuthStore } from "./auth-store";
import {
  createProfileViewModel,
  readStoredSettingsDraft,
  type ProfileFocusTab
} from "./profile-settings-state";

const profileTabs: Array<{ value: ProfileFocusTab; label: string }> = [
  { value: "overview", label: "概览" },
  { value: "activity", label: "动态" },
  { value: "favorites", label: "收藏" },
  { value: "drafts", label: "草稿" }
];

function ProfilePageSkeleton() {
  return (
    <SitePage>
      <SitePageHead>
        <SitePageEyebrow>个人中心</SitePageEyebrow>
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-4 w-72" />
      </SitePageHead>

      <SitePanel className="overflow-hidden">
        <Skeleton className="h-40 w-full" />
        <SitePanelBody className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_18rem]">
          <Skeleton className="-mt-10 h-24 w-24 rounded-[calc(var(--radius-panel)-0.08rem)]" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton className="h-20 rounded-[calc(var(--radius-panel)-0.15rem)]" key={index} />
            ))}
          </div>
        </SitePanelBody>
      </SitePanel>

      <SiteGrid variant="sidebar">
        <div className="space-y-4">
          <div className="border-b border-border/80 pb-2">
            <div className="flex gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton className="h-9 w-20 rounded-full" key={index} />
              ))}
            </div>
          </div>
          <Card>
            <CardContent className="space-y-4 pt-[var(--panel-padding)]">
              <Skeleton className="h-48 rounded-[calc(var(--radius-panel)-0.16rem)]" />
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        </div>
        <SiteRail>
          <Card variant="muted">
            <CardContent className="space-y-3 pt-[var(--panel-padding)]">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton className="h-16 rounded-[calc(var(--radius-panel)-0.2rem)]" key={index} />
              ))}
            </CardContent>
          </Card>
        </SiteRail>
      </SiteGrid>
    </SitePage>
  );
}

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<ProfileFocusTab>("overview");

  if (!user) {
    return <ProfilePageSkeleton />;
  }

  const settingsDraft = readStoredSettingsDraft(user);
  const currentProfileQuery = useQuery({
    queryKey: ["current-user-profile", user.id],
    queryFn: () => apiClient.getCurrentUserProfile()
  });
  const profile = createProfileViewModel(user, {
    avatarUrl: currentProfileQuery.data?.item.avatarUrl ?? settingsDraft.avatarUrl,
    displayName: currentProfileQuery.data?.item.displayName ?? settingsDraft.displayName,
    bio: currentProfileQuery.data?.item.bio ?? settingsDraft.bio
  });
  const profileQuery = useQuery({
    queryKey: ["self-profile", user.id],
    queryFn: () => apiClient.getUserProfile(user.id)
  });
  const contentQuery = useQuery({
    queryKey: ["self-profile-content", user.id],
    queryFn: () => apiClient.listUserContent(user.id)
  });
  const profilePayload = profileQuery.data?.item;
  const contentItems = contentQuery.data?.items ?? [];
  const favoriteItems = contentItems.filter(
    (item): item is Extract<(typeof contentItems)[number], { type: "favorite-post" }> =>
      item.type === "favorite-post"
  );
  const dynamicItems = contentItems.filter(
    (
      item
    ): item is Exclude<(typeof contentItems)[number], { type: "favorite-post" }> =>
      item.type !== "favorite-post"
  );

  return (
    <SitePage>
      <SitePageHead>
        <SitePageEyebrow>个人中心</SitePageEyebrow>
        <SitePageTitle>我的飞行主页</SitePageTitle>
        <SitePageDescription>
          这里集中展示头像、昵称、简介和近期公开内容，常用入口也能直接从这里进入。
        </SitePageDescription>
      </SitePageHead>

      <SitePanel className="overflow-hidden" variant="floating">
        <div className="relative h-44 overflow-hidden border-b border-border/80 md:h-48">
          <img
            alt={`${profile.displayName} 顶部横幅`}
            className="h-full w-full object-cover"
            src={getProfileBanner(profile.displayName)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/48 via-slate-900/14 to-transparent" />
        </div>

        <SitePanelBody className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_16rem] lg:items-end">
            <Avatar className="-mt-10 size-24 rounded-[calc(var(--radius-panel)-0.08rem)] ring-4 ring-white md:size-28" size="lg">
            <AvatarImage alt={profile.displayName} src={profile.avatarUrl ?? getAvatarImage(profile.displayName)} />
            <AvatarFallback>{profile.displayName.slice(0, 1)}</AvatarFallback>
          </Avatar>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="eyebrow">{profile.memberLabel}</Badge>
              <Badge variant="outline">{profile.callsign}</Badge>
              <Badge variant="tone">{profile.availability}</Badge>
            </div>

            <div className="space-y-1.5">
              <div className="text-[1.9rem] font-semibold tracking-[-0.04em] text-foreground md:text-[2.2rem]">
                {profile.displayName}
              </div>
              <div className="text-sm font-medium text-primary md:text-base">{profile.headline}</div>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-[0.95rem]">
                {profile.bio}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: "关注者", value: profilePayload?.followerCount ?? Number(profile.metrics[0]?.value ?? 0) },
              { label: "关注中", value: profilePayload?.followingCount ?? Number(profile.metrics[1]?.value ?? 0) },
              { label: "收藏", value: profilePayload?.favoriteCount ?? Number(profile.metrics[2]?.value ?? 0) }
            ].map((item) => (
              <div
                className="rounded-[calc(var(--radius-panel)-0.18rem)] border border-border/75 bg-surface-2/78 px-4 py-3"
                key={item.label}
              >
                <div className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
                  {item.label}
                </div>
                <div className="mt-1.5 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </SitePanelBody>
      </SitePanel>

      <SiteGrid variant="sidebar">
        <div className="flex min-w-0 flex-col gap-4">
          <Tabs onValueChange={(value) => setActiveTab(value as ProfileFocusTab)} value={activeTab}>
            <TabsList variant="line">
              {profileTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent className="min-h-[28rem] space-y-4" value="overview">
              <SitePanel>
                <div className="grid gap-0 lg:grid-cols-[1.05fr_minmax(0,1fr)]">
                  <div className="min-h-[15rem] overflow-hidden border-b border-border/80 lg:border-b-0 lg:border-r">
                    <img
                      alt={profile.focusCards[0]!.title}
                      className="h-full w-full object-cover"
                      src={getEditorialImage(profile.focusCards[0]!.imageSeed)}
                    />
                  </div>
                  <SitePanelBody className="flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <Badge variant="eyebrow">{profile.focusCards[0]!.eyebrow}</Badge>
                      <div className="text-[1.55rem] font-semibold leading-snug tracking-[-0.03em] text-foreground md:text-[1.8rem]">
                        {profile.focusCards[0]!.title}
                      </div>
                      <p className="text-sm leading-7 text-muted-foreground">
                        {profile.focusCards[0]!.summary}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {profile.focusCards[0]!.metrics.map((metric) => (
                          <div
                            className="rounded-[calc(var(--radius-panel)-0.2rem)] bg-surface-2/78 px-4 py-3"
                            key={metric.label}
                          >
                            <div className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                              {metric.label}
                            </div>
                            <div className="mt-1 text-xl font-semibold text-foreground">{metric.value}</div>
                          </div>
                        ))}
                      </div>

                      <Button asChild className="w-full sm:w-auto" variant="hero">
                        <Link to={profile.focusCards[0]!.href}>
                          <PenSquareIcon data-icon="inline-start" />
                          {profile.focusCards[0]!.ctaLabel}
                        </Link>
                      </Button>
                    </div>
                  </SitePanelBody>
                </div>
              </SitePanel>

              <div className="grid gap-4 md:grid-cols-2">
                {profile.focusCards.slice(1).map((card, index) => (
                  <Card key={card.id}>
                    <div className="overflow-hidden border-b border-border/80">
                      <img
                        alt={card.title}
                        className="h-40 w-full object-cover"
                        src={getEditorialImage(card.imageSeed, index + 1)}
                      />
                    </div>
                    <CardHeader className="gap-2">
                      <Badge variant="eyebrow">{card.eyebrow}</Badge>
                      <CardTitle className="text-xl">{card.title}</CardTitle>
                      <CardDescription>{card.summary}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {card.metrics.map((metric) => (
                          <div
                            className="rounded-[calc(var(--radius-panel)-0.2rem)] bg-background/76 px-4 py-3"
                            key={metric.label}
                          >
                            <div className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                              {metric.label}
                            </div>
                            <div className="mt-1 text-lg font-semibold text-foreground">{metric.value}</div>
                          </div>
                        ))}
                      </div>
                      <Button asChild className="w-full" variant="outline">
                        <Link to={card.href}>{card.ctaLabel}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent className="min-h-[28rem] space-y-4" value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">近况摘要</CardTitle>
                  <CardDescription>
                    这里直接展示你公开发布的文章、飞友圈动态、创建的榜单、飞行器投稿和机型评测。
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {contentQuery.isLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton className="h-24 rounded-[calc(var(--radius-panel)-0.2rem)]" key={index} />
                    ))
                  ) : dynamicItems.length > 0 ? (
                    dynamicItems.map((item) => (
                      <div
                        className="rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/75 bg-background/76 px-4 py-4"
                        key={`${item.type}-${item.id}`}
                      >
                        {item.type === "post" ? (
                          <>
                            <div className="text-sm font-medium text-foreground">
                              {item.postType === "article" ? "文章" : "动态"} · {item.title}
                            </div>
                            <div className="mt-2 text-sm leading-6 text-muted-foreground">
                              {item.contentPreview}
                            </div>
                          </>
                        ) : item.type === "ranking" ? (
                          <>
                            <div className="text-sm font-medium text-foreground">榜单 · {item.title}</div>
                            <div className="mt-2 text-sm leading-6 text-muted-foreground">
                              {item.description}
                            </div>
                          </>
                        ) : item.type === "aircraft" ? (
                          <>
                            <div className="text-sm font-medium text-foreground">
                              飞行器投稿 · {item.modelName}
                            </div>
                            <div className="mt-2 text-sm leading-6 text-muted-foreground">
                              {item.summary ?? "还没有补充简介。"}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm font-medium text-foreground">
                              机型评测 · {item.model.name}
                            </div>
                            <div className="mt-2 text-sm leading-6 text-muted-foreground">
                              {item.content ?? "只做了快速评分。"}
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <Alert>
                      <AlertTitle>还没有公开动态</AlertTitle>
                      <AlertDescription>发布文章、动态、榜单或飞行器内容后，这里会按时间顺序汇总。</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "消息状态", value: "已同步", icon: BellIcon },
                  { label: "个人资料", value: "已更新", icon: UserRoundIcon },
                  { label: "设置状态", value: "可编辑", icon: ShieldCheckIcon }
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <Card key={item.label} variant="muted">
                      <CardContent className="space-y-3 pt-[var(--panel-padding)]">
                        <div className="flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.2em] text-muted-foreground">
                          <Icon className="size-4 text-primary" />
                          {item.label}
                        </div>
                        <div className="text-2xl font-semibold text-foreground">{item.value}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent className="min-h-[28rem] space-y-4" value="favorites">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">我的收藏</CardTitle>
                  <CardDescription>
                    优先展示你已经收藏的文章和动态，方便快速回看。
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {contentQuery.isLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton className="h-28 rounded-[calc(var(--radius-panel)-0.2rem)]" key={index} />
                    ))
                  ) : favoriteItems.length > 0 ? (
                    favoriteItems.map((item) => (
                      <div
                        className="rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/70 bg-background/76 p-4"
                        key={`${item.type}-${item.id}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <Badge variant="eyebrow">{item.postType === "article" ? "文章收藏" : "动态收藏"}</Badge>
                          <span className="text-[0.72rem] text-muted-foreground">
                            {new Date(item.updatedAt).toLocaleDateString("zh-CN")}
                          </span>
                        </div>
                        <div className="mt-3 text-lg font-semibold text-foreground">{item.title}</div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.contentPreview}</p>
                        <Button asChild className="mt-4 w-full" size="sm" variant="outline">
                          <Link to={APP_ROUTES.postDetail.replace(":id", item.id)}>查看内容</Link>
                        </Button>
                      </div>
                    ))
                  ) : (
                    <Alert>
                      <AlertTitle>还没有收藏内容</AlertTitle>
                      <AlertDescription>先去文章、动态或机型详情页把感兴趣的内容收藏起来。</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent className="min-h-[28rem] space-y-4" value="drafts">
              <Card variant="muted">
                <CardHeader>
                  <CardTitle className="text-xl">资料与内容整理</CardTitle>
                  <CardDescription>
                    常用入口和最近整理事项集中放在这里，方便继续处理未完成内容。
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {profile.draftNotes.map((note) => (
                    <div
                      className="rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/70 bg-card/86 px-4 py-4 text-sm leading-7 text-muted-foreground"
                      key={note}
                    >
                      {note}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <SiteRail>
          <Card variant="muted">
            <CardHeader>
              <CardTitle>身份摘要</CardTitle>
              <CardDescription>集中查看当前身份、资料状态和最近的常用入口。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "呼号", value: profile.callsign, icon: UserRoundIcon },
                { label: "资料状态", value: profile.memberLabel, icon: MapPinIcon },
                { label: "当前状态", value: profile.availability, icon: CompassIcon }
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    className="rounded-[calc(var(--radius-panel)-0.2rem)] bg-background/72 px-4 py-4"
                    key={item.label}
                  >
                    <div className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                      <Icon className="size-4 text-primary" />
                      {item.label}
                    </div>
                    <div className="mt-1.5 text-sm font-medium text-foreground">{item.value}</div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <SitePanel variant="highlight">
            <SitePanelBody className="space-y-4">
              <SitePageEyebrow className="text-sky-100/78">快捷入口</SitePageEyebrow>
              <div className="text-[1.45rem] font-semibold leading-tight">常用操作</div>
              <div className="flex flex-col gap-2">
                {[
                  { to: APP_ROUTES.notifications, label: "进入消息中心" },
                  { to: APP_ROUTES.webSettings, label: "打开设置页" },
                  { to: APP_ROUTES.compose, label: "开始发布内容" }
                ].map((entry) => (
                  <Button
                    asChild
                    className="justify-between bg-white/10 text-white hover:bg-white/16"
                    key={entry.to}
                    variant="panel"
                  >
                    <Link to={entry.to}>
                      {entry.label}
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                ))}
              </div>
            </SitePanelBody>
          </SitePanel>
        </SiteRail>
      </SiteGrid>
    </SitePage>
  );
}
