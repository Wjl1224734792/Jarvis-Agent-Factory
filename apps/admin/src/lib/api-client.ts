import { ApiClientError, createApiClient, parseApiError } from "@feijia/http-client";
import { API_ROUTES, APP_PORTS, withApiV1Prefix } from "@feijia/shared";
import type {
  AiSettings,
  AiSettingsResponse,
  RankingDetail,
  RankingListItem,
  UpdateSiteSettingsInput
} from "@feijia/schemas";
import { dispatchAdminAuthInvalidEvent } from "./auth-events";

const fallbackBaseUrl = `http://localhost:${APP_PORTS.server}`;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const ADMIN_AUTH_INVALID_CODES = new Set([
  "FORBIDDEN",
  "INVALID_REFRESH_TOKEN",
  "SESSION_EXPIRED",
  "TOKEN_EXPIRED",
  "UNAUTHORIZED"
]);

interface AdminImportMetaEnv {
  VITE_ADMIN_API_BASE_URL?: string;
}
const configuredBaseUrl = (import.meta.env as AdminImportMetaEnv).VITE_ADMIN_API_BASE_URL;

function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname);
}

function resolveAdminApiBaseUrl() {
  const rawConfigured =
    typeof configuredBaseUrl === "string" && configuredBaseUrl.trim().length > 0
      ? configuredBaseUrl.trim()
      : fallbackBaseUrl;

  if (typeof window === "undefined") {
    return rawConfigured;
  }

  try {
    const url = new URL(rawConfigured);
    const pageHost = window.location.hostname.toLowerCase();
    const apiHost = url.hostname.toLowerCase();
    const pageIsLoopback = isLoopbackHost(pageHost);
    const apiIsLoopback = isLoopbackHost(apiHost);

    // 通过局域网 IP 打开 admin 时，把默认 localhost API 自动切到同主机，
    // 避免跨站 Cookie 在 SameSite=Lax 下不携带，导致反复 401。
    // 同样处理环回地址不一致的情况（如页面 127.0.0.1 但 API 用 localhost）。
    if ((!pageIsLoopback && apiIsLoopback) || (pageIsLoopback && apiIsLoopback && pageHost !== apiHost)) {
      const protocol = window.location.protocol === "https:" ? "https:" : "http:";
      url.protocol = protocol;
      url.hostname = pageHost;
      if (!url.port) {
        url.port = String(APP_PORTS.server);
      }
      return url.toString().replace(/\/$/, "");
    }

    return rawConfigured;
  } catch {
    return rawConfigured;
  }
}

const baseUrl = resolveAdminApiBaseUrl();

// 管理端优先复用共享 client，再按后台工作流补充聚合接口和兼容逻辑。
const sharedClient = createApiClient({
  baseUrl
});

async function parseResponse<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      dispatchAdminAuthInvalidEvent();
    }

    const replayableResponse = new Response(JSON.stringify(payload), {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "content-type": "application/json"
      }
    });
    throw await parseApiError(replayableResponse);
  }

  return payload as T;
}

let refreshingPromise: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshingPromise) {
    refreshingPromise = fetch(`${baseUrl}${API_ROUTES.auth.webRefresh}`, {
      method: "POST",
      credentials: "include"
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshingPromise = null;
      });
  }

  return refreshingPromise;
}

async function fetchWithAutoRefresh(
  input: RequestInfo,
  init: RequestInit,
  retryCount = 0
): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status !== 401 || retryCount > 0) {
    return response;
  }

  const payload = (await response.clone().json().catch(() => null)) as {
    code?: string;
  } | null;
  if (payload?.code !== "TOKEN_EXPIRED") {
    return response;
  }

  return await refreshSession()
    ? fetchWithAutoRefresh(input, init, retryCount + 1)
    : response;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetchWithAutoRefresh(`${baseUrl}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return parseResponse<T>(response);
}

async function putJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetchWithAutoRefresh(`${baseUrl}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return parseResponse<T>(response);
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetchWithAutoRefresh(`${baseUrl}${path}`, {
    method: "GET",
    credentials: "include"
  });

  return parseResponse<T>(response);
}

