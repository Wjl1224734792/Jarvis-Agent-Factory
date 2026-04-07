import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { BellIcon, Clock3Icon, PenSquareIcon, Settings2Icon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { VirtualFeed } from "@/components/virtual-feed";
import { SitePage, SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "../../lib/api-client";
import { getProfileBanner } from "../../lib/aviation-media";
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
    case "rating-target":
      return {
        label: "评分对象",
        href: APP_ROUTES.ratingTargetDetail.replace(":id", item.id),
        title: item.title,
        summary: item.summary ?? `${item.rankingTitle} 评分对象`
      };
    case "aircraft":
      return {
        label: "飞行器投稿",
        href: null,
        title: item.modelName,
        summary: item.summary ?? "机型投稿仍在审核或等待重新提交。"
      };
    case "review":
      return {
        label: "机型评测",
        href: APP_ROUTES.modelDetail.replace(":slug", item.model.slug),
        title: item.model.name,
        summary: item.content ?? "这条评测暂时没有补充长文。"
      };
    case "brand-application":
      return {
        label: "品牌申请",
        href: null,
        title: item.name,
        summary: item.description ?? "品牌申请正在审核或等待修改后重新提交。"
      };
  }
}

function getManageHref(item: ContentItem) {
  switch (item.type) {
    case "post":
      return item.postType === "article"
        ? `${APP_ROUTES.publishArticle}?edit=${item.id}`
        : `${APP_ROUTES.publishMoment}?edit=${item.id}`;
    case "ranking":
      return `${APP_ROUTES.rankingEditor}?edit=${item.id}`;
    case "rating-target":
      return `${APP_ROUTES.ratingTargetDetail.replace(":id", item.id)}?edit=1&ranking=${item.rankingId}`;
    case "aircraft":
      return `${APP_ROUTES.publishAircraft}?edit=${item.id}`;
    case "brand-application":
      return `${APP_ROUTES.publishBrand}?edit=${item.id}`;
    default:
      return null;
  }
}

function getRejectionReason(item: ContentItem) {
  if (!("rejectionReason" in item)) {
    return null;
  }
  return typeof item.rejectionReason === "string" && item.rejectionReason.trim().length > 0
    ? item.rejectionReason
    : null;
}

function ContentFeedRow(props: {
  item: ContentItem;
  showManagement?: boolean;
  onDelete?: (item: ContentItem) => void;
  deletingId?: string | null;
}) {
  const meta = getContentMeta(props.item);
  const manageHref = getManageHref(props.item);
  const rejectionReason = getRejectionReason(props.item);

  const content = (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[7rem_minmax(0,1fr)_8.5rem] md:items-start">
      <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-start md:gap-1">
        <Badge variant="outline">{meta.label}</Badge>
        <span className="text-[0.72rem] text-muted-foreground">
          {new Date(props.item.updatedAt).toLocaleDateString("zh-CN")}
        </span>
      </div>
      <div className="min-w-0 space-y-2">
        <div className="truncate text-[0.95rem] font-semibold text-foreground">{meta.title}</div>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{meta.summary}</p>
        {rejectionReason ? (
          <div className="rounded-[0.75rem] border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
            驳回原因：{rejectionReason}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2 text-[0.72rem] text-muted-foreground md:justify-end">
        <Clock3Icon className="size-3.5" />
        {new Date(props.item.updatedAt).toLocaleString("zh-CN", { hour12: false })}
      </div>
      {props.showManagement ? (
        <div className="flex flex-wrap items-center gap-2 md:col-span-3 md:justify-end">
          {manageHref ? (
            <Button asChild size="sm" type="button" variant="outline">
              <Link to={manageHref}>编辑</Link>
            </Button>
          ) : null}
          {props.onDelete &&
          (props.item.type === "post" ||
            props.item.type === "aircraft" ||
            props.item.type === "rating-target") ? (
            <Button
              disabled={props.deletingId === props.item.id}
              onClick={() => props.onDelete?.(props.item)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Trash2Icon data-icon="inline-start" />
              {props.deletingId === props.item.id ? "处理中..." : "删除"}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (!meta.href) {
    return content;
  }

  return (
    <Link className="block transition hover:bg-accent/28" to={meta.href}>
      {content}
    </Link>
  );
}

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProfileTab>("activity");
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentProfileQuery = useQuery({
    queryKey: ["current-user-profile", user?.id],
    queryFn: () => apiClient.getCurrentUserProfile(),
    enabled: Boolean(user)
  });
  const profileQuery = useQuery({
    queryKey: ["self-profile", user?.id],
    queryFn: () => {
      if (!user) {
        throw new Error("Missing user context");
      }
      return apiClient.getUserProfile(user.id);
    },
    enabled: Boolean(user)
  });
  const contentQuery = useQuery({
    queryKey: ["self-profile-content", user?.id],
    queryFn: () => {
      if (!user) {
        throw new Error("Missing user context");
      }
      return apiClient.listUserContent(user.id);
    },
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
  const userId = user.id;
  const avatarUrl = settings?.avatarUrl ?? user.avatarUrl ?? null;
  const bio = settings?.bio ?? "还没有填写个人简介。";

  if ((profileQuery.isLoading && !profile) || (currentProfileQuery.isLoading && !settings)) {
    return <ProfilePageSkeleton />;
  }

  async function handleDelete(item: ContentItem) {
    setDeletingId(item.id);
    setActionError(null);
    try {
      if (item.type === "post") {
        await apiClient.deletePost(item.id);
      } else if (item.type === "aircraft") {
        await apiClient.deleteAircraftSubmission(item.id);
      } else if (item.type === "rating-target") {
        await apiClient.deleteRatingTarget(item.id);
      } else {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["self-profile-content", userId] }),
        queryClient.invalidateQueries({ queryKey: ["self-profile", userId] }),
        queryClient.invalidateQueries({ queryKey: ["models"] }),
        queryClient.invalidateQueries({ queryKey: ["rankings"] }),
        queryClient.invalidateQueries({ queryKey: ["home-shell-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["circle-feed"] })
      ]);
    } catch (reason: unknown) {
      setActionError(reason instanceof Error ? reason.message : "内容删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <SitePage className="mx-auto w-full max-w-[72rem] gap-4">
      <SitePanel className="overflow-hidden !border-0" variant="floating">
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
              <UserAvatar
                className="-mt-12 size-22 rounded-[0.9rem] ring-4 ring-white md:size-24"
                displayName={displayName}
                size="lg"
                src={avatarUrl}
              />

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

      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>内容管理失败</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

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
          <div className="rounded-[0.95rem] bg-surface-1 px-4 py-4 text-sm text-muted-foreground">
            这里集中管理文章、动态、榜单、榜单条目、品牌申请和机型投稿。被驳回的内容会直接显示原因，修改后可重新提交。
          </div>
          <VirtualFeed
            className="!border-0"
            data={activityItems}
            emptyState={
              <div className="bg-white px-5 py-5 text-sm text-muted-foreground">
                还没有公开内容。
              </div>
            }
            height={660}
            itemKey={(item) => `${item.type}-${item.id}`}
            renderItem={(item) => (
              <ContentFeedRow
                deletingId={deletingId}
                item={item}
                onDelete={handleDelete}
                showManagement
              />
            )}
          />
        </TabsContent>

        <TabsContent className="space-y-4" value="favorites">
          <VirtualFeed
            className="!border-0"
            data={favoriteItems}
            emptyState={
              <div className="bg-white px-5 py-5 text-sm text-muted-foreground">
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
