import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src";

describe("posts api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests the home feed with tab query and credentials", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          tab: "recommended",
          activeCategorySlug: null,
          categories: [],
          items: []
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    );

    const client = createApiClient({
      baseUrl: "http://localhost:3002"
    });

    const payload = await client.listHomeFeed("recommended");

    expect(payload.tab).toBe("recommended");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3002/home/feed?tab=recommended",
      expect.objectContaining({
        method: "GET",
        credentials: "include"
      })
    );
  });

  it("posts comments with the expected payload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          item: {
            id: "comment_1",
            postId: "post_1",
            parentCommentId: null,
            replyToCommentId: null,
            content: "这条帖子很实用。",
            status: "visible",
            createdAt: "2026-03-23T00:00:00.000Z",
            updatedAt: "2026-03-23T00:00:00.000Z",
            author: {
              id: "user_1",
              displayName: "飞友",
              role: "user"
            },
            replyToUser: null
          }
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    );

    const client = createApiClient({
      baseUrl: "http://localhost:3002"
    });

    await client.createPostComment("post_1", {
      content: "这条帖子很实用。"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3002/posts/post_1/comments",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          content: "这条帖子很实用。"
        })
      })
    );
  });

  it("maps backend errors for admin moderation calls", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "NOT_FOUND",
          message: "Comment not found."
        }),
        {
          status: 404,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    );

    const client = createApiClient({
      baseUrl: "http://localhost:3002"
    });

    await expect(
      client.updateAdminPostCommentStatus("comment_404", {
        status: "hidden"
      })
    ).rejects.toThrow("内容不存在或已被删除。");
  });

  it("requests admin official article detail and update endpoints", async () => {
    const payload = {
      item: {
        id: "post_official_1",
        type: "article",
        title: "Official article",
        content: "Official article content.",
        contentHtml: "<p>Official article content.</p>",
        status: "published",
        commentCount: 0,
        reportCount: 0,
        createdAt: "2026-03-28T00:00:00.000Z",
        updatedAt: "2026-03-28T00:00:00.000Z",
        publishedAt: "2026-03-28T00:00:00.000Z",
        author: {
          id: "admin_1",
          displayName: "Admin",
          role: "admin"
        },
        images: [],
        videos: [],
        contentCategory: {
          id: "cat_1",
          slug: "official",
          name: "Official"
        },
        engagement: {
          likeCount: 0,
          favoriteCount: 0,
          shareCount: 0,
          viewer: {
            isAuthor: false,
            isFollowingAuthor: false,
            hasLiked: false,
            hasFavorited: false,
            hasShared: false
          }
        },
        comments: []
      }
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        })
      );

    const client = createApiClient({
      baseUrl: "http://localhost:3002"
    });

    await client.getAdminOfficialArticle("post_official_1");
    await client.updateAdminOfficialArticle("post_official_1", {
      title: "Updated official article",
      content: "Updated content",
      contentHtml: "<p>Updated content</p>",
      contentCategoryId: "cat_1",
      imageIds: [],
      videoIds: []
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3002/admin/official-articles/post_official_1",
      expect.objectContaining({
        method: "GET",
        credentials: "include"
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3002/admin/official-articles/post_official_1",
      expect.objectContaining({
        method: "PUT",
        credentials: "include"
      })
    );
  });

  it("marks one notification as read", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      })
    );

    const client = createApiClient({
      baseUrl: "http://localhost:3002"
    });

    const payload = await client.markNotificationRead("notice_1001");

    expect(payload.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3002/notifications/notice_1001/read",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
  });

  it("requests admin analytics overview", async () => {
    const now = "2026-03-28T00:00:00.000Z";
    const series30 = Array.from({ length: 30 }, (_, index) => ({
      periodStart: now,
      value: index
    }));
    const series12 = Array.from({ length: 12 }, (_, index) => ({
      periodStart: now,
      value: index
    }));
    const series5 = Array.from({ length: 5 }, (_, index) => ({
      periodStart: now,
      value: index
    }));

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          item: {
            totals: {
              users: 200,
              moments: 20,
              articles: 12,
              aircraft: 8,
              rankings: 5,
              pendingTotal: 11,
              pendingPosts: 2,
              pendingComments: 5,
              pendingReviews: 1,
              pendingSubmissions: 3
            },
            registration: {
              total: 200,
              today: 3,
              month: 18,
              year: 200,
              daily: series30,
              monthly: series12,
              yearly: series5
            },
            activity: {
              activeUsers: 64,
              dau: 12,
              mau: 64,
              yau: 150,
              daily: series30,
              monthly: series12,
              yearly: series5
            },
            contentMix: {
              moments: 20,
              articles: 12,
              aircraft: 8,
              rankings: 5
            },
            content: {
              moments: 20,
              articles: 12,
              aircraftPublishedModels: 8,
              aircraftPendingSubmissions: 3,
              rankings: 5
            },
            moderation: {
              posts: { queueEntered: 37, pending: 2, approved: 30, rejected: 4, hidden: 1 },
              comments: { queueEntered: 68, pending: 5, approved: 60, rejected: 0, hidden: 3 },
              reviews: { queueEntered: 18, pending: 1, approved: 15, rejected: 0, hidden: 2 },
              submissions: { queueEntered: 15, pending: 3, approved: 10, rejected: 2, hidden: 0 }
            },
            funnel: {
              posts: { queueEntered: 37, pending: 2, approved: 30, rejectedOrHidden: 5 },
              comments: { queueEntered: 68, pending: 5, approved: 60, rejectedOrHidden: 3 },
              reviews: { queueEntered: 18, pending: 1, approved: 15, rejectedOrHidden: 2 },
              submissions: { queueEntered: 15, pending: 3, approved: 10, rejectedOrHidden: 2 }
            },
            series: {
              registrationDaily: series30,
              registrationMonthly: series12,
              registrationYearly: series5,
              activityDaily: series30,
              activityMonthly: series12,
              activityYearly: series5
            }
          }
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    );

    const client = createApiClient({
      baseUrl: "http://localhost:3002"
    });

    const payload = await client.getAdminAnalyticsOverview();

    expect(payload.item.totals.users).toBe(200);
    expect(payload.item.activity.daily).toHaveLength(30);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3002/admin/analytics/overview",
      expect.objectContaining({
        method: "GET",
        credentials: "include"
      })
    );
  });
});
