import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { UsersIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";

interface CircleItem {
  id: string;
  slug: string;
  name: string;
  memberCount: number;
  role?: string | null;
}

export function ProfileCirclesTab(props: { userId: string }) {
  const circlesQuery = useQuery({
    queryKey: ["user-circles", props.userId],
    queryFn: () => apiClient.listUserCircles(props.userId),
    enabled: Boolean(props.userId),
  });

  const circles = (circlesQuery.data?.items ?? []) as CircleItem[];

  if (circlesQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-white p-4"
            key={i}
          >
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-3 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (circlesQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>圈子加载失败</AlertTitle>
        <AlertDescription>
          {circlesQuery.error instanceof Error
            ? circlesQuery.error.message
            : "暂时无法加载圈子列表，请稍后重试。"}
        </AlertDescription>
      </Alert>
    );
  }

  if (circles.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-white px-5 py-8 text-center text-sm text-muted-foreground">
        还没有加入任何圈子。
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {circles.map((c) => (
        <Link
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-white p-4 transition hover:border-primary/30 hover:bg-sky-50/20"
          key={c.id}
          to={APP_ROUTES.circleDetail.replace(":slug", c.slug)}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <UsersIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground line-clamp-1">
              {c.name}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {c.memberCount} 成员
              {c.role ? (
                <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem]">
                  {c.role === "owner" ? "圈主" : c.role === "admin" ? "管理员" : "成员"}
                </span>
              ) : null}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
