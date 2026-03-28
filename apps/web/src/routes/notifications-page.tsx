import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellIcon,
  BellRingIcon,
  MessageSquareTextIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
  UsersIcon
} from "lucide-react";
import { Link } from "react-router-dom";
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

function NotificationRow({ item }: { item: NotificationItem }) {
  return (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[auto_minmax(0,1fr)_8rem] md:items-start">
      <ProfileLink userId={item.actor.id}>
        <Avatar className="size-10" size="lg">
          <AvatarImage
            alt={item.actor.displayName}
            src={item.actor.avatarUrl ?? getAvatarImage(item.actor.id)}
          />
          <AvatarFallback>{item.actor.displayName.slice(0, 1)}</AvatarFallback>
        </Avatar>
      </ProfileLink>

      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{notificationGroupLabel(item.type)}</Badge>
          {item.isRead ? <Badge variant="outline">已读</Badge> : <Badge>未读</Badge>}
        </div>
        <ProfileLink className="line-clamp-1 text-[0.95rem] font-semibold text-foreground" userId={item.actor.id}>
          {notificationLabel(item)}
        </ProfileLink>
        <div className="text-sm text-muted-foreground">
          {new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}
        </div>
        {item.post ? <div className="text-sm text-foreground/82">相关帖子：{item.post.title}</div> : null}
        {item.comment ? (
          <div className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            评论摘要：{item.comment.contentPreview}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
        <div className="flex size-9 items-center justify-center rounded-full bg-secondary/58 text-primary">
          {item.isRead ? <BellIcon className="size-4" /> : <BellRingIcon className="size-4" />}
        </div>
        <Button asChild size="sm" type="button" variant="outline">
          <Link to={notificationHref(item)}>查看</Link>
        </Button>
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.listNotifications()
  });

  const isInitialLoading = notificationsQuery.isLoading;
  const payload = notificationsQuery.data;
  const unreadCount = payload?.unreadCount ?? 0;
  const socialCount = payload?.items.filter((item) => item.type === "followed").length ?? 0;
  const discussionCount =
    payload?.items.filter((item) => item.type === "post_commented" || item.type === "comment_replied").length ?? 0;

  return (
    <SitePage className="mx-auto w-full max-w-[72rem] gap-4">
      {isInitialLoading ? (
        <NotificationStatsSkeleton />
      ) : notificationsQuery.isError ? null : (
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="text-sm text-muted-foreground">消息按最新互动顺序展示，大量数据时会自动虚拟渲染。</div>
        <div className="flex flex-wrap gap-3">
          <Button
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
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ["notifications"] });
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCcwIcon data-icon="inline-start" />
            刷新
          </Button>
          <Button asChild size="sm" type="button" variant="outline">
            <Link to={APP_ROUTES.webSettings}>通知设置</Link>
          </Button>
        </div>
      </div>

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
              <AlertTitle>目前还没有新的消息</AlertTitle>
              <AlertDescription>有新的关注、互动或评论时，这里会直接列出来。</AlertDescription>
            </Alert>
          }
          height={680}
          itemKey={(item) => item.id}
          renderItem={(item) => <NotificationRow item={item} />}
        />
      )}
    </SitePage>
  );
}
