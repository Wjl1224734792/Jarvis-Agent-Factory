import { type QueryClient } from "@tanstack/react-query";
import type { AdminMessageDomain, NotificationType } from "@feijia/schemas";
import { APP_ROUTES } from "@feijia/shared";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";

export type AdminMessageNavigation = {
  href: string;
  filters: Record<string, string>;
};

export const adminMessageDomainOptions: Array<{ label: string; value: AdminMessageDomain }> = [
  { label: "文章 / 动态", value: "posts" },
  { label: "帖子评论", value: "post_comments" },
  { label: "机型评论", value: "model_comments" },
  { label: "评测", value: "reviews" },
  { label: "评测评论", value: "review_comments" },
  { label: "榜单", value: "rankings" },
  { label: "榜单评论", value: "ranking_comments" },
  { label: "评分对象", value: "rating_targets" },
  { label: "评分对象评论", value: "rating_target_comments" },
  { label: "机型投稿", value: "aircraft_submissions" },
  { label: "品牌申请", value: "brand_applications" }
];

export const adminMessageTypeOptions: Array<{ label: string; value: NotificationType }> = [
  { label: "内容审核结果", value: "post_audit_result" },
  { label: "评测审核结果", value: "review_audit_result" },
  { label: "榜单审核结果", value: "ranking_audit_result" },
  { label: "评分对象审核结果", value: "rating_target_audit_result" },
  { label: "机型投稿审核结果", value: "aircraft_submission_audit_result" },
  { label: "品牌申请审核结果", value: "brand_application_audit_result" }
];

const adminMessageTypesByDomain: Partial<Record<AdminMessageDomain, NotificationType[]>> = {
  posts: ["post_audit_result"],
  reviews: ["review_audit_result"],
  rankings: ["ranking_audit_result"],
  rating_targets: ["rating_target_audit_result"],
  aircraft_submissions: ["aircraft_submission_audit_result"],
  brand_applications: ["brand_application_audit_result"]
};

export const adminMessageReadStatusOptions = [
  { label: "全部", value: "all" },
  { label: "未读", value: "unread" },
  { label: "已读", value: "read" }
] as const;

export function getAdminMessageTypeOptions(domain?: AdminMessageDomain) {
  if (!domain) {
    return adminMessageTypeOptions;
  }

  const allowedTypes = adminMessageTypesByDomain[domain] ?? [];
  return adminMessageTypeOptions.filter((item) => allowedTypes.includes(item.value));
}

export function sanitizeAdminMessageFilters(input: {
  domain: string | null;
  type: string | null;
  readStatus: string | null;
}) {
  const activeDomain = adminMessageDomainOptions.some((item) => item.value === input.domain)
    ? (input.domain as (typeof adminMessageDomainOptions)[number]["value"])
    : undefined;
  const requestedType = adminMessageTypeOptions.some((item) => item.value === input.type)
    ? (input.type as (typeof adminMessageTypeOptions)[number]["value"])
    : undefined;
  const allowedTypes = getAdminMessageTypeOptions(activeDomain).map((item) => item.value);
  const activeType = requestedType && allowedTypes.includes(requestedType) ? requestedType : undefined;
  const activeReadStatus = adminMessageReadStatusOptions.some((item) => item.value === input.readStatus)
    ? (input.readStatus as (typeof adminMessageReadStatusOptions)[number]["value"])
    : "all";

  return {
    activeDomain,
    activeType,
    activeReadStatus,
    ignoredType: Boolean(requestedType) && requestedType !== activeType
  };
}

export function getAdminMessageDomainLabel(domain: AdminMessageDomain) {
  return adminMessageDomainOptions.find((item) => item.value === domain)?.label ?? domain;
}

export function getAdminMessageTypeLabel(type: NotificationType) {
  return adminMessageTypeOptions.find((item) => item.value === type)?.label ?? type;
}

function buildSearch(filters: Record<string, string>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value.trim().length > 0) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query.length > 0 ? `?${query}` : "";
}

function getCanonicalPathname(domain: AdminMessageDomain) {
  switch (domain) {
    case "posts":
      return APP_ROUTES.adminPosts;
    case "post_comments":
      return APP_ROUTES.adminPostComments;
    case "model_comments":
      return APP_ROUTES.adminModelComments;
    case "reviews":
      return APP_ROUTES.adminReviews;
    case "review_comments":
      return APP_ROUTES.adminReviewComments;
    case "rankings":
      return APP_ROUTES.adminRankings;
    case "ranking_comments":
      return APP_ROUTES.adminRankingComments;
    case "rating_targets":
      return ADMIN_ROUTE_PATHS.moderationRatingTargets;
    case "rating_target_comments":
      return APP_ROUTES.adminRatingTargetComments;
    case "aircraft_submissions":
      return APP_ROUTES.adminAircraftSubmissions;
    case "brand_applications":
      return APP_ROUTES.adminBrandApplications;
  }
}

function getDomainFilters(domain: AdminMessageDomain): Record<string, string> {
  switch (domain) {
    case "post_comments":
      return { domain: "post" };
    case "model_comments":
      return { domain: "model" };
    case "review_comments":
      return { domain: "review" };
    case "ranking_comments":
      return { domain: "ranking" };
    case "rating_target_comments":
      return { domain: "rating-target" };
    default:
      return {};
  }
}

/**
 * 统一把后端 navigation 元信息映射成 admin 端实际使用的 canonical 路由与筛选参数。
 * 这样后端即使返回历史 alias，前端仍然能稳定落到当前真实审核页。
 */
export function resolveAdminMessageDestination(
  domain: AdminMessageDomain,
  navigation: AdminMessageNavigation
) {
  return {
    pathname: getCanonicalPathname(domain),
    search: buildSearch({
      ...navigation.filters,
      ...getDomainFilters(domain)
    })
  };
}

export function adminMessagesQueryKey(input: {
  domain?: AdminMessageDomain;
  type?: NotificationType;
  readStatus?: "all" | "read" | "unread";
  limit?: number;
}) {
  return [
    "admin-messages",
    input.domain ?? "all",
    input.type ?? "all",
    input.readStatus ?? "all",
    input.limit ?? 50
  ] as const;
}

export function adminModerationTodosQueryKey() {
  return ["admin-messages", "todos"] as const;
}

export async function invalidateAdminMessageQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin-messages"] }),
    queryClient.invalidateQueries({ queryKey: ["admin-overview", "messages"] }),
    queryClient.invalidateQueries({ queryKey: ["admin-overview", "todos"] })
  ]);
}
