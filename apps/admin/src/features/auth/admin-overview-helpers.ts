import { APP_ROUTES } from "@feijia/shared";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";
import { apiClient } from "../../lib/api-client";

type AdminPostsPayload = Awaited<ReturnType<typeof apiClient.listAdminPosts>>;
type AdminCommentsPayload = Awaited<ReturnType<typeof apiClient.listAdminPostComments>>;
type AdminReviewsPayload = Awaited<ReturnType<typeof apiClient.listAdminReviews>>;
type AdminModelsPayload = Awaited<ReturnType<typeof apiClient.listModels>>;
type AdminCategoriesPayload = Awaited<ReturnType<typeof apiClient.listCategories>>;
type AdminBrandsPayload = Awaited<ReturnType<typeof apiClient.listBrands>>;
type OfficialArticlesPayload = Awaited<ReturnType<typeof apiClient.listOfficialArticles>>;
type AircraftSubmissionsPayload = Awaited<ReturnType<typeof apiClient.listAdminAircraftSubmissions>>;
type SiteSettingsPayload = Awaited<ReturnType<typeof apiClient.getSiteSettings>>;

function formatDayLabel(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function toDateKey(value: string) {
  return value.slice(0, 10);
}

function buildDailyCounts(values: string[], days = 7) {
  const today = new Date();
  const counts = new Map<string, number>();

  for (const value of values) {
    const key = toDateKey(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from({ length: days }).map((_, index) => {
    const current = new Date(today);
    current.setDate(today.getDate() - (days - index - 1));
    const key = current.toISOString().slice(0, 10);

    return {
      label: formatDayLabel(current),
      key,
      value: counts.get(key) ?? 0
    };
  });
}

export function buildAdminOverviewData(input: {
  posts: AdminPostsPayload["items"];
  comments: AdminCommentsPayload["items"];
  reviews: AdminReviewsPayload["items"];
  models: AdminModelsPayload["items"];
  categories: AdminCategoriesPayload;
  brands: AdminBrandsPayload;
  officialArticles: OfficialArticlesPayload["items"];
  submissions: AircraftSubmissionsPayload["items"];
  siteSettings: SiteSettingsPayload["item"] | null;
}) {
  const pendingPosts = input.posts.filter((item) => item.status === "pending").length;
  const hiddenComments = input.comments.filter((item) => item.status === "hidden").length;
  const hiddenReviews = input.reviews.filter((item) => item.status === "hidden").length;
  const pendingSubmissions = input.submissions.filter((item) => item.status === "submitted").length;

  const metrics = [
    {
      key: "posts",
      label: "内容池",
      value: input.posts.length,
      hint: `${pendingPosts} 条待处理`
    },
    {
      key: "official",
      label: "官方文章",
      value: input.officialArticles.length,
      hint: "首页会显示官方标签"
    },
    {
      key: "submissions",
      label: "机型投稿",
      value: input.submissions.length,
      hint: `${pendingSubmissions} 份待审核`
    },
    {
      key: "catalog",
      label: "目录资产",
      value: input.models.length,
      hint: `${input.categories.length} 分类 / ${input.brands.length} 品牌`
    }
  ];

  const queueRows = [
    { key: "posts", label: "帖子审核", value: pendingPosts, action: APP_ROUTES.adminPosts },
    { key: "comments", label: "评论治理", value: hiddenComments, action: APP_ROUTES.adminPostComments },
    { key: "reviews", label: "点评治理", value: hiddenReviews, action: APP_ROUTES.adminReviews },
    { key: "submissions", label: "投稿审核", value: pendingSubmissions, action: ADMIN_ROUTE_PATHS.aircraftSubmissions }
  ];

  const recentRows = [
    ...input.officialArticles.slice(0, 2).map((item) => ({
      key: `official-${item.id}`,
      type: "官方文章",
      title: item.title,
      status: item.status,
      owner: item.author.displayName
    })),
    ...input.posts.slice(0, 3).map((item) => ({
      key: `post-${item.id}`,
      type: item.author.role === "admin" ? "官方内容" : "用户内容",
      title: item.title,
      status: item.status,
      owner: item.author.displayName
    })),
    ...input.submissions.slice(0, 2).map((item) => ({
      key: `submission-${item.id}`,
      type: "机型投稿",
      title: item.modelName,
      status: item.status,
      owner: item.author.displayName
    }))
  ].slice(0, 6);

  const contentTrend = buildDailyCounts(input.posts.map((item) => item.createdAt));
  const submissionTrend = buildDailyCounts(input.submissions.map((item) => item.createdAt));
  const trendRows = contentTrend.map((item, index) => ({
    label: item.label,
    content: item.value,
    submissions: submissionTrend[index]?.value ?? 0
  }));

  const quickActions = [
    {
      key: "publish",
      title: "发布官方文章",
      description: "发布首页可见的官方内容。",
      href: ADMIN_ROUTE_PATHS.officialArticles
    },
    {
      key: "moderation",
      title: "处理帖子审核",
      description: "集中查看待审核与隐藏内容。",
      href: APP_ROUTES.adminPosts
    },
    {
      key: "submissions",
      title: "审核飞行器投稿",
      description: "前期投稿仍保留人工审核。",
      href: ADMIN_ROUTE_PATHS.aircraftSubmissions
    },
    {
      key: "rankings",
      title: "维护官方榜单",
      description: "更新官方榜单和排序条目。",
      href: APP_ROUTES.adminRankings
    }
  ];

  return {
    metrics,
    queueRows,
    recentRows,
    trendRows,
    quickActions,
    moderationEnabled: input.siteSettings?.postModerationEnabled ?? true
  };
}