type AdminRankingRecord = RankingListItem;
type AdminRankingDetailRecord = RankingDetail;
type AdminRankingItem = AdminRankingRecord["items"][number];
type AdminRankingListItem = AdminRankingRecord;

interface RankingDraftItemInput {
  title: string;
  summary: string | null;
  imageFileId: string | null;
  brandName: string | null;
  linkedModelSlug: string | null;
}

interface OfficialRankingUpsertInput {
  type: "official";
  title: string;
  coverImageFileId: string | null;
  itemAddPolicy: "public" | "owner";
  items: RankingDraftItemInput[];
}

export interface AdminAuthSessionItem {
  id: string;
  scope: "web" | "admin" | "app";
  clientIp: string | null;
  userAgent: string | null;
  deviceLabel: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  expiresAt: string;
  status: "active" | "revoked" | "expired";
  user: {
    id: string;
    displayName: string;
    role: "user" | "admin";
    phone: string | null;
  };
}

interface OfficialArticleInput {
  title: string;
  content: string;
  contentHtml?: string | null;
  contentCategoryId: string;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  declaration?: string;
  imageIds?: string[];
  videoIds?: string[];
}

const _legacyOfficialDefinitions = [
  {
    id: "official-endurance",
    title: "续航之王",
    description: "官方排序"
  },
  {
    id: "official-value",
    title: "性价比之选",
    description: "官方排序"
  },
  {
    id: "official-utility",
    title: "实用优先",
    description: "官方排序"
  }
] as const;

// 老榜单数据还存在一部分历史结构，这里统一兜底成后台页面可消费的列表形状。
function _averageScore(items: AdminRankingItem[]) {
  if (items.length === 0) {
    return 0;
  }

  return items.reduce((sum, item) => sum + item.averageScore, 0) / items.length;
}

function _normalizeOfficialRankings(payload: Awaited<ReturnType<typeof sharedClient.listRankings>>) {
  const official = payload.official as AdminRankingListItem[] | { items: AdminRankingItem[] };
  if (Array.isArray(official)) {
    return official.map((item) => ({
      ...item,
      status: item.status ?? "published",
      itemAddPolicy: item.itemAddPolicy ?? "owner"
    }));
  }

  const legacyOfficial = official;
  return _legacyOfficialDefinitions.map((definition, index) => {
    const items = legacyOfficial.items.slice(index, index + 3);
    return {
      id: definition.id,
      type: "official" as const,
      title: definition.title,
      coverImageFileId: null,
      coverImageUrl: null,
      status: "published" as const,
      itemAddPolicy: "owner" as const,
      averageScore: _averageScore(items),
      commentCount: 0,
      itemCount: items.length,
      createdAt: new Date().toISOString(),
      author: {
        id: "admin_legacy",
        displayName: "系统管理员",
        role: "admin" as const
      },
      items
    };
  });
}

