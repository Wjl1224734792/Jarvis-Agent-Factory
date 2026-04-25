export const APP_NAME = "飞加";
export {
  buildLoginRedirectUrl,
  buildRedirectTarget,
  resolveSafeRedirectPath
} from "./redirects";
export {
  normalizeRichTextLinkHref,
  normalizeRichTextMediaUrl,
  normalizeRichTextVideoSource
} from "./rich-text";

/** 本地开发默认端口（避开 3000/3001/3002 等常见占用） */
export const APP_PORTS = {
  web: 17_380,
  admin: 17_381,
  server: 17_382
} as const;

export const DEFAULT_PORTS = APP_PORTS;

export const APP_ROUTES = {
  home: "/",
  feedHome: "/home",
  flightCircle: "/circle",
  health: "/health",
  models: "/models",
  modelDetail: "/models/:slug",
  rankings: "/rankings",
  rankingEditor: "/rankings/create",
  rankingDetail: "/rankings/:id",
  ratingTargetDetail: "/rating-targets/:id",
  postDetail: "/posts/:id",
  search: "/search",
  compose: "/compose",
  publishArticle: "/publish/article",
  publishMoment: "/publish/moment",
  publishAircraft: "/publish/aircraft",
  publishBrand: "/publish/brand",
  notifications: "/notifications",
  webLogin: "/login",
  webProfile: "/me",
  webUserProfile: "/users/:id",
  webSettings: "/settings",
  adminLogin: "/admin/login",
  adminHome: "/admin",
  adminSearch: "/admin/search",
  adminOverview: "/admin/overview",
  adminModeration: "/admin/moderation",
  adminOperations: "/admin/operations",
  adminManagement: "/admin/management",
  adminCategories: "/admin/categories",
  adminBrands: "/admin/brands",
  adminBrandApplications: "/admin/brand-applications",
  adminModels: "/admin/models",
  adminReviews: "/admin/reviews",
  adminPosts: "/admin/posts",
  adminPostComments: "/admin/post-comments",
  adminContentCategories: "/admin/content-categories",
  adminAircraftSubmissions: "/admin/aircraft-submissions",
  adminRankings: "/admin/rankings",
  adminMessages: "/admin/messages",
  adminReviewComments: "/admin/review-comments",
  adminModelComments: "/admin/model-comments",
  adminRankingComments: "/admin/ranking-comments",
  adminRatingTargetComments: "/admin/rating-target-comments"
} as const;

export const API_BASE_PREFIX = "/api" as const;
export const API_VERSION = "v1" as const;
export const API_V1_PREFIX = `${API_BASE_PREFIX}/${API_VERSION}` as const;

/**
 * Prefix externally consumed API routes with the current stable namespace.
 * Health checks stay root-level so probes do not need version-aware config.
 */
