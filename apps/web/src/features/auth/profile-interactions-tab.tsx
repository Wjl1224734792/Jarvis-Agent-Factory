import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { HeartIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { resolveUserAvatarSrc } from "@/lib/avatar-url";

/** 互动记录子 Tab 类型 */
type InteractionTab = "likes" | "following";

/** 点赞帖子项（占位类型，后端 API 就绪后替换） */
interface LikedPostItem {
  id: string;
  title: string;
  postType: "article" | "moment";
  contentPreview: string;
  createdAt: string;
}

/** 关注用户项（占位类型，后端 API 就绪后替换） */
interface FollowingUserItem {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
}

/**
 * 互动记录 Tab -- 展示用户的点赞列表和关注列表。
 *
 * 当后端 API 就绪后，替换各 queryFn 中的占位实现即可。
 */
export function ProfileInteractionsTab(props: { userId: string }) {
  const [activeSubTab, setActiveSubTab] = useState<InteractionTab>("likes");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            activeSubTab === "likes"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          onClick={() => setActiveSubTab("likes")}
          type="button"
        >
          <HeartIcon className="size-3.5" />
          喜欢的帖子
        </button>
        <button
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            activeSubTab === "following"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          onClick={() => setActiveSubTab("following")}
          type="button"
        >
          <UsersIcon className="size-3.5" />
          关注中
        </button>
      </div>

      {activeSubTab === "likes" ? (
        <LikedPostsList userId={props.userId} />
      ) : (
        <FollowingList userId={props.userId} />
      )}
    </div>
  );
}

function LikedPostsList(props: { userId: string }) {
  /** 获取用户点赞的帖子（当前返回空列表，后端 API 就绪后替换） */
  const likesQuery = useQuery({
    queryKey: ["self-profile-likes", props.userId],
    queryFn: async (): Promise<{ items: LikedPostItem[] }> => {
      // TODO: 后端 listUserLikedPosts API 就绪后替换为：
      // return apiClient.listUserLikedPosts(props.userId);
      return { items: [] };
    },
    enabled: Boolean(props.userId)
  });

  if (likesQuery.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div className="rounded-xl border border-border/60 bg-white p-4" key={i}>
            <Skeleton className="mb-2 h-4 w-24 rounded-md" />
            <Skeleton className="mb-1 h-4 w-full rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (likesQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>加载失败</AlertTitle>
        <AlertDescription>
          {likesQuery.error instanceof Error
            ? likesQuery.error.message
            : "暂时无法加载点赞列表，请稍后重试。"}
        </AlertDescription>
      </Alert>
    );
  }

  if (likesQuery.data?.items.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-white px-5 py-8 text-center text-sm text-muted-foreground">
        还没有喜欢的帖子。
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60 border border-border/60 bg-white">
      {likesQuery.data?.items.map((item) => (
        <article className="px-4 py-3" key={item.id}>
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge className="text-[0.72rem]" variant="outline">
              {item.postType === "article" ? "文章" : "动态"}
            </Badge>
            <Badge className="text-[0.72rem]" variant="outline">
              喜欢
            </Badge>
          </div>
          <Link
            className="block font-medium text-foreground hover:underline line-clamp-1"
            to={APP_ROUTES.postDetail.replace(":id", item.id)}
          >
            {item.title}
          </Link>
          <p className="mt-0.5 line-clamp-1 text-[0.78rem] text-muted-foreground">
            {item.contentPreview}
          </p>
        </article>
      ))}
    </div>
  );
}

function FollowingList(props: { userId: string }) {
  /** 获取用户关注列表（当前返回空列表，后端 API 就绪后替换） */
  const followingQuery = useQuery({
    queryKey: ["self-profile-following", props.userId],
    queryFn: async (): Promise<{ items: FollowingUserItem[] }> => {
      // TODO: 后端 listUserFollowing API 就绪后替换为：
      // return apiClient.listUserFollowing(props.userId);
      return { items: [] };
    },
    enabled: Boolean(props.userId)
  });

  if (followingQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-white p-4" key={i}>
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-3 w-32 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (followingQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>加载失败</AlertTitle>
        <AlertDescription>
          {followingQuery.error instanceof Error
            ? followingQuery.error.message
            : "暂时无法加载关注列表，请稍后重试。"}
        </AlertDescription>
      </Alert>
    );
  }

  if (followingQuery.data?.items.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-white px-5 py-8 text-center text-sm text-muted-foreground">
        还没有关注任何人。
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {followingQuery.data?.items.map((user) => (
        <Link
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-white p-4 transition hover:border-primary/30 hover:bg-sky-50/20"
          key={user.id}
          to={APP_ROUTES.webUserProfile.replace(":id", user.id)}
        >
          <UserAvatar
            className="size-10 shrink-0"
            displayName={user.displayName}
            size="sm"
            src={resolveUserAvatarSrc(user.avatarUrl)}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground line-clamp-1">
              {user.displayName}
            </div>
            {user.bio ? (
              <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                {user.bio}
              </div>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
