export type UploadTask<T> = {
  slot: string;
  file: File;
  run: (file: File) => Promise<T>;
};

export type UploadBatchMode = "parallel" | "serial";

export type UploadBatchResult<T> = Record<string, T[]>;

export type DraftFileRecord = {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  file: File;
};

export type DraftSnapshot<T> = {
  key: string;
  version: number;
  updatedAt: number;
  data: T;
  filesBySlot: Record<string, DraftFileRecord[]>;
};
