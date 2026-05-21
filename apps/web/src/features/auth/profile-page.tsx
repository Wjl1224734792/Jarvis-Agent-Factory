import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { BellIcon, BellRingIcon, CameraIcon, PenSquareIcon, Settings2Icon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { SitePage, SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IpLocationText } from "@/components/ip-location-text";
import { apiClient } from "../../lib/api-client";
import { resolveUserAvatarSrc } from "../../lib/avatar-url";
import { getProfileBanner } from "../../lib/aviation-media";
import { useAuthStore } from "./auth-store";
import { ContentFeedListRow, type ContentItem } from "./profile-content-card";
import {
  filterProfileItems,
  type ProfileContentCategory,
  type ProfileLifecycle
} from "./profile-content-filters";
import {
  buildSelfProfileOverviewMetrics,
  getProfileMessageSummary
} from "./profile-overview";
import { getNotificationNavTone, shouldFetchNotifications } from "./notification-state";
import { profileVisibilityLabel } from "./profile-settings-state";
import { useNotifications } from "./use-notifications";
import { ProfileLayoutShell } from "./profile-layout-shell";
import { ProfileMetaBar } from "./profile-meta-bar";
import { ProfileStatusHint } from "./profile-status-hint";
import { ProfileFilterBar } from "./profile-filter-bar";
import { ProfilePagination } from "./profile-surface";
import { ProfileCirclesTab } from "./profile-circles-tab";

type ProfileTab = "activity" | "favorites" | "circles";

const profileTabs: Array<{ value: ProfileTab; label: string }> = [
  { value: "activity", label: "内容" },
  { value: "favorites", label: "收藏" },
  { value: "circles", label: "圈子" }
];

const profileContentCategories: Array<{ value: ProfileContentCategory; label: string }> = [
  { value: "article", label: "文章" },
  { value: "moment", label: "动态" },
  { value: "ranking", label: "榜单" },
  { value: "brand", label: "品牌" },
  { value: "aircraft", label: "飞行器" }
];

/** 收藏 Tab 不展示「品牌」分类（内容 Tab 仍保留） */
const profileFavoriteCategories = profileContentCategories.filter((c) => c.value !== "brand");

const profileLifecycleFilters: Array<{ value: ProfileLifecycle; label: string }> = [
  { value: "all", label: "全部" },
  { value: "draft", label: "草稿" },
  { value: "reviewing", label: "审核中" },
  { value: "published", label: "已发布" },
  { value: "rejected", label: "已驳回" }
];

const PROFILE_CONTENT_PAGE_SIZE = 9;

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

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const authStatus = useAuthStore((state) => state.status);
  const isAuthBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const queryClient = useQueryClient();
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("activity");
  const [activeContentCategory, setActiveContentCategory] = useState<ProfileContentCategory>("article");
  const [activeFavoriteCategory, setActiveFavoriteCategory] = useState<ProfileContentCategory>("article");
  const [activeLifecycle, setActiveLifecycle] = useState<ProfileLifecycle>("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUpdatingCover, setIsUpdatingCover] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [favoritePage, setFavoritePage] = useState(1);
  const notificationsQuery = useNotifications(
    user?.id,
    shouldFetchNotifications(authStatus, isAuthBootstrapped)
  );

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
        profileFavoriteCategories.map((category) => [
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

  const activityTotalPages = Math.max(1, Math.ceil(activityItems.length / PROFILE_CONTENT_PAGE_SIZE));
  const favoriteTotalPages = Math.max(1, Math.ceil(favoriteItems.length / PROFILE_CONTENT_PAGE_SIZE));

  const paginatedActivityItems = useMemo(() => {
    const start = (activityPage - 1) * PROFILE_CONTENT_PAGE_SIZE;
    return activityItems.slice(start, start + PROFILE_CONTENT_PAGE_SIZE);
  }, [activityItems, activityPage]);

  const paginatedFavoriteItems = useMemo(() => {
    const start = (favoritePage - 1) * PROFILE_CONTENT_PAGE_SIZE;
    return favoriteItems.slice(start, start + PROFILE_CONTENT_PAGE_SIZE);
  }, [favoriteItems, favoritePage]);

  useEffect(() => {
    setActivityPage(1);
  }, [activeContentCategory, activeLifecycle]);

  useEffect(() => {
    setFavoritePage(1);
  }, [activeFavoriteCategory]);

  useEffect(() => {
    if (activeFavoriteCategory === "brand") {
      setActiveFavoriteCategory("article");
    }
  }, [activeFavoriteCategory]);

  useEffect(() => {
    setActivityPage((page) => Math.min(page, activityTotalPages));
  }, [activityTotalPages]);

  useEffect(() => {
    setFavoritePage((page) => Math.min(page, favoriteTotalPages));
  }, [favoriteTotalPages]);

  if (!user) {
    return <ProfilePageSkeleton />;
  }

  const profile = profileQuery.data?.item;
  const settings = currentProfileQuery.data?.item;
  const displayName = settings?.displayName ?? user.displayName;
  const ipLocationLabel = profile?.user.ipLocationLabel ?? settings?.ipLocationLabel ?? user.ipLocationLabel ?? null;
  const userId = user.id;
  const avatarSrc = resolveUserAvatarSrc(settings?.avatarUrl) ?? resolveUserAvatarSrc(user.avatarUrl);
  const coverImageUrl = settings?.coverImageUrl ?? null;
  const bio = settings?.bio ?? "还没有填写个人简介。";
  const overviewMetrics = buildSelfProfileOverviewMetrics({
    followerCount: profile?.followerCount ?? 0,
    followingCount: profile?.followingCount ?? 0,
    favoriteCount: profile?.favoriteCount ?? 0,
    postCount: profile?.postCount ?? 0,
    rankingCount: profile?.rankingCount ?? 0,
    aircraftCount: profile?.aircraftCount ?? 0,
    reviewCount: profile?.reviewCount ?? 0
  });
  const messageSummary = getProfileMessageSummary(notificationsQuery.data?.unreadCount ?? 0);
  const messageTone = getNotificationNavTone(notificationsQuery.data?.unreadCount);

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
      toast.success("封面图已更新");
    } catch (reason: unknown) {
      setActionError(reason instanceof Error ? reason.message : "封面图更新失败");
    } finally {
      setIsUpdatingCover(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    }
  }

  async function handleAvatarChange(file: File) {
    setIsUpdatingAvatar(true);
    setActionError(null);
    try {
      const uploaded = await apiClient.uploadAvatarImage(file);
      await apiClient.updateCurrentUserProfile({
        avatarFileId: uploaded.item.id
      });
      await Promise.all([
        currentProfileQuery.refetch(),
        profileQuery.refetch()
      ]);
      toast.success("头像已更新");
    } catch (reason: unknown) {
      setActionError(reason instanceof Error ? reason.message : "头像更新失败");
    } finally {
      setIsUpdatingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  }

  const publishedCount = overviewMetrics.find((m) => m.key === "published")?.value ?? 0;
  const hasUnread = (notificationsQuery.data?.unreadCount ?? 0) > 0;

  const alertNode = (
    <>
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
    </>
  );

  const bannerNode = (
    <div className="relative h-40 overflow-hidden border-b border-border/60 md:h-48">
      <img
        alt={`${displayName} 顶部横幅`}
        className="h-full w-full object-cover"
        src={coverImageUrl ?? getProfileBanner(displayName)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
      <div className="absolute right-4 top-4 z-10 md:right-5 md:top-5">
        <Button
          disabled={isUpdatingCover}
          onClick={() => coverInputRef.current?.click()}
          size="sm"
          type="button"
          variant="ghost"
          className="bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
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
          <div className="relative group/avatar">
            <UserAvatar
              className="!h-20 !w-20 md:!h-24 md:!w-24"
              displayName={displayName}
              size="lg"
              src={avatarSrc}
            />
            <button
              className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/40 opacity-0 transition group-hover/avatar:opacity-100"
              disabled={isUpdatingAvatar}
              onClick={() => avatarInputRef.current?.click()}
              type="button"
              aria-label="更换头像"
            >
              <CameraIcon className="size-5 text-white" />
            </button>
            <input
              accept="image/*"
              aria-label="上传头像图片"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleAvatarChange(file);
                }
              }}
              ref={avatarInputRef}
              type="file"
            />
          </div>
          <div className="space-y-1.5 pb-2">
            <div className="text-[1.5rem] font-semibold tracking-[-0.03em] text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.28)] md:text-[1.75rem]">
              {displayName}
            </div>
            <IpLocationText
              className="block text-sm text-white/80 drop-shadow-[0_4px_14px_rgba(0,0,0,0.28)]"
              label={ipLocationLabel}
              variant="profile"
            />
            {settings?.profileVisibility ? (
              <Badge className="border-white/24 bg-white/12 text-white backdrop-blur-sm" variant="outline">
                {profileVisibilityLabel(settings.profileVisibility)}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  const metaBarNode = (
    <ProfileMetaBar
      bio={bio}
      metrics={[
        { key: "followers", label: "关注者", value: profile?.followerCount ?? 0 },
        { key: "following", label: "关注中", value: profile?.followingCount ?? 0 },
        { key: "favorites", label: "收藏", value: profile?.favoriteCount ?? 0 },
        { key: "published", label: "内容", value: publishedCount }
      ]}
    >
      <Button asChild size="sm" variant="outline">
        <Link to={APP_ROUTES.webSettings}>
          <Settings2Icon data-icon="inline-start" />
          修改资料
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link to={APP_ROUTES.notifications}>
          {messageTone === "unread" ? <BellRingIcon data-icon="inline-start" /> : <BellIcon data-icon="inline-start" />}
          {messageSummary.title}
        </Link>
      </Button>
      <Button asChild size="sm" variant="default">
        <Link to={APP_ROUTES.compose}>
          <PenSquareIcon data-icon="inline-start" />
          去发布内容
        </Link>
      </Button>
    </ProfileMetaBar>
  );

  const statusHintNode = hasUnread ? (
    <ProfileStatusHint
      description={messageSummary.description}
      tone="highlight"
      title={messageSummary.title}
    >
      <Button asChild size="sm" variant="default">
        <Link to={APP_ROUTES.notifications}>进入消息中心</Link>
      </Button>
    </ProfileStatusHint>
  ) : null;

  const filterBarNode = activeTab === "circles" ? null : activeTab === "activity" ? (
    <>
      <ProfileFilterBar
        active={activeContentCategory}
        onChange={(v) => setActiveContentCategory(v as ProfileContentCategory)}
        options={profileContentCategories.map((c) => ({
          value: c.value,
          label: c.label,
          count: contentCategoryCounts.get(c.value) ?? 0
        }))}
      />
      <ProfileFilterBar
        active={activeLifecycle}
        onChange={(v) => setActiveLifecycle(v as ProfileLifecycle)}
        options={profileLifecycleFilters.map((l) => ({ value: l.value, label: l.label }))}
      />
    </>
  ) : (
    <ProfileFilterBar
      active={activeFavoriteCategory}
      onChange={(v) => setActiveFavoriteCategory(v as ProfileContentCategory)}
      options={profileFavoriteCategories.map((c) => ({
        value: c.value,
        label: c.label,
        count: favoriteCategoryCounts.get(c.value) ?? 0
      }))}
    />
  );

  const contentNode = activeTab === "circles" ? (
    <ProfileCirclesTab userId={userId} />
  ) : activeTab === "activity" ? (
    activityItems.length === 0 ? (
      <div className="bg-white px-5 py-8 text-center text-sm text-muted-foreground">
        当前分类下还没有内容。
      </div>
    ) : (
      <>
        <div className="divide-y divide-border/60 border border-border/60 bg-white">
          {paginatedActivityItems.map((item, idx) => (
            <ContentFeedListRow
              deletingId={deletingId}
              index={(activityPage - 1) * PROFILE_CONTENT_PAGE_SIZE + idx}
              item={item}
              key={`${item.type}-${item.id}`}
              onDelete={handleDelete}
              showManagement
            />
          ))}
        </div>
        <ProfilePagination
          onPageChange={setActivityPage}
          page={activityPage}
          totalPages={activityTotalPages}
        />
      </>
    )
  ) : favoriteItems.length === 0 ? (
    <div className="bg-white px-5 py-8 text-center text-sm text-muted-foreground">
      当前分类下还没有收藏内容。
    </div>
  ) : (
    <>
      <div className="divide-y divide-border/60 border border-border/60 bg-white">
        {paginatedFavoriteItems.map((item, idx) => (
          <ContentFeedListRow
            index={(favoritePage - 1) * PROFILE_CONTENT_PAGE_SIZE + idx}
            item={item}
            key={`${item.type}-${item.id}`}
          />
        ))}
      </div>
        <ProfilePagination
          onPageChange={setFavoritePage}
          page={favoritePage}
          totalPages={favoriteTotalPages}
        />
    </>
  );

  return (
    <ProfileLayoutShell
      alert={alertNode}
      activeTab={activeTab}
      banner={bannerNode}
      filterBar={filterBarNode}
      metaBar={metaBarNode}
      onTabChange={(value) => setActiveTab(value as ProfileTab)}
      statusHint={statusHintNode}
      tabs={profileTabs}
    >
      {contentNode}
    </ProfileLayoutShell>
  );
}
