import { keepPreviousData } from "@tanstack/react-query";

/** 首页信息流请求超时（毫秒），供 React Query 与 fetch `AbortSignal` 使用 */
export const HOME_FEED_FETCH_TIMEOUT_MS = 20_000;
/** 首页信息流缓存保鲜时长，避免短时间切换 Tab 立即闪烁重载 */
export const HOME_FEED_QUERY_STALE_TIME_MS = 60_000;
/** 首页信息流缓存保留时长，保证 Tab/分类之间来回切换可复用已加载结果 */
export const HOME_FEED_QUERY_GC_TIME_MS = 10 * 60_000;

export type HomeFeedTabId = "recommended" | "latest" | "following";

const HOME_FEED_QUERY_NAMESPACE = "home-shell-feed";

export type HomeFeedQueryKey = readonly [
  typeof HOME_FEED_QUERY_NAMESPACE,
  HomeFeedTabId,
  string | null
];

type QueryKeyLike = readonly unknown[];

type PreviousQueryLike = {
  queryKey: QueryKeyLike;
};

export function normalizeHomeFeedCategorySlug(categorySlug: string | null | undefined) {
  const normalized = categorySlug?.trim();
  return normalized ? normalized : null;
}

/** 首页推荐流 queryKey，必须携带 tab 与 category 维度以避免跨分类串页。 */
export function getHomeFeedQueryKey(
  tab: HomeFeedTabId,
  categorySlug: string | null | undefined
): HomeFeedQueryKey {
  return [HOME_FEED_QUERY_NAMESPACE, tab, normalizeHomeFeedCategorySlug(categorySlug)];
}

function isHomeFeedTabId(value: unknown): value is HomeFeedTabId {
  return value === "recommended" || value === "latest" || value === "following";
}

function isHomeFeedQueryKey(queryKey: QueryKeyLike): queryKey is HomeFeedQueryKey {
  if (queryKey.length !== 3) {
    return false;
  }

  const [namespace, tab, categorySlug] = queryKey;
  return (
    namespace === HOME_FEED_QUERY_NAMESPACE &&
    isHomeFeedTabId(tab) &&
    (typeof categorySlug === "string" || categorySlug === null)
  );
}

function isSameHomeFeedQueryKey(queryKey: QueryKeyLike, targetQueryKey: HomeFeedQueryKey) {
  if (!isHomeFeedQueryKey(queryKey)) {
    return false;
  }

  return (
    queryKey[0] === targetQueryKey[0] &&
    queryKey[1] === targetQueryKey[1] &&
    queryKey[2] === targetQueryKey[2]
  );
}

/**
 * 仅当 queryKey 完全一致时保留旧数据，避免切换 Tab/分类时出现错误占位内容。
 * 这会保留同 key 重请求的稳定体验，同时杜绝跨 key 视觉串页。
 */
export function resolveHomeFeedPlaceholderData<TData>(
  previousData: TData | undefined,
  previousQuery: PreviousQueryLike | undefined,
  currentQueryKey: HomeFeedQueryKey
) {
  if (typeof previousData === "undefined" || !previousQuery) {
    return undefined;
  }

  if (!isSameHomeFeedQueryKey(previousQuery.queryKey, currentQueryKey)) {
    return undefined;
  }

  return keepPreviousData(previousData);
}

/**
 * 合并 TanStack Query 的取消信号与超时，便于 `listHomeFeed` 中止请求。
 * 环境不支持 `AbortSignal.any` 时仅使用超时信号。
 */
export function combineHomeFeedRequestSignal(querySignal: AbortSignal | undefined): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(HOME_FEED_FETCH_TIMEOUT_MS);
  if (typeof AbortSignal !== "undefined" && "any" in AbortSignal && typeof AbortSignal.any === "function") {
    return querySignal ? AbortSignal.any([querySignal, timeoutSignal]) : timeoutSignal;
  }
  return timeoutSignal;
}

export function getHomeFeedErrorDescription(error: unknown, timeoutMs: number): string {
  const seconds = Math.max(1, Math.round(timeoutMs / 1000));

  if (error instanceof DOMException) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return `请求超时（${seconds} 秒内未完成），请稍后重试。`;
    }
  }

  if (error instanceof Error) {
    const msg = error.message;
    if (/aborted|timeout|timed out/i.test(msg)) {
      return `请求超时（${seconds} 秒内未完成），请稍后重试。`;
    }
    if (/Failed to fetch|NetworkError|network|Load failed/i.test(msg)) {
      return `网络异常，请检查连接后重试。（${msg}）`;
    }
    return msg;
  }

  return "加载失败，请稍后重试。";
}
