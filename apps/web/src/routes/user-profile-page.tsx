import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowRightIcon, EyeOffIcon, UserPlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, Link, useParams } from "react-router-dom";
import { UserProfilePageRouteSkeleton } from "@/components/route-skeletons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IpLocationText } from "@/components/ip-location-text";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "../features/auth/auth-store";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { apiClient } from "../lib/api-client";
import { resolveUserAvatarSrc } from "../lib/avatar-url";
import { getProfileBanner } from "../lib/aviation-media";
import { ContentFeedListRow } from "../features/auth/profile-content-card";
import { isFavoriteItem } from "../features/auth/profile-content-filters";
import { getVisitorProfileRelationshipSummary } from "../features/auth/profile-overview";
import { ProfileLayoutShell } from "../features/auth/profile-layout-shell";
import { ProfileMetaBar } from "../features/auth/profile-meta-bar";
import { ProfileStatusHint } from "../features/auth/profile-status-hint";

const VISITOR_PROFILE_PAGE_SIZE = 9;

function ProfileGridPagination(props: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
      <Button
        disabled={props.page <= 1}
        onClick={() => props.onPageChange(props.page - 1)}
        size="sm"
        type="button"
        variant="ghost"
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
        variant="ghost"
      >
        下一页
      </Button>
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
  const rawContentItems = useMemo(
    () => contentQuery.data?.items ?? [],
    [contentQuery.data?.items]
  );
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

  const avatarSrc = resolveUserAvatarSrc(profile.user.avatarUrl);
  const bioText = profile.viewer.canViewProfile
    ? "这里展示对方当前开放给你的资料和内容。"
    : "这位飞友将公开资料设为了受限状态，你当前只能看到基础身份信息。";
  const relationshipSummary = getVisitorProfileRelationshipSummary({
    canViewContent: profile.viewer.canViewContent,
    canFollow: profile.viewer.canFollow,
    isFollowing: profile.viewer.isFollowing
  });
  const visibleContentCount =
    profile.postCount + profile.rankingCount + profile.aircraftCount + profile.reviewCount;

  const alertNode = actionError ? (
    <Alert variant="destructive">
      <AlertTitle>操作失败</AlertTitle>
      <AlertDescription>{actionError}</AlertDescription>
    </Alert>
  ) : null;

  const bannerNode = (
    <div className="relative h-40 overflow-hidden border-b border-border/60 md:h-48">
      <img
        alt={`${profile.user.displayName} 顶部横幅`}
        className="h-full w-full object-cover"
        src={getProfileBanner(profile.user.displayName)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
        <div className="flex items-end gap-4">
          <UserAvatar
            className="!h-20 !w-20 md:!h-24 md:!w-24"
            displayName={profile.user.displayName}
            size="lg"
            src={avatarSrc}
          />
          <div className="space-y-1.5 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/24 bg-white/12 text-white backdrop-blur-sm" variant="outline">
                公开主页
              </Badge>
              <Badge className="border-white/24 bg-white/12 text-white backdrop-blur-sm" variant="outline">
                {profile.viewer.canViewContent ? "内容可见" : "内容受限"}
              </Badge>
            </div>
            <div className="text-[1.5rem] font-semibold tracking-[-0.03em] text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.28)] md:text-[1.75rem]">
              {profile.user.displayName}
            </div>
            <IpLocationText
              className="block text-sm text-white/80 drop-shadow-[0_4px_14px_rgba(0,0,0,0.28)]"
              label={profile.user.ipLocationLabel}
              variant="profile"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const metaBarNode = (
    <ProfileMetaBar
      bio={bioText}
      metrics={[
        { key: "followers", label: "关注者", value: profile.followerCount },
        { key: "following", label: "关注中", value: profile.followingCount },
        { key: "favorites", label: "收藏", value: profile.favoriteCount },
        { key: "published", label: "公开内容", value: visibleContentCount }
      ]}
    >
      {profile.viewer.canFollow ? (
        <Button
          disabled={isTogglingFollow}
          onClick={() => {
            void handleToggleFollow();
          }}
          size="sm"
          type="button"
          variant={profile.viewer.isFollowing ? "outline" : "default"}
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
    </ProfileMetaBar>
  );

  const statusHintNode = !profile.viewer.canViewContent ? (
    <ProfileStatusHint
      description={relationshipSummary.description}
      tone="highlight"
      title={relationshipSummary.title}
    />
  ) : profile.viewer.isFollowing ? (
    <ProfileStatusHint
      description={relationshipSummary.description}
      title={relationshipSummary.title}
    />
  ) : profile.viewer.canFollow ? (
    <ProfileStatusHint
      description={relationshipSummary.description}
      title={relationshipSummary.title}
    />
  ) : (
    <ProfileStatusHint
      description={relationshipSummary.description}
      title={relationshipSummary.title}
    />
  );

  const contentNode = isContentLoading ? (
    <div className="divide-y divide-border/60 border border-border/60 bg-white">
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
      <div className="bg-white px-5 py-8 text-center text-sm text-muted-foreground">
        这位飞友暂时还没有对你开放的内容。
      </div>
    ) : (
      <>
        <div className="divide-y divide-border/60 border border-border/60 bg-white">
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
  );

  return (
    <ProfileLayoutShell
      alert={alertNode}
      activeTab="content"
      banner={bannerNode}
      metaBar={metaBarNode}
      onTabChange={() => {}}
      statusHint={statusHintNode}
      tabs={[
        { value: "content", label: "内容" },
        { value: "favorites", label: "收藏", disabled: true, title: "无法查看其他飞友的收藏列表" }
      ]}
    >
      {contentNode}
    </ProfileLayoutShell>
  );
}
