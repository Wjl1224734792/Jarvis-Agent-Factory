import { describe, expect, it } from "vitest";
import { buildAdminOverviewData } from "../src/features/auth/admin-overview-helpers";

describe("buildAdminOverviewData", () => {
  it("builds dashboard metrics, queue rows and moderation state", () => {
    const result = buildAdminOverviewData({
      posts: [
        {
          id: "post_1",
          type: "article",
          title: "Official update",
          contentPreview: "preview",
          contentHtml: null,
          status: "published",
          commentCount: 2,
          reportCount: 0,
          createdAt: "2026-03-28T08:00:00.000Z",
          updatedAt: "2026-03-28T08:00:00.000Z",
          publishedAt: "2026-03-28T08:00:00.000Z",
          author: { id: "admin_1", displayName: "Admin", avatarUrl: null, role: "admin" },
          images: [],
          videos: [],
          contentCategory: { id: "cat_1", slug: "ops", name: "运营", sortOrder: 0, isEnabled: true },
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
          }
        },
        {
          id: "post_2",
          type: "article",
          title: "Pending user post",
          contentPreview: "preview",
          contentHtml: null,
          status: "pending",
          commentCount: 0,
          reportCount: 1,
          createdAt: "2026-03-27T08:00:00.000Z",
          updatedAt: "2026-03-27T08:00:00.000Z",
          publishedAt: null,
          author: { id: "user_1", displayName: "User", avatarUrl: null, role: "user" },
          images: [],
          videos: [],
          contentCategory: { id: "cat_1", slug: "ops", name: "运营", sortOrder: 0, isEnabled: true },
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
          }
        }
      ],
      comments: [
        {
          id: "comment_1",
          postId: "post_2",
          postTitle: "Pending user post",
          parentCommentId: null,
          replyToCommentId: null,
          content: "comment",
          status: "pending",
          createdAt: "2026-03-28T08:00:00.000Z",
          updatedAt: "2026-03-28T08:00:00.000Z",
          author: { id: "user_2", displayName: "Commenter", avatarUrl: null, role: "user" },
          replyToUser: null
        }
      ],
      reviews: [
        {
          id: "review_1",
          content: "review",
          status: "pending",
          createdAt: "2026-03-28T08:00:00.000Z",
          updatedAt: "2026-03-28T08:00:00.000Z",
          author: { id: "user_3", displayName: "Reviewer", avatarUrl: null, role: "user" },
          model: { id: "model_1", name: "Model", slug: "model", brand: { id: "brand_1", name: "Brand", slug: "brand", categoryId: null, sortOrder: 0, isEnabled: true } }
        }
      ],
      models: [
        {
          id: "model_1",
          slug: "model",
          name: "Model",
          category: { id: "air_cat_1", slug: "drone", name: "Drone", sortOrder: 0, isEnabled: true },
          brand: { id: "brand_1", slug: "brand", name: "Brand", categoryId: null, sortOrder: 0, isEnabled: true },
          powerType: "electric",
          summary: null,
          description: null,
          isPublished: true,
          reviewSummary: { totalReviews: 0, averageRating: 0, favoriteCount: 0, interactionCount: 0 },
          specifications: { maxFlightTimeMinutes: null, maxRangeKilometers: null, maxSpeedKph: null, takeoffWeightGrams: null },
          viewer: { hasFavorited: false, hasLiked: false, hasReviewed: false }
        }
      ],
      categories: [{ id: "air_cat_1", slug: "drone", name: "Drone", sortOrder: 0, isEnabled: true }],
      brands: [{ id: "brand_1", slug: "brand", name: "Brand", categoryId: null, sortOrder: 0, isEnabled: true }],
      officialArticles: [
        {
          id: "post_1",
          type: "article",
          title: "Official update",
          contentPreview: "preview",
          contentHtml: null,
          status: "published",
          commentCount: 2,
          reportCount: 0,
          createdAt: "2026-03-28T08:00:00.000Z",
          updatedAt: "2026-03-28T08:00:00.000Z",
          publishedAt: "2026-03-28T08:00:00.000Z",
          author: { id: "admin_1", displayName: "Admin", avatarUrl: null, role: "admin" },
          images: [],
          videos: [],
          contentCategory: { id: "cat_1", slug: "ops", name: "运营", sortOrder: 0, isEnabled: true },
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
          }
        }
      ],
      submissions: [
        {
          id: "submission_1",
          status: "submitted",
          category: { id: "air_cat_1", slug: "drone", name: "Drone" },
          brand: null,
          proposedBrandName: "SkyMaker",
          modelName: "Sky One",
          powerType: "electric",
          summary: null,
          description: null,
          coverImageUrl: null,
          galleryImageUrls: [],
          videoAsset: null,
          approvedModelId: null,
          approvedModelSlug: null,
          author: { id: "user_4", displayName: "Submitter", avatarUrl: null, role: "user" },
          parameters: {
            maxFlightTimeMinutes: null,
            maxRangeKilometers: null,
            maxSpeedKph: null,
            takeoffWeightGrams: null
          },
          createdAt: "2026-03-28T08:00:00.000Z",
          updatedAt: "2026-03-28T08:00:00.000Z"
        }
      ],
      siteSettings: {
        postModerationEnabled: false,
        commentModerationEnabled: true,
        reviewModerationEnabled: false,
        submissionModerationEnabled: true
      }
    });

    expect(result.metrics[0]?.value).toBe(2);
    expect(result.metrics[1]?.value).toBe(1);
    expect(result.queueRows.find((item) => item.key === "posts")?.value).toBe(1);
    expect(result.queueRows.find((item) => item.key === "comments")?.value).toBe(1);
    expect(result.queueRows.find((item) => item.key === "reviews")?.value).toBe(1);
    expect(result.queueRows.find((item) => item.key === "submissions")?.value).toBe(1);
    expect(result.quickActions).toHaveLength(4);
    expect(result.moderationCards).toHaveLength(4);
    expect(result.moderationCards.find((item) => item.key === "posts")?.enabled).toBe(false);
    expect(result.moderationCards.find((item) => item.key === "comments")?.enabled).toBe(true);
    expect(result.moderationCards.find((item) => item.key === "reviews")?.enabled).toBe(false);
  });
});
