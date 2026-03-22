export const APP_NAME = "飞加网";

export const APP_PORTS = {
  web: 3000,
  admin: 3001,
  server: 3002
} as const;

export const DEFAULT_PORTS = APP_PORTS;

export const APP_ROUTES = {
  home: "/",
  health: "/health",
  models: "/models",
  modelDetail: "/models/:slug",
  webLogin: "/login",
  webProfile: "/me",
  adminLogin: "/admin/login",
  adminHome: "/admin",
  adminCategories: "/admin/categories",
  adminBrands: "/admin/brands",
  adminModels: "/admin/models"
} as const;

export const API_ROUTES = {
  health: "/health",
  auth: {
    captchaChallenge: "/auth/captcha/challenge",
    smsRequest: "/auth/sms/request",
    webLogin: "/auth/web/login",
    logout: "/auth/logout",
    currentUser: "/auth/me",
    protectedPing: "/auth/protected/ping",
    adminLogin: "/auth/admin/login",
    adminLogout: "/auth/admin/logout",
    adminCurrentUser: "/auth/admin/me",
    adminProtectedPing: "/auth/admin/protected/ping"
  },
  models: {
    list: "/models",
    detail: (slug: string) => `/models/${slug}`,
    categories: "/admin/categories",
    brands: "/admin/brands",
    adminList: "/admin/models",
    adminDetail: (id: string) => `/admin/models/${id}`,
    adminCategoryDetail: (id: string) => `/admin/categories/${id}`,
    adminBrandDetail: (id: string) => `/admin/brands/${id}`
  }
} as const;

export function formatLastUpdated(timestamp: string | null): string {
  if (!timestamp) {
    return "等待首次同步";
  }

  return new Date(timestamp).toLocaleString("zh-CN", {
    hour12: false
  });
}
