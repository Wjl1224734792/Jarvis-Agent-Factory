// Page-private component for CirclePage

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
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2"
        onWheel={handleWheel}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className="shrink-0 w-36 rounded-xl border border-border/60 overflow-hidden"
            key={index}
          >
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="p-3">
              <Skeleton className="h-4 w-3/4" />
              <div className="mt-2 flex items-center gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (circles.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="text-sm font-semibold text-foreground">
          还没有加入任何圈子
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          去发现页面浏览感兴趣的圈子吧
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex gap-3 overflow-x-auto pb-2"
      onWheel={handleWheel}
    >
      {circles.map((circle) => (
        <button
          className={cn(
            "shrink-0 w-36 rounded-xl border text-left transition overflow-hidden",
            selectedCircleId === circle.id
              ? "border-primary bg-sky-50"
              : "border-border/60 hover:border-primary/40 hover:bg-sky-50/30"
          )}
          key={circle.id}
          onClick={() => onSelect(circle.id)}
          type="button"
        >
          <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden">
            {circle.coverImageUrl ? (
              <img
                alt={circle.name}
                className="h-full w-full object-cover"
                src={circle.coverImageUrl}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-2xl font-bold text-slate-300">{circle.name.charAt(0)}</span>
              </div>
            )}
          </div>
          <div className="p-3">
            <div className="text-sm font-semibold text-foreground line-clamp-1">
              {circle.name}
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[0.65rem] text-muted-foreground">
              <span>{circle.memberCount} 成员</span>
              <span>{circle.postCount} 帖子</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
