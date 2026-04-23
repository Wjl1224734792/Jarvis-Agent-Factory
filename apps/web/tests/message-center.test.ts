import { APP_ROUTES } from "@feijia/shared";
import { describe, expect, it } from "vitest";
import {
  adaptMessageCenterPayload,
  formatMessageCenterContractWarning,
  hasMessageCenterContractMismatch,
  normalizeMessageCenterCategory
} from "../src/features/notifications/message-center";

describe("message-center", () => {
  it("normalizes shared categories into four top-level buckets", () => {
    expect(normalizeMessageCenterCategory("likes_and_favorites")).toBe("engagement");
    expect(normalizeMessageCenterCategory("new_followers")).toBe("follow");
    expect(normalizeMessageCenterCategory("comments_and_mentions")).toBe("comment");
    expect(normalizeMessageCenterCategory("system")).toBe("system");
  });

  it("adapts shared message cards into page-friendly items and stats", () => {
    const payload = adaptMessageCenterPayload({
      unreadCount: 2,
      unreadByCategory: {
        likesAndFavorites: 1,
        newFollowers: 1,
        commentsAndMentions: 0,
        system: 0
      },
      items: [
        {
          id: "n-follow",
          category: "new_followers",
          type: "followed",
          isRead: false,
          createdAt: "2026-04-18T10:00:00.000Z",
          title: "新增关注",
          summary: "新飞友关注了你",
          actor: {
            id: "user-follow",
            displayName: "新飞友",
            avatarUrl: null
          },
          target: {
            type: "user",
            id: "user-follow",
            title: "新飞友",
            status: null,
            href: null
          },
          preview: null
        },
        {
          id: "n-like",
          category: "likes_and_favorites",
          type: "post_liked",
          isRead: false,
          createdAt: "2026-04-18T09:00:00.000Z",
          title: "收到新的点赞",
          summary: "有人点赞了你的内容",
          actor: {
            id: "user-like",
            displayName: "点赞的人",
            avatarUrl: null
          },
          target: {
            type: "post",
            id: "post-1",
            title: "首飞日记",
            status: "published",
            href: null
          },
          preview: {
            text: "Nice post",
            imageUrl: null
          }
        }
      ]
    });

    expect(payload.stats.total).toBe(2);
    expect(payload.stats.unread).toBe(2);
    expect(payload.stats.byCategory).toEqual({
      engagement: 1,
      follow: 1,
      comment: 0,
      system: 0
    });
    expect(payload.items[0]?.target.href).toBe(APP_ROUTES.webUserProfile.replace(":id", "user-follow"));
    expect(payload.items[1]?.target.href).toBe(APP_ROUTES.postDetail.replace(":id", "post-1"));
    expect(payload.items[1]?.target.openInNewTab).toBe(true);
  });

  it("flags payloads that miss shared category fields", () => {
    const payload = adaptMessageCenterPayload({
      unreadCount: 1,
      items: [
        {
          id: "legacy-1",
          type: "post_liked",
          isRead: false,
          createdAt: "2026-04-18T09:00:00.000Z",
          title: "旧通知",
          summary: "缺少 category"
        }
      ]
    });

    expect(payload.items).toEqual([]);
    expect(payload.contract.missingCategoryCount).toBe(1);
    expect(hasMessageCenterContractMismatch(payload)).toBe(true);
  });

  it("describes both missing-category and invalid-item contract drift", () => {
    expect(
      formatMessageCenterContractWarning({
        invalidItemCount: 2,
        missingCategoryCount: 1,
        totalReceived: 5
      })
    ).toContain("1");
    expect(
      formatMessageCenterContractWarning({
        invalidItemCount: 2,
        missingCategoryCount: 1,
        totalReceived: 5
      })
    ).toContain("2");
  });

  it("keeps explicit system-message targets", () => {
    const payload = adaptMessageCenterPayload({
      unreadCount: 1,
      unreadByCategory: {
        likesAndFavorites: 0,
        newFollowers: 0,
        commentsAndMentions: 0,
        system: 1
      },
      items: [
        {
          id: "n-system",
          category: "system",
          type: "post_status_changed",
          isRead: false,
          createdAt: "2026-04-18T11:00:00.000Z",
          title: "文章审核通过",
          summary: "你的文章《首飞报告》已通过审核。",
          actor: null,
          target: {
            type: "status",
            id: "post-9",
            title: "首飞报告",
            status: "published",
            href: "/publish/status/article/post-9"
          },
          preview: null
        }
      ]
    });

    expect(payload.items[0]?.category).toBe("system");
    expect(payload.items[0]?.target).toEqual({
      href: "/publish/status/article/post-9",
      label: "查看详情",
      openInNewTab: false
    });
    expect(payload.stats.byCategory.system).toBe(1);
  });
});
