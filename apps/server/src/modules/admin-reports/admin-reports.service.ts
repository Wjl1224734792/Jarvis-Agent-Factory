import {
  aircraftModelCommentsTable,
  aircraftModelCommentReportsTable,
  aircraftModelReportsTable,
  aircraftModelsTable,
  aircraftReviewReportsTable,
  db,
  postCommentsTable,
  postCommentReportsTable,
  postReportsTable,
  postsTable,
  rankingsTable,
  rankingCommentsTable,
  rankingCommentReportsTable,
  ratingTargetCommentsTable,
  ratingTargetCommentReportsTable,
  ratingTargetReportsTable,
  rankingReportsTable,
  ratingTargetsTable,
  reviewCommentReportsTable,
  reviewCommentsTable,
  aircraftReviewsTable,
  usersTable
} from "@feijia/db";
import { desc, eq, gt } from "drizzle-orm";
import { buildAdminReportEvidenceImages } from "./admin-reports.helpers";
import { resolveUploadedFileUrl, resolveUploadedFileUrls } from "../uploads/uploads.helpers";

type ReportKind =
  | "post"
  | "model"
  | "review"
  | "post-comment"
  | "review-comment"
  | "model-comment"
  | "ranking"
  | "rating-target"
  | "ranking-comment"
  | "rating-target-comment";

function parseImageIds(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
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
      evidenceImages: buildAdminReportEvidenceImages(
        row.id,
        await resolveUploadedFileUrls(parseImageIds(row.imageFileIds))
      )
    }))
  );
}

