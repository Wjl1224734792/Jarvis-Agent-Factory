import { useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  BellIcon,
  BellRingIcon,
  ExternalLinkIcon,
  HeartIcon,
  MessageSquareTextIcon,
  RefreshCcwIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { VirtualFeed } from "@/components/virtual-feed";
import {
  SitePage,
  SitePageDescription,
  SitePageEyebrow,
  SitePageHead,
  SitePageTitle
} from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuthStore } from "../features/auth/auth-store";
import { getNotificationsQueryKey } from "../features/auth/notification-state";
import { useNotifications } from "../features/auth/use-notifications";
import {
  adaptMessageCenterPayload,
  hasMessageCenterContractMismatch,
  type MessageCenterAdaptedPayload,
  type MessageCenterCategory
} from "../features/notifications/message-center";
import { apiClient } from "../lib/api-client";
import { getAvatarImage } from "../lib/aviation-media";
import { cn } from "../lib/utils";
import { openDetailPageInNewTab } from "../lib/web-routes";

const messageCenterCategories: Array<{
  value: MessageCenterCategory;
  label: string;
  description: string;
  icon: typeof HeartIcon;
}> = [
  {
    value: "engagement",
    label: "点赞和收藏",
    description: "集中查看点赞、收藏和分享这类互动信号。",
    icon: HeartIcon
  },
  {
    value: "follow",
    label: "新增关注",
    description: "查看新建立的关注关系和对方主页入口。",
    icon: UsersIcon
  },
  {
    value: "comment",
    label: "评论和@",
    description: "优先处理评论回复、评论上下文和 @ 提醒。",
    icon: MessageSquareTextIcon
  },
  {
    value: "system",
    label: "系统消息",
    description: "承接内容发布状态、审核反馈和系统通知。",
    icon: SparklesIcon
  }
];

function formatMessageTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function NotificationStatsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card className="!border-0" key={index} variant="muted">
          <CardContent className="space-y-3 pt-[var(--panel-padding)]">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3.5 w-full" />
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
            <Skeleton className="size-11 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-8 w-24 rounded-[0.8rem]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageCenterRow(props: {
  item: MessageCenterAdaptedPayload["items"][number];
  pending: boolean;
  onOpen: (item: MessageCenterAdaptedPayload["items"][number]) => void;
}) {
  const unread = !props.item.isRead;

  return (
    <div className="grid gap-4 px-4 py-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start">
      {props.item.actor ? (
        <UserAvatar
          className="size-11 shrink-0"
          displayName={props.item.actor.displayName}
          size="default"
          src={props.item.actor.avatarUrl ?? getAvatarImage(props.item.actor.id)}
        />
      ) : (
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <SparklesIcon className="size-4" />
        </div>
      )}

      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{props.item.kindLabel}</Badge>
          {unread ? <Badge variant="destructive">未读</Badge> : <Badge variant="outline">已读</Badge>}
        </div>

        <div className="space-y-1">
          <button
            className="line-clamp-2 text-left text-[0.95rem] font-semibold text-foreground transition hover:text-primary"
            onClick={() => props.onOpen(props.item)}
            type="button"
          >
            {props.item.title}
          </button>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{props.item.summary}</p>
        </div>

        {props.item.preview && props.item.preview !== props.item.summary ? (
          <div className="rounded-[0.9rem] border border-border/70 bg-surface-2/75 px-3 py-2 text-sm text-foreground/82">
            {props.item.preview}
          </div>
        ) : null}

        <div className="text-sm text-muted-foreground">{formatMessageTime(props.item.createdAt)}</div>
      </div>

      <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-full",
            unread ? "bg-red-50 text-red-500" : "bg-secondary/58 text-primary"
          )}
        >
          {unread ? <BellRingIcon className="size-4" /> : <BellIcon className="size-4" />}
        </div>

        <Button
          disabled={props.pending}
          onClick={() => props.onOpen(props.item)}
          size="sm"
          type="button"
          variant="outline"
        >
          {props.pending ? "跳转中..." : props.item.target.label}
          {props.item.target.openInNewTab ? <ExternalLinkIcon data-icon="inline-end" /> : null}
        </Button>
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUserId = useAuthStore((state) => state.user?.id ?? null);
  const notificationsQuery = useNotifications(authUserId);
  const [activeCategory, setActiveCategory] = useState<MessageCenterCategory>("engagement");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  const isInitialLoading = notificationsQuery.isLoading;
  const messageCenter = useMemo(
    () =>
      adaptMessageCenterPayload(
        notificationsQuery.data ?? {
          unreadCount: 0,
          unreadByCategory: {
            likesAndFavorites: 0,
            newFollowers: 0,
            commentsAndMentions: 0,
            system: 0
          },
          items: []
        }
      ),
    [notificationsQuery.data]
  );
  const contractMismatch = hasMessageCenterContractMismatch(messageCenter);
  const activeItems = messageCenter.items.filter((item) => item.category === activeCategory);

  async function refreshNotifications() {
    await queryClient.invalidateQueries({ queryKey: getNotificationsQueryKey(authUserId) });
  }

  async function handleOpenMessage(item: MessageCenterAdaptedPayload["items"][number]) {
    setActionError(null);
    setPendingItemId(item.id);

    try {
      if (!item.isRead) {
        await apiClient.markNotificationRead(item.id);
        await refreshNotifications();
      }

      if (item.target.openInNewTab) {
        openDetailPageInNewTab(item.target.href);
        return;
      }

      void navigate(item.target.href);
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : "消息跳转失败");
    } finally {
      setPendingItemId(null);
    }
  }

  return (
    <SitePage className="mx-auto w-full max-w-[72rem] gap-4">
      <SitePageHead className="gap-3">
        <SitePageEyebrow>消息中心</SitePageEyebrow>
        <SitePageTitle>按统一分类处理互动、关系和系统通知</SitePageTitle>
        <SitePageDescription>
          一级分类完全跟随共享契约的 <code>category</code> 渲染，列表使用单列虚拟长列表展示，
          方便你连续处理未读消息。
        </SitePageDescription>
      </SitePageHead>

      {isInitialLoading ? (
        <NotificationStatsSkeleton />
      ) : notificationsQuery.isError ? null : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {messageCenterCategories.map((item) => {
            const Icon = item.icon;
            const count = messageCenter.stats.byCategory[item.value];

            return (
              <Card
                className="!border-0"
                key={item.value}
                variant={activeCategory === item.value ? "highlight" : "muted"}
              >
                <CardContent className="space-y-3 pt-[var(--panel-padding)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
                      {item.label}
                    </div>
                    <Icon
                      className={cn(
                        "size-4",
                        count > 0 ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                    {count}
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="!border-0" variant="muted">
        <CardContent className="space-y-4 pt-[var(--panel-padding)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={messageCenter.stats.unread > 0 ? "destructive" : "outline"}>
                  {messageCenter.stats.unread > 0
                    ? `${messageCenter.stats.unread} 条未读`
                    : "全部已读"}
                </Badge>
                <Badge variant="secondary">{messageCenter.stats.total} 条可渲染消息</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                批量已读、单条跳转和长列表刷新都集中在这里处理。
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                disabled={messageCenter.stats.unread === 0 || pendingItemId !== null}
                onClick={() => {
                  setActionError(null);
                  void apiClient
                    .markAllNotificationsRead()
                    .then(async () => {
                      await refreshNotifications();
                    })
                    .catch((error: unknown) => {
                      setActionError(
                        error instanceof Error ? error.message : "全部标记已读失败"
                      );
                    });
                }}
                size="sm"
                type="button"
              >
                <ShieldCheckIcon data-icon="inline-start" />
                全部标记已读
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
                  void navigate(APP_ROUTES.webSettings);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <Settings2Icon data-icon="inline-start" />
                通知设置
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {messageCenterCategories.map((item) => {
              const Icon = item.icon;
              const count = messageCenter.stats.byCategory[item.value];

              return (
                <button
                  className={cn(
                    "site-tab-trigger inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.8rem] transition",
                    activeCategory === item.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/70 bg-white text-foreground/75 hover:text-foreground"
                  )}
                  key={item.value}
                  onClick={() => setActiveCategory(item.value)}
                  type="button"
                >
                  <Icon className="size-3.5" />
                  <span>{item.label}</span>
                  <span className="text-[0.72rem] opacity-85">{count}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {contractMismatch ? (
        <Alert>
          <AlertTitle>消息契约待同步</AlertTitle>
          <AlertDescription>
            当前返回中有 {messageCenter.contract.missingCategoryCount} 条消息缺少共享{" "}
            <code>category</code>，前端不会再基于旧 <code>type</code> 本地分组，因此这些消息暂不渲染。
          </AlertDescription>
        </Alert>
      ) : null}

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
      ) : messageCenter.items.length === 0 && contractMismatch ? (
        <Alert>
          <AlertTitle>消息中心等待共享契约上线</AlertTitle>
          <AlertDescription>
            接口已经返回数据，但缺少当前页面要求的统一分类字段，暂时无法进入消息流展示。
          </AlertDescription>
        </Alert>
      ) : (
        <VirtualFeed
          className="!border-0"
          data={activeItems}
          emptyState={
            <Alert>
              <AlertTitle>
                {messageCenterCategories.find((item) => item.value === activeCategory)?.label}
                暂无消息
              </AlertTitle>
              <AlertDescription>
                {messageCenterCategories.find((item) => item.value === activeCategory)?.description}
              </AlertDescription>
            </Alert>
          }
          height={720}
          itemKey={(item) => item.id}
          renderItem={(item) => (
            <MessageCenterRow
              item={item}
              onOpen={handleOpenMessage}
              pending={pendingItemId === item.id}
            />
          )}
          refetchFooterLabel="消息列表同步中..."
          showRefetchFooter={notificationsQuery.isFetching && !notificationsQuery.isLoading}
        />
      )}
    </SitePage>
  );
}