const rawApiClient = {
  ...sharedClient,
  listAdminMessages(
    input: Parameters<typeof sharedClient.listAdminMessages>[0] = {}
  ) {
    return sharedClient.listAdminMessages(input);
  },
  listAdminModerationTodos() {
    return sharedClient.listAdminModerationTodos();
  },
  markAdminMessageRead(id: string) {
    return sharedClient.markAdminMessageRead(id);
  },
  markAllAdminMessagesRead() {
    return sharedClient.markAllAdminMessagesRead();
  },
  getAdminAnalyticsOverview() {
    return sharedClient.getAdminAnalyticsOverview();
  },
  listAdminAuditRecords(input?: Parameters<typeof sharedClient.listAdminAuditRecords>[0]) {
    return sharedClient.listAdminAuditRecords(input);
  },
  getAdminLogsOverview(input?: { source?: string }) {
    return sharedClient.getAdminLogsOverview(input);
  },
  listAdminUsers(input?: Parameters<typeof sharedClient.listAdminUsers>[0]) {
    return sharedClient.listAdminUsers(input);
  },
  getAdminUser(id: string) {
    return sharedClient.getAdminUser(id);
  },
  banAdminUser(id: string, input: Parameters<typeof sharedClient.banAdminUser>[1]) {
    return sharedClient.banAdminUser(id, input);
  },
  unbanAdminUser(id: string) {
    return sharedClient.unbanAdminUser(id);
  },
  listAdminLogFiles(input: Parameters<typeof sharedClient.listAdminLogFiles>[0]) {
    return sharedClient.listAdminLogFiles(input);
  },
  getAdminLogEntries(input: Parameters<typeof sharedClient.getAdminLogEntries>[0]) {
    return sharedClient.getAdminLogEntries(input);
  },
  listAdminContentCategories() {
    return sharedClient.listAdminContentCategories();
  },
  getAircraftSubmission(id: string) {
    return getJson<Awaited<ReturnType<typeof sharedClient.getAircraftSubmission>>>(
      API_ROUTES.submissions.adminDetail(id)
    );
  },
  createContentCategory(input: {
    slug: string;
    name: string;
    sortOrder: number;
    isEnabled: boolean;
  }) {
    return sharedClient.createContentCategory(input);
  },
  updateContentCategory(
    id: string,
    input: {
      slug: string;
      name: string;
      sortOrder: number;
      isEnabled: boolean;
    }
  ) {
    return sharedClient.updateContentCategory(id, input);
  },
  listCategories() {
    return getJson<Array<{
      id: string;
      slug: string;
      name: string;
      sortOrder: number;
      isEnabled: boolean;
    }>>(API_ROUTES.models.categories);
  },
  listBrands() {
    return getJson<Array<{
      id: string;
      slug: string;
      name: string;
      logoUrl?: string | null;
      categoryId: string | null;
      sortOrder: number;
      isEnabled: boolean;
    }>>(API_ROUTES.models.brands);
  },
  createCategory(input: {
    slug: string;
    name: string;
    sortOrder?: number;
    isEnabled: boolean;
  }) {
    return postJson<{ item: { id: string; slug: string; name: string } }>(
      API_ROUTES.models.categories,
      {
        ...input,
        sortOrder: Number(input.sortOrder ?? 0)
      }
    );
  },
  updateCategory(
    id: string,
    input: {
      slug: string;
      name: string;
      sortOrder: number;
      isEnabled: boolean;
    }
  ) {
    return putJson<{ item: { id: string; slug: string; name: string } }>(
      API_ROUTES.models.adminCategoryDetail(id),
      input
    );
  },
  listPowerTypes() {
    return getJson<
      Array<{
        id: string;
        slug: string;
        name: string;
        sortOrder: number;
        isEnabled: boolean;
        createdAt: string;
      }>
    >(API_ROUTES.powerTypes.adminList);
  },
  createPowerType(input: {
    slug: string;
    name: string;
    sortOrder?: number;
    isEnabled: boolean;
  }) {
    return postJson<{ item: { id: string; slug: string; name: string } }>(
      API_ROUTES.powerTypes.adminList,
      { ...input, sortOrder: Number(input.sortOrder ?? 0) }
    );
  },
  updatePowerType(
    id: string,
    input: { slug: string; name: string; sortOrder: number; isEnabled: boolean }
  ) {
    return putJson<{ item: { id: string; slug: string; name: string } }>(
      API_ROUTES.powerTypes.adminDetail(id),
      input
    );
  },
  createBrand(input: {
    slug: string;
    name: string;
    logoUrl?: string | null;
    categoryId: string | null;
    sortOrder: number;
    isEnabled: boolean;
  }) {
    return postJson<{ item: { id: string; slug: string; name: string } }>(
      API_ROUTES.models.brands,
      input
    );
  },
  updateBrand(
    id: string,
    input: {
      slug: string;
      name: string;
      logoUrl?: string | null;
      categoryId: string | null;
      sortOrder: number;
      isEnabled: boolean;
    }
  ) {
    return putJson<{ item: { id: string; slug: string; name: string } }>(
      API_ROUTES.models.adminBrandDetail(id),
      input
    );
  },
  listAdminPostComments(status?: "pending" | "visible" | "hidden") {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
    return getJson<Awaited<ReturnType<typeof sharedClient.listAdminPostComments>>>(
      `${API_ROUTES.posts.adminComments}${suffix}`
    );
  },
  listOfficialRankings() {
    return sharedClient.listAdminRankings().then((payload) => ({
      items: payload.items.filter((item) => item.type === "official")
    }));
  },
  listCommunityRankingsForModeration(status?: "pending" | "published" | "rejected" | "hidden") {
    return sharedClient.listAdminRankings().then((payload) => ({
      items: payload.items.filter((item) =>
        item.type === "community" && (status ? item.status === status : true)
      )
    }));
  },
  listOfficialArticles() {
    return sharedClient.listAdminPosts().then((payload) => ({
      items: payload.items.filter((item) => item.type === "article" && item.author.role === "admin")
    }));
  },
  getAdminOfficialArticle(id: string) {
    return sharedClient.getAdminOfficialArticle(id);
  },
  updateAdminOfficialArticle(id: string, input: OfficialArticleInput) {
    return sharedClient.updateAdminOfficialArticle(id, {
      title: input.title,
      content: input.content,
      contentHtml: input.contentHtml ?? null,
      contentCategoryId: input.contentCategoryId,
      sourceLabel: input.sourceLabel ?? null,
      sourceUrl: input.sourceUrl ?? null,
      declaration: input.declaration ?? '',
      imageIds: input.imageIds ?? [],
      videoIds: input.videoIds ?? []
    });
  },
  deleteAdminOfficialArticle(id: string) {
    return sharedClient.deleteAdminOfficialArticle(id);
  },
  getRankingDetail(id: string) {
    return sharedClient.getRankingDetail(id);
  },
  createRanking(input: OfficialRankingUpsertInput) {
    return sharedClient.createRanking(input);
  },
  updateRanking(id: string, input: OfficialRankingUpsertInput) {
    return sharedClient.updateRanking(id, input);
  },
  addRankingItem(id: string, input: RankingDraftItemInput) {
    return sharedClient.addRatingTarget(id, input);
  },
  updateRankingStatus(
    id: string,
    input: { status: "published" | "rejected" | "hidden"; rejectionReason?: string | null }
  ) {
    return sharedClient.updateAdminRankingStatus(id, input);
  },
  updateRatingTargetStatus(
    id: string,
    input: { status: "published" | "rejected" | "hidden"; rejectionReason?: string | null }
  ) {
    return sharedClient.updateAdminRatingTargetStatus(id, input);
  },
  async listRatingTargetsForModeration(status?: "pending" | "published" | "rejected" | "hidden") {
    // 审核页需要把"榜单"视角重新折叠成"评分对象"视角，方便独立分页和筛选。
    const rankings = await this.listCommunityRankingsForModeration();
    const details = await Promise.all(
      rankings.items.map(async (ranking) => {
        try {
          const detail = await this.getRankingDetail(ranking.id);
          return detail.item;
        } catch {
          return null;
        }
      })
    );

    return {
      items: details
        .filter((item): item is AdminRankingDetailRecord => item !== null)
        .flatMap((ranking) =>
          ranking.items
            .filter((item) => (status ? item.status === status : true))
            .map((item) => ({
              ...item,
              rankingId: ranking.id,
              rankingTitle: ranking.title,
              rankingAuthorName: ranking.author.displayName
            }))
        )
    };
  },
  getSiteSettings() {
    return sharedClient.getAdminSiteSettings();
  },
  getAiSettings() {
    return getJson<{ item: AiSettingsResponse }>(API_ROUTES.ai.adminSettings);
  },
  updateAiSettings(input: AiSettings) {
    return putJson<{ item: AiSettingsResponse }>(API_ROUTES.ai.adminSettings, input);
  },
  testAiConnection() {
    return postJson<{ success: boolean; message: string }>(
      `${API_ROUTES.ai.adminSettings}/test`,
      {}
    );
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
   * 生成 AI 摘要
   * @param postId 文章 ID
   * @param content 文章内容（可选，不传则后端从 DB 取）
   * @returns 摘要文本和是否缓存命中
   */
  generateAiSummary(postId: string, content?: string) {
    return postJson<{ summary: string; cached: boolean }>(API_ROUTES.ai.summary, {
      postId,
      content
    });
  },
  listAdminRatingTargets(status?: "pending" | "published" | "rejected" | "hidden") {
    return sharedClient.listAdminRatingTargets(status);
  },
  listAdminReportsSummary() {
    return sharedClient.listAdminReportsSummary();
  },
  getAdminModel(id: string) {
    return sharedClient.getAdminModel(id);
  },
  getAdminAuthSessions() {
    return getJson<{ items: AdminAuthSessionItem[] }>(API_ROUTES.auth.adminSessions);
  },
  changeAdminPassword(input: {
    currentPassword: string;
    newPassword: string;
  }) {
    return sharedClient.changeAdminPassword(input);
  },
  updateSiteSettings(input: UpdateSiteSettingsInput) {
    return sharedClient.updateAdminSiteSettings(input);
  },
  createOfficialArticle(input: OfficialArticleInput) {
    return sharedClient.createPost({
      type: "article",
      title: input.title,
      content: input.content,
      contentHtml: input.contentHtml ?? null,
      contentCategoryId: input.contentCategoryId,
      sourceLabel: input.sourceLabel ?? null,
      sourceUrl: input.sourceUrl ?? null,
      declaration: input.declaration ?? '',
      imageIds: input.imageIds ?? [],
      videoIds: input.videoIds ?? []
    });
  },
  uploadImage(file: File) {
    return sharedClient.uploadPostImage(file);
  },
  getAdminRoles() {
    return getJson<{
      roles: Record<string, string[]>;
    }>(withApiV1Prefix("/admin/roles"));
  },
  updateAdminRole(name: string, permissions: string[]) {
    return putJson<{ success: boolean }>(
      withApiV1Prefix(`/admin/roles/${encodeURIComponent(name)}`),
      { permissions }
    );
  }
};

function wrapAdminApiClient<T extends Record<string, unknown>>(client: T): T {
  return new Proxy(client, {
    get(target, prop: string | symbol) {
      const value = target[prop as keyof T];
      if (typeof value !== "function") {
        return value;
      }

      return async (...args: unknown[]) => {
        try {
          return await (value as (...innerArgs: unknown[]) => Promise<unknown>)(...args);
        } catch (error) {
          if (error instanceof ApiClientError && error.code === "TOKEN_EXPIRED" && await refreshSession()) {
            return await (value as (...innerArgs: unknown[]) => Promise<unknown>)(...args);
          }
          if (isAdminAuthInvalidError(error)) {
            dispatchAdminAuthInvalidEvent();
          }
          throw error;
        }
      };
    }
  });
}

/**
 * 判断错误是否意味着管理员登录态已经失效。
 *
 * @param error 待判断的错误对象。
 * @returns 命中鉴权错误码或典型鉴权文案时返回 `true`。
 * @throws {never} 该函数只做错误对象解析，不会主动抛出异常。
 */
function isAdminAuthInvalidError(error: unknown) {
  if (error instanceof ApiClientError) {
    return ADMIN_AUTH_INVALID_CODES.has(error.code ?? "");
  }

  return (
    error instanceof Error &&
    /登录|unauthorized|Authorization required|forbidden|权限不足/i.test(error.message)
  );
}

export const apiClient = wrapAdminApiClient(rawApiClient);
