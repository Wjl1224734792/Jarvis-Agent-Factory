import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowLeftIcon, MessageCircleIcon, PlusIcon, SendIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SitePage } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/features/auth/auth-store";
import { apiClient } from "@/lib/api-client";
import { resolveUserAvatarSrc } from "@/lib/avatar-url";
import { cn } from "@/lib/utils";

export function CircleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [posting, setPosting] = useState(false);

  const circleQuery = useQuery({
    queryKey: ["circle", slug],
    queryFn: () => apiClient.getCircleDetail(slug!),
    enabled: Boolean(slug),
  });

  const circle = circleQuery.data?.item as Record<string, unknown> | null;
  const circleId = circle?.id as string | undefined;

  const postsQuery = useQuery({
    queryKey: ["circle-posts", circleId],
    queryFn: () => (apiClient as any).listCirclePosts(circleId!, { tab: "latest" }),
    enabled: Boolean(circleId),
  });

  const posts = (postsQuery.data?.items ?? []) as Array<Record<string, unknown>>;

  async function handleJoin() {
    if (!circle) return;
    try {
      await (apiClient as any).joinCircle?.(circle.id);
      circleQuery.refetch();
    } catch { /* ignore */ }
  }

  async function handleCreatePost() {
    if (!circleId || !newPostTitle.trim() || posting) return;
    setPosting(true);
    try {
      await (apiClient as any).createCirclePost(circleId, {
        title: newPostTitle.trim(),
        content: newPostContent.trim() || undefined,
      });
      setNewPostTitle("");
      setNewPostContent("");
      setShowCreatePost(false);
      postsQuery.refetch();
    } catch (e: any) {
      // ignore
    } finally {
      setPosting(false);
    }
  }

  const isOwner = currentUser && (circle?.ownerId as string) === currentUser.id;

  return (
    <SitePage className="gap-4">
      {circleQuery.isLoading ? (
        <div className="py-12 text-center text-muted-foreground">加载中...</div>
      ) : circleQuery.isError ? (
        <div className="py-12 text-center text-red-500">
          {circleQuery.error?.message ?? "加载失败"}
        </div>
      ) : !circle ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>圈子不存在</p>
          <Link className="mt-2 inline-block text-primary hover:underline" to={APP_ROUTES.flightCircle}>
            返回飞友圈
          </Link>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center gap-3">
            <Link
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              to={APP_ROUTES.flightCircle}
            >
              <ArrowLeftIcon className="size-4" /> 返回
            </Link>
          </div>

          <div className="rounded-xl border border-border/60 p-6">
            <h1 className="text-xl font-bold text-foreground">{circle.name as string}</h1>
            {circle.description ? (
              <p className="mt-2 text-sm text-muted-foreground">{circle.description as string}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <UsersIcon className="size-4" />
                {circle.memberCount as number} 成员
              </span>
              <span>{circle.postCount as number} 帖子</span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs",
                circle.joinMode === "free" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              )}>
                {(circle.joinMode as string) === "free" ? "自由加入" : "审核加入"}
              </span>
            </div>

            <div className="mt-6 flex gap-3">
              {isAuthenticated ? (
                circle.viewerRole ? (
                  <Button disabled variant="outline" size="sm">
                    {(circle.viewerRole as string) === "owner" ? "圈主" : "已加入"}
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleJoin}>
                    {circle.joinMode === "free" ? "加入圈子" : "申请加入"}
                  </Button>
                )
              ) : (
                <Button size="sm" onClick={() => navigate("/login")}>
                  登录后加入
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                帖子 ({posts.length})
              </h2>
              {isAuthenticated ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCreatePost(!showCreatePost)}
                >
                  <PlusIcon className="size-3.5 mr-1" />
                  发帖
                </Button>
              ) : null}
            </div>

            {showCreatePost ? (
              <div className="mt-3 rounded-xl border border-border/60 bg-white p-4 space-y-3">
                <Input
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="帖子标题"
                  value={newPostTitle}
                />
                <Input
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="帖子内容（选填）"
                  value={newPostContent}
                />
                <div className="flex gap-2">
                  <Button
                    disabled={!newPostTitle.trim() || posting}
                    onClick={handleCreatePost}
                    size="sm"
                  >
                    <SendIcon className="size-3.5 mr-1" />
                    {posting ? "发布中..." : "发布"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowCreatePost(false);
                      setNewPostTitle("");
                      setNewPostContent("");
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="mt-3 space-y-3">
              {postsQuery.isLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">加载中...</div>
              ) : posts.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  暂无帖子，来发第一帖吧
                </div>
              ) : (
                posts.map((post: any) => (
                  <div
                    className="rounded-xl border border-border/50 bg-white p-4 transition hover:border-border"
                    key={post.id as string}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="size-8 shrink-0" size="sm">
                        <AvatarImage
                          alt={post.author?.displayName as string}
                          src={resolveUserAvatarSrc(post.author?.avatarUrl as string | null)}
                        />
                        <AvatarFallback>
                          {((post.author?.displayName as string) ?? "?")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {post.author?.displayName as string}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {post.createdAt
                              ? new Date(post.createdAt as string).toLocaleDateString("zh-CN")
                              : ""}
                          </span>
                        </div>
                        <h3 className="mt-1 text-sm font-semibold text-foreground">
                          {post.title as string}
                        </h3>
                        {post.content ? (
                          <p className="mt-1 text-xs text-foreground/72 line-clamp-3">
                            {post.content as string}
                          </p>
                        ) : null}
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MessageCircleIcon className="size-3.5" />
                            {post.commentCount as number ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </SitePage>
  );
}
