import { Suspense, lazy, type ComponentType, type ReactNode } from "react";
import { FeedRefetchFooter } from "@/components/feed-refetch-footer";
import { cn } from "@/lib/utils";

export type VirtualFeedProps<T> = {
  data: T[];
  itemKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  height?: number;
  useWindowScroll?: boolean;
  hasMore?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void | PromiseLike<unknown>;
  showItemDividers?: boolean;
  emptyState?: ReactNode;
  /** 后台刷新时在列表末尾显示轻量加载，避免全屏遮罩抖动 */
  showRefetchFooter?: boolean;
  refetchFooterLabel?: string;
  refetchFooterState?: "loading" | "error";
  refetchFooterErrorMessage?: string;
};

export type VirtualGridProps<T> = {
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

export type VirtualMasonryColumnsProps<T> = {
  columns: T[][];
  itemKey: (item: T, index: number, columnIndex: number) => string;
  renderItem: (item: T, index: number, columnIndex: number) => ReactNode;
  className?: string;
  columnClassName?: string;
  gap?: string;
  emptyState?: ReactNode;
  useWindowScroll?: boolean;
  hasMore?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void | PromiseLike<unknown>;
};

const shouldDeferVirtualFeedRuntime = typeof window !== "undefined";

const VirtualFeedRuntime = lazy(() =>
  import("./virtual-feed-runtime").then((module) => ({
    default: module.VirtualFeedRuntime as ComponentType<VirtualFeedProps<unknown>>
  }))
);
const VirtualGridRuntime = lazy(() =>
  import("./virtual-feed-runtime").then((module) => ({
    default: module.VirtualGridRuntime as ComponentType<VirtualGridProps<unknown>>
  }))
);
const VirtualMasonryColumnsRuntime = lazy(() =>
  import("./virtual-feed-runtime").then((module) => ({
    default: module.VirtualMasonryColumnsRuntime as ComponentType<VirtualMasonryColumnsProps<unknown>>
  }))
);

/** 浏览器里延后加载 react-virtuoso，服务端与测试环境保持同步静态回退。 */
function renderDeferredRuntime<P extends object>(
  RuntimeComponent: ComponentType<P>,
  props: P,
  fallback: ReactNode
) {
  if (!shouldDeferVirtualFeedRuntime) {
    return fallback;
  }

  return (
    <Suspense fallback={fallback}>
      <RuntimeComponent {...props} />
    </Suspense>
  );
}

function StaticVirtualFeedFallback<T>(props: VirtualFeedProps<T>) {
  const previewItems = props.data.slice(0, 8);

  return (
    <div
      className={cn("border border-border/70 bg-white", props.className)}
      data-virtual-feed-fallback="list"
    >
      {previewItems.map((item, index) => (
        <div
          className={cn(props.showItemDividers !== false && index < previewItems.length - 1 && "border-b border-border/70")}
          key={props.itemKey(item, index)}
        >
          {props.renderItem(item, index)}
        </div>
      ))}
      {props.showRefetchFooter ? (
        <FeedRefetchFooter
          errorMessage={props.refetchFooterErrorMessage}
          label={props.refetchFooterLabel}
          show
          state={props.refetchFooterState}
        />
      ) : null}
    </div>
  );
}

function StaticVirtualGridFallback<T>(props: VirtualGridProps<T>) {
  const previewItems = props.data.slice(0, 6);

  return (
    <div className={cn(props.className)} data-virtual-feed-fallback="grid">
      <div className={props.listClassName}>
        {previewItems.map((item, index) => (
          <div className={props.itemClassName} key={props.itemKey(item, index)}>
            {props.renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

function StaticVirtualMasonryColumnsFallback<T>(props: VirtualMasonryColumnsProps<T>) {
  return (
    <div
      className={cn("grid w-full min-w-0", props.className)}
      data-virtual-feed-fallback="masonry"
      style={{
        gap: props.gap ?? "8px",
        gridTemplateColumns: `repeat(${props.columns.length}, minmax(0, 1fr))`
      }}
    >
      {props.columns.map((column, columnIndex) => {
        const previewItems = column.slice(0, 4);

        return (
          <div className={cn("min-w-0", props.columnClassName)} key={`masonry-column-${columnIndex}`}>
            {previewItems.map((item, index) => (
              <div
                key={props.itemKey(item, index, columnIndex)}
                style={{ paddingBottom: index < previewItems.length - 1 ? props.gap ?? "8px" : undefined }}
              >
                {props.renderItem(item, index, columnIndex)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function VirtualFeed<T>(props: VirtualFeedProps<T>) {
  if (props.data.length === 0) {
    return props.emptyState ?? null;
  }

  return renderDeferredRuntime(
    VirtualFeedRuntime as ComponentType<VirtualFeedProps<T>>,
    props,
    <StaticVirtualFeedFallback {...props} />
  );
}

export function VirtualGrid<T>(props: VirtualGridProps<T>) {
  if (props.data.length === 0) {
    return props.emptyState ?? null;
  }

  return renderDeferredRuntime(
    VirtualGridRuntime as ComponentType<VirtualGridProps<T>>,
    props,
    <StaticVirtualGridFallback {...props} />
  );
}

export function VirtualMasonryColumns<T>(props: VirtualMasonryColumnsProps<T>) {
  if (props.columns.every((column) => column.length === 0)) {
    return props.emptyState ?? null;
  }

  return renderDeferredRuntime(
    VirtualMasonryColumnsRuntime as ComponentType<VirtualMasonryColumnsProps<T>>,
    props,
    <StaticVirtualMasonryColumnsFallback {...props} />
  );
}
