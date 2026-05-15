import { ApiClientError, createApiClient } from "@feijia/http-client";
import { API_ROUTES, APP_PORTS } from "@feijia/shared";
import { dispatchWebAuthInvalidEvent } from "./auth-events";
import { getViewSessionId } from "./view-session";

const fallbackBaseUrl = `http://localhost:${APP_PORTS.server}`;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

interface WebImportMetaEnv {
  VITE_WEB_API_BASE_URL?: string;
}
const rawBaseUrl = (import.meta.env as WebImportMetaEnv).VITE_WEB_API_BASE_URL;

function isLoopbackHost(hostname: string) {
  return LOOPBACK_HOSTS.has(hostname);
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part < 0 || part > 255)) {
    return false;
  }

  if (parts[0] === 10) {
    return true;
  }
  if (parts[0] === 192 && parts[1] === 168) {
    return true;
  }
  return parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
}

function isLocalDevHost(hostname: string) {
  return isLoopbackHost(hostname) || isPrivateIpv4(hostname);
}

/**
 * 解析 Web 端实际使用的 API 基地址，并在局域网联调时自动对齐主机名。
 *
 * @param configuredBaseUrl Vite 中显式配置的 API 基地址。
 * @param currentLocation 当前页面位置，测试场景可显式传入。
 * @returns 最终生效的 API 基地址。
 * @throws {never} 当输入 URL 非法时会直接回退原始配置，不会主动抛出异常。
 */
export function resolveWebApiBaseUrl(
  configuredBaseUrl: string | undefined,
  currentLocation?: Pick<Location, "hostname">
) {
  const baseUrl =
    typeof configuredBaseUrl === "string" && configuredBaseUrl.trim().length > 0
      ? configuredBaseUrl.trim()
      : fallbackBaseUrl;

  const pageHostname =
    currentLocation?.hostname ?? (typeof window === "undefined" ? "" : window.location.hostname);
  if (!pageHostname) {
    return baseUrl;
  }

  try {
    const parsed = new URL(baseUrl);
    if (!isLoopbackHost(parsed.hostname) || !isLocalDevHost(pageHostname)) {
      return baseUrl;
    }

    parsed.hostname = pageHostname;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return baseUrl;
  }
}

const resolvedBaseUrl = resolveWebApiBaseUrl(rawBaseUrl);

const NON_RETRIABLE_STATUS_CODES = new Set([400, 401, 403, 404, 409, 422]);
const NON_RETRIABLE_ERROR_CODES = new Set([
  "BAD_REQUEST",
  "DISPLAY_NAME_TAKEN",
  "FORBIDDEN",
  "INVALID_CAPTCHA",
  "INVALID_CREDENTIALS",
  "INVALID_REFRESH_TOKEN",
  "INVALID_REGISTRATION_TOKEN",
  "INVALID_SMS_CODE",
  "NOT_FOUND",
  "PHONE_ALREADY_REGISTERED",
  "SESSION_EXPIRED",
  "TOKEN_EXPIRED",
  "UNAUTHORIZED"
]);
const AUTH_INVALID_ERROR_CODES = new Set([
  "INVALID_REFRESH_TOKEN",
  "SESSION_EXPIRED",
  "TOKEN_EXPIRED",
  "UNAUTHORIZED"
]);

interface WebApiErrorOptions {
  code?: string;
  status?: number;
}

interface WebApiErrorMeta {
  authInvalid?: boolean;
  retryable?: boolean;
  status?: number;
  webMapped?: boolean;
}

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
      throw mapWebApiError(new Error(`Request failed with status ${response.status}`), {
        status: response.status
      });
    }
    // 对于成功但非 JSON 的响应，返回空对象作为降级
    return {} as T;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `Request failed with status ${response.status}`;
    const code =
      payload && typeof payload === "object" && "code" in payload
        ? String(payload.code)
        : undefined;

    throw mapWebApiError(new ApiClientError(message, code), {
      code,
      status: response.status
    });
  }

  return payload as T;
}

/**
 * 将服务端或网络错误翻译为适合 Web 端展示的统一文案。
 *
 * @param message 原始错误消息。
 * @returns 面向终端用户的简化提示语。
 * @throws {never} 该函数只做字符串匹配与映射，不会主动抛出异常。
 */
