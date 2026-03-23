import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellIcon,
  BellRingIcon,
  MessageSquareTextIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon
} from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { apiClient } from "../lib/api-client";

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

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.listNotifications()
  });

  if (notificationsQuery.isLoading) {
    return (
      <Card className="rounded-[1.8rem] border-border/80 bg-card/80">
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
  const totalCount = payload?.items.length ?? 0;
  const socialCount = payload?.items.filter((item) => item.type === "followed").length ?? 0;
  const discussionCount =
    payload?.items.filter(
      (item) => item.type === "post_commented" || item.type === "comment_replied"
    ).length ?? 0;

  return (
    <main className="flex flex-col gap-8">
      <section className="overflow-hidden rounded-[2rem] border border-border/80 bg-[linear-gradient(150deg,rgba(15,23,42,0.96)_0%,rgba(25,80,129,0.92)_48%,rgba(59,130,246,0.82)_100%)] p-6 text-primary-foreground shadow-[0_40px_90px_-58px_rgba(15,23,42,0.95)] sm:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white/14 text-white hover:bg-white/14">Notification Center</Badge>
              <Badge variant="outline" className="border-white/18 bg-white/8 text-white">
                社区反馈回流
              </Badge>
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              把关注、互动与回复统一收口在一个地方。
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-sky-50/86">
              通知中心负责把真正与你有关的变化提炼出来，让你直接回到帖子、评论和关系更新发生的位置。
            </p>
          </div>

          <Card className="rounded-[1.75rem] border-white/10 bg-white/8 text-white shadow-none backdrop-blur">
            <CardHeader>
              <CardDescription className="text-sky-100/70">Live Snapshot</CardDescription>
              <CardTitle className="text-2xl text-white">消息概况</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "未读", value: unreadCount, icon: BellRingIcon },
                { label: "关注", value: socialCount, icon: UsersIcon },
                { label: "评论", value: discussionCount, icon: MessageSquareTextIcon }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    className="rounded-[1.25rem] border border-white/10 bg-white/8 p-4"
                    key={item.label}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-white">{item.label}</div>
                      <Icon className="size-4.5 text-sky-100/80" />
                    </div>
                    <div className="mt-4 text-3xl font-semibold text-white">{item.value}</div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
        <Card className="rounded-[1.8rem] border-border/80 bg-card/80">
          <CardHeader>
            <CardTitle className="text-2xl">通知动作</CardTitle>
            <CardDescription>先处理状态，再返回真正有内容变化的地方。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              onClick={() => {
                void apiClient.markAllNotificationsRead().then(() => {
                  void queryClient.invalidateQueries({ queryKey: ["notifications"] });
                });
              }}
              size="lg"
              type="button"
            >
              <ShieldCheckIcon data-icon="inline-start" />
              全部标记为已读
            </Button>

            <Button
              onClick={() => {
                void queryClient.invalidateQueries({ queryKey: ["notifications"] });
              }}
              size="lg"
              type="button"
              variant="outline"
            >
              <RefreshCcwIcon data-icon="inline-start" />
              刷新提醒列表
            </Button>

            <Separator />

            {[
              {
                title: "关注提醒",
                description: "让新的关系变化被及时看见。",
                icon: UsersIcon
              },
              {
                title: "互动提醒",
                description: "点赞、收藏和分享会回流到这里。",
                icon: SparklesIcon
              },
              {
                title: "评论提醒",
                description: "评论和回复会带你回到具体上下文。",
                icon: MessageSquareTextIcon
              }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  className="flex items-start gap-4 rounded-[1.25rem] bg-secondary/45 p-4"
                  key={item.title}
                >
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-card text-primary shadow-sm">
                    <Icon className="size-4.5" />
                  </span>
                  <div>
                    <div className="font-medium text-foreground">{item.title}</div>
                    <div className="mt-2 text-sm leading-7 text-muted-foreground">
                      {item.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {payload && payload.items.length > 0 ? (
            payload.items.map((item) => (
              <Card
                className="rounded-[1.8rem] border-border/80 bg-card/82 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.35)]"
                key={item.id}
              >
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{notificationGroupLabel(item.type)}</Badge>
                    {!item.isRead ? <Badge>未读</Badge> : <Badge variant="outline">已读</Badge>}
                  </div>
                  <div className="flex items-start gap-4 pt-2">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                      {item.isRead ? <BellIcon className="size-4.5" /> : <BellRingIcon className="size-4.5" />}
                    </span>
                    <div>
                      <CardTitle className="text-xl">{notificationLabel(item)}</CardTitle>
                      <CardDescription className="mt-2">
                        {new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {item.post ? (
                    <div className="rounded-[1.2rem] border border-border/80 bg-secondary/40 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        相关帖子
                      </div>
                      <div className="mt-2 text-sm font-medium text-foreground">{item.post.title}</div>
                    </div>
                  ) : null}
                  {item.comment ? (
                    <div className="rounded-[1.2rem] border border-border/80 bg-secondary/40 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        评论摘录
                      </div>
                      <div className="mt-2 text-sm leading-7 text-muted-foreground">
                        {item.comment.contentPreview}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
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
      </section>
    </main>
  );
}
