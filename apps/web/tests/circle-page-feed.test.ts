import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CircleFeedItem } from "../src/routes/circle-page-feed";

vi.mock("@/components/profile-link", () => ({
  ProfileLink: ({ children }: { children: string }) => createElement("span", null, children)
}));

vi.mock("@/lib/avatar-url", () => ({
  resolveUserAvatarSrc: (value: string | null) => value
}));

vi.mock("react-virtuoso", () => ({
  Virtuoso: ({ data, itemContent }: { data: unknown[]; itemContent: (index: number, item: unknown) => unknown }) =>
    createElement("div", null, data.map((item, i) => createElement("div", { key: i }, itemContent(i, item)))),
}));

import { CirclePageFeed } from "../src/routes/circle-page-feed";

const createPost = (id: string): CircleFeedItem => ({
  id,
  title: `post-${id}`,
  cover: null,
  images: [],
  videos: [],
  author: {
    id: `user-${id}`,
    displayName: `user-${id}`,
    avatarUrl: null
  },
  engagement: {
    likeCount: 2
  }
});

describe("circle page feed", () => {
  it("does not render manual load more controls", () => {
    const markup = renderToStaticMarkup(
      createElement(CirclePageFeed, {
        activeTab: "recommended",
        onChangeTab: vi.fn(),
        posts: [createPost("post-1")],
        onCardClick: vi.fn(),
        isLoading: false,
        isRefetching: false,
        isFetchingNextPage: false,
        isError: false,
        hasMore: true,
        onLoadMore: vi.fn(),
        formatCount: (value: number) => String(value),
        authStatus: "anonymous",
        onNavigateToLogin: vi.fn()
      })
    );

    expect(markup).not.toContain("加载更多");
    expect(markup).not.toContain("<button>加载更多");
  });

  it("shows loading state during pagination", () => {
    const markup = renderToStaticMarkup(
      createElement(CirclePageFeed, {
        activeTab: "recommended",
        onChangeTab: vi.fn(),
        posts: [createPost("post-1")],
        onCardClick: vi.fn(),
        isLoading: false,
        isRefetching: false,
        isFetchingNextPage: true,
        isError: false,
        hasMore: true,
        onLoadMore: vi.fn(),
        formatCount: (value: number) => String(value),
        authStatus: "anonymous",
        onNavigateToLogin: vi.fn()
      })
    );

    expect(markup).toContain("正在加载更多...");
  });

  it("shows footer error state for next-page failures", () => {
    const markup = renderToStaticMarkup(
      createElement(CirclePageFeed, {
        activeTab: "recommended",
        onChangeTab: vi.fn(),
        posts: [createPost("post-1")],
        onCardClick: vi.fn(),
        isLoading: false,
        isRefetching: false,
        isFetchingNextPage: false,
        isError: false,
        isLoadMoreError: true,
        loadMoreErrorMessage: "请求失败",
        hasMore: true,
        onLoadMore: vi.fn(),
        formatCount: (value: number) => String(value),
        authStatus: "anonymous",
        onNavigateToLogin: vi.fn()
      })
    );

    expect(markup).toContain("请求失败");
    expect(markup).toContain("继续上滑将自动重试");
  });

  it("shows full-page error state on initial query failure", () => {
    const markup = renderToStaticMarkup(
      createElement(CirclePageFeed, {
        activeTab: "recommended",
        onChangeTab: vi.fn(),
        posts: [],
        onCardClick: vi.fn(),
        isLoading: false,
        isRefetching: false,
        isFetchingNextPage: false,
        isError: true,
        errorMessage: "请求失败",
        hasMore: false,
        onLoadMore: vi.fn(),
        formatCount: (value: number) => String(value),
        authStatus: "anonymous",
        onNavigateToLogin: vi.fn()
      })
    );

    expect(markup).toContain("飞友圈加载失败");
    expect(markup).toContain("请求失败");
  });

  it("renders circle tabs when following tab is active", () => {
    const markup = renderToStaticMarkup(
      createElement(CirclePageFeed, {
        activeTab: "following",
        onChangeTab: vi.fn(),
        posts: [],
        onCardClick: vi.fn(),
        isLoading: false,
        isRefetching: false,
        isFetchingNextPage: false,
        isError: false,
        hasMore: false,
        onLoadMore: vi.fn(),
        formatCount: (value: number) => String(value),
        authStatus: "authenticated",
        onNavigateToLogin: vi.fn(),
        circleTabs: [
          { id: "circle-c1", label: "航拍交流", circleId: "c1", circleSlug: "aerial" },
        ],
        activeCircleTabId: null,
        onChangeCircleTab: vi.fn(),
      })
    );

    expect(markup).toContain("航拍交流");
    expect(markup).toContain("关注");
  });

  it("shows login prompt for anonymous user on latest tab", () => {
    const markup = renderToStaticMarkup(
      createElement(CirclePageFeed, {
        activeTab: "latest",
        onChangeTab: vi.fn(),
        posts: [],
        onCardClick: vi.fn(),
        isLoading: false,
        isRefetching: false,
        isFetchingNextPage: false,
        isError: false,
        hasMore: false,
        onLoadMore: vi.fn(),
        formatCount: (value: number) => String(value),
        authStatus: "anonymous",
        onNavigateToLogin: vi.fn(),
      })
    );

    expect(markup).toContain("登录后浏览最新动态");
    expect(markup).toContain("去登录");
  });

  it("renders posts as single-column cards", () => {
    const markup = renderToStaticMarkup(
      createElement(CirclePageFeed, {
        activeTab: "recommended",
        onChangeTab: vi.fn(),
        posts: [createPost("post-1"), createPost("post-2")],
        onCardClick: vi.fn(),
        isLoading: false,
        isRefetching: false,
        isFetchingNextPage: false,
        isError: false,
        hasMore: false,
        onLoadMore: vi.fn(),
        formatCount: (value: number) => String(value),
        authStatus: "authenticated",
        onNavigateToLogin: vi.fn(),
      })
    );

    expect(markup).toContain("post-post-1");
    expect(markup).toContain("post-post-2");
  });
});
