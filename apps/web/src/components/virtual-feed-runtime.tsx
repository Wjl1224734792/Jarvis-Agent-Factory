import { Virtuoso, VirtuosoGrid } from "react-virtuoso";
import { FeedRefetchFooter } from "@/components/feed-refetch-footer";
import { cn } from "@/lib/utils";
import type { VirtualFeedProps, VirtualGridProps, VirtualMasonryColumnsProps } from "./virtual-feed";

export function VirtualFeedRuntime<T>({
  data,
  itemKey,
  renderItem,
  className,
  height = 640,
  useWindowScroll = false,
  showItemDividers = true,
  showRefetchFooter,
  refetchFooterLabel
}: VirtualFeedProps<T>) {
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

export function VirtualGridRuntime<T>({
  data,
  itemKey,
  renderItem,
  className,
  listClassName,
  itemClassName,
  height = 720,
  useWindowScroll = true
}: VirtualGridProps<T>) {
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

export function VirtualMasonryColumnsRuntime<T>({
  columns,
  itemKey,
  renderItem,
  className,
  columnClassName,
  gap = "8px",
  useWindowScroll = true
}: VirtualMasonryColumnsProps<T>) {
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
