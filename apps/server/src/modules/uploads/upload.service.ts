import {
  completeUploadResponseSchema,
  fileUrlResponseSchema,
  initUploadResponseSchema,
  type FileBizType
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import {
  buildStorageObjectUrl,
  createStorageProvider,
  resolveStorageProviderConfig
} from "../../lib/storage-provider";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";
import { auditsRepo } from "../audits/audits.repo";
import { qiniuAuditService } from "../audits/qiniu-audit.service";
import { getUploadPolicy, isAllowedUploadMime } from "./upload.policy";
import { uploadsRepo, type StoredFileRecord } from "./upload.repo";
import { resolvePublicUploadedFileUrl, resolveUploadedFileUrl } from "./uploads.helpers";

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

const auditableFileBizTypes = new Set<FileBizType>([
  "avatar-image",
  "post-image",
  "post-video",
  "aircraft-cover-image",
  "aircraft-video",
  "ranking-cover-image",
  "ranking-item-image",
  "report-image"
]);

function buildQiniuAuditCallbackUrl() {
  const publicServerBaseUrl = process.env.PUBLIC_SERVER_BASE_URL?.trim();
  if (!publicServerBaseUrl) {
    return null;
  }

  try {
    return new URL(API_ROUTES.audits.qiniuCallback, publicServerBaseUrl).toString();
  } catch {
    return null;
  }
}

async function triggerUploadedFileAudit(input: {
  file: NonNullable<StoredFileRecord>;
  fileUrl: string;
  config: ReturnType<typeof resolveStorageProviderConfig>;
}) {
  if (input.config.provider !== "kodo") {
    return;
  }

  if (!auditableFileBizTypes.has(input.file.bizType as FileBizType)) {
    return;
  }

  if (input.file.mediaKind === "image") {
    await qiniuAuditService.reviewImage({
      domain: "file",
      entityId: input.file.id,
      imageUrl: input.fileUrl
    });
    return;
  }

  if (input.file.mediaKind === "video") {
    if (!input.config.publicBaseUrlIsExplicit) {
      await auditsRepo.create({
        domain: "file",
        entityId: input.file.id,
        contentType: "video",
        mode: "ai",
        status: "failed",
        errorMessage: "Missing explicit STORAGE_PUBLIC_BASE_URL for video audit."
      });
      return;
    }

    const callbackUrl = buildQiniuAuditCallbackUrl();
    if (!callbackUrl) {
      await auditsRepo.create({
        domain: "file",
        entityId: input.file.id,
        contentType: "video",
        mode: "ai",
        status: "failed",
        errorMessage: "Missing or invalid PUBLIC_SERVER_BASE_URL for video audit callback."
      });
      return;
    }

    await qiniuAuditService.submitVideoReview({
      domain: "file",
      entityId: input.file.id,
      videoUrl: buildStorageObjectUrl(input.config, input.file.objectKey),
      callbackUrl
    });
  }
}

export const uploadsService = {
  async initUpload(input: {
    ownerId: string;
    bizType: FileBizType;
    fileName: string;
    contentType: string;
    byteSize: number;
  }) {
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
    const fileUrl = resolvedUrl ?? baseItem.url;

    await triggerUploadedFileAudit({
      file: uploaded,
      fileUrl,
      config
    });

    return {
      kind: "ok" as const,
      payload: completeUploadResponseSchema.parse({
        item: {
          ...baseItem,
          url: fileUrl
        }
      })
    };
  },
  async getFileUrl(fileId: string) {
    const url = await resolvePublicUploadedFileUrl(fileId);
    if (!url) {
      return null;
    }

    return fileUrlResponseSchema.parse({ url });
  },
  serializeFileItem
};
