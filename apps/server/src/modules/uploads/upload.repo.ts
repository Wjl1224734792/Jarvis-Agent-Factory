import { createId, db, filesTable } from "@feijia/db";
import { and, eq, inArray, isNotNull, notInArray } from "drizzle-orm";
import { incrementFileLookupCount } from "../../lib/request-metrics";

function fileSelection() {
  return {
    id: filesTable.id,
    ownerId: filesTable.ownerId,
    postId: filesTable.postId,
    bizType: filesTable.bizType,
    mediaKind: filesTable.mediaKind,
    provider: filesTable.provider,
    bucket: filesTable.bucket,
    region: filesTable.region,
    objectKey: filesTable.objectKey,
    fileName: filesTable.filename,
    mimeType: filesTable.contentType,
    byteSize: filesTable.size,
    etag: filesTable.etag,
    status: filesTable.status,
    currentAuditRecordId: filesTable.currentAuditRecordId,
    currentAuditStatus: filesTable.currentAuditStatus,
    currentAuditUpdatedAt: filesTable.currentAuditUpdatedAt,
    visibility: filesTable.visibility,
    createdAt: filesTable.createdAt,
    uploadedAt: filesTable.uploadedAt,
    deletedAt: filesTable.deletedAt
  };
}

export type StoredFileRecord = Awaited<ReturnType<typeof uploadsRepo.getFileById>>;

export const uploadsRepo = {
  async createPendingFile(input: {
    ownerId: string;
    bizType: string;
    mediaKind: string;
    provider: string;
    bucket: string;
    region: string;
    objectKey: string;
    fileName: string;
    mimeType: string;
    byteSize: number;
    visibility: string;
  }) {
    const id = createId("file");

    await db.insert(filesTable).values({
      id,
      ownerId: input.ownerId,
      postId: null,
      bizType: input.bizType,
      mediaKind: input.mediaKind,
      provider: input.provider,
      bucket: input.bucket,
      region: input.region,
      objectKey: input.objectKey,
      filename: input.fileName,
      contentType: input.mimeType,
      size: input.byteSize,
      etag: null,
      status: "pending",
      visibility: input.visibility,
      uploadedAt: null,
      deletedAt: null
    });

    return this.getFileById(id);
  },
  async getFileById(id: string) {
    incrementFileLookupCount();
    const rows = await db
      .select(fileSelection())
      .from(filesTable)
      .where(eq(filesTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async getOwnedFileById(ownerId: string, fileId: string) {
    const rows = await db
      .select(fileSelection())
      .from(filesTable)
      .where(and(eq(filesTable.ownerId, ownerId), eq(filesTable.id, fileId)))
      .limit(1);

    return rows[0] ?? null;
  },
  async listFilesByIds(fileIds: string[]) {
    if (fileIds.length === 0) {
      return [];
    }

    incrementFileLookupCount();
    return db
      .select(fileSelection())
      .from(filesTable)
      .where(inArray(filesTable.id, fileIds));
  },
  async markFileUploaded(input: {
    fileId: string;
    etag: string | null;
  }) {
    await db
      .update(filesTable)
      .set({
        etag: input.etag,
        status: "uploaded",
        uploadedAt: new Date()
      })
      .where(eq(filesTable.id, input.fileId));

    return this.getFileById(input.fileId);
  },
  async listOwnedAttachableFiles(input: {
    ownerId: string;
    fileIds: string[];
    mediaKind: "image" | "video";
    postId?: string;
  }) {
    if (input.fileIds.length === 0) {
      return [];
    }
    // 使用单次 IN 查询替代 N+1 逐条查询
    const rows = await db
      .select(fileSelection())
      .from(filesTable)
      .where(
        and(
          eq(filesTable.ownerId, input.ownerId),
          inArray(filesTable.id, input.fileIds),
          eq(filesTable.mediaKind, input.mediaKind),
          eq(filesTable.status, "uploaded")
        )
      );

    return rows.filter((file) => {
      if (input.postId) {
        return file.postId === null || file.postId === input.postId;
      }
      return file.postId === null;
    });
  },
  async listOwnedUploadedFiles(input: {
    ownerId: string;
    fileIds: string[];
    mediaKind?: "image" | "video";
    bizType?: string;
  }) {
    if (input.fileIds.length === 0) {
      return [];
    }

    // 使用单次 IN 查询替代 N+1 逐条查询
    const rows = await db
      .select(fileSelection())
      .from(filesTable)
      .where(
        and(
          eq(filesTable.ownerId, input.ownerId),
          inArray(filesTable.id, input.fileIds),
          eq(filesTable.status, "uploaded")
        )
      );

    return rows.filter((file) => {
      if (input.mediaKind && file.mediaKind !== input.mediaKind) {
        return false;
      }
      if (input.bizType && file.bizType !== input.bizType) {
        return false;
      }
      return true;
    });
  },
  async listPostFiles(postIds: string[], mediaKind: "image" | "video") {
    if (postIds.length === 0) {
      return [];
    }

    return db
      .select(fileSelection())
      .from(filesTable)
      .where(
        and(
          inArray(filesTable.postId, postIds),
          eq(filesTable.mediaKind, mediaKind),
          eq(filesTable.status, "uploaded"),
          isNotNull(filesTable.postId)
        )
      );
  },
  async replacePostFiles(input: {
    postId: string;
    ownerId: string;
    mediaKind: "image" | "video";
    fileIds: string[];
  }) {
    if (input.fileIds.length === 0) {
      await db
        .update(filesTable)
        .set({ postId: null })
        .where(
          and(
            eq(filesTable.ownerId, input.ownerId),
            eq(filesTable.postId, input.postId),
            eq(filesTable.mediaKind, input.mediaKind)
          )
        );
      return;
    }

    await db
      .update(filesTable)
      .set({ postId: null })
      .where(
        and(
          eq(filesTable.ownerId, input.ownerId),
          eq(filesTable.postId, input.postId),
          eq(filesTable.mediaKind, input.mediaKind),
          notInArray(filesTable.id, input.fileIds)
        )
      );

    await db
      .update(filesTable)
      .set({ postId: input.postId })
      .where(
        and(
          eq(filesTable.ownerId, input.ownerId),
          inArray(filesTable.id, input.fileIds),
          eq(filesTable.mediaKind, input.mediaKind),
          eq(filesTable.status, "uploaded")
        )
      );
  }
};
