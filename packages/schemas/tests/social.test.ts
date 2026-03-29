import { describe, expect, it } from "vitest";
import {
  adminAnalyticsOverviewResponseSchema,
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
          isFollowing: true,
          canFollow: true,
          canViewProfile: true,
          canViewContent: true
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
          type: "favorite-model",
          id: "fav_model_1",
          model: {
            id: "model_2",
            slug: "joby-s4",
            name: "Joby S4",
            powerType: "electric"
          },
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
    expect(profile.item.viewer.canViewContent).toBe(true);
    expect(content.items).toHaveLength(6);
  });

  it("parses admin analytics overview payload", () => {
    const now = new Date().toISOString();
    const point30 = Array.from({ length: 30 }, (_, index) => ({
      periodStart: now,
      value: index
    }));
    const point12 = Array.from({ length: 12 }, (_, index) => ({
      periodStart: now,
      value: index
    }));
    const point5 = Array.from({ length: 5 }, (_, index) => ({
      periodStart: now,
      value: index
    }));

    const payload = adminAnalyticsOverviewResponseSchema.parse({
      item: {
        totals: {
          users: 42,
          moments: 11,
          articles: 8,
          aircraft: 6,
          rankings: 5,
          pendingTotal: 10,
          pendingPosts: 1,
          pendingComments: 3,
          pendingReviews: 2,
          pendingSubmissions: 4
        },
        registration: {
          total: 42,
          today: 2,
          month: 12,
          year: 42,
          daily: point30,
          monthly: point12,
          yearly: point5
        },
        activity: {
          activeUsers: 19,
          dau: 6,
          mau: 18,
          yau: 19,
          daily: point30,
          monthly: point12,
          yearly: point5
        },
        contentMix: {
          moments: 11,
          articles: 8,
          aircraft: 6,
          rankings: 5
        },
        content: {
          moments: 11,
          articles: 8,
          aircraftPublishedModels: 6,
          aircraftPendingSubmissions: 4,
          rankings: 5
        },
        moderation: {
          posts: { queueEntered: 16, pending: 1, approved: 12, rejected: 2, hidden: 1 },
          comments: { queueEntered: 25, pending: 3, approved: 20, rejected: 0, hidden: 2 },
          reviews: { queueEntered: 12, pending: 2, approved: 9, rejected: 0, hidden: 1 },
          submissions: { queueEntered: 10, pending: 4, approved: 5, rejected: 1, hidden: 0 }
        },
        funnel: {
          posts: { queueEntered: 16, pending: 1, approved: 12, rejectedOrHidden: 3 },
          comments: { queueEntered: 25, pending: 3, approved: 20, rejectedOrHidden: 2 },
          reviews: { queueEntered: 12, pending: 2, approved: 9, rejectedOrHidden: 1 },
          submissions: { queueEntered: 10, pending: 4, approved: 5, rejectedOrHidden: 1 }
        },
        series: {
          registrationDaily: point30,
          registrationMonthly: point12,
          registrationYearly: point5,
          activityDaily: point30,
          activityMonthly: point12,
          activityYearly: point5
        }
      }
    });

    expect(payload.item.registration.daily).toHaveLength(30);
    expect(payload.item.activity.monthly).toHaveLength(12);
    expect(payload.item.activity.yearly).toHaveLength(5);
  });
});
