import type { ReactNode } from "react";
import { SitePanel, SitePanelBody } from "@/components/site-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SidebarSectionProps<T> {
  /** 面板标题 */
  title: string;
  /** 标题图标（可选） */
  icon?: ReactNode;
  /** 展示项列表 */
  items: T[];
  /** 最大展示数量，默认 3 */
  maxItems?: number;
  /** 单项渲染函数 */
  renderItem: (item: T, index: number) => ReactNode;
  /** 加载态 */
  isLoading?: boolean;
  /** 骨架屏数量，默认等于 maxItems */
  skeletonCount?: number;
  /** 外层样式扩展 */
  className?: string;
}

/**
 * 侧边栏通用面板组件，封装最大展示项截断逻辑与加载骨架屏。
 * 默认最多展示 3 项，通过 `items.slice(0, maxItems)` 自动截断。
 */
export function SidebarSection<T>({
  title,
  icon,
  items,
  maxItems = 3,
  renderItem,
  isLoading = false,
  skeletonCount,
  className
}: SidebarSectionProps<T>) {
  const effectiveSkeletonCount = skeletonCount ?? maxItems;
  const visibleItems = items.slice(0, maxItems);

  return (
    <SitePanel className={cn("bg-white backdrop-blur-none", className)}>
      <SitePanelBody className="space-y-2.5">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          {icon}
          {title}
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: effectiveSkeletonCount }).map((_, index) => (
              <div className="space-y-2" key={index}>
                <Skeleton className="h-4 w-4/5 rounded-none" />
                <Skeleton className="h-3.5 w-3/5 rounded-none" />
              </div>
            ))}
          </div>
        ) : (
          visibleItems.map((item, index) => renderItem(item, index))
        )}
      </SitePanelBody>
    </SitePanel>
  );
}
