import { createApiClient, parseApiError } from "@feijia/http-client";
import { API_ROUTES, APP_PORTS } from "@feijia/shared";
import { dispatchAdminAuthInvalidEvent } from "./auth-events";

const fallbackBaseUrl = `http://localhost:${APP_PORTS.server}`;
type AdminImportMetaEnv = {
  VITE_ADMIN_API_BASE_URL?: string;
};
const configuredBaseUrl = (import.meta.env as AdminImportMetaEnv).VITE_ADMIN_API_BASE_URL;

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
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
    if (!pageIsLoopback && apiIsLoopback) {
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
    if (response.status === 401) {
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

async function fetchWithAutoRefresh(
  input: RequestInfo,
  init: RequestInit
): Promise<Response> {
  return fetch(input, init);
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

type AdminRankingItem = {
  id: string;
  authorId?: string | null;
  status?: "pending" | "published" | "rejected" | "hidden";
  rank: number;
  title: string;
  summary: string | null;
  imageFileId?: string | null;
  imageUrl: string | null;
  brandName: string | null;
  averageScore: number;
  commentCount?: number;
  likeCount?: number;
  reportCount?: number;
  linkedModel: {
    slug: string;
    name: string;
    brand: {
      name: string;
    };
  } | null;
  viewer?: {
    canEdit: boolean;
    canDelete: boolean;
    hasReported: boolean;
  };
};

type AdminRankingListItem = {
  id: string;
  type: "official" | "community";
  status: "pending" | "published" | "rejected" | "hidden";
  rejectionReason?: string | null;
  title: string;
  coverImageFileId?: string | null;
  coverImageUrl: string | null;
  itemAddPolicy: "public" | "owner";
  averageScore: number;
  commentCount: number;
  reportCount?: number;
  itemCount: number;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    role: "user" | "admin";
  };
  items: AdminRankingItem[];
};

type AdminRankingDetail = AdminRankingListItem & {
  viewer: {
    canEdit: boolean;
    canAddItems: boolean;
  };
};

type RankingDraftItemInput = {
  title: string;
  summary: string | null;
  imageFileId: string | null;
  brandName: string | null;
  linkedModelSlug: string | null;
};

type OfficialRankingUpsertInput = {
  type: "official";
  title: string;
  coverImageFileId: string | null;
  itemAddPolicy: "public" | "owner";
  items: RankingDraftItemInput[];
};

export type SiteSettings = {
  postModerationEnabled: boolean;
  commentModerationEnabled?: boolean;
  reviewModerationEnabled?: boolean;
  submissionModerationEnabled?: boolean;
  rankingModerationEnabled?: boolean;
  articleModerationEnabled?: boolean;
  momentModerationEnabled?: boolean;
  brandModerationEnabled?: boolean;
  modelModerationEnabled?: boolean;
  ratingTargetModerationEnabled?: boolean;
  updatedAt?: string;
};

export type AdminAuthSessionItem = {
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
};

type OfficialArticleInput = {
  title: string;
  content: string;
  contentHtml?: string | null;
  contentCategoryId: string;
  imageIds?: string[];
  videoIds?: string[];
};

const legacyOfficialDefinitions = [
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
function averageScore(items: AdminRankingItem[]) {
  if (items.length === 0) {
    return 0;
  }

  return items.reduce((sum, item) => sum + item.averageScore, 0) / items.length;
}

function normalizeOfficialRankings(payload: Awaited<ReturnType<typeof sharedClient.listRankings>>) {
  const official = payload.official as AdminRankingListItem[] | { items: AdminRankingItem[] };
  if (Array.isArray(official)) {
    return official.map((item) => ({
      ...item,
      status: item.status ?? "published",
      itemAddPolicy: item.itemAddPolicy ?? "owner"
    }));
  }

  const legacyOfficial = official;
  return legacyOfficialDefinitions.map((definition, index) => {
    const items = legacyOfficial.items.slice(index, index + 3);
    return {
      id: definition.id,
      type: "official" as const,
      title: definition.title,
      coverImageFileId: null,
      coverImageUrl: null,
      status: "published" as const,
      itemAddPolicy: "owner" as const,
      averageScore: averageScore(items),
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
  getAdminLogsOverview() {
    return sharedClient.getAdminLogsOverview();
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
    return getJson<{ items: AdminRankingListItem[] }>("/admin/rankings?scope=official").catch(() =>
      sharedClient.listRankings().then((payload) => ({
        items: normalizeOfficialRankings(payload)
      }))
    );
  },
  listCommunityRankingsForModeration(status?: "pending" | "published" | "rejected" | "hidden") {
    const search = new URLSearchParams({ scope: "community" });
    if (status) {
      search.set("status", status);
    }

    return getJson<{ items: AdminRankingListItem[] }>(`/admin/rankings?${search.toString()}`);
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
      imageIds: input.imageIds ?? [],
      videoIds: input.videoIds ?? []
    });
  },
  deleteAdminOfficialArticle(id: string) {
    return sharedClient.deleteAdminOfficialArticle(id);
  },
  getRankingDetail(id: string) {
    return getJson<{ item: AdminRankingDetail }>(API_ROUTES.rankings.detail(id));
  },
  createRanking(input: OfficialRankingUpsertInput) {
    return postJson<{ item: AdminRankingDetail }>(API_ROUTES.rankings.create, input);
  },
  updateRanking(id: string, input: OfficialRankingUpsertInput) {
    return putJson<{ item: AdminRankingDetail }>(API_ROUTES.rankings.update(id), input);
  },
  addRankingItem(id: string, input: RankingDraftItemInput) {
    return postJson<{ item: AdminRankingDetail }>(API_ROUTES.rankings.items(id), input);
  },
  updateRankingStatus(
    id: string,
    input: { status: "published" | "rejected" | "hidden"; rejectionReason?: string | null }
  ) {
    return putJson<{ item: AdminRankingDetail }>(API_ROUTES.rankings.adminStatus(id), input);
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
        .filter((item): item is AdminRankingDetail => item !== null)
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
    return getJson<{ item: SiteSettings }>(API_ROUTES.admin.siteSettings);
  },
  getAdminAuthSessions() {
    return getJson<{ items: AdminAuthSessionItem[] }>("/admin/auth/sessions");
  },
  changeAdminPassword(input: {
    currentPassword: string;
    newPassword: string;
  }) {
    return sharedClient.changeAdminPassword(input);
  },
  updateSiteSettings(input: SiteSettings) {
    return putJson<{ item: SiteSettings }>(API_ROUTES.admin.siteSettings, input);
  },
  createOfficialArticle(input: OfficialArticleInput) {
    return sharedClient.createPost({
      type: "article",
      title: input.title,
      content: input.content,
      contentHtml: input.contentHtml ?? null,
      contentCategoryId: input.contentCategoryId,
      imageIds: input.imageIds ?? [],
      videoIds: input.videoIds ?? []
    });
  },
  uploadImage(file: File) {
    return sharedClient.uploadPostImage(file);
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
          if (
            error instanceof Error &&
            /登录|unauthorized|Authorization required/i.test(error.message)
          ) {
            dispatchAdminAuthInvalidEvent();
          }
          throw error;
        }
      };
    }
  });
}

export const apiClient = wrapAdminApiClient(rawApiClient);
