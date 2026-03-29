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
            content: "Useful post.",
            status: "visible",
            createdAt: "2026-03-23T00:00:00.000Z",
            updatedAt: "2026-03-23T00:00:00.000Z",
            author: {
              id: "user_1",
              displayName: "Pilot",
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
      content: "Useful post."
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3002/posts/post_1/comments",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          content: "Useful post."
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
    ).rejects.toThrow();
  });

  it("initializes and completes presigned uploads for post images", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            fileId: "file_1",
            objectKey: "post-image/user_1/2026/03/29/file_1.png",
            upload: {
              mode: "presigned-put",
              url: "https://storage.example.com/upload",
              headers: {
                "Content-Type": "image/png"
              },
              expiresIn: 900
            }
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            item: {
              id: "file_1",
              bizType: "post-image",
              mediaKind: "image",
              status: "uploaded",
              visibility: "public",
              url: "https://cdn.example.com/post-image/user_1/2026/03/29/file_1.png",
              fileName: "cover.png",
              mimeType: "image/png",
              byteSize: 128,
              uploadedAt: "2026-03-29T00:00:00.000Z"
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

    const file = new File([Uint8Array.from([1, 2, 3])], "cover.png", {
      type: "image/png"
    });
    const payload = await client.uploadPostImage(file);

    expect(payload.item.id).toBe("file_1");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3002/uploads/init",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://storage.example.com/upload",
      expect.objectContaining({
        method: "PUT",
        headers: {
          "Content-Type": "image/png"
        }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3002/uploads/complete",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
  });
});
