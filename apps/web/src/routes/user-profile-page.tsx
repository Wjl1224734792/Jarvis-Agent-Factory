import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowRightIcon, EyeOffIcon, UserPlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, Link, useParams } from "react-router-dom";
import { UserProfilePageRouteSkeleton } from "@/components/route-skeletons";
import { SitePage, SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "../features/auth/auth-store";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { apiClient } from "../lib/api-client";
import { getAvatarImage, getProfileBanner } from "../lib/aviation-media";
import { ContentFeedListRow } from "../features/auth/profile-content-card";
import { isFavoriteItem } from "../features/auth/profile-content-filters";

const VISITOR_PROFILE_PAGE_SIZE = 9;

function ProfileGridPagination(props: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border/60 pt-4">
      <Button
        disabled={props.page <= 1}
        onClick={() => props.onPageChange(props.page - 1)}
        size="sm"
        type="button"
        variant="outline"
      >
        上一页
      </Button>
      <span className="text-sm tabular-nums text-muted-foreground">
        {props.page} / {props.totalPages}
      </span>
      <Button
        disabled={props.page >= props.totalPages}
        onClick={() => props.onPageChange(props.page + 1)}
        size="sm"
        type="button"
        variant="outline"
      >
        下一页
      </Button>
    </div>
  );
}

function MetricStrip(props: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 border border-border/70 bg-surface-2/72 px-4 py-3">
      <div className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">{props.label}</div>
      <div className="text-lg font-semibold text-foreground">{props.value}</div>
    </div>
  );
}

