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
  const maskedPhone = item.user.phone
    ? `${item.user.phone.slice(0, 3)}****${item.user.phone.slice(-4)}`
    : null;
  const phoneSuffix = maskedPhone ? ` · ${maskedPhone}` : "";
  return `${item.user.displayName}${phoneSuffix}`;
}

export function formatAdminSessionTime(value: string | null) {
  if (!value) {
    return "未记录";
  }

  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

export function resolveAdminOverviewAuthError(input: {
  userDisplayName?: string | null;
  authError?: string | null;
}) {
  if (input.userDisplayName) {
    return null;
  }

  return input.authError ?? null;
}

export function resolveRecentSessionsPanelMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "最近登录设备暂时不可用。";
  }

  return /403|forbidden|权限/i.test(error.message)
    ? "最近登录设备面板暂时不可用，请稍后再试。"
    : "最近登录设备数据加载失败。";
}
