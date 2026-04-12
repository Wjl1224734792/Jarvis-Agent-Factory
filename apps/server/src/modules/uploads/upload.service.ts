import { completeUploadResponseSchema, fileUrlResponseSchema, initUploadResponseSchema, type FileBizType } from "@feijia/schemas";
import { createStorageProvider, resolveStorageProviderConfig, buildStorageObjectUrl } from "../posts/storage-provider";
import { getUploadPolicy, isAllowedUploadMime } from "./upload.policy";
import { uploadsRepo, type StoredFileRecord } from "./upload.repo";
import { resolveUploadedFileUrl } from "./uploads.helpers";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";

// 优先保留用户原始扩展名；缺失时按 MIME 推导，最后再兜底成 .bin。
function normalizeExtension(fileName: string, contentType: string) {
  const fileExtension = extname(fileName).trim().toLowerCase();
  if (fileExtension) {
    return fileExtension.replace(/[^a-z0-9.]/g, "");
  }

  if (contentType.startsWith("image/")) {
    return `.${contentType.slice("image/".length).replace(/[^a-z0-9]/g, "") || "bin"}`;
  }

  if (contentType.startsWith("video/")) {
    return `.${contentType.slice("video/".length).replace(/[^a-z0-9]/g, "") || "bin"}`;
  }

  return ".bin";
}

// 对象键按业务类型、所属用户和 UTC 日期分层，便于排查、清理和控制命名冲突。
function buildObjectKey(bizType: FileBizType, ownerId: string, fileName: string, contentType: string) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const extension = normalizeExtension(fileName, contentType);
  return `${bizType}/${ownerId}/${yyyy}/${mm}/${dd}/${randomUUID()}${extension}`;
}

function serializeFileItem(file: NonNullable<StoredFileRecord>) {
  const config = resolveStorageProviderConfig();

  return {
    id: file.id,
    bizType: file.bizType as FileBizType,
    mediaKind: file.mediaKind as "image" | "video",
    status: file.status as "pending" | "uploaded" | "failed" | "deleted",
    visibility: file.visibility as "public" | "private",
    fileName: file.fileName,
    mimeType: file.mimeType,
    byteSize: file.byteSize,
    url: buildStorageObjectUrl(config, file.objectKey),
    uploadedAt: file.uploadedAt?.toISOString() ?? null
  };
}

function formatLimitMb(maxSize: number) {
  const sizeInMb = maxSize / (1024 * 1024);
  return Number.isInteger(sizeInMb) ? `${sizeInMb}` : sizeInMb.toFixed(2);
}

export const uploadsService = {
  async initUpload(input: {
    ownerId: string;
    bizType: FileBizType;
    fileName: string;
    contentType: string;
    byteSize: number;
  }) {
    // 初始化阶段只发放上传凭证并落 pending 记录，文件内容仍由客户端直传对象存储。
    const policy = getUploadPolicy(input.bizType);
    if (!isAllowedUploadMime(policy, input.contentType)) {
      return { kind: "invalid_mime" as const };
    }
    if (input.byteSize <= 0) {
      return { kind: "invalid_size" as const };
    }
    if (input.byteSize > policy.maxSize) {
      return {
        kind: "file_too_large" as const,
        maxSizeBytes: policy.maxSize,
        maxSizeMb: formatLimitMb(policy.maxSize)
      };
    }

    const config = resolveStorageProviderConfig();
    const provider = createStorageProvider(config);
    // objectKey 一旦下发就和数据库记录绑定，后续完成上传时会再次核对同一对象。
    const objectKey = buildObjectKey(input.bizType, input.ownerId, input.fileName, input.contentType);
    const pending = await uploadsRepo.createPendingFile({
      ownerId: input.ownerId,
      bizType: input.bizType,
      mediaKind: policy.mediaKind,
      provider: config.provider,
      bucket: config.bucket,
      region: config.region,
      objectKey,
      fileName: input.fileName,
      mimeType: input.contentType,
      byteSize: input.byteSize,
      visibility: policy.visibility
    });

    if (!pending) {
      return { kind: "failed" as const };
    }

    const upload = await provider.initUpload({
      objectKey,
      contentType: input.contentType,
      size: input.byteSize,
      visibility: policy.visibility
    });

    return {
      kind: "ok" as const,
      payload: initUploadResponseSchema.parse({
        fileId: pending.id,
        objectKey,
        upload
      })
    };
  },
  async completeUpload(input: {
    ownerId: string;
    fileId: string;
  }) {
    const file = await uploadsRepo.getOwnedFileById(input.ownerId, input.fileId);
    if (!file) {
      return { kind: "not_found" as const };
    }

    const config = resolveStorageProviderConfig();
    const provider = createStorageProvider(config);
    // 完成上传时回查对象存储头信息，防止客户端上传了尺寸或类型不匹配的文件。
    const head = await provider.headObject({ objectKey: file.objectKey });
    if (!head.exists) {
      return { kind: "missing_object" as const };
    }
    if (head.size !== undefined && head.size !== file.byteSize) {
      return { kind: "size_mismatch" as const };
    }
    if (head.contentType && head.contentType !== file.mimeType) {
      return { kind: "content_type_mismatch" as const };
    }

    const uploaded = await uploadsRepo.markFileUploaded({
      fileId: file.id,
      etag: head.etag ?? null
    });

    if (!uploaded) {
      return { kind: "not_found" as const };
    }

    const baseItem = serializeFileItem(uploaded);
    const resolvedUrl = await resolveUploadedFileUrl(uploaded.id);

    return {
      kind: "ok" as const,
      payload: completeUploadResponseSchema.parse({
        item: {
          ...baseItem,
          url: resolvedUrl ?? baseItem.url
        }
      })
    };
  },
  async getFileUrl(fileId: string) {
    const file = await uploadsRepo.getFileById(fileId);
    if (!file) {
      return null;
    }

    if (file.visibility === "public") {
      // 公开资源直接返回稳定地址，私有资源则改走短期签名下载链接。
      return fileUrlResponseSchema.parse({
        url: buildStorageObjectUrl(resolveStorageProviderConfig(), file.objectKey)
      });
    }

    const provider = createStorageProvider(resolveStorageProviderConfig());
    return fileUrlResponseSchema.parse({
      url: await provider.getDownloadUrl({
        objectKey: file.objectKey,
        expiresIn: 900,
        filename: file.fileName
      })
    });
  },
  serializeFileItem
};
