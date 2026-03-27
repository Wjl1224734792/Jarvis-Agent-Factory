export const APP_NAME = "飞加网";

export const APP_PORTS = {
  web: 3000,
  admin: 3001,
  server: 3002
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
  rankingItemDetail: "/ranking-items/:id",
  postDetail: "/posts/:id",
  compose: "/compose",
  publishArticle: "/publish/article",
  publishMoment: "/publish/moment",
  publishAircraft: "/publish/aircraft",
  notifications: "/notifications",
  webLogin: "/login",
  webProfile: "/me",
  webSettings: "/settings",
  adminLogin: "/admin/login",
  adminHome: "/admin",
  adminCategories: "/admin/categories",
  adminBrands: "/admin/brands",
  adminModels: "/admin/models",
  adminReviews: "/admin/reviews",
  adminPosts: "/admin/posts",
  adminPostComments: "/admin/post-comments",
  adminContentCategories: "/admin/content-categories",
  adminAircraftSubmissions: "/admin/aircraft-submissions",
  adminRankings: "/admin/rankings"
} as const;

export const API_ROUTES = {
  health: "/health",
  feed: "/home/feed",
  circleFeed: "/circle/feed",
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
  posts: {
    create: "/posts",
    detail: (id: string) => `/posts/${id}`,
    comments: (id: string) => `/posts/${id}/comments`,
    commentDetail: (postId: string, commentId: string) => `/posts/${postId}/comments/${commentId}`,
    interaction: (id: string, type: string) => `/posts/${id}/interactions/${type}`,
    report: (id: string) => `/posts/${id}/report`,
    adminList: "/admin/posts",
    adminDetail: (id: string) => `/admin/posts/${id}`,
    adminComments: "/admin/post-comments",
    adminCommentDetail: (id: string) => `/admin/post-comments/${id}`
  },
  content: {
    categories: "/content-categories",
    adminCategories: "/admin/content-categories",
    adminCategoryDetail: (id: string) => `/admin/content-categories/${id}`
  },
  submissions: {
    create: "/aircraft-submissions",
    detail: (id: string) => `/aircraft-submissions/${id}`,
    adminList: "/admin/aircraft-submissions",
    adminDetail: (id: string) => `/admin/aircraft-submissions/${id}`
  },
  uploads: {
    images: "/uploads/images"
  },
  social: {
    follow: (userId: string) => `/users/${userId}/follow`,
    notifications: "/notifications",
    notificationsReadAll: "/notifications/read-all"
  },
  rankings: {
    overview: "/rankings",
    create: "/rankings",
    update: (id: string) => `/rankings/${id}`,
    detail: (id: string) => `/rankings/${id}`,
    items: (id: string) => `/rankings/${id}/items`,
    comments: (id: string) => `/rankings/${id}/comments`,
    itemDetail: (id: string) => `/ranking-items/${id}`,
    itemReview: (id: string) => `/ranking-items/${id}/review`,
    itemRatings: (id: string) => `/ranking-items/${id}/ratings`,
    itemComments: (id: string) => `/ranking-items/${id}/comments`
  },
  models: {
    list: "/models",
    detail: (slug: string) => `/models/${slug}`,
    reviews: (slug: string) => `/models/${slug}/reviews`,
    categories: "/admin/categories",
    brands: "/admin/brands",
    adminList: "/admin/models",
    adminDetail: (id: string) => `/admin/models/${id}`,
    adminCategoryDetail: (id: string) => `/admin/categories/${id}`,
    adminBrandDetail: (id: string) => `/admin/brands/${id}`,
    adminReviews: "/admin/reviews",
    adminReviewDetail: (id: string) => `/admin/reviews/${id}`
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
