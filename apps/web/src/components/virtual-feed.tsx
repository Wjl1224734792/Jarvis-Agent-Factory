import type { ReactNode } from "react";
import { Virtuoso } from "react-virtuoso";
import { cn } from "@/lib/utils";

type VirtualFeedProps<T> = {
  data: T[];
  itemKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  height?: number;
  emptyState?: ReactNode;
};

export function VirtualFeed<T>({
  data,
  itemKey,
  renderItem,
  className,
  height = 640,
  emptyState
}: VirtualFeedProps<T>) {
  if (data.length === 0) {
    return emptyState ?? null;
  }

  return (
    <div className={cn("border border-border/70 bg-white", className)}>
      <Virtuoso
        className="virtual-feed"
        computeItemKey={(index, item) => itemKey(item, index)}
        data={data}
        increaseViewportBy={{ top: 280, bottom: 420 }}
        itemContent={(index, item) => (
          <div className={cn(index < data.length - 1 && "border-b border-border/70")}>
            {renderItem(item, index)}
          </div>
        )}
        style={{ height }}
      />
    </div>
  );
}
