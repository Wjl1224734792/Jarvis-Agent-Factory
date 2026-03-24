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
  SitePanel,
  SitePanelBody,
  SiteRail
} from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient } from "../lib/api-client";
import { getAvatarImage } from "../lib/aviation-media";

function notificationLabel(
  item: Awaited<ReturnType<typeof apiClient.listNotifications>>["items"][number]
) {
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
      return "你有一条新通知";
  }
}

function notificationGroupLabel(
  type: Awaited<ReturnType<typeof apiClient.listNotifications>>["items"][number]["type"]
) {
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

function notificationHref(
  item: Awaited<ReturnType<typeof apiClient.listNotifications>>["items"][number]
) {
  if (item.comment?.postId) {
    return APP_ROUTES.postDetail.replace(":id", item.comment.postId);
  }

  if (item.post?.id) {
    return APP_ROUTES.postDetail.replace(":id", item.post.id);
  }

  return APP_ROUTES.feedHome;
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.listNotifications()
  });

  if (notificationsQuery.isLoading) {
    return (
      <Card className="rounded-[1.9rem] border-border/80 bg-card/94">
        <CardContent className="px-6 py-8 text-sm text-muted-foreground">
          正在加载通知中心...
        </CardContent>
      </Card>
    );
  }

  if (notificationsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>通知加载失败</AlertTitle>
        <AlertDescription>{notificationsQuery.error.message}</AlertDescription>
      </Alert>
    );
  }

  const payload = notificationsQuery.data;
  const unreadCount = payload?.unreadCount ?? 0;
  const socialCount = payload?.items.filter((item) => item.type === "followed").length ?? 0;
  const discussionCount =
    payload?.items.filter(
      (item) => item.type === "post_commented" || item.type === "comment_replied"
    ).length ?? 0;

  return (
    <SitePage>
      <SitePanel>
        <SitePanelBody>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "未读", value: unreadCount, icon: BellRingIcon },
              { label: "关注", value: socialCount, icon: UsersIcon },
              { label: "评论", value: discussionCount, icon: MessageSquareTextIcon }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div className="rounded-[calc(var(--radius-panel)-0.15rem)] bg-secondary/42 px-5 py-5" key={item.label}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
                      {item.label}
                    </div>
                    <Icon className="size-4.5 text-primary" />
                  </div>
                  <div className="mt-4 text-5xl font-semibold text-foreground">{item.value}</div>
                </div>
              );
            })}
          </div>
        </SitePanelBody>
      </SitePanel>

      <SiteGrid variant="sidebar">
        <SiteRail>
          <Card variant="muted">
            <CardContent className="space-y-4">
              <div className="text-2xl font-semibold text-foreground">通知动作</div>
              <Button
                className="w-full"
                onClick={() => {
                  void apiClient.markAllNotificationsRead().then(() => {
                    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
                  });
                }}
                size="xl"
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
                size="xl"
                type="button"
                variant="outline"
              >
                <RefreshCcwIcon data-icon="inline-start" />
                刷新提醒列表
              </Button>
            </CardContent>
          </Card>

          <Card variant="muted">
            <CardContent className="space-y-4">
              {[
                {
                  title: "关注提醒",
                  description: "新的关系变化会先进入这里，再决定是否回访对方主页。",
                  icon: UsersIcon
                },
                {
                  title: "互动提醒",
                  description: "点赞、收藏和分享统一归档，减少零散打断。",
                  icon: SparklesIcon
                },
                {
                  title: "评论提醒",
                  description: "评论和回复会尽量带你回到原始讨论上下文。",
                  icon: MessageSquareTextIcon
                }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div className="rounded-[calc(var(--radius-panel)-0.2rem)] bg-secondary/42 p-5" key={item.title}>
                    <div className="flex items-center gap-3 text-lg font-semibold text-foreground">
                      <Icon className="size-5 text-primary" />
                      {item.title}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </SiteRail>

        <div className="flex flex-col gap-5">
          {payload && payload.items.length > 0 ? (
            payload.items.map((item) => (
              <SitePanel key={item.id}>
                <SitePanelBody>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{notificationGroupLabel(item.type)}</Badge>
                    {!item.isRead ? (
                      <Badge>未读</Badge>
                    ) : (
                      <Badge variant="outline">已读</Badge>
                    )}
                  </div>

                  <div className="mt-5 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <Avatar size="lg">
                        <AvatarImage alt={item.actor.displayName} src={getAvatarImage(item.actor.id)} />
                        <AvatarFallback>{item.actor.displayName.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-2xl font-semibold text-foreground">{notificationLabel(item)}</div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}
                        </div>
                      </div>
                    </div>
                    <div className="flex size-12 items-center justify-center rounded-[1rem] bg-secondary/52 text-primary">
                      {item.isRead ? <BellIcon className="size-5" /> : <BellRingIcon className="size-5" />}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {item.post ? (
                      <div className="rounded-[calc(var(--radius-panel)-0.2rem)] bg-background/72 p-5">
                        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          相关帖子
                        </div>
                        <div className="mt-3 text-lg font-semibold text-foreground">{item.post.title}</div>
                      </div>
                    ) : null}
                    {item.comment ? (
                      <div className="rounded-[calc(var(--radius-panel)-0.2rem)] bg-background/72 p-5">
                        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          评论摘录
                        </div>
                        <div className="mt-3 text-sm leading-7 text-muted-foreground">
                          {item.comment.contentPreview}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 flex justify-end">
                    <Button asChild type="button" variant="outline">
                      <Link to={notificationHref(item)}>查看上下文</Link>
                    </Button>
                  </div>
                </SitePanelBody>
              </SitePanel>
            ))
          ) : (
            <Alert>
              <AlertTitle>还没有新的通知</AlertTitle>
              <AlertDescription>
                当前会在有人关注你、与你互动或回复评论时进入这里。
              </AlertDescription>
            </Alert>
          )}
        </div>
      </SiteGrid>
    </SitePage>
  );
}
