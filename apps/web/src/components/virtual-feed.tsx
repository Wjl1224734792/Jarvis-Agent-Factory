import type { ReactNode } from "react";
import { Virtuoso, VirtuosoGrid } from "react-virtuoso";
import { FeedRefetchFooter } from "@/components/feed-refetch-footer";
import { cn } from "@/lib/utils";

type VirtualFeedProps<T> = {
  data: T[];
  itemKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  height?: number;
  useWindowScroll?: boolean;
  showItemDividers?: boolean;
  emptyState?: ReactNode;
  /** 后台刷新时在列表末尾显示轻量加载，避免全屏遮罩抖动 */
  showRefetchFooter?: boolean;
  refetchFooterLabel?: string;
};

export function VirtualFeed<T>({
  data,
  itemKey,
  renderItem,
  className,
  height = 640,
  useWindowScroll = false,
  showItemDividers = true,
  emptyState,
  showRefetchFooter,
  refetchFooterLabel
}: VirtualFeedProps<T>) {
  if (data.length === 0) {
    return emptyState ?? null;
  }

  return (
    <div className={cn("border border-border/70 bg-white", className)}>
      <Virtuoso
        className="virtual-feed"
        {...(showRefetchFooter
          ? {
              components: {
                Footer: () => <FeedRefetchFooter label={refetchFooterLabel} show />
              }
            }
          : {})}
        computeItemKey={(index, item) => itemKey(item, index)}
        data={data}
        increaseViewportBy={{ top: 280, bottom: 420 }}
        itemContent={(index, item) => (
          <div className={cn(showItemDividers && index < data.length - 1 && "border-b border-border/70")}>
            {renderItem(item, index)}
          </div>
        )}
        style={useWindowScroll ? undefined : { height }}
        useWindowScroll={useWindowScroll}
      />
    </div>
  );
}

type VirtualGridProps<T> = {
  data: T[];
  itemKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  listClassName: string;
  itemClassName?: string;
  height?: number;
  useWindowScroll?: boolean;
  emptyState?: ReactNode;
};

export function VirtualGrid<T>({
  data,
  itemKey,
  renderItem,
  className,
  listClassName,
  itemClassName,
  height = 720,
  useWindowScroll = true,
  emptyState
}: VirtualGridProps<T>) {
  if (data.length === 0) {
    return emptyState ?? null;
  }

  return (
    <VirtuosoGrid
      className={className}
      computeItemKey={(index, item) => itemKey(item, index)}
      data={data}
      increaseViewportBy={{ top: 360, bottom: 560 }}
      itemClassName={itemClassName}
      itemContent={(index, item) => renderItem(item, index)}
      listClassName={listClassName}
      overscan={{ main: 640, reverse: 320 }}
      style={useWindowScroll ? undefined : { height }}
      useWindowScroll={useWindowScroll}
    />
  );
}

type VirtualMasonryColumnsProps<T> = {
  columns: T[][];
  itemKey: (item: T, index: number, columnIndex: number) => string;
  renderItem: (item: T, index: number, columnIndex: number) => ReactNode;
  className?: string;
  columnClassName?: string;
  gap?: string;
  emptyState?: ReactNode;
  useWindowScroll?: boolean;
};

export function VirtualMasonryColumns<T>({
  columns,
  itemKey,
  renderItem,
  className,
  columnClassName,
  gap = "8px",
  emptyState,
  useWindowScroll = true
}: VirtualMasonryColumnsProps<T>) {
  if (columns.every((column) => column.length === 0)) {
    return emptyState ?? null;
  }

  return (
    <div
      className={cn("grid w-full min-w-0", className)}
      style={{
        gap,
        gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`
      }}
    >
      {columns.map((column, columnIndex) => (
        <Virtuoso
          className={cn("min-w-0", columnClassName)}
          computeItemKey={(index, item) => itemKey(item, index, columnIndex)}
          data={column}
          increaseViewportBy={{ top: 320, bottom: 480 }}
          itemContent={(index, item) => (
            <div style={{ paddingBottom: index < column.length - 1 ? gap : undefined }}>
              {renderItem(item, index, columnIndex)}
            </div>
          )}
          key={`masonry-column-${columnIndex}`}
          useWindowScroll={useWindowScroll}
        />
      ))}
    </div>
  );
}
