import { useEffect, useRef, type MutableRefObject } from "react";
import { Virtuoso, VirtuosoGrid } from "react-virtuoso";
import { FeedRefetchFooter } from "@/components/feed-refetch-footer";
import { cn } from "@/lib/utils";
import type { VirtualFeedProps, VirtualGridProps, VirtualMasonryColumnsProps } from "./virtual-feed";

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as PromiseLike<unknown>).then === "function"
  );
}

function releaseLoadLockAfterSettled(
  loadResult: unknown,
  isLoadRequestedRef: MutableRefObject<boolean>
) {
  if (!isPromiseLike(loadResult)) {
    return;
  }

  void Promise.resolve(loadResult)
    .catch(() => undefined)
    .finally(() => {
      isLoadRequestedRef.current = false;
    });
}

export function VirtualFeedRuntime<T>({
  data,
  itemKey,
  renderItem,
  className,
  height = 640,
  useWindowScroll = false,
  hasMore,
  isFetchingNextPage,
  onLoadMore,
  showItemDividers = true,
  showRefetchFooter,
  refetchFooterLabel,
  refetchFooterState,
  refetchFooterErrorMessage
}: VirtualFeedProps<T>) {
  const isLoadRequestedRef = useRef(false);

  useEffect(() => {
    if (!isFetchingNextPage) {
      isLoadRequestedRef.current = false;
    }
  }, [isFetchingNextPage]);

  const requestLoadMore = () => {
    if (!onLoadMore || !hasMore || isFetchingNextPage || isLoadRequestedRef.current) {
      return;
    }

    isLoadRequestedRef.current = true;

    try {
      const loadResult = onLoadMore();
      releaseLoadLockAfterSettled(loadResult, isLoadRequestedRef);
    } catch {
      isLoadRequestedRef.current = false;
    }
  };

  return (
    <div className={cn("border border-border/70 bg-white", className)}>
      <Virtuoso
        className="virtual-feed"
        endReached={() => {
          requestLoadMore();
        }}
        {...(showRefetchFooter
          ? {
              components: {
                Footer: () => (
                  <FeedRefetchFooter
                    errorMessage={refetchFooterErrorMessage}
                    label={refetchFooterLabel}
                    show
                    state={refetchFooterState}
                  />
                )
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
  useWindowScroll = true,
  hasMore,
  isFetchingNextPage,
  onLoadMore
}: VirtualMasonryColumnsProps<T>) {
  const isLoadRequestedRef = useRef(false);

  useEffect(() => {
    if (!isFetchingNextPage) {
      isLoadRequestedRef.current = false;
    }
  }, [isFetchingNextPage]);

  const requestLoadMore = (columnIndex: number) => {
    if (columnIndex !== 0) {
      return;
    }

    if (!onLoadMore || !hasMore || isFetchingNextPage || isLoadRequestedRef.current) {
      return;
    }

    isLoadRequestedRef.current = true;

    try {
      const loadResult = onLoadMore();
      releaseLoadLockAfterSettled(loadResult, isLoadRequestedRef);
    } catch {
      isLoadRequestedRef.current = false;
    }
  };

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
          endReached={() => {
            requestLoadMore(columnIndex);
          }}
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
