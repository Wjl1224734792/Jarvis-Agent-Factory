import { createApiClient } from "@feijia/http-client";
import { API_ROUTES, APP_PORTS } from "@feijia/shared";

const fallbackBaseUrl = `http://localhost:${APP_PORTS.server}`;
type WebImportMetaEnv = {
  VITE_WEB_API_BASE_URL?: string;
};
const rawBaseUrl = (import.meta.env as WebImportMetaEnv).VITE_WEB_API_BASE_URL;

const resolvedBaseUrl =
  typeof rawBaseUrl === "string" && rawBaseUrl.trim().length > 0
    ? rawBaseUrl.trim()
    : fallbackBaseUrl;

// 共享 client 负责大部分“服务端 schema 已覆盖”的接口，web 侧只扩展额外页面专属能力。
const sharedClient = createApiClient({
  baseUrl: resolvedBaseUrl
});

async function parseResponse<T>(response: Response): Promise<T> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // 非 JSON 响应，记录原始状态码
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    // 对于成功但非 JSON 的响应，返回空对象作为降级
    return {} as T;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `Request failed with status ${response.status}`;
    throw mapWebApiError(message);
  }

  return payload as T;
}

export function sanitizeWebApiErrorMessage(message: string) {
  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes("unauthorized") ||
    normalized.includes("login required") ||
    normalized.includes("请先登录") ||
    normalized.includes("未登录")
  ) {
    return "请先登录后再继续操作。";
  }

  if (
    normalized.includes("forbidden") ||
    normalized.includes("not allowed") ||
    normalized.includes("权限不足")
  ) {
    return "当前无权执行此操作。";
  }

  if (
    normalized.includes("not found") ||
    normalized.includes("missing") ||
    normalized.includes("不存在")
  ) {
    return "请求的内容不存在或已被移除。";
  }

  if (
    normalized.includes("invalid") ||
    normalized.includes("required") ||
    normalized.includes("bad request") ||
    normalized.includes("exceeds") ||
    normalized.includes("conflict") ||
    normalized.includes("already") ||
    normalized.includes("taken")
  ) {
    return "提交内容有误，请检查后重试。";
  }

  if (
    normalized.includes("500") ||
    normalized.includes("503") ||
    normalized.includes("internal") ||
    normalized.includes("unexpected") ||
    normalized.includes("stack") ||
    normalized.includes("sql") ||
    normalized.includes("exception")
  ) {
    return "服务暂时不可用，请稍后重试。";
  }

  return "操作失败，请稍后重试。";
}

// Web 端额外做一层错误文案翻译，避免把服务端原始错误直接暴露给终端用户。
export function mapWebApiError(error: unknown) {
  if (error instanceof Error) {
    return new Error(sanitizeWebApiErrorMessage(error.message));
  }

  return new Error("操作失败，请稍后重试。");
}

let refreshingPromise: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshingPromise) {
    refreshingPromise = fetch(`${resolvedBaseUrl}/auth/web/refresh`, {
      method: "POST",
      credentials: "include"
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshingPromise = null;
      });
  }
  return refreshingPromise;
}

/** 自动刷新 token 的最大重试次数，防止无限循环 */
const MAX_REFRESH_RETRIES = 1;

