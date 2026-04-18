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
  icon: typeof HeartIcon;
}> = [
  {
    value: "engagement",
    label: "点赞和收藏",
    icon: HeartIcon
  },
  {
    value: "follow",
    label: "新增关注",
    icon: UsersIcon
  },
  {
    value: "comment",
    label: "评论和@",
    icon: MessageSquareTextIcon
  },
  {
    value: "system",
    label: "系统消息",
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
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="rounded-[0.9rem] bg-card px-4 py-4" key={index}>
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
  const activeCategoryMeta = messageCenterCategories.find((item) => item.value === activeCategory);
  const ActiveCategoryIcon = activeCategoryMeta?.icon;

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
      <SitePageHead>
        <SitePageTitle>消息中心</SitePageTitle>
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
                <button
                  className="w-full text-left"
                  onClick={() => setActiveCategory(item.value)}
                  type="button"
                >
                  <CardContent className="space-y-3 pt-[var(--panel-padding)]">
                    <div className="relative inline-flex size-9 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                      <Icon className="size-4" />
                      {count > 0 ? (
                        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.6rem] font-bold leading-none text-white">
                          {count > 99 ? "99+" : count}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm font-medium text-foreground">{item.label}</div>
                  </CardContent>
                </button>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="!border-0" variant="muted">
        <CardContent className="space-y-4 pt-[var(--panel-padding)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-medium text-foreground">{activeCategoryMeta?.label}</div>
            <div className="flex flex-wrap gap-2">
              <Button
                aria-label="全部标记已读"
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
                size="icon"
                title="全部标记已读"
                type="button"
              >
                <ShieldCheckIcon />
                <span className="sr-only">全部标记已读</span>
              </Button>
              <Button
                aria-label="刷新"
                onClick={() => {
                  setActionError(null);
                  void refreshNotifications();
                }}
                size="icon"
                title="刷新"
                type="button"
                variant="outline"
              >
                <RefreshCcwIcon />
                <span className="sr-only">刷新</span>
              </Button>
              <Button
                aria-label="通知设置"
                onClick={() => {
                  void navigate(APP_ROUTES.webSettings);
                }}
                size="icon"
                title="通知设置"
                type="button"
                variant="outline"
              >
                <Settings2Icon />
                <span className="sr-only">通知设置</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {contractMismatch ? (
        <Alert>
          <AlertTitle>消息契约待同步</AlertTitle>
          <AlertDescription>
            有 {messageCenter.contract.missingCategoryCount} 条消息缺少 <code>category</code>，暂不展示。
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
          <AlertTitle>分类字段缺失</AlertTitle>
          <AlertDescription>当前消息缺少统一分类，暂不可展示。</AlertDescription>
        </Alert>
      ) : (
        <VirtualFeed
          className="!border-0"
          data={activeItems}
          emptyState={
            <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-[0.9rem] py-6 text-muted-foreground">
              {ActiveCategoryIcon ? <ActiveCategoryIcon className="size-5" /> : null}
              <p className="text-sm">{activeCategoryMeta?.label ?? "当前分类"}暂无消息</p>
            </div>
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
