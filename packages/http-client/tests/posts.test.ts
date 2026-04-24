import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src";
import { API_ROUTES } from "@feijia/shared";

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
          items: [],
          nextCursor: null,
          pagination: {
            limit: 20,
            hasMore: false
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
      baseUrl: "http://localhost:17382"
    });

    const payload = await client.listHomeFeed("recommended");

    expect(payload.tab).toBe("recommended");
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:17382${API_ROUTES.feed}?tab=recommended`,
      expect.objectContaining({
        method: "GET",
        credentials: "include"
      })
    );
  });

  it("requests recommended home feed with cursor", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          tab: "recommended",
          activeCategorySlug: null,
          categories: [],
          items: [],
          nextCursor: "cursor_40",
          pagination: {
            limit: 20,
            hasMore: true
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
      baseUrl: "http://localhost:17382"
    });

    const payload = await client.listHomeFeed({
      tab: "recommended",
      cursor: "cursor_20",
      limit: 20
    });

    expect(payload.nextCursor).toBe("cursor_40");
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:17382${API_ROUTES.feed}?tab=recommended&limit=20&cursor=cursor_20`,
      expect.objectContaining({
        method: "GET",
        credentials: "include"
      })
    );
  });

  it("requests latest/following circle feed with cursor pagination", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          tab: "following",
          items: [],
          nextCursor: "cursor_30",
          pagination: {
            limit: 10,
            hasMore: true
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
      baseUrl: "http://localhost:17382"
    });

    await client.listCircleFeed("following", { cursor: "cursor_20", limit: 10 });

    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:17382${API_ROUTES.circleFeed}?tab=following&limit=10&cursor=cursor_20`,
      expect.objectContaining({
        method: "GET",
        credentials: "include"
      })
    );
  });

  it("requests recommended circle feed with cursor", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          tab: "recommended",
          items: [],
          nextCursor: null,
          pagination: {
            limit: 10,
            hasMore: false
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
      baseUrl: "http://localhost:17382"
    });

    await client.listCircleFeed("recommended", { cursor: "cursor_10", limit: 10 });

    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:17382${API_ROUTES.circleFeed}?tab=recommended&limit=10&cursor=cursor_10`,
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
      baseUrl: "http://localhost:17382"
    });

    await client.createPostComment("post_1", {
      content: "Useful post."
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:17382${API_ROUTES.posts.comments("post_1")}`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          content: "Useful post."
        })
      })
    );
  });

  it("updates posts with the expected payload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          item: {
            id: "post_1",
            type: "article",
            title: "Updated article",
            content: "Updated article body",
            contentHtml: "<p>Updated article body</p>",
            status: "pending",
            commentCount: 0,
            reportCount: 0,
            createdAt: "2026-03-29T00:00:00.000Z",
            updatedAt: "2026-03-29T00:00:00.000Z",
            publishedAt: null,
            author: {
              id: "user_1",
              displayName: "Pilot",
              avatarUrl: null,
              role: "user"
            },
            images: [],
            videos: [],
            contentCategory: null,
            engagement: {
              likeCount: 0,
              favoriteCount: 0,
              shareCount: 0,
              viewer: {
                isAuthor: true,
                isFollowingAuthor: false,
                hasLiked: false,
                hasFavorited: false,
                hasShared: false
              }
            },
            comments: []
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
      baseUrl: "http://localhost:17382"
    });

    await client.updatePost("post_1", {
      type: "article",
      title: "Updated article",
      content: "Updated article body",
      contentHtml: "<p>Updated article body</p>",
      contentCategoryId: null,
      imageIds: [],
      videoIds: []
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:17382${API_ROUTES.posts.detail("post_1")}`,
      expect.objectContaining({
        method: "PUT",
        credentials: "include"
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
      baseUrl: "http://localhost:17382"
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
      baseUrl: "http://localhost:17382"
    });

    const file = new File([Uint8Array.from([1, 2, 3])], "cover.png", {
      type: "image/png"
    });
    const payload = await client.uploadPostImage(file);

    expect(payload.item.id).toBe("file_1");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `http://localhost:17382${API_ROUTES.uploads.init}`,
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
      `http://localhost:17382${API_ROUTES.uploads.complete}`,
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
  });

  it("maps structured upload limit errors to a user-facing message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "BAD_REQUEST",
          message: "File size exceeds limit. Current max allowed is 10 MB.",
          details: {
            reason: "file_too_large",
            bizType: "post-image",
            mediaKind: "image",
            limit: {
              bytes: 10485760,
              mb: "10",
              bizType: "post-image",
              mediaKind: "image"
            }
          }
        }),
        {
          status: 400,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    );

    const client = createApiClient({
      baseUrl: "http://localhost:17382"
    });

    const file = new File([Uint8Array.from([1, 2, 3])], "cover.png", {
      type: "image/png"
    });

    await expect(client.uploadPostImage(file)).rejects.toThrow("当前最大允许 10 MB");
  });
  it("uploads post images with qiniu form data when server returns kodo upload mode", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            fileId: "file_kodo_1",
            objectKey: "post-image/user_1/2026/04/21/file_1.png",
            upload: {
              mode: "qiniu-form",
              uploadUrl: "https://up-z0.qiniup.com",
              fileFieldName: "file",
              fields: {
                token: "upload-token",
                key: "uploads/post-image/user_1/2026/04/21/file_1.png"
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
              id: "file_kodo_1",
              bizType: "post-image",
              mediaKind: "image",
              status: "uploaded",
              visibility: "public",
              url: "https://cdn.example.com/post-image/user_1/2026/04/21/file_1.png",
              fileName: "cover.png",
              mimeType: "image/png",
              byteSize: 128,
              uploadedAt: "2026-04-21T00:00:00.000Z"
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
      baseUrl: "http://localhost:17382"
    });

    const file = new File([Uint8Array.from([1, 2, 3])], "cover.png", {
      type: "image/png"
    });

    const payload = await client.uploadPostImage(file);

    expect(payload.item.id).toBe("file_kodo_1");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://up-z0.qiniup.com",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData)
      })
    );

    const secondCall = fetchMock.mock.calls[1];
    const uploadRequest = secondCall?.[1] as RequestInit | undefined;
    const formData = uploadRequest?.body as FormData;

    expect(formData.get("token")).toBe("upload-token");
    expect(formData.get("key")).toBe("uploads/post-image/user_1/2026/04/21/file_1.png");
    expect(formData.get("file")).toBe(file);
  });
});
