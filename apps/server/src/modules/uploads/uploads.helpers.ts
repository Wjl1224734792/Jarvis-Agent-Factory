import {
  buildStorageObjectUrl,
  createStorageProvider,
  resolveStorageProviderConfig,
  shouldUseSignedReadUrl
} from "../../lib/storage-provider";
import { getCachedFileUrl, setCachedFileUrl } from "../../lib/request-metrics";
import { uploadsRepo } from "./upload.repo";

type ResolveUploadedFileAudience = "internal" | "public";

const publicAuditPassStatuses = new Set(["passed", "manual_passed"]);

function resolveReadStorageAccess() {
  const config = resolveStorageProviderConfig();
  const shouldPresign = shouldUseSignedReadUrl(config);

  return {
    config,
    provider: shouldPresign ? createStorageProvider(config) : null
  };
}

function buildFileUrlCacheKey(fileId: string, audience: ResolveUploadedFileAudience) {
  return `${audience}:${fileId}`;
}

function canPubliclyServeFile(input: {
  file: Awaited<ReturnType<typeof uploadsRepo.getFileById>>;
}) {
  if (!input.file || input.file.status !== "uploaded") {
    return false;
  }

  if (input.file.provider !== "kodo") {
    return true;
  }

  if (input.file.mediaKind !== "image" && input.file.mediaKind !== "video") {
    return true;
  }

  return publicAuditPassStatuses.has(input.file.currentAuditStatus ?? "");
}

async function resolveUploadedFileUrlMapByAudience(
  fileIds: Array<string | null | undefined>,
  audience: ResolveUploadedFileAudience
) {
  const uniqueIds = Array.from(
    new Set(
      fileIds.filter(
        (fileId): fileId is string => typeof fileId === "string" && fileId.length > 0
      )
    )
  );
  const urlMap = new Map<string, string | null>();
  const unresolvedIds: string[] = [];

  for (const fileId of uniqueIds) {
    const cacheKey = buildFileUrlCacheKey(fileId, audience);
    const cached = getCachedFileUrl(cacheKey);
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

        if (
          audience === "public" &&
          !canPubliclyServeFile({
            file
          })
        ) {
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
      setCachedFileUrl(buildFileUrlCacheKey(fileId, audience), url);
    }

    return urlMap;
  }

  for (const fileId of unresolvedIds) {
    const file = fileById.get(fileId);
    if (!file) {
      urlMap.set(fileId, null);
      setCachedFileUrl(buildFileUrlCacheKey(fileId, audience), null);
      continue;
    }

    if (
      audience === "public" &&
      !canPubliclyServeFile({
        file
      })
    ) {
      urlMap.set(fileId, null);
      setCachedFileUrl(buildFileUrlCacheKey(fileId, audience), null);
      continue;
    }

    const url = buildStorageObjectUrl(config, file.objectKey);
    urlMap.set(fileId, url);
    setCachedFileUrl(buildFileUrlCacheKey(fileId, audience), url);
  }

  return urlMap;
}

export async function resolveUploadedFileUrl(
  fileId: string | null | undefined
) {
  if (!fileId) {
    return null;
  }

  const fileUrlMap = await resolveUploadedFileUrlMapByAudience([fileId], "internal");
  return fileUrlMap.get(fileId) ?? null;
}

export async function resolvePublicUploadedFileUrl(
  fileId: string | null | undefined
) {
  if (!fileId) {
    return null;
  }

  const fileUrlMap = await resolveUploadedFileUrlMapByAudience([fileId], "public");
  return fileUrlMap.get(fileId) ?? null;
}

export async function resolveUploadedFileUrls(fileIds: Array<string | null | undefined>) {
  const fileUrlMap = await resolveUploadedFileUrlMapByAudience(fileIds, "internal");
  return fileIds
    .map((fileId) => (fileId ? fileUrlMap.get(fileId) ?? null : null))
    .filter((value): value is string => Boolean(value));
}

export async function resolvePublicUploadedFileUrls(
  fileIds: Array<string | null | undefined>
) {
  const fileUrlMap = await resolveUploadedFileUrlMapByAudience(fileIds, "public");
  return fileIds
    .map((fileId) => (fileId ? fileUrlMap.get(fileId) ?? null : null))
    .filter((value): value is string => Boolean(value));
}

export async function resolveUploadedFileUrlMap(fileIds: Array<string | null | undefined>) {
  return resolveUploadedFileUrlMapByAudience(fileIds, "internal");
}

export async function resolvePublicUploadedFileUrlMap(
  fileIds: Array<string | null | undefined>
) {
  return resolveUploadedFileUrlMapByAudience(fileIds, "public");
}
