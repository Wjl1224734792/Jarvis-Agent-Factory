import {
  buildStorageObjectUrl,
  createStorageProvider,
  resolveStorageProviderConfig
} from "../../lib/storage-provider";
import { getCachedFileUrl, setCachedFileUrl } from "../../lib/request-metrics";
import { uploadsRepo } from "./upload.repo";

function isTruthyEnv(value: string | undefined) {
  if (!value?.trim()) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

/** 仅当 endpoint 为本机地址时才预签名，避免 Docker 内网 host（如 minio:9000）生成浏览器不可达的 URL */
function isLocalhostStorageEndpoint(endpoint: string) {
  return endpoint.includes("localhost") || endpoint.includes("127.0.0.1");
}

/**
 * 非 production（含 NODE_ENV 未设置）时对本机 MinIO 使用预签名 GET，避免默认桶无匿名读导致直链 403。
 * 生产若本地联调仍需预签名，可设 STORAGE_PRESIGN_READ_URLS=1（仍要求 endpoint 含 localhost/127.0.0.1）。
 */
function shouldPresignReadUrls(endpoint: string) {
  if (!isLocalhostStorageEndpoint(endpoint)) {
    return false;
  }

  const nonProduction = process.env.NODE_ENV !== "production";
  return nonProduction || isTruthyEnv(process.env.STORAGE_PRESIGN_READ_URLS);
}

export async function resolveUploadedFileUrl(fileId: string | null | undefined) {
  if (!fileId) {
    return null;
  }

  const cached = getCachedFileUrl(fileId);
  if (cached.hit) {
    return cached.value;
  }

  const file = await uploadsRepo.getFileById(fileId);
  if (!file) {
    setCachedFileUrl(fileId, null);
    return null;
  }

  const config = resolveStorageProviderConfig();
  if (shouldPresignReadUrls(config.endpoint)) {
    const provider = createStorageProvider(config);
    // 不传 filename，避免 Response-Disposition: attachment 影响 <img src> 内联展示
    const url = await provider.getDownloadUrl({
      objectKey: file.objectKey,
      expiresIn: 60 * 60
    });
    setCachedFileUrl(fileId, url);
    return url;
  }

  const url = buildStorageObjectUrl(config, file.objectKey);
  setCachedFileUrl(fileId, url);
  return url;
}

export async function resolveUploadedFileUrls(fileIds: Array<string | null | undefined>) {
  const fileUrlMap = await resolveUploadedFileUrlMap(fileIds);
  return fileIds
    .map((fileId) => (fileId ? fileUrlMap.get(fileId) ?? null : null))
    .filter((value): value is string => Boolean(value));
}

export async function resolveUploadedFileUrlMap(fileIds: Array<string | null | undefined>) {
  const uniqueIds = Array.from(
    new Set(fileIds.filter((fileId): fileId is string => typeof fileId === "string" && fileId.length > 0))
  );
  const urlMap = new Map<string, string | null>();
  const unresolvedIds: string[] = [];

  for (const fileId of uniqueIds) {
    const cached = getCachedFileUrl(fileId);
    if (cached.hit) {
      urlMap.set(fileId, cached.value);
      continue;
    }
    unresolvedIds.push(fileId);
  }

  if (unresolvedIds.length === 0) {
    return urlMap;
  }

  const files = await uploadsRepo.listFilesByIds(unresolvedIds);
  const fileById = new Map(files.map((file) => [file.id, file]));
  const config = resolveStorageProviderConfig();
  const provider = shouldPresignReadUrls(config.endpoint) ? createStorageProvider(config) : null;

  for (const fileId of unresolvedIds) {
    const file = fileById.get(fileId);
    if (!file) {
      urlMap.set(fileId, null);
      setCachedFileUrl(fileId, null);
      continue;
    }

    if (provider) {
      const url = await provider.getDownloadUrl({
        objectKey: file.objectKey,
        expiresIn: 60 * 60
      });
      urlMap.set(fileId, url);
      setCachedFileUrl(fileId, url);
      continue;
    }

    const url = buildStorageObjectUrl(config, file.objectKey);
    urlMap.set(fileId, url);
    setCachedFileUrl(fileId, url);
  }

  return urlMap;
}
