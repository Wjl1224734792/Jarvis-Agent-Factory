import { AsyncLocalStorage } from 'node:async_hooks';
import { isTruthyEnvValue } from './env-flags';

interface RequestMetricsStore {
  fileLookupCount: number;
  fileUrlCache: Map<string, string | null>;
}

const requestMetricsStorage = new AsyncLocalStorage<RequestMetricsStore>();

/**
 * 判断是否开启接口性能基线采样日志。
 *
 * @returns 仅当 `API_METRICS_ENABLED` 命中真值集合时返回 `true`。
 * @throws {never} 该函数只读取环境变量，不会抛出异常。
 */
export function isApiMetricsEnabled() {
  return isTruthyEnvValue(process.env.API_METRICS_ENABLED);
}

/**
 * 在一次请求作用域内初始化文件 URL 查找指标与缓存。
 *
 * @param callback 需要在请求上下文中运行的异步回调。
 * @returns 回调执行结果。
 * @throws {Error} 当回调内部抛出异常时会继续向上透传。
 */
export function runWithRequestMetrics<T>(callback: () => Promise<T>) {
  return requestMetricsStorage.run(
    { fileLookupCount: 0, fileUrlCache: new Map() },
    callback
  );
}

/**
 * 累加当前请求中的文件地址查找次数。
 *
 * @returns 无返回值；当请求上下文不存在时静默跳过。
 * @throws {never} 缺少请求上下文时不会抛出异常。
 */
export function incrementFileLookupCount() {
  const store = requestMetricsStorage.getStore();
  if (!store) {
    return;
  }

  store.fileLookupCount += 1;
}

/**
 * 读取当前请求的文件地址查找次数。
 *
 * @returns 当前请求累计的查找次数；无上下文时返回 `0`。
 * @throws {never} 该函数只读取当前上下文，不会抛出异常。
 */
export function getRequestFileLookupCount() {
  return requestMetricsStorage.getStore()?.fileLookupCount ?? 0;
}

/**
 * 读取当前请求内缓存过的文件地址。
 *
 * @param fileId 业务文件 ID。
 * @returns 命中状态与缓存值；未命中时统一返回 `{ hit: false, value: null }`。
 * @throws {never} 无请求上下文或缓存缺失时不会抛出异常。
 */
export function getCachedFileUrl(fileId: string) {
  const store = requestMetricsStorage.getStore();
  if (!store) {
    return { hit: false as const, value: null as string | null };
  }

  if (!store.fileUrlCache.has(fileId)) {
    return { hit: false as const, value: null as string | null };
  }

  return { hit: true as const, value: store.fileUrlCache.get(fileId) ?? null };
}

/**
 * 写入当前请求内的文件地址缓存。
 *
 * @param fileId 业务文件 ID。
 * @param url 已解析出的文件地址，允许显式缓存 `null`。
 * @returns 无返回值；无请求上下文时静默跳过。
 * @throws {never} 缺少请求上下文时不会抛出异常。
 */
export function setCachedFileUrl(fileId: string, url: string | null) {
  const store = requestMetricsStorage.getStore();
  if (!store) {
    return;
  }

  store.fileUrlCache.set(fileId, url);
}
