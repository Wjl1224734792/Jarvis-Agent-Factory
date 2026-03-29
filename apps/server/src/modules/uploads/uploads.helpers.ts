import { buildStorageObjectUrl, resolveStorageProviderConfig } from "../posts/storage-provider";
import { uploadsRepo } from "./upload.repo";

export async function resolveUploadedFileUrl(fileId: string | null | undefined) {
  if (!fileId) {
    return null;
  }

  const file = await uploadsRepo.getFileById(fileId);
  if (!file) {
    return null;
  }

  const config = resolveStorageProviderConfig();
  return buildStorageObjectUrl(config, file.objectKey);
}
