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
        openNote: vi.fn(),
        selectedNoteId: null,
        isLoading: false,
        isRefetching: false,
        isFetchingNextPage: false,
        isError: false,
        hasMore: true,
        onLoadMore: vi.fn(),
        formatCount: (value: number) => String(value)
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
        openNote: vi.fn(),
        selectedNoteId: null,
        isLoading: false,
        isRefetching: false,
        isFetchingNextPage: true,
        isError: false,
        hasMore: true,
        onLoadMore: vi.fn(),
        formatCount: (value: number) => String(value)
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
        openNote: vi.fn(),
        selectedNoteId: null,
        isLoading: false,
        isRefetching: false,
        isFetchingNextPage: false,
        isError: false,
        isLoadMoreError: true,
        loadMoreErrorMessage: "请求失败",
        hasMore: true,
        onLoadMore: vi.fn(),
        formatCount: (value: number) => String(value)
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
        openNote: vi.fn(),
        selectedNoteId: null,
        isLoading: false,
        isRefetching: false,
        isFetchingNextPage: false,
        isError: true,
        errorMessage: "请求失败",
        hasMore: false,
        onLoadMore: vi.fn(),
        formatCount: (value: number) => String(value)
      })
    );

    expect(markup).toContain("飞友圈加载失败");
    expect(markup).toContain("请求失败");
  });
});
