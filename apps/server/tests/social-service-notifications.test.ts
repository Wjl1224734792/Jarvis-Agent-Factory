import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = {
  countAdminInboxUnreadNotifications: vi.fn(),
  listAdminInboxNotifications: vi.fn(),
  listNotifications: vi.fn(),
  listUsersByIds: vi.fn()
};

vi.mock("../src/modules/social/social.repo", () => ({
  socialRepo: repo
}));

vi.mock("../src/modules/uploads/uploads.helpers", () => ({
  resolvePublicUploadedFileUrl: vi.fn(async () => null),
  resolveUploadedFileUrl: vi.fn(async () => null)
}));

describe("social service notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.countAdminInboxUnreadNotifications.mockResolvedValue(0);
    repo.listAdminInboxNotifications.mockResolvedValue([]);
    repo.listUsersByIds.mockResolvedValue([]);
  });

  it("keeps legacy system notifications visible and normalizes stale hrefs", async () => {
    const { socialService } = await import("../src/modules/social/social.service");
    repo.listNotifications.mockResolvedValue([
      {
        id: "notice_brand_status",
        userId: "user_1",
        actorId: null,
        category: "system",
        type: "brand_application_status_changed",
        targetType: "brand_application",
        targetId: "brand_application_1",
        targetTitle: "品牌申请",
        targetStatus: "approved",
        title: "品牌申请状态更新",
        summary: "品牌申请状态已更新",
        preview: null,
        metadata: JSON.stringify({
          href: "/brand-applications/brand_application_1"
        }),
        postId: null,
        commentId: null,
        isRead: false,
        createdAt: new Date("2026-04-27T00:00:00.000Z")
      },
      {
        id: "notice_rating_target",
        userId: "user_1",
        actorId: null,
        category: "system",
        type: "rating_target_status_changed",
        targetType: "rating_target",
        targetId: "rating_target_1",
        targetTitle: "评分对象",
        targetStatus: "published",
        title: "评分对象状态更新",
        summary: "评分对象状态已更新",
        preview: null,
        metadata: JSON.stringify({
          href: "/rankings/items/rating_target_1"
        }),
        postId: null,
        commentId: null,
        isRead: false,
        createdAt: new Date("2026-04-27T00:01:00.000Z")
      }
    ]);

    const payload = await socialService.listNotifications("user_1");

    expect(payload.unreadByCategory.system).toBe(2);
    expect(payload.items.map((item) => item.type)).toEqual([
      "brand_application_status_changed",
      "rating_target_status_changed"
    ]);
    expect(payload.items[0]?.target.href).toBe("/publish/brand?submitted=brand_application_1");
    expect(payload.items[1]?.target.href).toBe("/rating-targets/rating_target_1");
  });

  it("keeps legacy admin inbox status messages visible under their moderation domains", async () => {
    const { socialService } = await import("../src/modules/social/social.service");
    repo.countAdminInboxUnreadNotifications.mockResolvedValue(1);
    repo.listAdminInboxNotifications.mockResolvedValue([
      {
        id: "notice_brand_status_admin",
        userId: "admin_1",
        actorId: null,
        category: "system",
        type: "brand_application_status_changed",
        targetType: "brand_application",
        targetId: "brand_application_1",
        targetTitle: "品牌申请",
        targetStatus: "approved",
        title: "品牌申请状态更新",
        summary: "品牌申请状态已更新",
        preview: null,
        metadata: JSON.stringify({
          adminInbox: true,
          href: "/brand-applications/brand_application_1"
        }),
        postId: null,
        commentId: null,
        isRead: false,
        createdAt: new Date("2026-04-27T00:00:00.000Z")
      }
    ]);

    const payload = await socialService.listAdminMessages("admin_1", {
      domain: "brand_applications"
    });

    expect(repo.listAdminInboxNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        types: expect.arrayContaining([
          "brand_application_audit_result",
          "brand_application_status_changed"
        ])
      })
    );
    expect(payload.unreadCount).toBe(1);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({
      type: "brand_application_status_changed",
      domain: "brand_applications",
      target: {
        href: "/publish/brand?submitted=brand_application_1"
      },
      navigation: {
        href: "/admin/brand-applications"
      }
    });
  });
});
