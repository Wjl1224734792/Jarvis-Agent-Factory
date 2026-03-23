import { describe, expect, it } from "vitest";
import { notificationsResponseSchema } from "../src/social";

describe("social contract", () => {
  it("parses the notifications response", () => {
    const payload = notificationsResponseSchema.parse({
      unreadCount: 1,
      items: [
        {
          id: "notice_1",
          type: "post_liked",
          isRead: false,
          createdAt: new Date().toISOString(),
          actor: {
            id: "user_1",
            displayName: "Sky Rider",
            role: "user"
          },
          post: {
            id: "post_1",
            title: "Harbor session"
          },
          comment: null
        }
      ]
    });

    expect(payload.unreadCount).toBe(1);
    expect(payload.items[0]?.type).toBe("post_liked");
  });
});
