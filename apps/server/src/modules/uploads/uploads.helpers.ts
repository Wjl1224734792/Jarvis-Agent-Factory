import {
  buildStorageObjectUrl,
  createStorageProvider,
  resolveStorageProviderConfig
} from "../posts/storage-provider";
import { uploadsRepo } from "./upload.repo";

function shouldUseSignedUrlForDev(endpoint: string) {
  return (
    process.env.NODE_ENV === "development" &&
    (endpoint.includes("localhost") || endpoint.includes("127.0.0.1"))
  );
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
  if (shouldUseSignedUrlForDev(config.endpoint)) {
    const provider = createStorageProvider(config);
    return provider.getDownloadUrl({
      objectKey: file.objectKey,
      expiresIn: 60 * 60,
      filename: file.fileName
    });
  }

  return buildStorageObjectUrl(config, file.objectKey);
}

export async function resolveUploadedFileUrls(fileIds: Array<string | null | undefined>) {
  const urls = await Promise.all(fileIds.map((fileId) => resolveUploadedFileUrl(fileId)));
  return urls.filter((value): value is string => Boolean(value));
}
