import { describe, expect, it } from "vitest";
import {
  adminMessageListQuerySchema,
  adminMessageListResponseSchema,
  adminModerationTodosResponseSchema,
  adminAnalyticsOverviewResponseSchema,
  notificationsResponseSchema,
  userContentResponseSchema,
  userProfileResponseSchema
} from "../src/social";

describe("social contract", () => {
  it("parses the notifications response", () => {
    const payload = notificationsResponseSchema.parse({
      unreadCount: 1,
      unreadByCategory: {
        likesAndFavorites: 1,
        newFollowers: 0,
        commentsAndMentions: 0,
        system: 0
      },
      items: [
        {
          id: "notice_1",
          category: "likes_and_favorites",
          type: "post_liked",
          isRead: false,
          createdAt: new Date().toISOString(),
          title: "帖子收到新点赞",
          summary: "Sky Rider 点赞了你的《Harbor session》",
          target: {
            type: "post",
            id: "post_1",
            title: "Harbor session",
            status: "published",
            href: "/posts/post_1"
          },
          actor: {
            id: "user_1",
            displayName: "Sky Rider",
            role: "user"
          },
          preview: {
            text: "Nice post",
            imageUrl: null
          },
          metadata: {
            trigger: "post_like",
            source: "social"
          }
        }
      ]
    });

    expect(payload.unreadCount).toBe(1);
    expect(payload.unreadByCategory.likesAndFavorites).toBe(1);
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
          pendingSubmissions: 4,
          pendingRankings: 2,
          pendingBrandApplications: 1,
          pendingRatingTargets: 3
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
          submissions: { queueEntered: 10, pending: 4, approved: 5, rejected: 1, hidden: 0 },
          rankings: { queueEntered: 8, pending: 2, approved: 4, rejected: 1, hidden: 1 },
          brandApplications: { queueEntered: 6, pending: 1, approved: 3, rejected: 1, hidden: 1 },
          ratingTargets: { queueEntered: 7, pending: 3, approved: 2, rejected: 1, hidden: 1 }
        },
        funnel: {
          posts: { queueEntered: 16, pending: 1, approved: 12, rejectedOrHidden: 3 },
          comments: { queueEntered: 25, pending: 3, approved: 20, rejectedOrHidden: 2 },
          reviews: { queueEntered: 12, pending: 2, approved: 9, rejectedOrHidden: 1 },
          submissions: { queueEntered: 10, pending: 4, approved: 5, rejectedOrHidden: 1 },
          rankings: { queueEntered: 8, pending: 2, approved: 4, rejectedOrHidden: 2 },
          brandApplications: { queueEntered: 6, pending: 1, approved: 3, rejectedOrHidden: 2 },
          ratingTargets: { queueEntered: 7, pending: 3, approved: 2, rejectedOrHidden: 2 }
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

  it("parses admin message center contracts", () => {
    const query = adminMessageListQuerySchema.parse({
      domain: "posts",
      type: "post_audit_result",
      readStatus: "unread",
      limit: "20"
    });
    const messages = adminMessageListResponseSchema.parse({
      unreadCount: 2,
      items: [
        {
          id: "notice_1",
          category: "system",
          type: "post_audit_result",
          domain: "posts",
          isRead: false,
          createdAt: new Date().toISOString(),
          title: "内容审核未通过",
          summary: "动态《测试动态》当前状态：未通过审核",
          target: {
            type: "post",
            id: "post_1",
            title: "测试动态",
            status: "rejected",
            href: "/posts/post_1"
          },
          actor: null,
          preview: null,
          metadata: {
            fromStatus: "pending",
            toStatus: "rejected"
          },
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
    });
    const todos = adminModerationTodosResponseSchema.parse({
      pendingCount: 7,
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
    });

    expect(query.limit).toBe(20);
    expect(messages.items[0]?.domain).toBe("posts");
    expect(todos.items[0]?.domain).toBe("post_comments");
  });

  it("rejects incompatible admin message query domain/type combinations", () => {
    const result = adminMessageListQuerySchema.safeParse({
      domain: "reviews",
      type: "post_audit_result"
    });

    expect(result.success).toBe(false);
  });
});
