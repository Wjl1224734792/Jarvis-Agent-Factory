// Web 侧把"由页面自己维护的派生路径"集中在这里，避免和共享 APP_ROUTES 混在一起。
export const WEB_ROUTE_PATHS = {
  publishArticle: "/publish/article",
  publishMoment: "/publish/moment",
  publishAircraft: "/publish/aircraft",
  publishStatus: "/publish/status/:kind/:id",
  safeRedirect: "/safe-redirect",
  rankingDetail: "/rankings/:id",
  ratingTargetDetail: "/rating-targets/:id"
} as const;

export const DETAIL_PAGE_LINK_PROPS = {
  target: "_blank",
  rel: "noopener noreferrer"
} as const;

export type PublishStatusKind = "article" | "moment" | "aircraft" | "ranking";

function replacePathParam(path: string, key: string, value: string) {
  return path.replace(`:${key}`, value);
}

export function buildRankingDetailPath(id: string) {
  return replacePathParam(WEB_ROUTE_PATHS.rankingDetail, "id", id);
}

export function buildRatingTargetDetailPath(id: string) {
  return replacePathParam(WEB_ROUTE_PATHS.ratingTargetDetail, "id", id);
}

export function buildPublishStatusPath(kind: PublishStatusKind, id: string) {
  return replacePathParam(
    replacePathParam(WEB_ROUTE_PATHS.publishStatus, "kind", kind),
    "id",
    id
  );
}

export function buildSafeRedirectPath(target: string, fromPath?: string) {
  const query = new URLSearchParams({
    target
  });
  if (fromPath) {
    query.set("from", fromPath);
  }
  return `${WEB_ROUTE_PATHS.safeRedirect}?${query.toString()}`;
}

export function isExternalHttpUrl(value: string, currentOrigin: string) {
  try {
    const url = new URL(value, currentOrigin);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    return url.origin !== currentOrigin;
  } catch {
    return false;
  }
}

export function openDetailPageInNewTab(path: string) {
  if (typeof window === "undefined") {
    return;
  }

  const openedWindow = window.open(path, "_blank", "noopener,noreferrer");
  if (openedWindow) {
    openedWindow.opener = null;
  }
}