export function sanitizeWebApiErrorMessage(message: string) {
  if (
    message.includes("当前最大允许") ||
    message.includes("文件类型不支持") ||
    message.includes("文件大小无效")
  ) {
    return message.trim();
  }

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

  if (normalized.includes("已被占用") || normalized.includes("被占用")) {
    return "用户名已被占用，请更换后重试。";
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
function getWebApiErrorCode(error: unknown, overrideCode?: string) {
  if (overrideCode) {
    return overrideCode;
  }

  if (error instanceof ApiClientError) {
    return error.code;
  }

  if (
    error instanceof Error &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return undefined;
}

function getWebApiErrorStatus(error: unknown, overrideStatus?: number) {
  if (typeof overrideStatus === "number") {
    return overrideStatus;
  }

  if (
    error instanceof Error &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }

  return undefined;
}

function isNonRetriableWebError(status: number | undefined, code: string | undefined) {
  return (
    (typeof status === "number" && NON_RETRIABLE_STATUS_CODES.has(status)) ||
    (typeof code === "string" && NON_RETRIABLE_ERROR_CODES.has(code))
  );
}

function resolveAuthInvalidWebError(status: number | undefined, code: string | undefined) {
  return (
    status === 401 ||
    (typeof code === "string" && AUTH_INVALID_ERROR_CODES.has(code))
  );
}

function attachWebApiErrorMeta<T extends Error>(
  error: T,
  sourceError: unknown,
  options?: WebApiErrorOptions
) {
  const code = getWebApiErrorCode(sourceError, options?.code);
  const status = getWebApiErrorStatus(sourceError, options?.status);
  const retryable = !isNonRetriableWebError(status, code);
  const authInvalid = resolveAuthInvalidWebError(status, code);

  Object.defineProperties(error, {
    authInvalid: {
      configurable: true,
      enumerable: false,
      value: authInvalid
    },
    retryable: {
      configurable: true,
      enumerable: false,
      value: retryable
    },
    status: {
      configurable: true,
      enumerable: false,
      value: status
    },
    webMapped: {
      configurable: true,
      enumerable: false,
      value: true
    }
  } satisfies Record<keyof WebApiErrorMeta, PropertyDescriptor>);

  return error as T & WebApiErrorMeta;
}

/**
 * 判断当前错误是否适合提示用户重试。
 *
 * @param error 待判断的错误对象。
 * @returns `true/false` 表示可否重试，无法判断时返回 `undefined`。
 * @throws {never} 该函数只做错误元数据解析，不会主动抛出异常。
 */
export function getWebErrorRetryable(error: unknown) {
  if (!(error instanceof Error)) {
    return undefined;
  }

  if (
    "retryable" in error &&
    typeof (error as { retryable?: unknown }).retryable === "boolean"
  ) {
    return (error as { retryable: boolean }).retryable;
  }

  const code = getWebApiErrorCode(error);
  const status = getWebApiErrorStatus(error);
  if (typeof status === "number" || typeof code === "string") {
    return !isNonRetriableWebError(status, code);
  }

  return undefined;
}

/**
 * 判断错误是否意味着 Web 登录态已经失效。
 *
 * @param error 待判断的错误对象。
 * @returns 命中鉴权失效状态码、错误码或文案时返回 `true`。
 * @throws {never} 该函数只做错误元数据解析，不会主动抛出异常。
 */
export function isWebAuthInvalidError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  if (
    "authInvalid" in error &&
    typeof (error as { authInvalid?: unknown }).authInvalid === "boolean"
  ) {
    return (error as { authInvalid: boolean }).authInvalid;
  }

  const status = getWebApiErrorStatus(error);
  const code = getWebApiErrorCode(error);

  if (typeof status === "number" || typeof code === "string") {
    return resolveAuthInvalidWebError(status, code);
  }

  return isAuthErrorMessage(error.message);
}

function isMappedWebApiError(error: unknown) {
  return (
    error instanceof Error &&
    "webMapped" in error &&
    (error as { webMapped?: unknown }).webMapped === true
  );
}

function shouldAttemptSessionRefresh(error: unknown) {
  return error instanceof ApiClientError && error.code === "TOKEN_EXPIRED";
}

function isAuthErrorMessage(message: string) {
  const normalized = message.trim().toLowerCase();
  return normalized.includes("请先登录") || normalized.includes("login") || normalized.includes("unauthorized");
}

/**
 * 为 Web 端统一映射 API 错误对象，并注入可重试/登录失效元数据。
 *
 * @param error 原始错误对象。
 * @param options 错误码或状态码覆盖项。
 * @returns 已完成用户文案翻译和元数据注入的错误对象。
 * @throws {never} 该函数始终返回错误对象本身，不会主动抛出异常。
 */
export function mapWebApiError(error: unknown, options?: WebApiErrorOptions) {
  if (error instanceof ApiClientError) {
    const message = sanitizeWebApiErrorMessage(error.message);
    const mappedError = attachWebApiErrorMeta(
      new ApiClientError(message, options?.code ?? error.code),
      error,
      options
    );
    if (isWebAuthInvalidError(mappedError)) {
      dispatchWebAuthInvalidEvent();
    }
    return mappedError;
  }

  if (error instanceof Error) {
    const message = sanitizeWebApiErrorMessage(error.message);
    const mappedError = attachWebApiErrorMeta(new Error(message), error, options);
    if (isWebAuthInvalidError(mappedError)) {
      dispatchWebAuthInvalidEvent();
    }
    return mappedError;
  }

  return new Error("操作失败，请稍后重试。");
}

let refreshingPromise: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshingPromise) {
    refreshingPromise = fetch(`${resolvedBaseUrl}${API_ROUTES.auth.webRefresh}`, {
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

interface WebBrand {
  id: string;
  slug: string;
  name: string;
  categoryId: string | null;
  sortOrder: number;
  isEnabled: boolean;
  logoUrl?: string | null;
}

interface WebCategory {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
}

interface WebModelListResponse {
  items: Array<{
    id: string;
    slug: string;
    name: string;
    summary: string | null;
    powerType: "electric" | "fuel" | "hybrid" | "other";
    favoriteCount: number;
    commentCount: number;
    viewCount: number;
    coverImageUrl: string | null;
    coverVideoUrl: string | null;
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
}

interface WebModelDetailResponse {
  item: WebModelListResponse["items"][number] & {
    description: string | null;
    isPublished: boolean;
    coverVideoUrl: string | null;
    galleryImageUrls: string[];
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
}

function buildModelListSearch(input?: {
  categorySlugs?: string[];
  brandSlugs?: string[];
  powerTypes?: string[];
  keyword?: string;
  sort?: "hot" | "latest";
  tab?: "recommended" | "latest" | "following";
  limit?: number;
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

  if (input?.sort) {
    search.set("sort", input.sort);
  }

  if (input?.tab) {
    search.set("tab", input.tab);
  }

  if (typeof input?.limit === "number") {
    search.set("limit", String(input.limit));
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
    sort?: "hot" | "latest";
    tab?: "recommended" | "latest" | "following";
    limit?: number;
  }) {
    return getJson<WebModelListResponse>(
      `${API_ROUTES.models.list}${buildModelListSearch({
        categorySlugs: input?.categorySlugs ?? (input?.categorySlug ? [input.categorySlug] : []),
        brandSlugs: input?.brandSlugs ?? (input?.brandSlug ? [input.brandSlug] : []),
        powerTypes: input?.powerTypes ?? [],
        keyword: input?.keyword ?? "",
        sort: input?.sort,
        tab: input?.tab,
        limit: input?.limit
      })}`
    );
  },
  getModelDetail(slug: string) {
    return getJson<WebModelDetailResponse>(API_ROUTES.models.detail(slug));
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
  },
  uploadPostImage(file: File) {
    return sharedClient.uploadPostImage(file);
  },
  uploadPostVideo(file: File) {
    return sharedClient.uploadPostVideo(file);
  },
  recordPostView(id: string) {
    return sharedClient.recordPostView(id, {
      sessionId: getViewSessionId() ?? undefined
    });
  },
  recordModelView(slug: string) {
    return sharedClient.recordModelView(slug, {
      sessionId: getViewSessionId() ?? undefined
    });
  },
  /**
   * AI 辅助排版
   * @param content 原始 HTML 内容（最大 8000 字符）
   * @param mode 排版模式：beautify（局部美化）或 structure（全文结构化）
   * @returns 格式化后的 HTML 和变更说明数组
   */
  formatAiContent(content: string, mode: 'beautify' | 'structure') {
    return postJson<{ html: string; changes: string[] }>(API_ROUTES.ai.format, {
      content,
      mode
    });
  },
  /**
   * 查询 AI 功能开关状态
   * @returns AI 功能（排版）的启用状态
   */
  getAiFeatures() {
    return getJson<{ features: { format: boolean } }>(
      API_ROUTES.ai.features
    );
  }
};

export type WebApiClient = typeof rawApiClient;

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
            if (shouldAttemptSessionRefresh(error) && await refreshSession()) {
              return await (value as (...args: unknown[]) => Promise<unknown>)(...args);
            }
            throw isMappedWebApiError(error) ? error : mapWebApiError(error);
          }
        };
      }
      return value;
    },
  });
}

// 对导出的所有异步接口统一包一层错误翻译，保证页面侧无需重复 try/catch 文案适配。
export const apiClient = createWrappedApiClient(rawApiClient);
