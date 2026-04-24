import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CircleFeedColumnCell } from "../src/routes/circle-page-helpers";
import { VirtualMasonryColumnsRuntime, VirtualFeedRuntime } from "../src/components/virtual-feed-runtime";

vi.mock("@/components/feed-refetch-footer", () => ({
  FeedRefetchFooter: () => createElement("div", { "data-refetch-footer": "" }, "loading")
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ")
}));

type MockedVirtuosoProps = {
  endReached?: () => void;
  className?: string;
};
const virtuosoInstances: Array<MockedVirtuosoProps> = [];

vi.mock("react-virtuoso", () => ({
  Virtuoso: (props: MockedVirtuosoProps) => {
    virtuosoInstances.push(props);

    return createElement("div", { className: `virtuoso-${props.className ?? ""}` }, "virtuoso");
  },
  VirtuosoGrid: () => createElement("div", null, "virtuoso-grid")
}));

import { VirtualFeed, VirtualGrid, VirtualMasonryColumns } from "../src/components/virtual-feed";

describe("virtual feed lazy shells", () => {
  beforeEach(() => {
    virtuosoInstances.length = 0;
  });

  it("renders a static masonry fallback while the virtuoso runtime is deferred", () => {
    const TestVirtualMasonryColumns = VirtualMasonryColumns<CircleFeedColumnCell<{ id: string }>>;

    const columns: CircleFeedColumnCell<{ id: string }>[][] = [
      [{ item: { id: "a" }, absoluteIndex: 0 }],
      [
        { item: { id: "b" }, absoluteIndex: 1 },
        { item: { id: "c" }, absoluteIndex: 2 }
      ]
    ];

    const markup = renderToStaticMarkup(
      createElement(TestVirtualMasonryColumns, {
        columns,
        gap: "8px",
        itemKey: (cell: CircleFeedColumnCell<{ id: string }>) => cell.item.id,
        renderItem: (cell: CircleFeedColumnCell<{ id: string }>) =>
          createElement("article", null, cell.item.id)
      })
    );

    expect(markup).toContain("data-virtual-feed-fallback=\"masonry\"");
    expect(markup).toContain("<article>a</article>");
    expect(markup).toContain("<article>c</article>");
  });

  it("keeps list and grid empty states synchronous", () => {
    const listMarkup = renderToStaticMarkup(
      createElement(VirtualFeed<string>, {
        data: [],
        emptyState: createElement("p", null, "empty-list"),
        itemKey: (item) => item,
        renderItem: (item) => item
      })
    );
    const gridMarkup = renderToStaticMarkup(
      createElement(VirtualGrid<string>, {
        data: [],
        emptyState: createElement("p", null, "empty-grid"),
        itemKey: (item) => item,
        listClassName: "grid",
        renderItem: (item) => item
      })
    );

    expect(listMarkup).toContain("empty-list");
    expect(gridMarkup).toContain("empty-grid");
  });

  it("triggers auto load when the virtual list reports end reached", () => {
    const onLoadMore = vi.fn();

    renderToStaticMarkup(
      createElement(VirtualFeedRuntime, {
        data: ["a", "b", "c"],
        itemKey: (item: unknown) => String(item),
        renderItem: (item: unknown) => String(item),
        hasMore: true,
        isFetchingNextPage: false,
        onLoadMore
      })
    );

    expect(virtuosoInstances).toHaveLength(1);
    const endReached = virtuosoInstances[0]?.endReached;
    expect(typeof endReached).toBe("function");

    endReached?.();
    endReached?.();

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("skips auto loading when already fetching next page", () => {
    const onLoadMore = vi.fn();

    renderToStaticMarkup(
      createElement(VirtualFeedRuntime, {
        data: ["a", "b", "c"],
        itemKey: (item: unknown) => String(item),
        renderItem: (item: unknown) => String(item),
        hasMore: true,
        isFetchingNextPage: true,
        onLoadMore
      })
    );

    virtuosoInstances[0]?.endReached?.();

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("only triggers masonry auto load from the first column", () => {
    const onLoadMore = vi.fn();
    const columns: Array<
      { id: string; post: string }[]
    > = [[{ id: "a", post: "A" }], [{ id: "b", post: "B" }]];

    renderToStaticMarkup(
      createElement(VirtualMasonryColumnsRuntime, {
        columns,
        className: "w-full",
        gap: "8px",
        itemKey: (item: unknown) => String((item as { id: string }).id),
        renderItem: (cell: unknown) => (cell as { post: string }).post,
        hasMore: true,
        isFetchingNextPage: false,
        onLoadMore
      })
      );

    expect(virtuosoInstances).toHaveLength(2);
    virtuosoInstances[1]?.endReached?.();
    expect(onLoadMore).not.toHaveBeenCalled();

    virtuosoInstances[0]?.endReached?.();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
