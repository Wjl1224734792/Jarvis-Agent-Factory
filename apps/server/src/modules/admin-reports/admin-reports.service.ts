import {
  aircraftModelCommentReportsTable,
  aircraftModelReportsTable,
  aircraftReviewReportsTable,
  db,
  postCommentReportsTable,
  postReportsTable,
  rankingCommentReportsTable,
  rankingItemCommentReportsTable,
  rankingItemReportsTable,
  rankingReportsTable,
  reviewCommentReportsTable,
  usersTable
} from "@feijia/db";
import { eq } from "drizzle-orm";
import { resolveUploadedFileUrl, resolveUploadedFileUrls } from "../uploads/uploads.helpers";

type ReportKind =
  | "post"
  | "model"
  | "review"
  | "post-comment"
  | "review-comment"
  | "model-comment"
  | "ranking"
  | "ranking-item"
  | "ranking-comment"
  | "ranking-item-comment";

function parseImageIds(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function serializeReportRows(
  rows: Array<{
    id: string;
    reason: string;
    imageFileIds: string;
    createdAt: Date;
    reporter: {
      id: string;
      displayName: string;
      avatarFileId: string | null;
      role: string;
    };
  }>
) {
  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
      reporter: {
        id: row.reporter.id,
        displayName: row.reporter.displayName,
        avatarUrl: await resolveUploadedFileUrl(row.reporter.avatarFileId),
        role: row.reporter.role as "user" | "admin"
      },
      evidenceImages: (await resolveUploadedFileUrls(parseImageIds(row.imageFileIds))).map((url, index) => ({
        id: `${row.id}-${index}`,
        url,
        fileName: null
      }))
    }))
  );
}

