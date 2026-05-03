// 兼容桥接层：storage provider 已归位到 `src/lib`，
// 旧模块路径继续保留导出，避免分阶段收敛时打断现有引用。
export {
  buildStorageObjectUrl,
  createStorageProvider,
  createStorageUploader,
  isStorageProviderExplicitlyConfigured,
  resolveStorageProviderConfig,
  shouldUseSignedReadUrl
} from '../../lib/storage-provider';

export type {
  StorageObjectHead,
  StorageProvider,
  StorageProviderConfig,
  StorageUploadDescriptor,
  StorageUploadInput,
  StorageUploadResult
} from '../../lib/storage-provider';
