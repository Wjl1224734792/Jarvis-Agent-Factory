import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src";

describe("admin message api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests admin messages with filters and credentials", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          unreadCount: 1,
          items: [
            {
              id: "notice_1",
              category: "system",
              type: "post_status_changed",
              domain: "posts",
              isRead: false,
              createdAt: "2026-04-19T00:00:00.000Z",
              title: "内容审核未通过",
              summary: "动态《示例动态》当前状态：未通过审核",
              target: {
                type: "post",
                id: "post_1",
                title: "示例动态",
                status: "rejected",
                href: "/posts/post_1"
              },
              actor: null,
              preview: null,
              metadata: {},
              subjectUser: {
                id: "user_1",
                displayName: "投稿用户",
                role: "user"
              },
              navigation: {
                href: "/admin/posts",
                filters: {
                  status: "rejected",
                  targetId: "post_1"
                }
              }
            }
          ]
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

    const payload = await client.listAdminMessages({
      domain: "posts",
      type: "post_status_changed",
      readStatus: "unread",
      limit: 20
    });

    expect(payload.items[0]?.domain).toBe("posts");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:17382/admin/messages?domain=posts&type=post_status_changed&readStatus=unread&limit=20",
      expect.objectContaining({
        method: "GET",
        credentials: "include"
      })
    );
  });

  it("requests admin moderation todos and marks messages as read", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            pendingCount: 5,
            items: [
              {
                domain: "post_comments",
                title: "帖子评论待审核",
                pendingCount: 3,
                navigation: {
                  href: "/admin/post-comments",
                  filters: {
                    status: "pending"
                  }
                }
              }
            ]
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true
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

    const todos = await client.listAdminModerationTodos();
    await client.markAdminMessageRead("notice_1");
    await client.markAllAdminMessagesRead();

    expect(todos.pendingCount).toBe(5);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:17382/admin/messages/todos",
      expect.objectContaining({
        method: "GET",
        credentials: "include"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:17382/admin/messages/notice_1/read",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:17382/admin/messages/read-all",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
  });
});
