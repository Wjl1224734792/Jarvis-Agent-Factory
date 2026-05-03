import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CircleFeedColumnCell } from "../src/routes/circle-page-helpers";

vi.mock("@/components/feed-refetch-footer", () => ({
  FeedRefetchFooter: () => createElement("div", { "data-refetch-footer": "" }, "loading")
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ")
}));

import { VirtualFeed, VirtualGrid, VirtualMasonryColumns } from "../src/components/virtual-feed";

describe("virtual feed lazy shells", () => {
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
});
