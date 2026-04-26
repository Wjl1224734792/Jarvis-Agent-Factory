import { describe, expect, it } from "vitest";
import {
  buildAdminUsersQueryKey,
  canUpdateAdminUserStatus,
  formatAdminUserPhone,
  getAdminUserStatusMeta,
  normalizeAdminUserRoleFilter,
  normalizeAdminUserStatusFilter,
  sortAdminUsersWithTargetFirst
} from "../src/features/users/admin-users-page-helpers";

const user = {
  id: "user_1",
  role: "user" as const,
  status: "active" as const
};

describe("admin users page helpers", () => {
  it("normalizes filters and builds stable query keys", () => {
    expect(normalizeAdminUserStatusFilter("banned")).toBe("banned");
    expect(normalizeAdminUserStatusFilter("whatever")).toBe("all");
    expect(normalizeAdminUserRoleFilter("admin")).toBe("admin");
    expect(normalizeAdminUserRoleFilter(null)).toBe("all");
    expect(
      buildAdminUsersQueryKey({
        keyword: "Pilot",
        status: "active",
        role: "user",
        page: 1,
        pageSize: 20
      })
    ).toEqual(["admin-users", "Pilot", "active", "user", 1, 20]);
  });

  it("formats phone and exposes status labels", () => {
    expect(formatAdminUserPhone("13800138000")).toBe("138****8000");
    expect(formatAdminUserPhone(null)).toBe("未绑定");
    expect(getAdminUserStatusMeta("active").label).toBe("正常");
    expect(getAdminUserStatusMeta("banned").label).toBe("已封禁");
  });

  it("prevents changing current admins or admin accounts", () => {
    expect(canUpdateAdminUserStatus("user_1", user)).toBe(false);
    expect(canUpdateAdminUserStatus("admin_1", { ...user, role: "admin" })).toBe(false);
    expect(canUpdateAdminUserStatus("admin_1", user)).toBe(true);
  });

  it("keeps target users at the top of the list", () => {
    const sorted = sortAdminUsersWithTargetFirst(
      [
        { id: "user_1" },
        { id: "user_2" }
      ],
      "user_2"
    );

    expect(sorted.map((item) => item.id)).toEqual(["user_2", "user_1"]);
  });
});