export function withApiV1Prefix(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_V1_PREFIX}${normalizedPath}`;
}

export const API_ROUTES = {
  health: "/health",
  search: {
    site: withApiV1Prefix("/search"),
    admin: withApiV1Prefix("/admin/search")
  },
  feed: withApiV1Prefix("/home/feed"),
  circleFeed: withApiV1Prefix("/circle/feed"),
  admin: {
    siteSettings: withApiV1Prefix("/admin/site-settings"),
    analyticsOverview: withApiV1Prefix("/admin/analytics/overview"),
    logsSummary: withApiV1Prefix("/admin/logs/summary"),
    logsRead: withApiV1Prefix("/admin/logs/read"),
    logsOverview: withApiV1Prefix("/admin/logs/overview"),
    logsFiles: withApiV1Prefix("/admin/logs/files"),
    logsEntries: withApiV1Prefix("/admin/logs/entries"),
    reports: withApiV1Prefix("/admin/reports"),
    reportDetail: (kind: string, id: string) => withApiV1Prefix(`/admin/reports/${kind}/${id}`),
    messages: withApiV1Prefix("/admin/messages"),
    messagesReadAll: withApiV1Prefix("/admin/messages/read-all"),
    messageRead: (id: string) => withApiV1Prefix(`/admin/messages/${id}/read`),
    messageTodos: withApiV1Prefix("/admin/messages/todos"),
    audits: withApiV1Prefix("/admin/audits"),
    auditManualReview: (id: string) => withApiV1Prefix(`/admin/audits/${id}/manual-review`)
  },
  auth: {
    captchaChallenge: withApiV1Prefix("/auth/captcha/challenge"),
    smsRequest: withApiV1Prefix("/auth/sms/request"),
    webLogin: withApiV1Prefix("/auth/web/login"),
    webRegisterComplete: withApiV1Prefix("/auth/web/register/complete"),
    webRefresh: withApiV1Prefix("/auth/web/refresh"),
    registrationDisplayNameSuggest: withApiV1Prefix("/auth/registration/display-name/suggest"),
    logout: withApiV1Prefix("/auth/logout"),
    currentUser: withApiV1Prefix("/auth/me"),
    protectedPing: withApiV1Prefix("/auth/protected/ping"),
    appLogin: withApiV1Prefix("/auth/app/login"),
    appRegisterComplete: withApiV1Prefix("/auth/app/register/complete"),
    appRefresh: withApiV1Prefix("/auth/app/refresh"),
    appCurrentUser: withApiV1Prefix("/auth/app/me"),
    appLogout: withApiV1Prefix("/auth/app/logout"),
    adminLogin: withApiV1Prefix("/auth/admin/login"),
    adminLogout: withApiV1Prefix("/auth/admin/logout"),
    adminChangePassword: withApiV1Prefix("/auth/admin/password/change"),
    adminCurrentUser: withApiV1Prefix("/auth/admin/me"),
    adminProtectedPing: withApiV1Prefix("/auth/admin/protected/ping"),
    adminSessions: withApiV1Prefix("/admin/auth/sessions"),
    deviceRegister: withApiV1Prefix("/auth/device/register"),
    deviceUnregister: withApiV1Prefix("/auth/device/unregister")
  },
  posts: {
    create: withApiV1Prefix("/posts"),
    detail: (id: string) => withApiV1Prefix(`/posts/${id}`),
    view: (id: string) => withApiV1Prefix(`/posts/${id}/view`),
    comments: (id: string) => withApiV1Prefix(`/posts/${id}/comments`),
    commentDetail: (postId: string, commentId: string) =>
      withApiV1Prefix(`/posts/${postId}/comments/${commentId}`),
    commentLike: (postId: string, commentId: string) =>
      withApiV1Prefix(`/posts/${postId}/comments/${commentId}/like`),
    commentReport: (postId: string, commentId: string) =>
      withApiV1Prefix(`/posts/${postId}/comments/${commentId}/report`),
    interaction: (id: string, type: string) => withApiV1Prefix(`/posts/${id}/interactions/${type}`),
    report: (id: string) => withApiV1Prefix(`/posts/${id}/report`),
    adminList: withApiV1Prefix("/admin/posts"),
    adminDetail: (id: string) => withApiV1Prefix(`/admin/posts/${id}`),
    adminOfficialDetail: (id: string) => withApiV1Prefix(`/admin/official-articles/${id}`),
    adminReports: (id: string) => withApiV1Prefix(`/admin/posts/${id}/reports`),
    adminComments: withApiV1Prefix("/admin/post-comments"),
    adminCommentDetail: (id: string) => withApiV1Prefix(`/admin/post-comments/${id}`),
    adminCommentReports: (id: string) => withApiV1Prefix(`/admin/post-comments/${id}/reports`)
  },
  content: {
    categories: withApiV1Prefix("/content-categories"),
    adminCategories: withApiV1Prefix("/admin/content-categories"),
    adminCategoryDetail: (id: string) => withApiV1Prefix(`/admin/content-categories/${id}`)
  },
  brandApplications: {
    create: withApiV1Prefix("/brand-applications"),
    detail: (id: string) => withApiV1Prefix(`/brand-applications/${id}`),
    update: (id: string) => withApiV1Prefix(`/brand-applications/${id}`),
    adminList: withApiV1Prefix("/admin/brand-applications"),
    adminDetail: (id: string) => withApiV1Prefix(`/admin/brand-applications/${id}`)
  },
  submissions: {
    create: withApiV1Prefix("/aircraft-submissions"),
    detail: (id: string) => withApiV1Prefix(`/aircraft-submissions/${id}`),
    adminList: withApiV1Prefix("/admin/aircraft-submissions"),
    adminDetail: (id: string) => withApiV1Prefix(`/admin/aircraft-submissions/${id}`)
  },
  uploads: {
    init: withApiV1Prefix("/uploads/init"),
    complete: withApiV1Prefix("/uploads/complete")
  },
  files: {
    url: (id: string) => withApiV1Prefix(`/files/${id}/url`)
  },
  users: {
    meProfile: withApiV1Prefix("/users/me/profile"),
    mePhoneChangeRequest: withApiV1Prefix("/users/me/phone/change/request"),
    mePhoneChangeConfirm: withApiV1Prefix("/users/me/phone/change/confirm"),
    profile: (userId: string) => withApiV1Prefix(`/users/${userId}/profile`),
    content: (userId: string) => withApiV1Prefix(`/users/${userId}/content`)
  },
  social: {
    follow: (userId: string) => withApiV1Prefix(`/users/${userId}/follow`),
    notifications: withApiV1Prefix("/notifications"),
    notificationsReadAll: withApiV1Prefix("/notifications/read-all"),
    notificationRead: (id: string) => withApiV1Prefix(`/notifications/${id}/read`)
  },
  audits: {
    qiniuCallback: withApiV1Prefix("/internal/audits/qiniu/callback")
  },
  rankings: {
    overview: withApiV1Prefix("/rankings"),
    create: withApiV1Prefix("/rankings"),
    update: (id: string) => withApiV1Prefix(`/rankings/${id}`),
    detail: (id: string) => withApiV1Prefix(`/rankings/${id}`),
    adminList: withApiV1Prefix("/admin/rankings"),
    adminDetail: (id: string) => withApiV1Prefix(`/admin/rankings/${id}`),
    adminStatus: (id: string) => withApiV1Prefix(`/admin/rankings/${id}/status`),
    adminReports: (id: string) => withApiV1Prefix(`/admin/rankings/${id}/reports`),
    adminRankingComments: withApiV1Prefix("/admin/ranking-comments"),
    adminRankingCommentDetail: (id: string) => withApiV1Prefix(`/admin/ranking-comments/${id}`),
    adminRankingCommentReports: (id: string) => withApiV1Prefix(`/admin/ranking-comments/${id}/reports`),
    adminRatingTargetComments: withApiV1Prefix("/admin/rating-target-comments"),
    adminRatingTargetCommentDetail: (id: string) =>
      withApiV1Prefix(`/admin/rating-target-comments/${id}`),
    adminRatingTargetCommentReports: (id: string) =>
      withApiV1Prefix(`/admin/rating-target-comments/${id}/reports`),
    items: (id: string) => withApiV1Prefix(`/rankings/${id}/items`),
    comments: (id: string) => withApiV1Prefix(`/rankings/${id}/comments`),
    commentDetail: (rankingId: string, commentId: string) =>
      withApiV1Prefix(`/rankings/${rankingId}/comments/${commentId}`),
    commentLike: (rankingId: string, commentId: string) =>
      withApiV1Prefix(`/rankings/${rankingId}/comments/${commentId}/like`),
    commentReport: (rankingId: string, commentId: string) =>
      withApiV1Prefix(`/rankings/${rankingId}/comments/${commentId}/report`),
    report: (id: string) => withApiV1Prefix(`/rankings/${id}/report`),
    itemDetail: (id: string) => withApiV1Prefix(`/rating-targets/${id}`),
    adminItemStatus: (id: string) => withApiV1Prefix(`/admin/rating-targets/${id}/status`),
    adminItems: withApiV1Prefix("/admin/rating-targets"),
    adminItemReports: (id: string) => withApiV1Prefix(`/admin/rating-targets/${id}/reports`),
    itemReport: (id: string) => withApiV1Prefix(`/rating-targets/${id}/report`),
    itemReview: (id: string) => withApiV1Prefix(`/rating-targets/${id}/review`),
    itemRatings: (id: string) => withApiV1Prefix(`/rating-targets/${id}/ratings`),
    itemComments: (id: string) => withApiV1Prefix(`/rating-targets/${id}/comments`),
    itemCommentDetail: (itemId: string, commentId: string) =>
      withApiV1Prefix(`/rating-targets/${itemId}/comments/${commentId}`),
    itemCommentLike: (itemId: string, commentId: string) =>
      withApiV1Prefix(`/rating-targets/${itemId}/comments/${commentId}/like`),
    itemCommentReport: (itemId: string, commentId: string) =>
      withApiV1Prefix(`/rating-targets/${itemId}/comments/${commentId}/report`)
  },
  models: {
    list: withApiV1Prefix("/models"),
    detail: (slug: string) => withApiV1Prefix(`/models/${slug}`),
    view: (slug: string) => withApiV1Prefix(`/models/${slug}/view`),
    comments: (slug: string) => withApiV1Prefix(`/models/${slug}/comments`),
    commentDetail: (slug: string, commentId: string) =>
      withApiV1Prefix(`/models/${slug}/comments/${commentId}`),
    commentLike: (slug: string, commentId: string) =>
      withApiV1Prefix(`/models/${slug}/comments/${commentId}/like`),
    commentReport: (slug: string, commentId: string) =>
      withApiV1Prefix(`/models/${slug}/comments/${commentId}/report`),
    interactions: (slug: string, type: string) => withApiV1Prefix(`/models/${slug}/interactions/${type}`),
    report: (slug: string) => withApiV1Prefix(`/models/${slug}/report`),
    reviews: (slug: string) => withApiV1Prefix(`/models/${slug}/reviews`),
    reviewDetail: (reviewId: string) => withApiV1Prefix(`/reviews/${reviewId}`),
    reviewLike: (reviewId: string) => withApiV1Prefix(`/reviews/${reviewId}/like`),
    reviewReport: (reviewId: string) => withApiV1Prefix(`/reviews/${reviewId}/report`),
    reviewComments: (reviewId: string) => withApiV1Prefix(`/reviews/${reviewId}/comments`),
    reviewCommentDetail: (reviewId: string, commentId: string) =>
      withApiV1Prefix(`/reviews/${reviewId}/comments/${commentId}`),
    reviewCommentLike: (reviewId: string, commentId: string) =>
      withApiV1Prefix(`/reviews/${reviewId}/comments/${commentId}/like`),
    reviewCommentReport: (reviewId: string, commentId: string) =>
      withApiV1Prefix(`/reviews/${reviewId}/comments/${commentId}/report`),
    categories: withApiV1Prefix("/admin/categories"),
    brands: withApiV1Prefix("/admin/brands"),
    adminList: withApiV1Prefix("/admin/models"),
    adminDetail: (id: string) => withApiV1Prefix(`/admin/models/${id}`),
    adminReports: (id: string) => withApiV1Prefix(`/admin/models/${id}/reports`),
    adminCategoryDetail: (id: string) => withApiV1Prefix(`/admin/categories/${id}`),
    adminBrandDetail: (id: string) => withApiV1Prefix(`/admin/brands/${id}`),
    adminReviews: withApiV1Prefix("/admin/reviews"),
    adminReviewDetail: (id: string) => withApiV1Prefix(`/admin/reviews/${id}`),
    adminReviewReports: (id: string) => withApiV1Prefix(`/admin/reviews/${id}/reports`),
    adminReviewComments: withApiV1Prefix("/admin/review-comments"),
    adminReviewCommentDetail: (id: string) => withApiV1Prefix(`/admin/review-comments/${id}`),
    adminComments: withApiV1Prefix("/admin/model-comments"),
    adminCommentDetail: (id: string) => withApiV1Prefix(`/admin/model-comments/${id}`),
    adminCommentReports: (id: string) => withApiV1Prefix(`/admin/model-comments/${id}/reports`),
    adminReviewCommentReports: (id: string) => withApiV1Prefix(`/admin/review-comments/${id}/reports`)
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
