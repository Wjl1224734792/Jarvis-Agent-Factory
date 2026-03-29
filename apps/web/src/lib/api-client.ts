import { createApiClient } from "@feijia/http-client";
import { API_ROUTES, APP_PORTS } from "@feijia/shared";

const fallbackBaseUrl = `http://localhost:${APP_PORTS.server}`;

const resolvedBaseUrl =
  import.meta.env.VITE_WEB_API_BASE_URL?.trim() || fallbackBaseUrl;

const sharedClient = createApiClient({
  baseUrl: resolvedBaseUrl
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

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${resolvedBaseUrl}${path}`, {
    method: "GET",
    credentials: "include"
  });

  return parseResponse<T>(response);
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${resolvedBaseUrl}${path}`, {
    method: "POST",
    credentials: "include",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
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

export const apiClient = {
  ...sharedClient,
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
  }
};