export function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const currentUser = useAuthStore((state) => state.user);
  const authStatus = useAuthStore((state) => state.status);
  const promptLogin = useLoginPrompt();
  const queryClient = useQueryClient();
  const userId = params.id ?? "";
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [visitorPage, setVisitorPage] = useState(1);
  const profileQuery = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => apiClient.getUserProfile(userId),
    enabled: Boolean(userId)
  });
  const profile = profileQuery.data?.item;
  const contentQuery = useQuery({
    queryKey: ["user-content", userId],
    queryFn: () => apiClient.listUserContent(userId),
    enabled: Boolean(userId && profile?.viewer.canViewContent)
  });
  const rawContentItems = contentQuery.data?.items ?? [];
  const visitorContentItems = useMemo(
    () => rawContentItems.filter((item) => !isFavoriteItem(item)),
    [rawContentItems]
  );

  const visitorTotalPages = Math.max(1, Math.ceil(visitorContentItems.length / VISITOR_PROFILE_PAGE_SIZE));

  const paginatedVisitorItems = useMemo(() => {
    const start = (visitorPage - 1) * VISITOR_PROFILE_PAGE_SIZE;
    return visitorContentItems.slice(start, start + VISITOR_PROFILE_PAGE_SIZE);
  }, [visitorContentItems, visitorPage]);

  useEffect(() => {
    setVisitorPage(1);
  }, [userId]);

  useEffect(() => {
    setVisitorPage((page) => Math.min(page, visitorTotalPages));
  }, [visitorTotalPages]);

  if (currentUser?.id && currentUser.id === userId) {
    return <Navigate replace to={APP_ROUTES.webProfile} />;
  }

  if (!userId || (profileQuery.isLoading && !profileQuery.data)) {
    return <UserProfilePageRouteSkeleton />;
  }

  if (profileQuery.isError || !profile) {
    return (
      <Alert variant="destructive">
        <AlertTitle>个人主页加载失败</AlertTitle>
        <AlertDescription>
          {profileQuery.isError ? profileQuery.error.message : "找不到这位飞友。"}
        </AlertDescription>
      </Alert>
    );
  }

  const isContentLoading = profile.viewer.canViewContent && contentQuery.isLoading && !contentQuery.data;
  const profileUserId = profile.user.id;

  async function handleToggleFollow() {
    if (authStatus !== "authenticated") {
      promptLogin({
        title: "登录后才能关注飞友",
        description: "关注关系建立后，公开资料和内容的可见范围也会随之变化。"
      });
      return;
    }

    setIsTogglingFollow(true);
    setActionError(null);
    try {
      await apiClient.toggleFollow(profileUserId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-profile", userId] }),
        queryClient.invalidateQueries({ queryKey: ["user-content", userId] })
      ]);
    } catch (reason: unknown) {
      setActionError(reason instanceof Error ? reason.message : "关注状态更新失败");
    } finally {
      setIsTogglingFollow(false);
    }
  }

  const avatarSrc = profile.user.avatarUrl ?? getAvatarImage(profile.user.id);
  const bioText = profile.viewer.canViewProfile
    ? "这里展示对方当前开放给你的资料和内容。"
    : "这位飞友将公开资料设为了受限状态，你当前只能看到基础身份信息。";

  return (
    <SitePage className="mx-auto w-full max-w-[72rem] gap-4">
      <SitePanel className="overflow-hidden !border-0" variant="floating">
        <div className="relative h-40 overflow-hidden border-b border-border/80 md:h-48">
          <img
            alt={`${profile.user.displayName} 顶部横幅`}
            className="h-full w-full object-cover"
            src={getProfileBanner(profile.user.displayName)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
            <div className="flex items-end gap-4">
              <UserAvatar
                className="!h-28 !w-28 md:!h-32 md:!w-32"
                displayName={profile.user.displayName}
                size="lg"
                src={avatarSrc}
              />
              <div className="space-y-2 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-white/24 bg-white/12 text-white backdrop-blur-sm" variant="outline">
                    公开主页
                  </Badge>
                  <Badge className="border-white/24 bg-white/12 text-white backdrop-blur-sm" variant="outline">
                    {profile.viewer.canViewContent ? "内容可见" : "内容受限"}
                  </Badge>
                </div>
                <div className="text-[2rem] font-semibold tracking-[-0.05em] text-white drop-shadow-[0_6px_20px_rgba(0,0,0,0.36)] md:text-[2.5rem]">
                  {profile.user.displayName}
                </div>
              </div>
            </div>
          </div>
        </div>

        <SitePanelBody className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
            <div className="grid gap-4 md:grid-cols-[9rem_minmax(0,1fr)] md:items-start">
              <div className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">{bioText}</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <MetricStrip label="关注者" value={profile.followerCount} />
              <MetricStrip label="关注中" value={profile.followingCount} />
              <MetricStrip label="收藏" value={profile.favoriteCount} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-border/70 pt-4">
            {profile.viewer.canFollow ? (
              <Button
                disabled={isTogglingFollow}
                onClick={() => {
                  void handleToggleFollow();
                }}
                size="sm"
                type="button"
                variant={profile.viewer.isFollowing ? "panel" : "hero"}
              >
                <UserPlusIcon data-icon="inline-start" />
                {isTogglingFollow ? "更新中..." : profile.viewer.isFollowing ? "取消关注" : "关注这位飞友"}
              </Button>
            ) : null}

            <Button asChild size="sm" type="button" variant="outline">
              <Link to={APP_ROUTES.webProfile}>
                返回我的主页
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </SitePanelBody>
      </SitePanel>

      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>操作失败</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="content">
        <TabsList variant="line">
          <TabsTrigger value="content">内容</TabsTrigger>
          <TabsTrigger disabled title="无法查看其他飞友的收藏列表" value="favorites">
            收藏
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="content">
          {isContentLoading ? (
            <div className="divide-y divide-border/60 border border-border/70 bg-white">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="flex gap-3 px-3 py-3 sm:gap-3 sm:px-4" key={index}>
                  <Skeleton className="h-20 w-28 shrink-0 rounded-md sm:h-24 sm:w-32" />
                  <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                    <Skeleton className="h-4 w-24 rounded-full" />
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="h-3.5 w-full rounded-md" />
                    <Skeleton className="h-3 w-2/3 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : profile.viewer.canViewContent ? (
            visitorContentItems.length === 0 ? (
              <div className="bg-white px-5 py-5 text-sm text-muted-foreground">
                这位飞友暂时还没有对你开放的内容。
              </div>
            ) : (
              <>
                <div className="divide-y divide-border/60 border border-border/70 bg-white">
                  {paginatedVisitorItems.map((item, idx) => (
                    <ContentFeedListRow
                      index={(visitorPage - 1) * VISITOR_PROFILE_PAGE_SIZE + idx}
                      item={item}
                      key={`${item.type}-${item.id}`}
                      viewer="visitor"
                    />
                  ))}
                </div>
                <ProfileGridPagination
                  onPageChange={setVisitorPage}
                  page={visitorPage}
                  totalPages={visitorTotalPages}
                />
              </>
            )
          ) : (
            <Alert>
              <EyeOffIcon className="size-4" />
              <AlertTitle>当前内容不可见</AlertTitle>
              <AlertDescription>
                对方的公开范围限制了内容访问。建立关注关系后，这里会自动刷新可见性。
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </SitePage>
  );
}
