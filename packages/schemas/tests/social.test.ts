import { describe, expect, it } from "vitest";
import {
  notificationsResponseSchema,
  userContentResponseSchema,
  userProfileResponseSchema
} from "../src/social";

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

  it("parses user profile and aggregated content payload", () => {
    const profile = userProfileResponseSchema.parse({
      item: {
        user: {
          id: "user_1",
          displayName: "Sky Rider",
          role: "user"
        },
        followerCount: 10,
        followingCount: 4,
        favoriteCount: 6,
        postCount: 3,
        rankingCount: 2,
        aircraftCount: 1,
        reviewCount: 2,
        viewer: {
          isSelf: false,
          isFollowing: true
        }
      }
    });

    const content = userContentResponseSchema.parse({
      items: [
        {
          type: "post",
          id: "post_1",
          postType: "article",
          title: "Harbor session",
          contentPreview: "steady wind",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          type: "favorite-post",
          id: "post_2",
          postType: "moment",
          title: "Sunset climb",
          contentPreview: "wind stayed smooth",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          type: "review",
          id: "review_1",
          content: "Very stable",
          model: {
            id: "model_1",
            slug: "mini-4-pro",
            name: "DJI Mini 4 Pro"
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          type: "ranking",
          id: "ranking_1",
          title: "我最常飞的机型",
          description: "一条用户创建的榜单",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          type: "aircraft",
          id: "sub_1",
          modelName: "Mini 5 Pro",
          summary: "待审核的投稿",
          status: "submitted",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    });

    expect(profile.item.viewer.isFollowing).toBe(true);
    expect(content.items).toHaveLength(5);
  });
});
