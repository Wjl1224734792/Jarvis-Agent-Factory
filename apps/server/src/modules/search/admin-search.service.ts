import {
  aircraftModelCommentsTable,
  aircraftModelInteractionsTable,
  aircraftModelsTable,
  aircraftReviewsTable,
  aircraftSubmissionsTable,
  brandApplicationsTable,
  brandsTable,
  db,
  postCommentsTable,
  postsTable,
  rankingCommentsTable,
  rankingsTable,
  ratingTargetCommentsTable,
  ratingTargetsTable,
  reviewCommentsTable,
  usersTable
} from "@feijia/db";
import { desc, eq, sql } from "drizzle-orm";
import {
  buildIlikeAnyCondition,
  buildMatchRankSql,
  buildSearchPatterns,
  resolveMatchedField,
  truncateSearchText
} from "../../lib/search";

type AdminSearchItem = {
  id: string;
  type:
    | "post_article"
    | "post_moment"
    | "post_comment"
    | "model_comment"
    | "review"
    | "review_comment"
    | "ranking_comment"
    | "rating_target_comment"
    | "brand_application"
    | "aircraft_submission"
    | "ranking"
    | "rating_target"
    | "report"
    | "official_article"
    | "model"
    | "brand"
    | "category"
    | "content_category";
  section: "moderation" | "operations" | "management";
  title: string;
  subtitle: string | null;
  status: string | null;
  statusLabel: string | null;
  targetPath: string;
  matchedField: string;
  score: number;
  updatedAt: string | null;
};

