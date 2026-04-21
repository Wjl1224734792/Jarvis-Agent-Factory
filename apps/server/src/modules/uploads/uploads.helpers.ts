import {
  buildStorageObjectUrl,
  createStorageProvider,
  resolveStorageProviderConfig,
  shouldUseSignedReadUrl
} from "../../lib/storage-provider";
import { getCachedFileUrl, setCachedFileUrl } from "../../lib/request-metrics";
import { uploadsRepo } from "./upload.repo";

function resolveReadStorageAccess() {
  const config = resolveStorageProviderConfig();
  const shouldPresign = shouldUseSignedReadUrl(config);

  return {
    config,
    provider: shouldPresign ? createStorageProvider(config) : null
  };
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

  const { config, provider } = resolveReadStorageAccess();
  if (provider) {
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
  const { config, provider } = resolveReadStorageAccess();

  if (provider) {
    const resolvedEntries = await Promise.all(
      unresolvedIds.map(async (fileId) => {
        const file = fileById.get(fileId);
        if (!file) {
          return [fileId, null] as const;
        }

        const url = await provider.getDownloadUrl({
          objectKey: file.objectKey,
          expiresIn: 60 * 60
        });
        return [fileId, url] as const;
      })
    );

    for (const [fileId, url] of resolvedEntries) {
      urlMap.set(fileId, url);
      setCachedFileUrl(fileId, url);
    }

    return urlMap;
  }

  for (const fileId of unresolvedIds) {
    const file = fileById.get(fileId);
    if (!file) {
      urlMap.set(fileId, null);
      setCachedFileUrl(fileId, null);
      continue;
    }

    const url = buildStorageObjectUrl(config, file.objectKey);
    urlMap.set(fileId, url);
    setCachedFileUrl(fileId, url);
  }

  return urlMap;
}
