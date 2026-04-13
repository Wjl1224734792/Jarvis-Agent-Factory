import { APP_ROUTES } from "@feijia/shared";

export function normalizeSearchQuery(value: string) {
  return value.trim();
}

export function buildSearchLocation(rawValue: string) {
  const query = normalizeSearchQuery(rawValue);

  return {
    pathname: APP_ROUTES.search,
    search: query.length > 0 ? `?q=${encodeURIComponent(query)}` : ""
  };
}

export function shouldShowCompactSearchBar(pathname: string) {
  return pathname === APP_ROUTES.search;
}
