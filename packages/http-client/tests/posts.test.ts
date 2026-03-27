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
    ).rejects.toThrow("Comment not found.");
  });
});
