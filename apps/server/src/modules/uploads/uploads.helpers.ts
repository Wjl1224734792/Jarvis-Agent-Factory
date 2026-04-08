import {
  buildStorageObjectUrl,
  createStorageProvider,
  resolveStorageProviderConfig
} from "../posts/storage-provider";
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

  const file = await uploadsRepo.getFileById(fileId);
  if (!file) {
    return null;
  }

  const config = resolveStorageProviderConfig();
  if (shouldPresignReadUrls(config.endpoint)) {
    const provider = createStorageProvider(config);
    // 不传 filename，避免 Response-Disposition: attachment 影响 <img src> 内联展示
    return provider.getDownloadUrl({
      objectKey: file.objectKey,
      expiresIn: 60 * 60
    });
  }

  return buildStorageObjectUrl(config, file.objectKey);
}

export async function resolveUploadedFileUrls(fileIds: Array<string | null | undefined>) {
  const urls = await Promise.all(fileIds.map((fileId) => resolveUploadedFileUrl(fileId)));
  return urls.filter((value): value is string => Boolean(value));
}
