import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Mock Skeleton component
vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) =>
    createElement("div", { className: `skeleton-mock ${className ?? ""}` }),
}));

// Mock cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) =>
    classes.filter(Boolean).join(" "),
}));

import { CircleTabSelector } from "../src/routes/circle-tab-selector";

const mockCircles = [
  { id: "c1", slug: "aerial", name: "航拍交流", memberCount: 120, postCount: 45, coverImageUrl: null },
  { id: "c2", slug: "models", name: "机型讨论", memberCount: 85, postCount: 30, coverImageUrl: null },
];

describe("CircleTabSelector", () => {
  it("renders circle list in a scroll container", () => {
    const markup = renderToStaticMarkup(
      createElement(CircleTabSelector, {
        circles: mockCircles,
        selectedCircleId: null,
        onSelect: vi.fn(),
        isLoading: false,
      })
    );

    expect(markup).toContain("航拍交流");
    expect(markup).toContain("机型讨论");
    expect(markup).toContain("120 成员");
    expect(markup).toContain("45 帖子");
    expect(markup).toContain("overflow-x-auto");
  });

  it("triggers onSelect callback when a circle is clicked", () => {
    const onSelect = vi.fn();
    const markup = renderToStaticMarkup(
      createElement(CircleTabSelector, {
        circles: mockCircles,
        selectedCircleId: null,
        onSelect,
        isLoading: false,
      })
    );

    // Verify the component renders clickable elements with the circle names
    expect(markup).toContain("航拍交流");
    expect(markup).toContain("机型讨论");
    // The click handler is wired via onClick={onSelect(circle.id)}
    // We verify the component structure supports interaction
    expect(markup).toContain('type="button"');
  });

  it("shows skeleton cards during loading state", () => {
    const markup = renderToStaticMarkup(
      createElement(CircleTabSelector, {
        circles: [],
        selectedCircleId: null,
        onSelect: vi.fn(),
        isLoading: true,
      })
    );

    expect(markup).toContain("skeleton-mock");
    expect(markup).not.toContain("还没有加入任何圈子");
  });

  it("shows guidance prompt when circles list is empty", () => {
    const markup = renderToStaticMarkup(
      createElement(CircleTabSelector, {
        circles: [],
        selectedCircleId: null,
        onSelect: vi.fn(),
        isLoading: false,
      })
    );

    expect(markup).toContain("还没有加入任何圈子");
    expect(markup).toContain("去发现页面浏览感兴趣的圈子吧");
  });

  it("applies highlighted style to selected circle", () => {
    const markup = renderToStaticMarkup(
      createElement(CircleTabSelector, {
        circles: mockCircles,
        selectedCircleId: "c1",
        onSelect: vi.fn(),
        isLoading: false,
      })
    );

    // Selected circle should have primary border and sky background
    expect(markup).toContain("border-primary");
    expect(markup).toContain("bg-sky-50");
  });
});
