import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { BellIcon, CameraIcon, Clock3Icon, PenSquareIcon, Settings2Icon, Trash2Icon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
import { getAvatarImage, getProfileBanner } from "../../lib/aviation-media";
import { DETAIL_PAGE_LINK_PROPS } from "../../lib/web-routes";
import { useAuthStore } from "./auth-store";
import {
  filterProfileItems,
  getProfileItemLifecycle,
  type ProfileContentCategory,
  type ProfileLifecycle
} from "./profile-content-filters";
import { profileVisibilityLabel } from "./profile-settings-state";

type ProfileTab = "activity" | "favorites";
type ContentItem = Awaited<ReturnType<typeof apiClient.listUserContent>>["items"][number];

const profileTabs: Array<{ value: ProfileTab; label: string }> = [
  { value: "activity", label: "内容" },
  { value: "favorites", label: "收藏" }
];

const profileContentCategories: Array<{ value: ProfileContentCategory; label: string }> = [
  { value: "article", label: "文章" },
  { value: "moment", label: "动态" },
  { value: "ranking", label: "榜单" },
  { value: "brand", label: "品牌" },
  { value: "aircraft", label: "飞行器" }
];

const profileLifecycleFilters: Array<{ value: ProfileLifecycle; label: string }> = [
  { value: "all", label: "全部" },
  { value: "draft", label: "草稿" },
  { value: "reviewing", label: "审核中" },
  { value: "published", label: "已发布" },
  { value: "rejected", label: "已驳回" }
];

function ProfilePageSkeleton() {
  return (
    <SitePage>
      <SitePanel className="overflow-hidden">
        <div className="relative">
          <Skeleton className="h-44 w-full md:h-52" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
            <div className="flex items-end gap-4">
              <Skeleton className="h-28 w-28 rounded-full bg-white md:h-32 md:w-32" />
              <div className="space-y-2 pb-3">
                <Skeleton className="h-10 w-52 bg-white/28" />
                <Skeleton className="h-6 w-24 rounded-full bg-white/22" />
              </div>
            </div>
          </div>
        </div>
        <SitePanelBody className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
            <div className="grid gap-4 md:grid-cols-[9rem_minmax(0,1fr)] md:items-start">
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton className="h-18 rounded-[0.8rem]" key={index} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 border-t border-border/70 pt-4">
            <Skeleton className="h-10 w-36 rounded-[0.8rem]" />
            <Skeleton className="h-10 w-36 rounded-[0.8rem]" />
            <Skeleton className="h-10 w-36 rounded-[0.8rem]" />
          </div>
        </SitePanelBody>
      </SitePanel>
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
        summary: "社区榜单"
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

function getAuthorViewCount(item: ContentItem) {
  if (item.type === "post" || item.type === "aircraft") {
    return item.viewCount;
  }

  return null;
}

function getLifecycleBadge(item: ContentItem) {
  const lifecycle = getProfileItemLifecycle(item);
  switch (lifecycle) {
    case "draft":
      return {
        label: "草稿",
        className: "border-slate-300/80 bg-slate-50 text-slate-700"
      };
    case "reviewing":
      return {
        label: "审核中",
        className: "border-sky-200 bg-sky-50 text-sky-700"
      };
    case "published":
      return {
        label: "已发布",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700"
      };
    case "rejected":
      return {
        label: "已驳回",
        className: "border-amber-300/90 bg-amber-50 text-amber-800"
      };
    default:
      return null;
  }
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
  const lifecycleBadge = props.showManagement ? getLifecycleBadge(props.item) : null;
  const authorViewCount =
    props.showManagement && "canManage" in props.item && props.item.canManage
      ? getAuthorViewCount(props.item)
      : null;

  const content = (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[7rem_minmax(0,1fr)_8.5rem] md:items-start">
      <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-start md:gap-1">
        <Badge variant="outline">{meta.label}</Badge>
        {lifecycleBadge ? (
          <Badge className={lifecycleBadge.className} variant="outline">
            {lifecycleBadge.label}
          </Badge>
        ) : null}
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
        {typeof authorViewCount === "number" ? <span>浏览 {authorViewCount}</span> : null}
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
    <Link className="block transition hover:bg-accent/28" {...DETAIL_PAGE_LINK_PROPS} to={meta.href}>
      {content}
    </Link>
  );
}

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("activity");
  const [activeContentCategory, setActiveContentCategory] = useState<ProfileContentCategory>("article");
  const [activeFavoriteCategory, setActiveFavoriteCategory] = useState<ProfileContentCategory>("article");
  const [activeLifecycle, setActiveLifecycle] = useState<ProfileLifecycle>("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUpdatingCover, setIsUpdatingCover] = useState(false);

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

  const allProfileItems = useMemo(() => contentQuery.data?.items ?? [], [contentQuery.data?.items]);
  const contentCategoryCounts = useMemo(
    () =>
      new Map(
        profileContentCategories.map((category) => [
          category.value,
          filterProfileItems(allProfileItems, {
            primaryTab: "content",
            category: category.value,
            lifecycle: "all"
          }).length
        ])
      ),
    [allProfileItems]
  );
  const favoriteCategoryCounts = useMemo(
    () =>
      new Map(
        profileContentCategories.map((category) => [
          category.value,
          filterProfileItems(allProfileItems, {
            primaryTab: "favorites",
            category: category.value
          }).length
        ])
      ),
    [allProfileItems]
  );
  const favoriteItems = useMemo(
    () =>
      filterProfileItems(allProfileItems, {
        primaryTab: "favorites",
        category: activeFavoriteCategory
      }),
    [activeFavoriteCategory, allProfileItems]
  );
  const activityItems = useMemo(
    () =>
      filterProfileItems(allProfileItems, {
        primaryTab: "content",
        category: activeContentCategory,
        lifecycle: activeLifecycle
      }),
    [activeContentCategory, activeLifecycle, allProfileItems]
  );

  if (!user) {
    return <ProfilePageSkeleton />;
  }

  const profile = profileQuery.data?.item;
  const settings = currentProfileQuery.data?.item;
  const displayName = settings?.displayName ?? user.displayName;
  const userId = user.id;
  const avatarSrc =
    settings?.avatarUrl?.trim() || user.avatarUrl?.trim() || getAvatarImage(userId);
  const coverImageUrl = settings?.coverImageUrl ?? null;
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

  async function handleCoverChange(file: File) {
    setIsUpdatingCover(true);
    setActionError(null);
    try {
      const uploaded = await apiClient.uploadPostImage(file);
      await apiClient.updateCurrentUserProfile({
        coverImageFileId: uploaded.item.id
      });
      await Promise.all([
        currentProfileQuery.refetch(),
        profileQuery.refetch()
      ]);
    } catch (reason: unknown) {
      setActionError(reason instanceof Error ? reason.message : "封面图更新失败");
    } finally {
      setIsUpdatingCover(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    }
  }

  return (
    <SitePage className="mx-auto w-full max-w-[72rem] gap-4">
      <SitePanel className="overflow-hidden !border-0" variant="floating">
        <div className="relative h-40 overflow-hidden border-b border-border/80 md:h-48">
          <img
            alt={`${displayName} 顶部横幅`}
            className="h-full w-full object-cover"
            src={coverImageUrl ?? getProfileBanner(displayName)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
          <div className="absolute right-4 top-4 z-10 md:right-5 md:top-5">
            <Button
              disabled={isUpdatingCover}
              onClick={() => coverInputRef.current?.click()}
              size="sm"
              type="button"
              variant="outline"
            >
              <CameraIcon data-icon="inline-start" />
              {isUpdatingCover ? "上传中..." : "编辑封面"}
            </Button>
            <input
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleCoverChange(file);
                }
              }}
              ref={coverInputRef}
              type="file"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
            <div className="flex items-end gap-4">
              <UserAvatar
                className="!h-28 !w-28 md:!h-32 md:!w-32"
                displayName={displayName}
                size="lg"
                src={avatarSrc}
              />
              <div className="space-y-2 pb-3">
                <div className="text-[2rem] font-semibold tracking-[-0.05em] text-white drop-shadow-[0_6px_20px_rgba(0,0,0,0.36)] md:text-[2.5rem]">
                  {displayName}
                </div>
                {settings?.profileVisibility ? (
                  <Badge className="border-white/24 bg-white/12 text-white backdrop-blur-sm" variant="outline">
                    {profileVisibilityLabel(settings.profileVisibility)}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <SitePanelBody className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
            <div className="grid gap-4 md:grid-cols-[9rem_minmax(0,1fr)] md:items-start">
              <div className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">{bio}</p>
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
          <div className="flex flex-wrap items-center gap-2">
            {profileContentCategories.map((category) => (
              <button
                className={`site-tab-trigger rounded-full border px-3 py-1.5 text-[0.78rem] transition ${
                  activeContentCategory === category.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 text-foreground/70 hover:text-foreground"
                }`}
                key={category.value}
                onClick={() => setActiveContentCategory(category.value)}
                type="button"
              >
                {category.label}
                <span className="ml-1.5 text-[0.72rem] opacity-80">
                  {contentCategoryCounts.get(category.value) ?? 0}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {profileLifecycleFilters.map((lifecycle) => (
              <button
                className={`site-tab-trigger rounded-full border px-3 py-1.5 text-[0.78rem] transition ${
                  activeLifecycle === lifecycle.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/70 text-foreground/68 hover:text-foreground"
                }`}
                key={lifecycle.value}
                onClick={() => setActiveLifecycle(lifecycle.value)}
                type="button"
              >
                {lifecycle.label}
              </button>
            ))}
          </div>
          <VirtualFeed
            className="!border-0"
            data={activityItems}
            emptyState={
              <div className="bg-white px-5 py-5 text-sm text-muted-foreground">
                当前分类下还没有内容。
              </div>
            }
            height={660}
            itemKey={(item) => `${item.type}-${item.id}`}
            renderItem={(item) => (
              <ContentFeedRow deletingId={deletingId} item={item} onDelete={handleDelete} showManagement />
            )}
          />
        </TabsContent>

        <TabsContent className="space-y-4" value="favorites">
          <div className="flex flex-wrap items-center gap-2">
            {profileContentCategories.map((category) => (
              <button
                className={`site-tab-trigger rounded-full border px-3 py-1.5 text-[0.78rem] transition ${
                  activeFavoriteCategory === category.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 text-foreground/70 hover:text-foreground"
                }`}
                key={category.value}
                onClick={() => setActiveFavoriteCategory(category.value)}
                type="button"
              >
                {category.label}
                <span className="ml-1.5 text-[0.72rem] opacity-80">
                  {favoriteCategoryCounts.get(category.value) ?? 0}
                </span>
              </button>
            ))}
          </div>
          <VirtualFeed
            className="!border-0"
            data={favoriteItems}
            emptyState={
              <div className="bg-white px-5 py-5 text-sm text-muted-foreground">
                当前分类下还没有收藏内容。
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
