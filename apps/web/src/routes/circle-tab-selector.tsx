// Page-private component for CirclePage -- 关注圈子横滚条

import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type CircleTabSelectorProps = {
  circles: Array<{
    id: string;
    slug: string;
    name: string;
    memberCount: number;
    postCount: number;
    coverImageUrl: string | null;
  }>;
  selectedCircleId: string | null;
  onSelect: (circleId: string) => void;
  isLoading: boolean;
};

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

/**
 * 关注圈子横滚条——贴吧式紧凑风格。
 * 展示用户已关注圈子的头像与名称，点击可切换到对应圈子的帖子流。
 * 鼠标滚轮支持横向滚动。
 */
export function CircleTabSelector({
  circles,
  selectedCircleId,
  onSelect,
  isLoading,
}: CircleTabSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  /** 鼠标滚轮 → 水平滚动（使用原生事件以 { passive: false } 注册，消除浏览器警告） */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const node = el;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      node.scrollLeft += event.deltaY;
    }

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, []);

  if (isLoading) {
    return (
      <div className="px-4 pt-3">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="flex shrink-0 items-center gap-2" key={index}>
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (circles.length === 0) {
    return null;
  }

  return (
    <div className="px-4 pt-3">
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2"
      >
        {circles.map((circle) => (
          <button
            className={cn(
              "flex shrink-0 items-center gap-2 focus:outline-none transition-transform hover:scale-105"
            )}
            key={circle.id}
            onClick={() => onSelect(circle.id)}
            type="button"
          >
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full transition-all",
                selectedCircleId === circle.id
                  ? "ring-2 ring-primary"
                  : "ring-2 ring-transparent hover:ring-primary/30",
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
                <span className="text-sm font-bold">
                  {circle.name.charAt(0)}
                </span>
              )}
            </div>
            <span className="truncate text-sm font-medium text-foreground/80">
              {circle.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
