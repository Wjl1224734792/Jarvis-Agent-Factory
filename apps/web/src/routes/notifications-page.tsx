import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  BellIcon,
  BellRingIcon,
  MessageSquareTextIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon
} from "lucide-react";
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
import { ProfileLink } from "@/components/profile-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "../lib/api-client";
import { getAvatarImage } from "../lib/aviation-media";

type NotificationItem = Awaited<ReturnType<typeof apiClient.listNotifications>>["items"][number];

function notificationLabel(item: NotificationItem) {
  switch (item.type) {
    case "followed":
      return `${item.actor.displayName} 关注了你`;
    case "post_liked":
      return `${item.actor.displayName} 点赞了你的帖子`;
    case "post_favorited":
      return `${item.actor.displayName} 收藏了你的帖子`;
    case "post_shared":
      return `${item.actor.displayName} 分享了你的帖子`;
    case "post_commented":
      return `${item.actor.displayName} 评论了你的帖子`;
    case "comment_replied":
      return `${item.actor.displayName} 回复了你的评论`;
    default:
      return "你有一条新的站内提醒";
  }
}

function notificationGroupLabel(type: NotificationItem["type"]) {
  switch (type) {
    case "followed":
      return "关注动态";
    case "post_liked":
    case "post_favorited":
    case "post_shared":
      return "帖子互动";
    case "post_commented":
    case "comment_replied":
      return "评论交流";
    default:
      return "站内提醒";
  }
}

function notificationHref(item: NotificationItem) {
  if (item.comment?.postId) {
    return APP_ROUTES.postDetail.replace(":id", item.comment.postId);
  }

  if (item.post?.id) {
    return APP_ROUTES.postDetail.replace(":id", item.post.id);
  }

  return APP_ROUTES.feedHome;
}

function NotificationStatsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} variant="muted">
          <CardContent className="space-y-3 pt-[var(--panel-padding)]">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NotificationFeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <SitePanel key={index}>
          <SitePanelBody className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
            <div className="flex items-start gap-3">
              <Skeleton className="size-11 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3.5 w-40" />
              </div>
              <Skeleton className="size-10 rounded-[0.9rem]" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-20 rounded-[calc(var(--radius-panel)-0.2rem)]" />
              <Skeleton className="h-20 rounded-[calc(var(--radius-panel)-0.2rem)]" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-9 w-24 rounded-[var(--radius-control)]" />
            </div>
          </SitePanelBody>
        </SitePanel>
      ))}
    </div>
  );
}

