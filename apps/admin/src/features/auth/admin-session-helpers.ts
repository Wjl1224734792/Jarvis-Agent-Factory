import type { AdminAuthSessionItem } from "../../lib/api-client";

const sessionScopeLabels: Record<AdminAuthSessionItem["scope"], string> = {
  web: "Web",
  admin: "Admin",
  app: "App"
};

const sessionStatusLabels: Record<AdminAuthSessionItem["status"], string> = {
  active: "活跃",
  revoked: "已退出",
  expired: "已过期"
};

export function formatAdminSessionScope(scope: AdminAuthSessionItem["scope"]) {
  return sessionScopeLabels[scope] ?? scope;
}

export function formatAdminSessionStatus(status: AdminAuthSessionItem["status"]) {
  return sessionStatusLabels[status] ?? status;
}

export function formatAdminSessionIdentity(item: AdminAuthSessionItem) {
  const phoneSuffix = item.user.phone ? ` · ${item.user.phone}` : "";
  return `${item.user.displayName}${phoneSuffix}`;
}

export function formatAdminSessionTime(value: string | null) {
  if (!value) {
    return "未记录";
  }

  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}