async function fetchWithAutoRefresh(
  input: RequestInfo,
  init: RequestInit,
  retryCount = 0
): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401 && retryCount < MAX_REFRESH_RETRIES) {
    const clone = response.clone();
    const payload = (await clone.json().catch(() => null)) as {
      code?: string;
    } | null;
    if (payload?.code === "TOKEN_EXPIRED") {
      const ok = await refreshSession();
      if (ok) {
        return fetchWithAutoRefresh(input, init, retryCount + 1);
      }
    }
  }

  return response;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetchWithAutoRefresh(`${resolvedBaseUrl}${path}`, {
    method: "GET",
    credentials: "include"
  });

  return parseResponse<T>(response);
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetchWithAutoRefresh(`${resolvedBaseUrl}${path}`, {
    method: "POST",
    credentials: "include",
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  return parseResponse<T>(response);
}

async function putJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetchWithAutoRefresh(`${resolvedBaseUrl}${path}`, {
    method: "PUT",
    credentials: "include",
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  return parseResponse<T>(response);
}

async function deleteJson<T>(path: string): Promise<T> {
  const response = await fetchWithAutoRefresh(`${resolvedBaseUrl}${path}`, {
    method: "DELETE",
    credentials: "include"
  });

  return parseResponse<T>(response);
}

type WebBrand = {
  id: string;
  slug: string;
  name: string;
  categoryId: string | null;
  sortOrder: number;
  isEnabled: boolean;
  logoUrl?: string | null;
};

type WebCategory = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
};

type WebModelListResponse = {
  items: Array<{
    id: string;
    slug: string;
    name: string;
    summary: string | null;
    powerType: "electric" | "fuel" | "hybrid" | "other";
    reviewSummary: {
      totalReviews: number;
    };
    category: {
      id: string;
      slug: string;
      name: string;
    };
    brand: {
      id: string;
      slug: string;
      name: string;
      logoUrl?: string | null;
    };
  }>;
  total: number;
  filters: {
    categories: WebCategory[];
    brands: WebBrand[];
    powerTypes: Array<"electric" | "fuel" | "hybrid" | "other">;
  };
};

type WebModelDetailResponse = {
  item: WebModelListResponse["items"][number] & {
    description: string | null;
    isPublished: boolean;
    parameters: {
      maxFlightTimeMinutes: number | null;
      maxRangeKilometers: number | null;
      maxSpeedKph: number | null;
      takeoffWeightGrams: number | null;
    };
    interactionSummary: {
      interestCount: number;
      favoriteCount: number;
      shareCount: number;
    };
    viewer: {
      isInterested: boolean;
      isFavorited: boolean;
      hasShared: boolean;
    };
  };
};

function buildModelListSearch(input?: {
  categorySlugs?: string[];
  brandSlugs?: string[];
  powerTypes?: string[];
  keyword?: string;
}) {
  const search = new URLSearchParams();

  for (const slug of input?.categorySlugs ?? []) {
    search.append("categorySlug", slug);
  }

  for (const slug of input?.brandSlugs ?? []) {
    search.append("brandSlug", slug);
  }

  for (const powerType of input?.powerTypes ?? []) {
    search.append("powerType", powerType);
  }

  if (input?.keyword?.trim()) {
    search.set("keyword", input.keyword.trim());
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

const rawApiClient = {
  ...sharedClient,
  getPostDetail(id: string, input?: { commentSort?: "hot" | "latest" }) {
    const search = new URLSearchParams();
    if (input?.commentSort) {
      search.set("commentSort", input.commentSort);
    }

    return getJson<Awaited<ReturnType<typeof sharedClient.getPostDetail>>>(
      `${API_ROUTES.posts.detail(id)}${search.toString() ? `?${search.toString()}` : ""}`
    );
  },
  listModels(input?: {
    categorySlugs?: string[];
    brandSlugs?: string[];
    powerTypes?: string[];
    keyword?: string;
    categorySlug?: string;
    brandSlug?: string;
  }) {
    return getJson<WebModelListResponse>(
      `${API_ROUTES.models.list}${buildModelListSearch({
        categorySlugs: input?.categorySlugs ?? (input?.categorySlug ? [input.categorySlug] : []),
        brandSlugs: input?.brandSlugs ?? (input?.brandSlug ? [input.brandSlug] : []),
        powerTypes: input?.powerTypes ?? [],
        keyword: input?.keyword ?? ""
      })}`
    );
  },
  getModelDetail(slug: string) {
    return getJson<WebModelDetailResponse>(API_ROUTES.models.detail(slug));
  },
  markNotificationRead(id: string) {
    return postJson<{ success: true }>(`/notifications/${id}/read`);
  },
  listAircraftCategories() {
    return getJson<WebCategory[]>(API_ROUTES.models.categories);
  },
  listBrands() {
    return getJson<WebBrand[]>(API_ROUTES.models.brands);
  },
  likeModelReview(reviewId: string) {
    return postJson<{ success: true }>(API_ROUTES.models.reviewLike(reviewId));
  },
  reportModelReview(reviewId: string, input: { reason: string; imageIds: string[] }) {
    return postJson<{ success: true }>(API_ROUTES.models.reviewReport(reviewId), input);
  },
  updateReviewComment(reviewId: string, commentId: string, input: { content: string }) {
    return putJson<{ item: Awaited<ReturnType<typeof sharedClient.listReviewComments>>["items"][number] }>(
      API_ROUTES.models.reviewCommentDetail(reviewId, commentId),
      input
    );
  },
  likeReviewComment(reviewId: string, commentId: string) {
    return postJson<{ success: true }>(API_ROUTES.models.reviewCommentLike(reviewId, commentId));
  },
  reportReviewComment(reviewId: string, commentId: string, input: { reason: string; imageIds: string[] }) {
    return postJson<{ success: true }>(
      API_ROUTES.models.reviewCommentReport(reviewId, commentId),
      input
    );
  },
  reportModel(slug: string, input: { reason: string; imageIds: string[] }) {
    return postJson<{ success: true }>(API_ROUTES.models.report(slug), input);
  },
  updateRatingTargetComment(itemId: string, commentId: string, input: { content: string }) {
    return putJson<{ item: unknown }>(API_ROUTES.rankings.itemCommentDetail(itemId, commentId), input);
  },
  deleteRatingTargetComment(itemId: string, commentId: string) {
    return deleteJson<{ success: true }>(API_ROUTES.rankings.itemCommentDetail(itemId, commentId));
  },
  likeRatingTargetComment(itemId: string, commentId: string) {
    return postJson<{ success: true }>(API_ROUTES.rankings.itemCommentLike(itemId, commentId));
  },
  reportRatingTargetComment(itemId: string, commentId: string, input: { reason: string; imageIds: string[] }) {
    return postJson<{ success: true }>(API_ROUTES.rankings.itemCommentReport(itemId, commentId), input);
  },
  reportRatingTarget(itemId: string, input: { reason: string; imageIds: string[] }) {
    return postJson<{ success: true }>(API_ROUTES.rankings.itemReport(itemId), input);
  },
  uploadRatingTargetImage(file: File) {
    return sharedClient.uploadRankingItemImage(file);
  }
};

/**
 * 使用 Proxy 对 API 客户端所有方法统一包裹错误翻译。
 * 相比 for...of + as any 动态赋值，此方式：
 * - 保持完整类型推断，无需类型断言
 * - 运行时仅拦截函数调用，非函数属性原样透传
 * - 若未来添加非 Promise 方法也不会意外包装
 */
function createWrappedApiClient<T extends Record<string, unknown>>(client: T): T {
  return new Proxy(client, {
    get(target, prop: string | symbol) {
      const value = target[prop as keyof T];
      if (typeof value === "function") {
        return async (...args: unknown[]) => {
          try {
            return await (value as (...args: unknown[]) => Promise<unknown>)(...args);
          } catch (error) {
            throw mapWebApiError(error);
          }
        };
      }
      return value;
    },
  });
}

// 对导出的所有异步接口统一包一层错误翻译，保证页面侧无需重复 try/catch 文案适配。
export const apiClient = createWrappedApiClient(rawApiClient);
