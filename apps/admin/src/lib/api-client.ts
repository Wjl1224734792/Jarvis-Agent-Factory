import { createApiClient } from "@feijia/http-client";
import { API_ROUTES, APP_PORTS } from "@feijia/shared";

const fallbackBaseUrl = `http://localhost:${APP_PORTS.server}`;
const baseUrl =
  import.meta.env.VITE_ADMIN_API_BASE_URL?.trim() || fallbackBaseUrl;

const sharedClient = createApiClient({
  baseUrl
});

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
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
  const response = await fetch(`${baseUrl}${path}`, {
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
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    credentials: "include"
  });

  return parseResponse<T>(response);
}

type AdminRankingItem = {
  id: string;
  rank: number;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  brandName: string | null;
  averageScore: number;
  linkedModel: {
    slug: string;
    name: string;
    brand: {
      name: string;
    };
  } | null;
};

type AdminRankingListItem = {
  id: string;
  type: "official" | "community";
  title: string;
  description: string;
  coverImageUrl: string | null;
  averageScore: number;
  commentCount: number;
  itemCount: number;
  items: AdminRankingItem[];
};

type AdminRankingDetail = AdminRankingListItem & {
  itemAddPolicy: "public" | "owner";
  viewer: {
    canEdit: boolean;
    canAddItems: boolean;
  };
};

type RankingDraftItemInput = {
  title: string;
  summary: string | null;
  imageUrl: string | null;
  brandName: string | null;
  linkedModelSlug: string | null;
};

type OfficialRankingUpsertInput = {
  type: "official";
  title: string;
  description: string;
  coverImageUrl: string | null;
  itemAddPolicy: "owner";
  items: RankingDraftItemInput[];
};

type SiteSettings = {
  postModerationEnabled: boolean;
  commentModerationEnabled?: boolean;
  reviewModerationEnabled?: boolean;
  submissionModerationEnabled?: boolean;
  updatedAt?: string;
};

type AnalyticsSeriesPoint = {
  label: string;
  value: number;
};

type AdminAnalyticsOverview = {
  totals: {
    users: number;
    moments: number;
    articles: number;
    aircraft: number;
    rankings: number;
    pending: number;
  };
  registration: {
    today: number;
    month: number;
    year: number;
    daily: AnalyticsSeriesPoint[];
    monthly: AnalyticsSeriesPoint[];
    yearly: AnalyticsSeriesPoint[];
  };
  activity: {
    dau: number;
    mau: number;
    yau: number;
    daily: AnalyticsSeriesPoint[];
    monthly: AnalyticsSeriesPoint[];
    yearly: AnalyticsSeriesPoint[];
  };
  contentMix: Array<{
    type: "moment" | "article" | "aircraft" | "ranking";
    label: string;
    value: number;
  }>;
  moderation: Array<{
    key: "posts" | "comments" | "reviews" | "submissions";
    label: string;
    pending: number;
    approved: number;
    rejected: number;
  }>;
  funnel: Array<{
    stage: string;
    value: number;
  }>;
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

function averageScore(items: AdminRankingItem[]) {
  if (items.length === 0) {
    return 0;
  }

  return items.reduce((sum, item) => sum + item.averageScore, 0) / items.length;
}

function normalizeOfficialRankings(payload: Awaited<ReturnType<typeof sharedClient.listRankings>>) {
  const official = payload.official as unknown;
  if (Array.isArray(official)) {
    return official as AdminRankingListItem[];
  }

  const legacyOfficial = official as { items: AdminRankingItem[] };
  return legacyOfficialDefinitions.map((definition, index) => {
    const items = legacyOfficial.items.slice(index, index + 3) as AdminRankingItem[];
    return {
      id: definition.id,
      type: "official" as const,
      title: definition.title,
      description: definition.description,
      coverImageUrl: null,
      averageScore: averageScore(items),
      commentCount: 0,
      itemCount: items.length,
      items
    };
  });
}

export const apiClient = {
  ...sharedClient,
  getAdminAnalyticsOverview() {
    return sharedClient.getAdminAnalyticsOverview();
  },
  listAdminContentCategories() {
    return sharedClient.listAdminContentCategories();
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
      categoryId: string | null;
      sortOrder: number;
      isEnabled: boolean;
    }>>(API_ROUTES.models.brands);
  },
  createCategory(input: {
    slug: string;
    name: string;
    sortOrder: number;
    isEnabled: boolean;
  }) {
    return postJson<{ item: { id: string; slug: string; name: string } }>(
      API_ROUTES.models.categories,
      input
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
    return sharedClient.listRankings().then((payload) => ({
      items: normalizeOfficialRankings(payload)
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
  getSiteSettings() {
    return getJson<{ item: SiteSettings }>(API_ROUTES.admin.siteSettings);
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
