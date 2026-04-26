import type { AdminUserListItem, AdminUserListQuery, UserStatus } from "@feijia/schemas";

type AdminUserStatusFilter = AdminUserListQuery["status"];
type AdminUserRoleFilter = AdminUserListQuery["role"];

const adminUserStatusFilters = new Set<AdminUserStatusFilter>(["all", "active", "banned"]);
const adminUserRoleFilters = new Set<AdminUserRoleFilter>(["all", "user", "admin"]);

export function normalizeAdminUserStatusFilter(value: unknown): AdminUserStatusFilter {
  return typeof value === "string" && adminUserStatusFilters.has(value as AdminUserStatusFilter)
    ? (value as AdminUserStatusFilter)
    : "all";
}

export function normalizeAdminUserRoleFilter(value: unknown): AdminUserRoleFilter {
  return typeof value === "string" && adminUserRoleFilters.has(value as AdminUserRoleFilter)
    ? (value as AdminUserRoleFilter)
    : "all";
}

export function buildAdminUsersQueryKey(input: AdminUserListQuery) {
  return [
    "admin-users",
    input.keyword ?? "",
    input.status,
    input.role,
    input.page,
    input.pageSize
  ] as const;
}

export function getAdminUserStatusMeta(status: UserStatus) {
  if (status === "banned") {
    return {
      label: "已封禁",
      color: "error" as const
    };
  }

  return {
    label: "正常",
    color: "success" as const
  };
}

export function formatAdminUserPhone(phone: string | null | undefined) {
  if (!phone) {
    return "未绑定";
  }

  if (phone.length < 8) {
    return phone;
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function canUpdateAdminUserStatus(
  currentUserId: string | null | undefined,
  user: Pick<AdminUserListItem, "id" | "role">
) {
  return user.role !== "admin" && user.id !== currentUserId;
}

export function sortAdminUsersWithTargetFirst<T extends { id: string }>(
  items: T[],
  targetUserId: string | null | undefined
) {
  if (!targetUserId) {
    return items;
  }

  return [...items].sort((left, right) => {
    if (left.id === targetUserId) {
      return -1;
    }
    if (right.id === targetUserId) {
      return 1;
    }
    return 0;
  });
}