function NotificationRailSkeleton() {
  return (
    <SiteRail>
      <Card variant="muted">
        <CardContent className="space-y-3 pt-[var(--panel-padding)]">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-10 rounded-[var(--radius-control)]" />
          <Skeleton className="h-10 rounded-[var(--radius-control)]" />
        </CardContent>
      </Card>
      <Card variant="muted">
        <CardContent className="space-y-3 pt-[var(--panel-padding)]">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton className="h-20 rounded-[calc(var(--radius-panel)-0.2rem)]" key={index} />
          ))}
        </CardContent>
      </Card>
    </SiteRail>
  );
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.listNotifications()
  });

  const isInitialLoading = notificationsQuery.isLoading;
  const hasError = notificationsQuery.isError;
  const payload = notificationsQuery.data;
  const unreadCount = payload?.unreadCount ?? 0;
  const socialCount = payload?.items.filter((item) => item.type === "followed").length ?? 0;
  const discussionCount =
    payload?.items.filter(
      (item) => item.type === "post_commented" || item.type === "comment_replied"
    ).length ?? 0;

  return (
    <SitePage>
      <SitePageHead>
        <SitePageEyebrow>消息中心</SitePageEyebrow>
        <SitePageTitle>站内消息与互动提醒</SitePageTitle>
        <SitePageDescription>
          把关注、互动和评论提醒收成更紧凑的一条流，加载时只替换消息区块，不再整页闪动。
        </SitePageDescription>
      </SitePageHead>

      <SiteGrid variant="sidebar">
        <div className="space-y-4">
          {isInitialLoading ? (
            <NotificationStatsSkeleton />
          ) : hasError ? null : (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "未读消息", value: unreadCount, icon: BellRingIcon },
                { label: "关注提醒", value: socialCount, icon: UsersIcon },
                { label: "评论提醒", value: discussionCount, icon: MessageSquareTextIcon }
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <Card key={item.label} variant="muted">
                    <CardContent className="space-y-3 pt-[var(--panel-padding)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
                          {item.label}
                        </div>
                        <Icon className="size-4 text-primary" />
                      </div>
                      <div className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                        {item.value}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {hasError ? (
            <Alert variant="destructive">
              <AlertTitle>消息加载失败</AlertTitle>
              <AlertDescription>{notificationsQuery.error.message}</AlertDescription>
            </Alert>
          ) : (
            <>
              {isInitialLoading ? (
                <NotificationFeedSkeleton />
              ) : payload && payload.items.length > 0 ? (
                <div className="space-y-3">
                  {payload.items.map((item) => (
                    <SitePanel key={item.id}>
                      <SitePanelBody className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{notificationGroupLabel(item.type)}</Badge>
                          {item.isRead ? <Badge variant="outline">已读</Badge> : <Badge>未读</Badge>}
                        </div>

                        <div className="flex items-start gap-3">
                      <ProfileLink userId={item.actor.id}>
                          <Avatar className="size-11" size="lg">
                          <AvatarImage alt={item.actor.displayName} src={item.actor.avatarUrl ?? getAvatarImage(item.actor.id)} />
                          <AvatarFallback>{item.actor.displayName.slice(0, 1)}</AvatarFallback>
                        </Avatar>
                      </ProfileLink>
                      <div className="min-w-0 flex-1">
                        <ProfileLink className="text-base font-semibold text-foreground md:text-lg" userId={item.actor.id}>
                          {notificationLabel(item)}
                        </ProfileLink>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}
                        </div>
                          </div>
                          <div className="flex size-10 items-center justify-center rounded-[0.9rem] bg-secondary/58 text-primary">
                            {item.isRead ? <BellIcon className="size-4.5" /> : <BellRingIcon className="size-4.5" />}
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          {item.post ? (
                            <div className="rounded-[calc(var(--radius-panel)-0.2rem)] bg-background/72 px-4 py-4">
                              <div className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                                相关帖子
                              </div>
                              <div className="mt-2 text-sm font-medium text-foreground md:text-base">
                                {item.post.title}
                              </div>
                            </div>
                          ) : null}

                          {item.comment ? (
                            <div className="rounded-[calc(var(--radius-panel)-0.2rem)] bg-background/72 px-4 py-4">
                              <div className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                                评论摘录
                              </div>
                              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                                {item.comment.contentPreview}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex justify-end">
                          <Button asChild size="sm" type="button" variant="outline">
                            <Link to={notificationHref(item)}>查看上下文</Link>
                          </Button>
                        </div>
                      </SitePanelBody>
                    </SitePanel>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertTitle>目前还没有新的消息</AlertTitle>
                  <AlertDescription>
                    当有人关注你、与你互动或回复评论时，这里会优先收进一条紧凑的信息流里。
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        {isInitialLoading ? (
          <NotificationRailSkeleton />
        ) : hasError ? (
          <SiteRail>
            <Card variant="muted">
              <CardContent className="pt-[var(--panel-padding)]">
                <div className="text-sm leading-6 text-muted-foreground">
                  当前无法获取消息数据，请稍后刷新重试。
                </div>
              </CardContent>
            </Card>
          </SiteRail>
        ) : (
          <SiteRail>
            <Card variant="muted">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">消息动作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => {
                    void apiClient.markAllNotificationsRead().then(() => {
                      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
                    });
                  }}
                  size="sm"
                  type="button"
                >
                  <ShieldCheckIcon data-icon="inline-start" />
                  全部标记为已读
                </Button>

                <Button
                  className="w-full"
                  onClick={() => {
                    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RefreshCcwIcon data-icon="inline-start" />
                  刷新消息流
                </Button>
              </CardContent>
            </Card>

            <Card variant="muted">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">快速入口</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "查看个人主页", href: APP_ROUTES.webProfile, icon: UsersIcon },
                  { label: "调整通知设置", href: APP_ROUTES.webSettings, icon: SparklesIcon }
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <Button asChild className="w-full justify-between" key={item.label} size="sm" variant="outline">
                      <Link to={item.href}>
                        <span className="inline-flex items-center gap-2">
                          <Icon className="size-4 text-primary" />
                          {item.label}
                        </span>
                      </Link>
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          </SiteRail>
        )}
      </SiteGrid>
    </SitePage>
  );
}
