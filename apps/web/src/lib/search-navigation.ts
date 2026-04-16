import { APP_ROUTES } from "@feijia/shared";

export function normalizeSearchQuery(value: string) {
  return value.trim();
}

export function buildSearchLocation(rawValue: string, options?: { type?: string }) {
  const query = normalizeSearchQuery(rawValue);
  const params = new URLSearchParams();
  if (query.length > 0) {
    params.set("q", query);
  }
  if (options?.type) {
    params.set("type", options.type);
  }
  const search = params.toString();

  return {
    pathname: APP_ROUTES.search,
    search: search.length > 0 ? `?${search}` : ""
  };
}

export function shouldShowCompactSearchBar(pathname: string) {
  return pathname === APP_ROUTES.search;
}