export const adminReportsService = {
  async listReportSummary() {
    const [
      postRows,
      modelRows,
      reviewRows,
      ratingTargetRows,
      postCommentRows,
      reviewCommentRows,
      modelCommentRows,
      rankingCommentRows,
      ratingTargetCommentRows
    ] = await Promise.all([
      db
        .select({
          id: postsTable.id,
          title: postsTable.title,
          subtitle: usersTable.displayName,
          preview: postsTable.contentPlainText,
          reportCount: postsTable.reportCount,
          status: postsTable.status
        })
        .from(postsTable)
        .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
        .where(gt(postsTable.reportCount, 0))
        .orderBy(desc(postsTable.reportCount), desc(postsTable.updatedAt)),
      db
        .select({
          id: aircraftModelsTable.id,
          title: aircraftModelsTable.name,
          subtitle: aircraftModelsTable.summary,
          preview: aircraftModelsTable.description,
          reportCount: aircraftModelsTable.reportCount,
          status: aircraftModelsTable.isPublished
        })
        .from(aircraftModelsTable)
        .where(gt(aircraftModelsTable.reportCount, 0))
        .orderBy(desc(aircraftModelsTable.reportCount), desc(aircraftModelsTable.createdAt)),
      db
        .select({
          id: aircraftReviewsTable.id,
          title: aircraftModelsTable.name,
          subtitle: usersTable.displayName,
          preview: aircraftReviewsTable.content,
          reportCount: aircraftReviewsTable.reportCount,
          status: aircraftReviewsTable.status
        })
        .from(aircraftReviewsTable)
        .innerJoin(aircraftModelsTable, eq(aircraftReviewsTable.modelId, aircraftModelsTable.id))
        .innerJoin(usersTable, eq(aircraftReviewsTable.userId, usersTable.id))
        .where(gt(aircraftReviewsTable.reportCount, 0))
        .orderBy(desc(aircraftReviewsTable.reportCount), desc(aircraftReviewsTable.updatedAt)),
      db
        .select({
          id: ratingTargetsTable.id,
          title: ratingTargetsTable.title,
          subtitle: rankingsTable.title,
          preview: ratingTargetsTable.summary,
          reportCount: ratingTargetsTable.reportCount,
          status: ratingTargetsTable.status
        })
        .from(ratingTargetsTable)
        .innerJoin(rankingsTable, eq(ratingTargetsTable.rankingId, rankingsTable.id))
        .where(gt(ratingTargetsTable.reportCount, 0))
        .orderBy(desc(ratingTargetsTable.reportCount), desc(ratingTargetsTable.updatedAt)),
      db
        .select({
          id: postCommentsTable.id,
          title: postsTable.title,
          subtitle: usersTable.displayName,
          preview: postCommentsTable.content,
          reportCount: postCommentsTable.reportCount,
          status: postCommentsTable.status
        })
        .from(postCommentsTable)
        .innerJoin(postsTable, eq(postCommentsTable.postId, postsTable.id))
        .innerJoin(usersTable, eq(postCommentsTable.authorId, usersTable.id))
        .where(gt(postCommentsTable.reportCount, 0))
        .orderBy(desc(postCommentsTable.reportCount), desc(postCommentsTable.updatedAt)),
      db
        .select({
          id: reviewCommentsTable.id,
          title: aircraftModelsTable.name,
          subtitle: usersTable.displayName,
          preview: reviewCommentsTable.content,
          reportCount: reviewCommentsTable.reportCount,
          status: reviewCommentsTable.status
        })
        .from(reviewCommentsTable)
        .innerJoin(aircraftReviewsTable, eq(reviewCommentsTable.reviewId, aircraftReviewsTable.id))
        .innerJoin(aircraftModelsTable, eq(aircraftReviewsTable.modelId, aircraftModelsTable.id))
        .innerJoin(usersTable, eq(reviewCommentsTable.authorId, usersTable.id))
        .where(gt(reviewCommentsTable.reportCount, 0))
        .orderBy(desc(reviewCommentsTable.reportCount), desc(reviewCommentsTable.updatedAt)),
      db
        .select({
          id: aircraftModelCommentsTable.id,
          title: aircraftModelsTable.name,
          subtitle: usersTable.displayName,
          preview: aircraftModelCommentsTable.content,
          reportCount: aircraftModelCommentsTable.reportCount,
          status: aircraftModelCommentsTable.status
        })
        .from(aircraftModelCommentsTable)
        .innerJoin(aircraftModelsTable, eq(aircraftModelCommentsTable.modelId, aircraftModelsTable.id))
        .innerJoin(usersTable, eq(aircraftModelCommentsTable.authorId, usersTable.id))
        .where(gt(aircraftModelCommentsTable.reportCount, 0))
        .orderBy(desc(aircraftModelCommentsTable.reportCount), desc(aircraftModelCommentsTable.updatedAt)),
      db
        .select({
          id: rankingCommentsTable.id,
          title: rankingsTable.title,
          subtitle: usersTable.displayName,
          preview: rankingCommentsTable.content,
          reportCount: rankingCommentsTable.reportCount,
          status: rankingCommentsTable.status
        })
        .from(rankingCommentsTable)
        .innerJoin(rankingsTable, eq(rankingCommentsTable.rankingId, rankingsTable.id))
        .innerJoin(usersTable, eq(rankingCommentsTable.authorId, usersTable.id))
        .where(gt(rankingCommentsTable.reportCount, 0))
        .orderBy(desc(rankingCommentsTable.reportCount), desc(rankingCommentsTable.updatedAt)),
      db
        .select({
          id: ratingTargetCommentsTable.id,
          title: ratingTargetsTable.title,
          subtitle: usersTable.displayName,
          preview: ratingTargetCommentsTable.content,
          reportCount: ratingTargetCommentsTable.reportCount,
          status: ratingTargetCommentsTable.status
        })
        .from(ratingTargetCommentsTable)
        .innerJoin(ratingTargetsTable, eq(ratingTargetCommentsTable.ratingTargetId, ratingTargetsTable.id))
        .innerJoin(rankingsTable, eq(ratingTargetsTable.rankingId, rankingsTable.id))
        .innerJoin(usersTable, eq(ratingTargetCommentsTable.authorId, usersTable.id))
        .where(gt(ratingTargetCommentsTable.reportCount, 0))
        .orderBy(desc(ratingTargetCommentsTable.reportCount), desc(ratingTargetCommentsTable.updatedAt))
    ]);

    return {
      items: [
        ...postRows.map((row) => ({
          kind: "post" as const,
          id: row.id,
          title: row.title,
          subtitle: row.subtitle ?? null,
          preview: row.preview ?? null,
          reportCount: row.reportCount,
          status: row.status ?? null
        })),
        ...modelRows.map((row) => ({
          kind: "model" as const,
          id: row.id,
          title: row.title,
          subtitle: row.subtitle ?? null,
          preview: row.preview ?? null,
          reportCount: row.reportCount,
          status: row.status ? "published" : "draft"
        })),
        ...reviewRows.map((row) => ({
          kind: "review" as const,
          id: row.id,
          title: row.title,
          subtitle: row.subtitle ?? null,
          preview: row.preview ?? null,
          reportCount: row.reportCount,
          status: row.status ?? null
        })),
        ...ratingTargetRows.map((row) => ({
          kind: "rating-target" as const,
          id: row.id,
          title: row.title,
          subtitle: row.subtitle ?? null,
          preview: row.preview ?? null,
          reportCount: row.reportCount,
          status: row.status ?? null
        })),
        ...postCommentRows.map((row) => ({
          kind: "post-comment" as const,
          id: row.id,
          title: row.title,
          subtitle: row.subtitle ?? null,
          preview: row.preview ?? null,
          reportCount: row.reportCount,
          status: row.status ?? null
        })),
        ...reviewCommentRows.map((row) => ({
          kind: "review-comment" as const,
          id: row.id,
          title: row.title,
          subtitle: row.subtitle ?? null,
          preview: row.preview ?? null,
          reportCount: row.reportCount,
          status: row.status ?? null
        })),
        ...modelCommentRows.map((row) => ({
          kind: "model-comment" as const,
          id: row.id,
          title: row.title,
          subtitle: row.subtitle ?? null,
          preview: row.preview ?? null,
          reportCount: row.reportCount,
          status: row.status ?? null
        })),
        ...rankingCommentRows.map((row) => ({
          kind: "ranking-comment" as const,
          id: row.id,
          title: row.title,
          subtitle: row.subtitle ?? null,
          preview: row.preview ?? null,
          reportCount: row.reportCount,
          status: row.status ?? null
        })),
        ...ratingTargetCommentRows.map((row) => ({
          kind: "rating-target-comment" as const,
          id: row.id,
          title: row.title,
          subtitle: row.subtitle ?? null,
          preview: row.preview ?? null,
          reportCount: row.reportCount,
          status: row.status ?? null
        }))
      ].sort((left, right) => right.reportCount - left.reportCount)
    };
  },
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
      case "rating-target": {
        const rows = await db
          .select({
            id: ratingTargetReportsTable.id,
            reason: ratingTargetReportsTable.reason,
            imageFileIds: ratingTargetReportsTable.imageFileIds,
            createdAt: ratingTargetReportsTable.createdAt,
            reporter: baseSelection
          })
          .from(ratingTargetReportsTable)
          .innerJoin(usersTable, eq(ratingTargetReportsTable.reporterId, usersTable.id))
          .where(eq(ratingTargetReportsTable.ratingTargetId, id));
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
      case "rating-target-comment": {
        const rows = await db
          .select({
            id: ratingTargetCommentReportsTable.id,
            reason: ratingTargetCommentReportsTable.reason,
            imageFileIds: ratingTargetCommentReportsTable.imageFileIds,
            createdAt: ratingTargetCommentReportsTable.createdAt,
            reporter: baseSelection
          })
          .from(ratingTargetCommentReportsTable)
          .innerJoin(usersTable, eq(ratingTargetCommentReportsTable.reporterId, usersTable.id))
          .where(eq(ratingTargetCommentReportsTable.commentId, id));
        return { items: await serializeReportRows(rows) };
      }
      default:
        return { items: [] };
    }
  }
};
