export const APP_NAME = "飞加";
export {
  buildLoginRedirectUrl,
  buildRedirectTarget,
  resolveSafeRedirectPath
} from "./redirects";

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

export const API_ROUTES = {
  health: "/health",
  search: {
    site: "/search",
    admin: "/admin/search"
  },
  feed: "/home/feed",
  circleFeed: "/circle/feed",
  admin: {
    siteSettings: "/admin/site-settings",
    analyticsOverview: "/admin/analytics/overview",
    logsSummary: "/admin/logs/summary",
    logsRead: "/admin/logs/read",
    logsOverview: "/admin/logs/overview",
    logsFiles: "/admin/logs/files",
    logsEntries: "/admin/logs/entries",
    reports: "/admin/reports",
    reportDetail: (kind: string, id: string) => `/admin/reports/${kind}/${id}`,
    messages: "/admin/messages",
    messagesReadAll: "/admin/messages/read-all",
    messageRead: (id: string) => `/admin/messages/${id}/read`,
    messageTodos: "/admin/messages/todos"
  },
  auth: {
    captchaChallenge: "/auth/captcha/challenge",
    smsRequest: "/auth/sms/request",
    webLogin: "/auth/web/login",
    webRegisterComplete: "/auth/web/register/complete",
    webRefresh: "/auth/web/refresh",
    registrationDisplayNameSuggest: "/auth/registration/display-name/suggest",
    logout: "/auth/logout",
    currentUser: "/auth/me",
    protectedPing: "/auth/protected/ping",
    appLogin: "/auth/app/login",
    appRegisterComplete: "/auth/app/register/complete",
    appRefresh: "/auth/app/refresh",
    appCurrentUser: "/auth/app/me",
    appLogout: "/auth/app/logout",
    adminLogin: "/auth/admin/login",
    adminLogout: "/auth/admin/logout",
    adminChangePassword: "/auth/admin/password/change",
    adminCurrentUser: "/auth/admin/me",
    adminProtectedPing: "/auth/admin/protected/ping",
    adminSessions: "/admin/auth/sessions",
    deviceRegister: "/auth/device/register",
    deviceUnregister: "/auth/device/unregister"
  },
  posts: {
    create: "/posts",
    detail: (id: string) => `/posts/${id}`,
    view: (id: string) => `/posts/${id}/view`,
    comments: (id: string) => `/posts/${id}/comments`,
    commentDetail: (postId: string, commentId: string) => `/posts/${postId}/comments/${commentId}`,
    commentLike: (postId: string, commentId: string) =>
      `/posts/${postId}/comments/${commentId}/like`,
    commentReport: (postId: string, commentId: string) =>
      `/posts/${postId}/comments/${commentId}/report`,
    interaction: (id: string, type: string) => `/posts/${id}/interactions/${type}`,
    report: (id: string) => `/posts/${id}/report`,
    adminList: "/admin/posts",
    adminDetail: (id: string) => `/admin/posts/${id}`,
    adminOfficialDetail: (id: string) => `/admin/official-articles/${id}`,
    adminReports: (id: string) => `/admin/posts/${id}/reports`,
    adminComments: "/admin/post-comments",
    adminCommentDetail: (id: string) => `/admin/post-comments/${id}`,
    adminCommentReports: (id: string) => `/admin/post-comments/${id}/reports`
  },
  content: {
    categories: "/content-categories",
    adminCategories: "/admin/content-categories",
    adminCategoryDetail: (id: string) => `/admin/content-categories/${id}`
  },
  brandApplications: {
    create: "/brand-applications",
    detail: (id: string) => `/brand-applications/${id}`,
    update: (id: string) => `/brand-applications/${id}`,
    adminList: "/admin/brand-applications",
    adminDetail: (id: string) => `/admin/brand-applications/${id}`
  },
  submissions: {
    create: "/aircraft-submissions",
    detail: (id: string) => `/aircraft-submissions/${id}`,
    adminList: "/admin/aircraft-submissions",
    adminDetail: (id: string) => `/admin/aircraft-submissions/${id}`
  },
  uploads: {
    init: "/uploads/init",
    complete: "/uploads/complete"
  },
  files: {
    url: (id: string) => `/files/${id}/url`
  },
  users: {
    meProfile: "/users/me/profile",
    mePhoneChangeRequest: "/users/me/phone/change/request",
    mePhoneChangeConfirm: "/users/me/phone/change/confirm",
    profile: (userId: string) => `/users/${userId}/profile`,
    content: (userId: string) => `/users/${userId}/content`
  },
  social: {
    follow: (userId: string) => `/users/${userId}/follow`,
    notifications: "/notifications",
    notificationsReadAll: "/notifications/read-all",
    notificationRead: (id: string) => `/notifications/${id}/read`
  },
  rankings: {
    overview: "/rankings",
    create: "/rankings",
    update: (id: string) => `/rankings/${id}`,
    detail: (id: string) => `/rankings/${id}`,
    adminList: "/admin/rankings",
    adminDetail: (id: string) => `/admin/rankings/${id}`,
    adminStatus: (id: string) => `/admin/rankings/${id}/status`,
    adminReports: (id: string) => `/admin/rankings/${id}/reports`,
    adminRankingComments: "/admin/ranking-comments",
    adminRankingCommentDetail: (id: string) => `/admin/ranking-comments/${id}`,
    adminRankingCommentReports: (id: string) => `/admin/ranking-comments/${id}/reports`,
    adminRatingTargetComments: "/admin/rating-target-comments",
    adminRatingTargetCommentDetail: (id: string) => `/admin/rating-target-comments/${id}`,
    adminRatingTargetCommentReports: (id: string) => `/admin/rating-target-comments/${id}/reports`,
    items: (id: string) => `/rankings/${id}/items`,
    comments: (id: string) => `/rankings/${id}/comments`,
    commentDetail: (rankingId: string, commentId: string) => `/rankings/${rankingId}/comments/${commentId}`,
    commentLike: (rankingId: string, commentId: string) =>
      `/rankings/${rankingId}/comments/${commentId}/like`,
    commentReport: (rankingId: string, commentId: string) =>
      `/rankings/${rankingId}/comments/${commentId}/report`,
    report: (id: string) => `/rankings/${id}/report`,
    itemDetail: (id: string) => `/rating-targets/${id}`,
    adminItemStatus: (id: string) => `/admin/rating-targets/${id}/status`,
    adminItemReports: (id: string) => `/admin/rating-targets/${id}/reports`,
    itemReport: (id: string) => `/rating-targets/${id}/report`,
    itemReview: (id: string) => `/rating-targets/${id}/review`,
    itemRatings: (id: string) => `/rating-targets/${id}/ratings`,
    itemComments: (id: string) => `/rating-targets/${id}/comments`,
    itemCommentDetail: (itemId: string, commentId: string) =>
      `/rating-targets/${itemId}/comments/${commentId}`,
    itemCommentLike: (itemId: string, commentId: string) =>
      `/rating-targets/${itemId}/comments/${commentId}/like`,
    itemCommentReport: (itemId: string, commentId: string) =>
      `/rating-targets/${itemId}/comments/${commentId}/report`
  },
  models: {
    list: "/models",
    detail: (slug: string) => `/models/${slug}`,
    view: (slug: string) => `/models/${slug}/view`,
    comments: (slug: string) => `/models/${slug}/comments`,
    commentDetail: (slug: string, commentId: string) => `/models/${slug}/comments/${commentId}`,
    commentLike: (slug: string, commentId: string) =>
      `/models/${slug}/comments/${commentId}/like`,
    commentReport: (slug: string, commentId: string) =>
      `/models/${slug}/comments/${commentId}/report`,
    interactions: (slug: string, type: string) => `/models/${slug}/interactions/${type}`,
    report: (slug: string) => `/models/${slug}/report`,
    reviews: (slug: string) => `/models/${slug}/reviews`,
    reviewDetail: (reviewId: string) => `/reviews/${reviewId}`,
    reviewLike: (reviewId: string) => `/reviews/${reviewId}/like`,
    reviewReport: (reviewId: string) => `/reviews/${reviewId}/report`,
    reviewComments: (reviewId: string) => `/reviews/${reviewId}/comments`,
    reviewCommentDetail: (reviewId: string, commentId: string) =>
      `/reviews/${reviewId}/comments/${commentId}`,
    reviewCommentLike: (reviewId: string, commentId: string) =>
      `/reviews/${reviewId}/comments/${commentId}/like`,
    reviewCommentReport: (reviewId: string, commentId: string) =>
      `/reviews/${reviewId}/comments/${commentId}/report`,
    categories: "/admin/categories",
    brands: "/admin/brands",
    adminList: "/admin/models",
    adminDetail: (id: string) => `/admin/models/${id}`,
    adminReports: (id: string) => `/admin/models/${id}/reports`,
    adminCategoryDetail: (id: string) => `/admin/categories/${id}`,
    adminBrandDetail: (id: string) => `/admin/brands/${id}`,
    adminReviews: "/admin/reviews",
    adminReviewDetail: (id: string) => `/admin/reviews/${id}`,
    adminReviewReports: (id: string) => `/admin/reviews/${id}/reports`,
    adminReviewComments: "/admin/review-comments",
    adminReviewCommentDetail: (id: string) => `/admin/review-comments/${id}`,
    adminComments: "/admin/model-comments",
    adminCommentDetail: (id: string) => `/admin/model-comments/${id}`,
    adminCommentReports: (id: string) => `/admin/model-comments/${id}/reports`,
    adminReviewCommentReports: (id: string) => `/admin/review-comments/${id}/reports`
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
