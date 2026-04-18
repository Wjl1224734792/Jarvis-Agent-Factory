import { AsyncLocalStorage } from "node:async_hooks";

type RequestMetricsStore = {
  fileLookupCount: number;
  fileUrlCache: Map<string, string | null>;
};

const requestMetricsStorage = new AsyncLocalStorage<RequestMetricsStore>();

function isTruthyEnv(value: string | undefined) {
  if (!value?.trim()) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function isApiMetricsEnabled() {
  return isTruthyEnv(process.env.API_METRICS_ENABLED);
}

export function runWithRequestMetrics<T>(callback: () => Promise<T>) {
  return requestMetricsStorage.run({ fileLookupCount: 0, fileUrlCache: new Map() }, callback);
}

export function incrementFileLookupCount() {
  const store = requestMetricsStorage.getStore();
  if (!store) {
    return;
  }

  store.fileLookupCount += 1;
}

export function getRequestFileLookupCount() {
  return requestMetricsStorage.getStore()?.fileLookupCount ?? 0;
}

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

export function setCachedFileUrl(fileId: string, url: string | null) {
  const store = requestMetricsStorage.getStore();
  if (!store) {
    return;
  }

  store.fileUrlCache.set(fileId, url);
}
