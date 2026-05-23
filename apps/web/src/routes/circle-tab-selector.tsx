// Page-private component for CirclePage -- 关注圈子横滚条

import { useRef } from "react";
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

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    event.preventDefault();
    el.scrollLeft += event.deltaY;
  }

  if (isLoading) {
    return (
      <div className="px-4 pt-3">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2"
          onWheel={handleWheel}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="flex shrink-0 flex-col items-center gap-1" key={index}>
              <Skeleton className="size-12 rounded-full" />
              <Skeleton className="h-3 w-10" />
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
        onWheel={handleWheel}
      >
        {circles.map((circle) => (
          <button
            className={cn(
              "flex shrink-0 flex-col items-center gap-1 focus:outline-none",
              "transition-transform hover:scale-105"
            )}
            key={circle.id}
            onClick={() => onSelect(circle.id)}
            type="button"
          >
            <div
              className={cn(
                "flex size-12 items-center justify-center overflow-hidden rounded-full transition-all",
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
                <span className="text-base font-bold">
                  {circle.name.charAt(0)}
                </span>
              )}
            </div>
            <span className="max-w-[3.5rem] truncate text-[0.7rem] leading-tight text-foreground/70">
              {circle.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
