// Web 侧把“由页面自己维护的派生路径”集中在这里，避免和共享 APP_ROUTES 混在一起。
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

/**
 * 构建安全外跳页路由，统一承载外链跳转确认流程。
 *
 * @param target 目标外链地址。
 * @param fromPath 可选的来源站内路径，用于返回按钮与安全校验。
 * @returns 带查询参数的安全跳转页路径。
 * @throws {never} 该函数只拼接查询参数，不会主动抛出异常。
 */
export function buildSafeRedirectPath(target: string, fromPath?: string) {
  const query = new URLSearchParams({
    target
  });
  if (fromPath) {
    query.set("from", fromPath);
  }

  return `${WEB_ROUTE_PATHS.safeRedirect}?${query.toString()}`;
}

/**
 * 规范化安全跳转页里的来源路径，避免开放重定向或回跳死循环。
 *
 * @param value 候选来源路径。
 * @returns 校验通过的站内路径；不合法时统一回退到首页。
 * @throws {never} 非法路径会直接回退，不会主动抛出异常。
 */
export function normalizeSafeRedirectFromPath(
  value: string | null | undefined
) {
  const fallback = "/";
  const path = value?.trim();
  if (!path) {
    return fallback;
  }

  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.startsWith("\\") ||
    path.includes("\\")
  ) {
    return fallback;
  }

  if (
    path === WEB_ROUTE_PATHS.safeRedirect ||
    path.startsWith(`${WEB_ROUTE_PATHS.safeRedirect}?`) ||
    path.startsWith(`${WEB_ROUTE_PATHS.safeRedirect}#`)
  ) {
    return fallback;
  }

  try {
    const baseOrigin = "https://feijia.local";
    const url = new URL(path, baseOrigin);
    if (
      url.origin !== baseOrigin ||
      `${url.pathname}${url.search}${url.hash}` !== path
    ) {
      return fallback;
    }
  } catch {
    return fallback;
  }

  return path;
}

/**
 * 判断一个链接是否为需要走安全跳转页的外部 HTTP 链接。
 *
 * @param value 待判断的链接值。
 * @param currentOrigin 当前站点 origin。
 * @returns 指向外站且协议为 HTTP/HTTPS 时返回 `true`。
 * @throws {never} URL 解析失败时会返回 `false`，不会主动抛出异常。
 */
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

/**
 * 在新标签页中打开详情页，并显式切断 `opener`。
 *
 * @param path 需要打开的站内详情页路径。
 * @returns 无返回值；SSR 或浏览器阻止弹窗时静默跳过。
 * @throws {never} 该函数只在浏览器环境尝试打开新窗口，不会主动抛出异常。
 */
export function openDetailPageInNewTab(path: string) {
  if (typeof window === "undefined") {
    return;
  }

  const openedWindow = window.open(path, "_blank", "noopener,noreferrer");
  if (openedWindow) {
    openedWindow.opener = null;
  }
}
