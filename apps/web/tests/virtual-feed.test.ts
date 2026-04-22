import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CircleFeedColumnCell } from "../src/routes/circle-page-helpers";

const { virtuosoCalls } = vi.hoisted(() => ({
  virtuosoCalls: [] as Array<Record<string, unknown>>
}));

vi.mock("react-virtuoso", () => ({
  Virtuoso: (props: Record<string, unknown>) => {
    virtuosoCalls.push(props);

    const data = (props.data as Array<CircleFeedColumnCell<{ id: string }>>) ?? [];
    const itemContent = props.itemContent as (
      index: number,
      item: CircleFeedColumnCell<{ id: string }>
    ) => ReactNode;

    return createElement(
      "div",
      { "data-virtuoso-column": data.length },
      data.map((item, index) =>
        createElement("div", { key: item.item.id }, itemContent(index, item))
      )
    );
  },
  VirtuosoGrid: () => createElement("div", { "data-virtuoso-grid": "" })
}));

vi.mock("@/components/feed-refetch-footer", () => ({
  FeedRefetchFooter: () => createElement("div", { "data-refetch-footer": "" })
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ")
}));

import { VirtualMasonryColumns } from "../src/components/virtual-feed";

describe("virtual masonry columns", () => {
  it("renders one window-scrolled Virtuoso list per masonry column", () => {
    virtuosoCalls.length = 0;
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

    expect(virtuosoCalls).toHaveLength(2);
    expect(virtuosoCalls.every((props) => props.useWindowScroll === true)).toBe(true);
    expect(markup).toContain("data-virtuoso-column=\"1\"");
    expect(markup).toContain("data-virtuoso-column=\"2\"");
    expect(markup).toContain("<article>a</article>");
    expect(markup).toContain("<article>c</article>");
  });
});
