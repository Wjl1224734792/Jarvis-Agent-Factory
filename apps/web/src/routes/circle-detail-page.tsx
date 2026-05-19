import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowLeftIcon, PlusIcon, UsersIcon } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SitePage } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/auth-store";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function CircleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated");

  const circleQuery = useQuery({
    queryKey: ["circle", slug],
    queryFn: () => apiClient.getCircleDetail(slug!),
    enabled: Boolean(slug),
  });

  const circle = circleQuery.data?.item;
  const isOwner = currentUser && circle?.ownerId === currentUser.id;

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
            <h1 className="text-xl font-bold text-foreground">{circle.name}</h1>
            {circle.description ? (
              <p className="mt-2 text-sm text-muted-foreground">{circle.description}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <UsersIcon className="size-4" />
                {circle.memberCount} 成员
              </span>
              <span>{circle.postCount} 帖子</span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs",
                circle.joinMode === "free" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              )}>
                {circle.joinMode === "free" ? "自由加入" : "审核加入"}
              </span>
            </div>

            <div className="mt-6 flex gap-3">
              {isAuthenticated ? (
                circle.viewerRole ? (
                  <Button disabled variant="outline" size="sm">
                    {circle.viewerRole === "owner" ? "圈主" : "已加入"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!circle) return;
                      try {
                        await (apiClient as any).joinCircle?.(circle.id);
                        circleQuery.refetch();
                      } catch { /* ignore */ }
                    }}
                  >
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
              <h2 className="text-sm font-semibold text-foreground">帖子</h2>
              {isAuthenticated ? (
                <Button size="sm" variant="outline">
                  <PlusIcon className="size-3.5 mr-1" />
                  发帖
                </Button>
              ) : null}
            </div>
            <div className="mt-3 space-y-3">
              <div className="py-12 text-center text-sm text-muted-foreground">
                暂无帖子
              </div>
            </div>
          </div>
        </div>
      )}
    </SitePage>
  );
}
