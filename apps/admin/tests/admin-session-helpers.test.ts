import { describe, expect, it } from "vitest";
import {
  formatAdminSessionIdentity,
  formatAdminSessionScope,
  formatAdminSessionStatus,
  formatAdminSessionTime,
  resolveAdminOverviewAuthError,
  resolveRecentSessionsPanelMessage
} from "../src/features/auth/admin-session-helpers";

describe("admin session helpers", () => {
  it("formats session scope and status labels", () => {
    expect(formatAdminSessionScope("web")).toBe("Web");
    expect(formatAdminSessionScope("app")).toBe("App");
    expect(formatAdminSessionStatus("active")).toBe("活跃");
    expect(formatAdminSessionStatus("revoked")).toBe("已退出");
  });

  it("formats user identity and time strings", () => {
    expect(
      formatAdminSessionIdentity({
        id: "sess_1",
        scope: "web",
        clientIp: "127.0.0.1",
        userAgent: "Browser",
        deviceLabel: "MacBook Pro",
        createdAt: "2026-03-29T02:00:00.000Z",
        lastSeenAt: "2026-03-29T02:30:00.000Z",
        revokedAt: null,
        expiresAt: "2026-04-05T02:00:00.000Z",
        status: "active",
        user: {
          id: "user_1",
          displayName: "飞友A",
          role: "user",
          phone: "13800138000"
        }
      })
    ).toContain("13800138000");

    expect(formatAdminSessionTime(null)).toBe("未记录");
    expect(formatAdminSessionTime("2026-03-29T02:00:00.000Z")).toContain("2026");
  });

  it("suppresses stale auth error when admin user is already loaded", () => {
    expect(
      resolveAdminOverviewAuthError({
        userDisplayName: "系统管理员",
        authError: "管理员权限不足"
      })
    ).toBeNull();
    expect(
      resolveAdminOverviewAuthError({
        userDisplayName: null,
        authError: "管理员权限不足"
      })
    ).toBe("管理员权限不足");
  });

  it("maps recent session errors to safe panel copy", () => {
    expect(resolveRecentSessionsPanelMessage(new Error("403 Forbidden"))).toContain("暂时不可用");
    expect(resolveRecentSessionsPanelMessage(new Error("network timeout"))).toContain("加载失败");
  });
});
