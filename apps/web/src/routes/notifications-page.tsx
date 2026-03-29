import { useQueryClient } from "@tanstack/react-query";
import {
  BellIcon,
  BellRingIcon,
  MessageSquareTextIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
  UsersIcon
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { VirtualFeed } from "@/components/virtual-feed";
import { SitePage } from "@/components/site-shell";
import { ProfileLink } from "@/components/profile-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_ROUTES } from "@feijia/shared";
import { cn } from "@/lib/utils";
import { apiClient } from "../lib/api-client";
import { getAvatarImage } from "../lib/aviation-media";
import { NOTIFICATIONS_QUERY_KEY } from "../features/auth/notification-state";
import { useNotifications } from "../features/auth/use-notifications";

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
  }
}

function notificationGroupLabel(type: NotificationItem["type"]) {
  switch (type) {
    case "followed":
      return "关注";
    case "post_liked":
    case "post_favorited":
    case "post_shared":
      return "互动";
    case "post_commented":
    case "comment_replied":
      return "评论";
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
    <div className="border border-border/70 bg-white">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="border-b border-border/70 px-4 py-4 last:border-b-0" key={index}>
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3.5 w-40" />
            </div>
            <Skeleton className="h-8 w-16 rounded-[0.8rem]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationRow(props: {
  item: NotificationItem;
  onView: (item: NotificationItem) => void;
}) {
  const unread = !props.item.isRead;

  return (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[auto_minmax(0,1fr)_8rem] md:items-start">
      <ProfileLink userId={props.item.actor.id}>
        <Avatar className="size-10" size="lg">
          <AvatarImage
            alt={props.item.actor.displayName}
            src={props.item.actor.avatarUrl ?? getAvatarImage(props.item.actor.id)}
          />
          <AvatarFallback>{props.item.actor.displayName.slice(0, 1)}</AvatarFallback>
        </Avatar>
      </ProfileLink>

      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{notificationGroupLabel(props.item.type)}</Badge>
          {props.item.isRead ? <Badge variant="outline">已读</Badge> : <Badge variant="destructive">未读</Badge>}
        </div>
        <ProfileLink className="line-clamp-1 text-[0.95rem] font-semibold text-foreground" userId={props.item.actor.id}>
          {notificationLabel(props.item)}
        </ProfileLink>
        <div className="text-sm text-muted-foreground">
          {new Date(props.item.createdAt).toLocaleString("zh-CN", { hour12: false })}
        </div>
        {props.item.post ? <div className="text-sm text-foreground/82">相关帖子：{props.item.post.title}</div> : null}
        {props.item.comment ? (
          <div className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            评论摘要：{props.item.comment.contentPreview}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-full",
            unread ? "bg-red-50 text-red-500" : "bg-secondary/58 text-primary"
          )}
        >
          {props.item.isRead ? <BellIcon className="size-4" /> : <BellRingIcon className="size-4" />}
        </div>
        <Button
          onClick={() => {
            props.onView(props.item);
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          查看
        </Button>
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notificationsQuery = useNotifications();
  const [actionError, setActionError] = useState<string | null>(null);

  const isInitialLoading = notificationsQuery.isLoading;
  const payload = notificationsQuery.data;
  const unreadCount = payload?.unreadCount ?? 0;
  const socialCount = payload?.items.filter((item) => item.type === "followed").length ?? 0;
  const discussionCount =
    payload?.items.filter((item) => item.type === "post_commented" || item.type === "comment_replied").length ?? 0;

  async function refreshNotifications() {
    await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
  }

  async function handleViewNotification(item: NotificationItem) {
    setActionError(null);
    if (!item.isRead) {
      try {
        await apiClient.markNotificationRead(item.id);
      } catch (error: unknown) {
        setActionError(error instanceof Error ? error.message : "标记消息已读失败");
        return;
      } finally {
        await refreshNotifications();
      }
    }

    navigate(notificationHref(item));
  }

  return (
    <SitePage className="mx-auto w-full max-w-[72rem] gap-4">
      {isInitialLoading ? (
        <NotificationStatsSkeleton />
      ) : notificationsQuery.isError ? null : (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "未读消息", value: unreadCount, icon: BellRingIcon, tone: "danger" as const },
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
                    <Icon className={cn("size-4", item.tone === "danger" && item.value > 0 ? "text-red-500" : "text-primary")} />
                  </div>
                  <div className="text-2xl font-semibold tracking-[-0.03em] text-foreground">{item.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="text-sm text-muted-foreground">消息按最新互动顺序展示，支持统一刷新与全部标记已读。</div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              setActionError(null);
              void apiClient
                .markAllNotificationsRead()
                .then(async () => {
                  await refreshNotifications();
                })
                .catch((error: unknown) => {
                  setActionError(error instanceof Error ? error.message : "全部标记已读失败");
                });
            }}
            size="sm"
            type="button"
          >
            <ShieldCheckIcon data-icon="inline-start" />
            全部标记为已读
          </Button>
          <Button
            onClick={() => {
              setActionError(null);
              void refreshNotifications();
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCcwIcon data-icon="inline-start" />
            刷新
          </Button>
          <Button
            onClick={() => {
              navigate(APP_ROUTES.webSettings);
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            通知设置
          </Button>
        </div>
      </div>

      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>消息状态更新失败</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      {notificationsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>消息加载失败</AlertTitle>
          <AlertDescription>{notificationsQuery.error.message}</AlertDescription>
        </Alert>
      ) : isInitialLoading ? (
        <NotificationFeedSkeleton />
      ) : (
        <VirtualFeed
          data={payload?.items ?? []}
          emptyState={
            <Alert>
              <AlertTitle>当前没有新的消息</AlertTitle>
              <AlertDescription>当有人关注、点赞、评论或回复你时，这里会第一时间提醒。</AlertDescription>
            </Alert>
          }
          height={680}
          itemKey={(item) => item.id}
          renderItem={(item) => <NotificationRow item={item} onView={handleViewNotification} />}
        />
      )}
    </SitePage>
  );
}
