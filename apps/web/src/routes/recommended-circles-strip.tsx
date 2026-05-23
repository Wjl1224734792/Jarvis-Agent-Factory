import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { APP_ROUTES } from "@feijia/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/** 初始字母背景色板——按 slug hash 分配，保证同一圈子颜色固定 */
const AVATAR_COLORS = [
  "bg-sky-100 text-sky-600",
  "bg-amber-100 text-amber-600",
  "bg-emerald-100 text-emerald-600",
  "bg-rose-100 text-rose-600",
  "bg-violet-100 text-violet-600",
  "bg-cyan-100 text-cyan-600",
  "bg-orange-100 text-orange-600",
  "bg-teal-100 text-teal-600",
];

function resolveColorClass(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** 格式化成员数为简洁显示（如 1.2k、3.5w） */
function formatMemberCount(count: number) {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1).replace(/\.0$/, "")}w`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(count);
}

interface RecommendedCircle {
  id: string;
  slug: string;
  name: string;
  memberCount: number;
  coverImageUrl: string | null;
}

function SkeletonCard() {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <Skeleton className="size-16 rounded-full" />
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

/**
 * 推荐圈子横向滚动条——类似 Instagram Stories 横滚条风格。
 * 展示热门圈子的头像（封面图或首字母）、名称、成员数，支持点击进入圈子详情。
 */
export function RecommendedCirclesStrip() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const circlesQuery = useQuery({
    queryKey: ["recommended-circles"],
    queryFn: () => apiClient.listCircles({ sort: "hot" }),
  });

  const circles = (circlesQuery.data?.items ?? []) as RecommendedCircle[];

  /** 鼠标滚轮 → 水平滚动 */
  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el) return;
    event.preventDefault();
    el.scrollLeft += event.deltaY;
  }

  /** 点击卡片 → 跳转圈子详情 */
  function handleClick(circle: RecommendedCircle) {
    void navigate(APP_ROUTES.circleDetail.replace(":slug", circle.slug));
  }

  if (circlesQuery.isLoading) {
    return (
      <div className="px-4 pt-2">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2"
          onWheel={handleWheel}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (circles.length === 0) {
    return null;
  }

  return (
    <div className="px-4 pt-2">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2"
        onWheel={handleWheel}
      >
        {circles.map((circle) => (
          <button
            className="flex shrink-0 flex-col items-center gap-1.5 focus:outline-none"
            key={circle.id}
            onClick={() => handleClick(circle)}
            type="button"
          >
            <div
              className={cn(
                "flex size-16 items-center justify-center overflow-hidden rounded-full ring-2 ring-primary/20 transition-all hover:ring-primary/50 hover:scale-105",
                !circle.coverImageUrl && resolveColorClass(circle.slug)
              )}
            >
              {circle.coverImageUrl ? (
                <img
                  alt={circle.name}
                  className="h-full w-full object-cover"
                  src={circle.coverImageUrl}
                />
              ) : (
                <span className="text-xl font-bold">
                  {circle.name.charAt(0)}
                </span>
              )}
            </div>
            <span className="max-w-[4rem] truncate text-[0.7rem] leading-tight text-foreground/70">
              {circle.name}
            </span>
            <span className="text-[0.6rem] text-muted-foreground">
              {formatMemberCount(circle.memberCount)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
