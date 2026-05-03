export {
  buildStorageObjectUrl,
  createStorageProvider,
  createStorageUploader,
  isStorageProviderExplicitlyConfigured,
  resolveStorageProviderConfig,
  shouldUseSignedReadUrl
} from "../modules/posts/storage-provider";

export type {
  StorageObjectHead,
  StorageProvider,
  StorageProviderConfig,
  StorageUploadDescriptor,
  StorageUploadInput,
  StorageUploadResult
} from "../modules/posts/storage-provider";
