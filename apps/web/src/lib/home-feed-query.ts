/** 首页信息流请求超时（毫秒），供 React Query 与 fetch `AbortSignal` 使用 */
export const HOME_FEED_FETCH_TIMEOUT_MS = 20_000;

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