function resolveGroupLimit(limit: number) {
  return Math.max(2, Math.min(limit, Math.ceil(limit / 6)));
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function buildAdminItem(
  query: string,
  input: Omit<AdminSearchItem, "matchedField" | "score"> & {
    fields: Array<{ field: string; value: string | null | undefined }>;
  }
): AdminSearchItem {
  const match = resolveMatchedField(query, input.fields);

  return {
    id: input.id,
    type: input.type,
    section: input.section,
    title: input.title,
    subtitle: input.subtitle,
    status: input.status,
    statusLabel: input.statusLabel,
    targetPath: input.targetPath,
    matchedField: match.matchedField,
    score: match.score,
    updatedAt: input.updatedAt
  };
}

function postStatusLabel(status: string | null) {
  switch (status) {
    case "pending":
      return "待审核";
    case "published":
      return "已发布";
    case "rejected":
      return "已驳回";
    case "hidden":
      return "已隐藏";
    default:
      return null;
  }
}

function commentStatusLabel(status: string | null) {
  switch (status) {
    case "pending":
      return "待审核";
    case "visible":
      return "可见";
    case "hidden":
      return "已隐藏";
    default:
      return null;
  }
}

function reviewStatusLabel(status: string | null) {
  switch (status) {
    case "pending":
      return "待审核";
    case "visible":
      return "可见";
    case "hidden":
      return "已隐藏";
    default:
      return null;
  }
}

function rankingStatusLabel(status: string | null) {
  switch (status) {
    case "pending":
      return "待审核";
    case "published":
      return "已发布";
    case "rejected":
      return "已驳回";
    case "hidden":
      return "已隐藏";
    default:
      return null;
  }
}

function submissionStatusLabel(status: string | null) {
  switch (status) {
    case "submitted":
      return "待审核";
    case "approved":
      return "已通过";
    case "rejected":
      return "已驳回";
    default:
      return null;
  }
}

function brandApplicationStatusLabel(status: string | null) {
  switch (status) {
    case "pending":
      return "待审核";
    case "approved":
      return "已通过";
    case "rejected":
      return "已驳回";
    default:
      return null;
  }
}

export async function searchAdminContent(input: { query: string; limit: number }) {
  const patterns = buildSearchPatterns(input.query);
  const limit = resolveGroupLimit(input.limit);

  const postSearchFields = [postsTable.title, postsTable.contentPlainText, usersTable.displayName];
  const postMatchRank = buildMatchRankSql(postSearchFields, patterns);
  const postKeywordCondition = buildIlikeAnyCondition(postSearchFields, patterns.contains);

  const postRows = postKeywordCondition
    ? await db
        .select({
          id: postsTable.id,
          type: postsTable.type,
          title: postsTable.title,
          contentPlainText: postsTable.contentPlainText,
          status: postsTable.status,
          authorDisplayName: usersTable.displayName,
          authorRole: usersTable.role,
          updatedAt: postsTable.updatedAt
        })
        .from(postsTable)
        .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
        .where(postKeywordCondition)
        .orderBy(desc(postMatchRank), desc(postsTable.updatedAt))
        .limit(limit)
    : [];

  const postCommentSearchFields = [
    postCommentsTable.content,
    postsTable.title,
    usersTable.displayName
  ];
  const postCommentMatchRank = buildMatchRankSql(postCommentSearchFields, patterns);
  const postCommentKeywordCondition = buildIlikeAnyCondition(
    postCommentSearchFields,
    patterns.contains
  );

  const postCommentRows = postCommentKeywordCondition
    ? await db
        .select({
          id: postCommentsTable.id,
          content: postCommentsTable.content,
          status: postCommentsTable.status,
          postTitle: postsTable.title,
          authorDisplayName: usersTable.displayName,
          updatedAt: postCommentsTable.updatedAt
        })
        .from(postCommentsTable)
        .innerJoin(postsTable, eq(postCommentsTable.postId, postsTable.id))
        .innerJoin(usersTable, eq(postCommentsTable.authorId, usersTable.id))
        .where(postCommentKeywordCondition)
        .orderBy(desc(postCommentMatchRank), desc(postCommentsTable.updatedAt))
        .limit(limit)
    : [];

  const reviewSearchFields = [
    aircraftReviewsTable.content,
    aircraftModelsTable.name,
    usersTable.displayName
  ];
  const reviewMatchRank = buildMatchRankSql(reviewSearchFields, patterns);
  const reviewKeywordCondition = buildIlikeAnyCondition(reviewSearchFields, patterns.contains);

  const reviewRows = reviewKeywordCondition
    ? await db
        .select({
          id: aircraftReviewsTable.id,
          content: aircraftReviewsTable.content,
          status: aircraftReviewsTable.status,
          modelName: aircraftModelsTable.name,
          authorDisplayName: usersTable.displayName,
          updatedAt: aircraftReviewsTable.updatedAt
        })
        .from(aircraftReviewsTable)
        .innerJoin(aircraftModelsTable, eq(aircraftReviewsTable.modelId, aircraftModelsTable.id))
        .innerJoin(usersTable, eq(aircraftReviewsTable.userId, usersTable.id))
        .where(reviewKeywordCondition)
        .orderBy(desc(reviewMatchRank), desc(aircraftReviewsTable.updatedAt))
        .limit(limit)
    : [];

  const reviewCommentSearchFields = [
    reviewCommentsTable.content,
    aircraftModelsTable.name,
    usersTable.displayName
  ];
  const reviewCommentMatchRank = buildMatchRankSql(reviewCommentSearchFields, patterns);
  const reviewCommentKeywordCondition = buildIlikeAnyCondition(
    reviewCommentSearchFields,
    patterns.contains
  );

  const reviewCommentRows = reviewCommentKeywordCondition
    ? await db
        .select({
          id: reviewCommentsTable.id,
          content: reviewCommentsTable.content,
          status: reviewCommentsTable.status,
          modelName: aircraftModelsTable.name,
          authorDisplayName: usersTable.displayName,
          updatedAt: reviewCommentsTable.updatedAt
        })
        .from(reviewCommentsTable)
        .innerJoin(aircraftReviewsTable, eq(reviewCommentsTable.reviewId, aircraftReviewsTable.id))
        .innerJoin(aircraftModelsTable, eq(aircraftReviewsTable.modelId, aircraftModelsTable.id))
        .innerJoin(usersTable, eq(reviewCommentsTable.authorId, usersTable.id))
        .where(reviewCommentKeywordCondition)
        .orderBy(desc(reviewCommentMatchRank), desc(reviewCommentsTable.updatedAt))
        .limit(limit)
    : [];

  const modelCommentSearchFields = [
    aircraftModelCommentsTable.content,
    aircraftModelsTable.name,
    usersTable.displayName
  ];
  const modelCommentMatchRank = buildMatchRankSql(modelCommentSearchFields, patterns);
  const modelCommentKeywordCondition = buildIlikeAnyCondition(
    modelCommentSearchFields,
    patterns.contains
  );

  const modelCommentRows = modelCommentKeywordCondition
    ? await db
        .select({
          id: aircraftModelCommentsTable.id,
          content: aircraftModelCommentsTable.content,
          status: aircraftModelCommentsTable.status,
          modelName: aircraftModelsTable.name,
          authorDisplayName: usersTable.displayName,
          updatedAt: aircraftModelCommentsTable.updatedAt
        })
        .from(aircraftModelCommentsTable)
        .innerJoin(aircraftModelsTable, eq(aircraftModelCommentsTable.modelId, aircraftModelsTable.id))
        .innerJoin(usersTable, eq(aircraftModelCommentsTable.authorId, usersTable.id))
        .where(modelCommentKeywordCondition)
        .orderBy(desc(modelCommentMatchRank), desc(aircraftModelCommentsTable.updatedAt))
        .limit(limit)
    : [];

  const rankingSearchFields = [rankingsTable.title, rankingsTable.description, usersTable.displayName];
  const rankingMatchRank = buildMatchRankSql(rankingSearchFields, patterns);
  const rankingKeywordCondition = buildIlikeAnyCondition(rankingSearchFields, patterns.contains);

  const rankingRows = rankingKeywordCondition
    ? await db
        .select({
          id: rankingsTable.id,
          type: rankingsTable.type,
          title: rankingsTable.title,
          description: rankingsTable.description,
          status: rankingsTable.status,
          authorDisplayName: usersTable.displayName,
          updatedAt: rankingsTable.updatedAt
        })
        .from(rankingsTable)
        .innerJoin(usersTable, eq(rankingsTable.authorId, usersTable.id))
        .where(rankingKeywordCondition)
        .orderBy(desc(rankingMatchRank), desc(rankingsTable.updatedAt))
        .limit(limit)
    : [];

  const rankingCommentSearchFields = [
    rankingCommentsTable.content,
    rankingsTable.title,
    usersTable.displayName
  ];
  const rankingCommentMatchRank = buildMatchRankSql(rankingCommentSearchFields, patterns);
  const rankingCommentKeywordCondition = buildIlikeAnyCondition(
    rankingCommentSearchFields,
    patterns.contains
  );

  const rankingCommentRows = rankingCommentKeywordCondition
    ? await db
        .select({
          id: rankingCommentsTable.id,
          content: rankingCommentsTable.content,
          status: rankingCommentsTable.status,
          rankingTitle: rankingsTable.title,
          authorDisplayName: usersTable.displayName,
          updatedAt: rankingCommentsTable.updatedAt
        })
        .from(rankingCommentsTable)
        .innerJoin(rankingsTable, eq(rankingCommentsTable.rankingId, rankingsTable.id))
        .innerJoin(usersTable, eq(rankingCommentsTable.authorId, usersTable.id))
        .where(rankingCommentKeywordCondition)
        .orderBy(desc(rankingCommentMatchRank), desc(rankingCommentsTable.updatedAt))
        .limit(limit)
    : [];

  const ratingTargetSearchFields = [
    ratingTargetsTable.title,
    ratingTargetsTable.summary,
    ratingTargetsTable.brandName,
    rankingsTable.title
  ];
  const ratingTargetMatchRank = buildMatchRankSql(ratingTargetSearchFields, patterns);
  const ratingTargetKeywordCondition = buildIlikeAnyCondition(
    ratingTargetSearchFields,
    patterns.contains
  );

  const ratingTargetRows = ratingTargetKeywordCondition
    ? await db
        .select({
          id: ratingTargetsTable.id,
          title: ratingTargetsTable.title,
          summary: ratingTargetsTable.summary,
          brandName: ratingTargetsTable.brandName,
          status: ratingTargetsTable.status,
          rankingId: rankingsTable.id,
          rankingTitle: rankingsTable.title,
          updatedAt: ratingTargetsTable.updatedAt
        })
        .from(ratingTargetsTable)
        .innerJoin(rankingsTable, eq(ratingTargetsTable.rankingId, rankingsTable.id))
        .where(ratingTargetKeywordCondition)
        .orderBy(desc(ratingTargetMatchRank), desc(ratingTargetsTable.updatedAt))
        .limit(limit)
    : [];

  const ratingTargetCommentSearchFields = [
    ratingTargetCommentsTable.content,
    ratingTargetsTable.title,
    rankingsTable.title
  ];
  const ratingTargetCommentMatchRank = buildMatchRankSql(
    ratingTargetCommentSearchFields,
    patterns
  );
  const ratingTargetCommentKeywordCondition = buildIlikeAnyCondition(
    ratingTargetCommentSearchFields,
    patterns.contains
  );

  const ratingTargetCommentRows = ratingTargetCommentKeywordCondition
    ? await db
        .select({
          id: ratingTargetCommentsTable.id,
          content: ratingTargetCommentsTable.content,
          status: ratingTargetCommentsTable.status,
          ratingTargetTitle: ratingTargetsTable.title,
          rankingTitle: rankingsTable.title,
          authorDisplayName: usersTable.displayName,
          updatedAt: ratingTargetCommentsTable.updatedAt
        })
        .from(ratingTargetCommentsTable)
        .innerJoin(ratingTargetsTable, eq(ratingTargetCommentsTable.ratingTargetId, ratingTargetsTable.id))
        .innerJoin(rankingsTable, eq(ratingTargetsTable.rankingId, rankingsTable.id))
        .innerJoin(usersTable, eq(ratingTargetCommentsTable.authorId, usersTable.id))
        .where(ratingTargetCommentKeywordCondition)
        .orderBy(desc(ratingTargetCommentMatchRank), desc(ratingTargetCommentsTable.updatedAt))
        .limit(limit)
    : [];

  const brandApplicationSearchFields = [
    brandApplicationsTable.name,
    brandApplicationsTable.slug,
    brandApplicationsTable.description,
    usersTable.displayName
  ];
  const brandApplicationMatchRank = buildMatchRankSql(brandApplicationSearchFields, patterns);
  const brandApplicationKeywordCondition = buildIlikeAnyCondition(
    brandApplicationSearchFields,
    patterns.contains
  );

  const brandApplicationRows = brandApplicationKeywordCondition
    ? await db
        .select({
          id: brandApplicationsTable.id,
          name: brandApplicationsTable.name,
          slug: brandApplicationsTable.slug,
          description: brandApplicationsTable.description,
          status: brandApplicationsTable.status,
          applicantDisplayName: usersTable.displayName,
          updatedAt: brandApplicationsTable.updatedAt
        })
        .from(brandApplicationsTable)
        .innerJoin(usersTable, eq(brandApplicationsTable.applicantId, usersTable.id))
        .where(brandApplicationKeywordCondition)
        .orderBy(desc(brandApplicationMatchRank), desc(brandApplicationsTable.updatedAt))
        .limit(limit)
    : [];

  const submissionSearchFields = [
    aircraftSubmissionsTable.modelName,
    aircraftSubmissionsTable.proposedBrandName,
    aircraftSubmissionsTable.summary,
    aircraftSubmissionsTable.description,
    brandsTable.name,
    usersTable.displayName
  ];
  const submissionMatchRank = buildMatchRankSql(submissionSearchFields, patterns);
  const submissionKeywordCondition = buildIlikeAnyCondition(
    submissionSearchFields,
    patterns.contains
  );

  const submissionRows = submissionKeywordCondition
    ? await db
        .select({
          id: aircraftSubmissionsTable.id,
          modelName: aircraftSubmissionsTable.modelName,
          summary: aircraftSubmissionsTable.summary,
          description: aircraftSubmissionsTable.description,
          brandName: brandsTable.name,
          proposedBrandName: aircraftSubmissionsTable.proposedBrandName,
          status: aircraftSubmissionsTable.status,
          authorDisplayName: usersTable.displayName,
          updatedAt: aircraftSubmissionsTable.updatedAt
        })
        .from(aircraftSubmissionsTable)
        .leftJoin(brandsTable, eq(aircraftSubmissionsTable.brandId, brandsTable.id))
        .innerJoin(usersTable, eq(aircraftSubmissionsTable.authorId, usersTable.id))
        .where(submissionKeywordCondition)
        .orderBy(desc(submissionMatchRank), desc(aircraftSubmissionsTable.updatedAt))
        .limit(limit)
    : [];

  const modelFavoriteCounts = db
    .select({
      modelId: aircraftModelInteractionsTable.modelId,
      favoriteCount: sql<number>`cast(count(*) as int)`.as("favorite_count")
    })
    .from(aircraftModelInteractionsTable)
    .where(eq(aircraftModelInteractionsTable.type, "favorite"))
    .groupBy(aircraftModelInteractionsTable.modelId)
    .as("admin_search_model_favorite_counts");

  const modelCommentCounts = db
    .select({
      modelId: aircraftModelCommentsTable.modelId,
      commentCount: sql<number>`cast(count(*) as int)`.as("comment_count")
    })
    .from(aircraftModelCommentsTable)
    .where(eq(aircraftModelCommentsTable.status, "visible"))
    .groupBy(aircraftModelCommentsTable.modelId)
    .as("admin_search_model_comment_counts");

  const modelSearchFields = [
    aircraftModelsTable.name,
    aircraftModelsTable.summary,
    aircraftModelsTable.description,
    brandsTable.name
  ];
  const modelMatchRank = buildMatchRankSql(modelSearchFields, patterns);
  const modelKeywordCondition = buildIlikeAnyCondition(modelSearchFields, patterns.contains);

  const modelRows = modelKeywordCondition
    ? await db
        .select({
          id: aircraftModelsTable.id,
          name: aircraftModelsTable.name,
          slug: aircraftModelsTable.slug,
          summary: aircraftModelsTable.summary,
          description: aircraftModelsTable.description,
          brandName: brandsTable.name,
          createdAt: aircraftModelsTable.createdAt
        })
        .from(aircraftModelsTable)
        .innerJoin(brandsTable, eq(aircraftModelsTable.brandId, brandsTable.id))
        .leftJoin(modelFavoriteCounts, eq(modelFavoriteCounts.modelId, aircraftModelsTable.id))
        .leftJoin(modelCommentCounts, eq(modelCommentCounts.modelId, aircraftModelsTable.id))
        .where(modelKeywordCondition)
        .orderBy(
          desc(modelMatchRank),
          desc(sql`coalesce(${modelFavoriteCounts.favoriteCount}, 0)`),
          desc(sql`coalesce(${modelCommentCounts.commentCount}, 0)`),
          desc(aircraftModelsTable.createdAt)
        )
        .limit(limit)
    : [];

  const brandSearchFields = [brandsTable.name, brandsTable.slug];
  const brandMatchRank = buildMatchRankSql(brandSearchFields, patterns);
  const brandKeywordCondition = buildIlikeAnyCondition(brandSearchFields, patterns.contains);

  const brandRows = brandKeywordCondition
    ? await db
        .select({
          id: brandsTable.id,
          name: brandsTable.name,
          slug: brandsTable.slug,
          isEnabled: brandsTable.isEnabled,
          createdAt: brandsTable.createdAt
        })
        .from(brandsTable)
        .where(brandKeywordCondition)
        .orderBy(desc(brandMatchRank), desc(brandsTable.sortOrder), desc(brandsTable.createdAt))
        .limit(limit)
    : [];

  const aircraftCategoryRows = await db.execute<{
    id: string;
    name: string;
    slug: string;
    isEnabled: boolean;
    createdAt: Date | string | null;
  }>(sql`
    select
      c."id" as "id",
      c."name" as "name",
      c."slug" as "slug",
      c."is_enabled" as "isEnabled",
      c."created_at" as "createdAt"
    from "aircraft_categories" as c
    where ${buildIlikeAnyCondition([sql`c."name"`, sql`c."slug"`], patterns.contains) ?? sql`false`}
    order by ${buildMatchRankSql([sql`c."name"`, sql`c."slug"`], patterns)} desc,
      c."sort_order" asc,
      c."created_at" desc
    limit ${limit}
  `);

  const contentCategoryRows = await db.execute<{
    id: string;
    name: string;
    slug: string;
    isEnabled: boolean;
    createdAt: Date | string | null;
  }>(sql`
    select
      c."id" as "id",
      c."name" as "name",
      c."slug" as "slug",
      c."is_enabled" as "isEnabled",
      c."created_at" as "createdAt"
    from "content_categories" as c
    where ${buildIlikeAnyCondition([sql`c."name"`, sql`c."slug"`], patterns.contains) ?? sql`false`}
    order by ${buildMatchRankSql([sql`c."name"`, sql`c."slug"`], patterns)} desc,
      c."sort_order" asc,
      c."created_at" desc
    limit ${limit}
  `);

  const reportRows = await db.execute<{
    id: string;
    title: string;
    subtitle: string | null;
    reason: string;
    createdAt: Date | string | null;
  }>(sql`
    with report_rows as (
      select pr."id", p."title", u."display_name" as "subtitle", pr."reason", pr."created_at" as "createdAt",
        ${buildMatchRankSql([sql`pr."reason"`, sql`p."title"`], patterns)} as "matchRank"
      from "post_reports" as pr
      inner join "posts" as p on p."id" = pr."post_id"
      inner join "users" as u on u."id" = pr."reporter_id"
      where ${buildIlikeAnyCondition([sql`pr."reason"`, sql`p."title"`], patterns.contains) ?? sql`false`}
      union all
      select rr."id", m."name" as "title", u."display_name" as "subtitle", rr."reason", rr."created_at" as "createdAt",
        ${buildMatchRankSql([sql`rr."reason"`, sql`m."name"`], patterns)} as "matchRank"
      from "aircraft_model_reports" as rr
      inner join "aircraft_models" as m on m."id" = rr."model_id"
      inner join "users" as u on u."id" = rr."reporter_id"
      where ${buildIlikeAnyCondition([sql`rr."reason"`, sql`m."name"`], patterns.contains) ?? sql`false`}
      union all
      select rr."id", m."name" as "title", u."display_name" as "subtitle", rr."reason", rr."created_at" as "createdAt",
        ${buildMatchRankSql([sql`rr."reason"`, sql`m."name"`], patterns)} as "matchRank"
      from "aircraft_review_reports" as rr
      inner join "aircraft_reviews" as r on r."id" = rr."review_id"
      inner join "aircraft_models" as m on m."id" = r."model_id"
      inner join "users" as u on u."id" = rr."reporter_id"
      where ${buildIlikeAnyCondition([sql`rr."reason"`, sql`m."name"`], patterns.contains) ?? sql`false`}
      union all
      select rr."id", rk."title", u."display_name" as "subtitle", rr."reason", rr."created_at" as "createdAt",
        ${buildMatchRankSql([sql`rr."reason"`, sql`rk."title"`], patterns)} as "matchRank"
      from "ranking_reports" as rr
      inner join "rankings" as rk on rk."id" = rr."ranking_id"
      inner join "users" as u on u."id" = rr."reporter_id"
      where ${buildIlikeAnyCondition([sql`rr."reason"`, sql`rk."title"`], patterns.contains) ?? sql`false`}
      union all
      select rr."id", rt."title", u."display_name" as "subtitle", rr."reason", rr."created_at" as "createdAt",
        ${buildMatchRankSql([sql`rr."reason"`, sql`rt."title"`], patterns)} as "matchRank"
      from "rating_target_reports" as rr
      inner join "rating_targets" as rt on rt."id" = rr."rating_target_id"
      inner join "users" as u on u."id" = rr."reporter_id"
      where ${buildIlikeAnyCondition([sql`rr."reason"`, sql`rt."title"`], patterns.contains) ?? sql`false`}
    )
    select "id", "title", "subtitle", "reason", "createdAt"
    from report_rows
    order by "matchRank" desc, "createdAt" desc
    limit ${limit}
  `);

  const items: AdminSearchItem[] = [
    ...postRows.map((row) =>
      buildAdminItem(input.query, {
        id: row.id,
        type:
          row.authorRole === "admin" && row.type === "article"
            ? "official_article"
            : row.type === "article"
              ? "post_article"
              : "post_moment",
        section: row.authorRole === "admin" && row.type === "article" ? "operations" : "moderation",
        title: row.title,
        subtitle: row.authorDisplayName,
        status: row.status,
        statusLabel: postStatusLabel(row.status),
        targetPath:
          row.authorRole === "admin" && row.type === "article"
            ? `/admin/operations/articles?focus=${row.id}`
            : row.type === "article"
              ? `/admin/moderation/articles?status=${row.status}&focus=${row.id}`
              : `/admin/moderation/moments?status=${row.status}&focus=${row.id}`,
        updatedAt: toIsoString(row.updatedAt),
        fields: [
          { field: "title", value: row.title },
          { field: "content", value: row.contentPlainText },
          { field: "author", value: row.authorDisplayName }
        ]
      })
    ),
    ...postCommentRows.map((row) =>
      buildAdminItem(input.query, {
        id: row.id,
        type: "post_comment",
        section: "moderation",
        title: row.postTitle,
        subtitle: row.authorDisplayName,
        status: row.status,
        statusLabel: commentStatusLabel(row.status),
        targetPath: `/admin/moderation/comments?domain=post&status=${row.status}&focus=${row.id}`,
        updatedAt: toIsoString(row.updatedAt),
        fields: [
          { field: "content", value: row.content },
          { field: "postTitle", value: row.postTitle },
          { field: "author", value: row.authorDisplayName }
        ]
      })
    ),
    ...reviewRows.map((row) =>
      buildAdminItem(input.query, {
        id: row.id,
        type: "review",
        section: "moderation",
        title: row.modelName,
        subtitle: row.authorDisplayName,
        status: row.status,
        statusLabel: reviewStatusLabel(row.status),
        targetPath: `/admin/reviews?focus=${row.id}`,
        updatedAt: toIsoString(row.updatedAt),
        fields: [
          { field: "content", value: row.content },
          { field: "model", value: row.modelName },
          { field: "author", value: row.authorDisplayName }
        ]
      })
    ),
    ...reviewCommentRows.map((row) =>
      buildAdminItem(input.query, {
        id: row.id,
        type: "review_comment",
        section: "moderation",
        title: row.modelName,
        subtitle: row.authorDisplayName,
        status: row.status,
        statusLabel: commentStatusLabel(row.status),
        targetPath: `/admin/moderation/comments?domain=review&status=${row.status}&focus=${row.id}`,
        updatedAt: toIsoString(row.updatedAt),
        fields: [
          { field: "content", value: row.content },
          { field: "model", value: row.modelName },
          { field: "author", value: row.authorDisplayName }
        ]
      })
    ),
    ...modelCommentRows.map((row) =>
      buildAdminItem(input.query, {
        id: row.id,
        type: "model_comment",
        section: "moderation",
        title: row.modelName,
        subtitle: row.authorDisplayName,
        status: row.status,
        statusLabel: commentStatusLabel(row.status),
        targetPath: `/admin/moderation/comments?domain=model&status=${row.status}&focus=${row.id}`,
        updatedAt: toIsoString(row.updatedAt),
        fields: [
          { field: "content", value: row.content },
          { field: "model", value: row.modelName },
          { field: "author", value: row.authorDisplayName }
        ]
      })
    ),
    ...rankingRows.map((row) =>
      buildAdminItem(input.query, {
        id: row.id,
        type: "ranking",
        section: row.type === "official" ? "operations" : "moderation",
        title: row.title,
        subtitle: row.authorDisplayName,
        status: row.status,
        statusLabel: rankingStatusLabel(row.status),
        targetPath:
          row.type === "official"
            ? `/admin/rankings/${row.id}`
            : `/admin/moderation/rankings?status=${row.status}&focus=${row.id}`,
        updatedAt: toIsoString(row.updatedAt),
        fields: [
          { field: "title", value: row.title },
          { field: "description", value: row.description },
          { field: "author", value: row.authorDisplayName }
        ]
      })
    ),
    ...rankingCommentRows.map((row) =>
      buildAdminItem(input.query, {
        id: row.id,
        type: "ranking_comment",
        section: "moderation",
        title: row.rankingTitle,
        subtitle: row.authorDisplayName,
        status: row.status,
        statusLabel: commentStatusLabel(row.status),
        targetPath: `/admin/moderation/comments?domain=ranking&status=${row.status}&focus=${row.id}`,
        updatedAt: toIsoString(row.updatedAt),
        fields: [
          { field: "content", value: row.content },
          { field: "ranking", value: row.rankingTitle },
          { field: "author", value: row.authorDisplayName }
        ]
      })
    ),
    ...ratingTargetRows.map((row) =>
      buildAdminItem(input.query, {
        id: row.id,
        type: "rating_target",
        section: "moderation",
        title: row.title,
        subtitle: row.rankingTitle,
        status: row.status,
        statusLabel: rankingStatusLabel(row.status),
        targetPath: `/admin/moderation/rating-targets?status=${row.status}&focus=${row.id}`,
        updatedAt: toIsoString(row.updatedAt),
        fields: [
          { field: "title", value: row.title },
          { field: "summary", value: row.summary },
          { field: "brand", value: row.brandName },
          { field: "ranking", value: row.rankingTitle }
        ]
      })
    ),
    ...ratingTargetCommentRows.map((row) =>
      buildAdminItem(input.query, {
        id: row.id,
        type: "rating_target_comment",
        section: "moderation",
        title: `${row.rankingTitle} / ${row.ratingTargetTitle}`,
        subtitle: row.authorDisplayName,
        status: row.status,
        statusLabel: commentStatusLabel(row.status),
        targetPath: `/admin/moderation/comments?domain=rating-target&status=${row.status}&focus=${row.id}`,
        updatedAt: toIsoString(row.updatedAt),
        fields: [
          { field: "content", value: row.content },
          { field: "ratingTarget", value: row.ratingTargetTitle },
          { field: "ranking", value: row.rankingTitle }
        ]
      })
    ),
    ...brandApplicationRows.map((row) =>
      buildAdminItem(input.query, {
        id: row.id,
        type: "brand_application",
        section: "moderation",
        title: row.name,
        subtitle: row.applicantDisplayName,
        status: row.status,
        statusLabel: brandApplicationStatusLabel(row.status),
        targetPath: `/admin/moderation/brand-applications?status=${row.status}&focus=${row.id}`,
        updatedAt: toIsoString(row.updatedAt),
        fields: [
          { field: "name", value: row.name },
          { field: "slug", value: row.slug },
          { field: "description", value: row.description },
          { field: "applicant", value: row.applicantDisplayName }
        ]
      })
    ),
    ...submissionRows.map((row) =>
      buildAdminItem(input.query, {
        id: row.id,
        type: "aircraft_submission",
        section: "moderation",
        title: row.modelName,
        subtitle: row.authorDisplayName,
        status: row.status,
        statusLabel: submissionStatusLabel(row.status),
        targetPath: `/admin/moderation/aircraft-submissions?status=${row.status}&focus=${row.id}`,
        updatedAt: toIsoString(row.updatedAt),
        fields: [
          { field: "modelName", value: row.modelName },
          { field: "summary", value: row.summary ?? row.description },
          { field: "brand", value: row.brandName ?? row.proposedBrandName },
          { field: "author", value: row.authorDisplayName }
        ]
      })
    ),
    ...modelRows.map((row) =>
      buildAdminItem(input.query, {
        id: row.id,
        type: "model",
        section: "operations",
        title: row.name,
        subtitle: row.brandName,
        status: "published",
        statusLabel: "已上线",
        targetPath: `/admin/operations/aircraft?focus=${row.id}`,
        updatedAt: toIsoString(row.createdAt),
        fields: [
          { field: "name", value: row.name },
          { field: "summary", value: row.summary ?? row.description },
          { field: "brand", value: row.brandName }
        ]
      })
    ),
    ...brandRows.map((row) =>
      buildAdminItem(input.query, {
        id: row.id,
        type: "brand",
        section: "management",
        title: row.name,
        subtitle: row.slug,
        status: row.isEnabled ? "enabled" : "disabled",
        statusLabel: row.isEnabled ? "已启用" : "已停用",
        targetPath: `/admin/management/brands?focus=${row.id}`,
        updatedAt: toIsoString(row.createdAt),
        fields: [
          { field: "name", value: row.name },
          { field: "slug", value: row.slug }
        ]
      })
    ),
    ...aircraftCategoryRows.rows.map((row) =>
      buildAdminItem(input.query, {
        id: row.id,
        type: "category",
        section: "management",
        title: row.name,
        subtitle: row.slug,
        status: row.isEnabled ? "enabled" : "disabled",
        statusLabel: row.isEnabled ? "已启用" : "已停用",
        targetPath: `/admin/management/categories?focus=${row.id}`,
        updatedAt: toIsoString(row.createdAt),
        fields: [
          { field: "name", value: row.name },
          { field: "slug", value: row.slug }
        ]
      })
    ),
    ...contentCategoryRows.rows.map((row) =>
      buildAdminItem(input.query, {
        id: row.id,
        type: "content_category",
        section: "management",
        title: row.name,
        subtitle: row.slug,
        status: row.isEnabled ? "enabled" : "disabled",
        statusLabel: row.isEnabled ? "已启用" : "已停用",
        targetPath: `/admin/management/content-categories?focus=${row.id}`,
        updatedAt: toIsoString(row.createdAt),
        fields: [
          { field: "name", value: row.name },
          { field: "slug", value: row.slug }
        ]
      })
    ),
    ...reportRows.rows.map((row) =>
      buildAdminItem(input.query, {
        id: row.id,
        type: "report",
        section: "moderation",
        title: row.title,
        subtitle: row.subtitle,
        status: "pending",
        statusLabel: "待处理举报",
        targetPath: `/admin/moderation/reports?focus=${row.id}`,
        updatedAt: toIsoString(row.createdAt),
        fields: [
          { field: "reason", value: truncateSearchText(row.reason, 120) },
          { field: "title", value: row.title }
        ]
      })
    )
  ].sort((left, right) => right.score - left.score || left.section.localeCompare(right.section));

  return {
    query: input.query,
    total: items.length,
    items
  };
}
