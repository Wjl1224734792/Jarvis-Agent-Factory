import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowRightIcon, EyeOffIcon, UserPlusIcon } from "lucide-react";
import { useState } from "react";
import { Navigate, Link, useParams } from "react-router-dom";
import { VirtualFeed } from "@/components/virtual-feed";
import { SitePage, SitePanel, SitePanelBody } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "../features/auth/auth-store";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { apiClient } from "../lib/api-client";
import { getAvatarImage, getProfileBanner } from "../lib/aviation-media";
import { DETAIL_PAGE_LINK_PROPS } from "../lib/web-routes";

type ContentItem = Awaited<ReturnType<typeof apiClient.listUserContent>>["items"][number];

function UserProfileSkeleton() {
  return (
    <SitePage>
      <SitePanel className="overflow-hidden">
        <Skeleton className="h-44 w-full" />
        <SitePanelBody className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)]">
          <Skeleton className="-mt-12 h-24 w-24 rounded-[0.8rem]" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
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
      <Skeleton className="h-[30rem] rounded-[0.9rem]" />
    </SitePage>
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
        summary: "这款机型已出现在对方的收藏列表中。"
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
        summary: item.summary ?? item.rankingTitle
      };
    case "aircraft":
      return {
        label: "飞行器投稿",
        href: null,
        title: item.modelName,
        summary: item.summary ?? "对方提交了机型资料，等待进一步处理。"
      };
    case "review":
      return {
        label: "机型评论",
        href: APP_ROUTES.modelDetail.replace(":slug", item.model.slug),
        title: item.model.name,
        summary: item.content ?? "只留下了评分，没有补充长评。"
      };
    case "brand-application":
      return {
        label: "品牌申请",
        href: null,
        title: item.name,
        summary: item.description ?? "品牌申请等待审核处理。"
      };
  }

  return {
    label: "内容",
    href: null,
    title: "未知内容",
    summary: ""
  };
}

function ContentFeedRow({ item }: { item: ContentItem }) {
  const meta = getContentMeta(item);
  const row = (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[7rem_minmax(0,1fr)_8.5rem] md:items-start">
      <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-start md:gap-1">
        <Badge variant="outline">{meta.label}</Badge>
        <span className="text-[0.72rem] text-muted-foreground">
          {new Date(item.updatedAt).toLocaleDateString("zh-CN")}
        </span>
      </div>
      <div className="min-w-0 space-y-1.5">
        <div className="truncate text-[0.95rem] font-semibold text-foreground">{meta.title}</div>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{meta.summary}</p>
      </div>
      <div className="text-[0.72rem] text-muted-foreground md:text-right">
        {new Date(item.updatedAt).toLocaleString("zh-CN", { hour12: false })}
      </div>
    </div>
  );

  if (!meta.href) {
    return row;
  }

  return (
    <Link className="block transition hover:bg-accent/28" {...DETAIL_PAGE_LINK_PROPS} to={meta.href}>
      {row}
    </Link>
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

  if (currentUser?.id && currentUser.id === userId) {
    return <Navigate replace to={APP_ROUTES.webProfile} />;
  }

  if (!userId || (profileQuery.isLoading && !profileQuery.data)) {
    return <UserProfileSkeleton />;
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

  const contentItems = contentQuery.data?.items ?? [];
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

  return (
    <SitePage className="mx-auto w-full max-w-[72rem] gap-4">
      <SitePanel className="overflow-hidden" variant="floating">
        <div className="relative h-40 overflow-hidden border-b border-border/80 md:h-48">
          <img
            alt={`${profile.user.displayName} 顶部横幅`}
            className="h-full w-full object-cover"
            src={getProfileBanner(profile.user.displayName)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/58 via-slate-900/18 to-transparent" />
        </div>

        <SitePanelBody className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
            <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-end">
              <Avatar className="-mt-10 size-22 rounded-[0.9rem] ring-4 ring-white md:size-24" size="lg">
                <AvatarImage
                  alt={profile.user.displayName}
                  src={profile.user.avatarUrl ?? getAvatarImage(profile.user.id)}
                />
                <AvatarFallback>{profile.user.displayName.slice(0, 1)}</AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="eyebrow">公开主页</Badge>
                  <Badge variant="outline">{profile.viewer.canViewContent ? "内容可见" : "内容受限"}</Badge>
                </div>
                <div className="text-[1.8rem] font-semibold tracking-[-0.04em] text-foreground md:text-[2.15rem]">
                  {profile.user.displayName}
                </div>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {profile.viewer.canViewProfile
                    ? "这里展示对方当前开放给你的资料和内容。"
                    : "这位飞友将公开资料设为了受限状态，你当前只能看到基础身份信息。"}
                </p>
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

      {profile.viewer.canViewContent ? (
        <VirtualFeed
          data={contentItems}
          emptyState={
            <div className="border border-border/70 bg-white px-5 py-5 text-sm text-muted-foreground">
              这位飞友暂时还没有对你开放的内容。
            </div>
          }
          height={660}
          itemKey={(item) => `${item.type}-${item.id}`}
          renderItem={(item) => <ContentFeedRow item={item} />}
        />
      ) : (
        <Alert>
          <EyeOffIcon className="size-4" />
          <AlertTitle>当前内容不可见</AlertTitle>
          <AlertDescription>
            对方的公开范围限制了内容访问。建立关注关系后，这里会自动刷新可见性。
          </AlertDescription>
        </Alert>
      )}
    </SitePage>
  );
}