export const adminReportsService = {
  async getReportDetails(kind: ReportKind, id: string) {
    const baseSelection = {
      id: usersTable.id,
      displayName: usersTable.displayName,
      avatarFileId: usersTable.avatarFileId,
      role: usersTable.role
    };

    switch (kind) {
      case "post": {
        const rows = await db
          .select({
            id: postReportsTable.id,
            reason: postReportsTable.reason,
            imageFileIds: postReportsTable.imageFileIds,
            createdAt: postReportsTable.createdAt,
            reporter: baseSelection
          })
          .from(postReportsTable)
          .innerJoin(usersTable, eq(postReportsTable.reporterId, usersTable.id))
          .where(eq(postReportsTable.postId, id));
        return { items: await serializeReportRows(rows) };
      }
      case "model": {
        const rows = await db
          .select({
            id: aircraftModelReportsTable.id,
            reason: aircraftModelReportsTable.reason,
            imageFileIds: aircraftModelReportsTable.imageFileIds,
            createdAt: aircraftModelReportsTable.createdAt,
            reporter: baseSelection
          })
          .from(aircraftModelReportsTable)
          .innerJoin(usersTable, eq(aircraftModelReportsTable.reporterId, usersTable.id))
          .where(eq(aircraftModelReportsTable.modelId, id));
        return { items: await serializeReportRows(rows) };
      }
      case "review": {
        const rows = await db
          .select({
            id: aircraftReviewReportsTable.id,
            reason: aircraftReviewReportsTable.reason,
            imageFileIds: aircraftReviewReportsTable.imageFileIds,
            createdAt: aircraftReviewReportsTable.createdAt,
            reporter: baseSelection
          })
          .from(aircraftReviewReportsTable)
          .innerJoin(usersTable, eq(aircraftReviewReportsTable.reporterId, usersTable.id))
          .where(eq(aircraftReviewReportsTable.reviewId, id));
        return { items: await serializeReportRows(rows) };
      }
      case "post-comment": {
        const rows = await db
          .select({
            id: postCommentReportsTable.id,
            reason: postCommentReportsTable.reason,
            imageFileIds: postCommentReportsTable.imageFileIds,
            createdAt: postCommentReportsTable.createdAt,
            reporter: baseSelection
          })
          .from(postCommentReportsTable)
          .innerJoin(usersTable, eq(postCommentReportsTable.reporterId, usersTable.id))
          .where(eq(postCommentReportsTable.commentId, id));
        return { items: await serializeReportRows(rows) };
      }
      case "review-comment": {
        const rows = await db
          .select({
            id: reviewCommentReportsTable.id,
            reason: reviewCommentReportsTable.reason,
            imageFileIds: reviewCommentReportsTable.imageFileIds,
            createdAt: reviewCommentReportsTable.createdAt,
            reporter: baseSelection
          })
          .from(reviewCommentReportsTable)
          .innerJoin(usersTable, eq(reviewCommentReportsTable.reporterId, usersTable.id))
          .where(eq(reviewCommentReportsTable.commentId, id));
        return { items: await serializeReportRows(rows) };
      }
      case "model-comment": {
        const rows = await db
          .select({
            id: aircraftModelCommentReportsTable.id,
            reason: aircraftModelCommentReportsTable.reason,
            imageFileIds: aircraftModelCommentReportsTable.imageFileIds,
            createdAt: aircraftModelCommentReportsTable.createdAt,
            reporter: baseSelection
          })
          .from(aircraftModelCommentReportsTable)
          .innerJoin(usersTable, eq(aircraftModelCommentReportsTable.reporterId, usersTable.id))
          .where(eq(aircraftModelCommentReportsTable.commentId, id));
        return { items: await serializeReportRows(rows) };
      }
      case "ranking": {
        const rows = await db
          .select({
            id: rankingReportsTable.id,
            reason: rankingReportsTable.reason,
            imageFileIds: rankingReportsTable.imageFileIds,
            createdAt: rankingReportsTable.createdAt,
            reporter: baseSelection
          })
          .from(rankingReportsTable)
          .innerJoin(usersTable, eq(rankingReportsTable.reporterId, usersTable.id))
          .where(eq(rankingReportsTable.rankingId, id));
        return { items: await serializeReportRows(rows) };
      }
      case "ranking-item": {
        const rows = await db
          .select({
            id: rankingItemReportsTable.id,
            reason: rankingItemReportsTable.reason,
            imageFileIds: rankingItemReportsTable.imageFileIds,
            createdAt: rankingItemReportsTable.createdAt,
            reporter: baseSelection
          })
          .from(rankingItemReportsTable)
          .innerJoin(usersTable, eq(rankingItemReportsTable.reporterId, usersTable.id))
          .where(eq(rankingItemReportsTable.rankingItemId, id));
        return { items: await serializeReportRows(rows) };
      }
      case "ranking-comment": {
        const rows = await db
          .select({
            id: rankingCommentReportsTable.id,
            reason: rankingCommentReportsTable.reason,
            imageFileIds: rankingCommentReportsTable.imageFileIds,
            createdAt: rankingCommentReportsTable.createdAt,
            reporter: baseSelection
          })
          .from(rankingCommentReportsTable)
          .innerJoin(usersTable, eq(rankingCommentReportsTable.reporterId, usersTable.id))
          .where(eq(rankingCommentReportsTable.commentId, id));
        return { items: await serializeReportRows(rows) };
      }
      case "ranking-item-comment": {
        const rows = await db
          .select({
            id: rankingItemCommentReportsTable.id,
            reason: rankingItemCommentReportsTable.reason,
            imageFileIds: rankingItemCommentReportsTable.imageFileIds,
            createdAt: rankingItemCommentReportsTable.createdAt,
            reporter: baseSelection
          })
          .from(rankingItemCommentReportsTable)
          .innerJoin(usersTable, eq(rankingItemCommentReportsTable.reporterId, usersTable.id))
          .where(eq(rankingItemCommentReportsTable.commentId, id));
        return { items: await serializeReportRows(rows) };
      }
      default:
        return { items: [] };
    }
  }
};
