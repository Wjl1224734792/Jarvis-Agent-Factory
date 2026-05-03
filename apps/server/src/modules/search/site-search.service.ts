import {
  aircraftModelCommentsTable,
  aircraftModelInteractionsTable,
  aircraftModelsTable,
  brandsTable,
  db,
  postsTable,
  rankingsTable,
  ratingTargetsTable,
  userFollowsTable,
  userSettingsTable,
  usersTable
} from "@feijia/db";
import { and, desc, eq, or, sql } from "drizzle-orm";
import {
  buildIlikeAnyCondition,
  buildMatchRankSql,
  buildSearchPatterns,
  resolveMatchedField,
  truncateSearchText
} from "../../lib/search";

type SiteSearchItem = {
  id: string;
  type: "post_article" | "post_moment" | "model" | "ranking" | "rating_target" | "user";
  title: string;
  subtitle: string | null;
  summary: string | null;
  href: string;
  matchedField: string;
  score: number;
  updatedAt: string | null;
};

function resolveGroupLimit(limit: number) {
  return Math.max(6, Math.min(50, limit * 2));
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

function buildSiteItem(
  query: string,
  input: Omit<SiteSearchItem, "matchedField" | "score"> & {
    fields: Array<{ field: string; value: string | null | undefined }>;
  }
): SiteSearchItem {
  const match = resolveMatchedField(query, input.fields);

  return {
    id: input.id,
    type: input.type,
    title: input.title,
    subtitle: input.subtitle,
    summary: input.summary,
    href: input.href,
    matchedField: match.matchedField,
    score: match.score,
    updatedAt: input.updatedAt
  };
}

export async function searchSiteContent(input: {
  query: string;
  limit: number;
  currentUserId?: string | null;
}) {
  const patterns = buildSearchPatterns(input.query);
  const limit = resolveGroupLimit(input.limit);

  const postSearchFields = [postsTable.title, postsTable.contentPlainText];
  const postMatchRank = buildMatchRankSql(postSearchFields, patterns);
  const postKeywordCondition = buildIlikeAnyCondition(postSearchFields, patterns.contains);

  const articleRows = postKeywordCondition
    ? await db
        .select({
          id: postsTable.id,
          title: postsTable.title,
          contentPlainText: postsTable.contentPlainText,
          authorDisplayName: usersTable.displayName,
          publishedAt: postsTable.publishedAt,
          createdAt: postsTable.createdAt
        })
        .from(postsTable)
        .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
        .where(
          and(
            eq(postsTable.status, "published"),
            eq(postsTable.type, "article"),
            postKeywordCondition
          )
        )
        .orderBy(desc(postMatchRank), desc(postsTable.publishedAt), desc(postsTable.createdAt))
        .limit(limit)
    : [];

  const momentRows = postKeywordCondition
    ? await db
        .select({
          id: postsTable.id,
          title: postsTable.title,
          contentPlainText: postsTable.contentPlainText,
          authorDisplayName: usersTable.displayName,
          publishedAt: postsTable.publishedAt,
          createdAt: postsTable.createdAt
        })
        .from(postsTable)
        .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
        .where(
          and(
            eq(postsTable.status, "published"),
            eq(postsTable.type, "moment"),
            postKeywordCondition
          )
        )
        .orderBy(desc(postMatchRank), desc(postsTable.publishedAt), desc(postsTable.createdAt))
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
    .as("search_model_favorite_counts");

  const modelCommentCounts = db
    .select({
      modelId: aircraftModelCommentsTable.modelId,
      commentCount: sql<number>`cast(count(*) as int)`.as("comment_count")
    })
    .from(aircraftModelCommentsTable)
    .where(eq(aircraftModelCommentsTable.status, "visible"))
    .groupBy(aircraftModelCommentsTable.modelId)
    .as("search_model_comment_counts");

  const modelSearchFields = [
    aircraftModelsTable.name,
    brandsTable.name,
    aircraftModelsTable.summary,
    aircraftModelsTable.description
  ];
  const modelMatchRank = buildMatchRankSql(modelSearchFields, patterns);
  const modelKeywordCondition = buildIlikeAnyCondition(modelSearchFields, patterns.contains);

  const modelRows = modelKeywordCondition
    ? await db
        .select({
          id: aircraftModelsTable.id,
          slug: aircraftModelsTable.slug,
          name: aircraftModelsTable.name,
          summary: aircraftModelsTable.summary,
          description: aircraftModelsTable.description,
          brandName: brandsTable.name,
          createdAt: aircraftModelsTable.createdAt
        })
        .from(aircraftModelsTable)
        .innerJoin(brandsTable, eq(aircraftModelsTable.brandId, brandsTable.id))
        .leftJoin(modelFavoriteCounts, eq(modelFavoriteCounts.modelId, aircraftModelsTable.id))
        .leftJoin(modelCommentCounts, eq(modelCommentCounts.modelId, aircraftModelsTable.id))
        .where(and(eq(aircraftModelsTable.isPublished, true), modelKeywordCondition))
        .orderBy(
          desc(modelMatchRank),
          desc(sql`coalesce(${modelFavoriteCounts.favoriteCount}, 0)`),
          desc(sql`coalesce(${modelCommentCounts.commentCount}, 0)`),
          desc(aircraftModelsTable.createdAt)
        )
        .limit(limit)
    : [];

  const rankingSearchFields = [rankingsTable.title, rankingsTable.description];
  const rankingMatchRank = buildMatchRankSql(rankingSearchFields, patterns);
  const rankingKeywordCondition = buildIlikeAnyCondition(rankingSearchFields, patterns.contains);

  const rankingRows = rankingKeywordCondition
    ? await db
        .select({
          id: rankingsTable.id,
          title: rankingsTable.title,
          description: rankingsTable.description,
          authorDisplayName: usersTable.displayName,
          createdAt: rankingsTable.createdAt
        })
        .from(rankingsTable)
        .innerJoin(usersTable, eq(rankingsTable.authorId, usersTable.id))
        .where(and(eq(rankingsTable.status, "published"), rankingKeywordCondition))
        .orderBy(desc(rankingMatchRank), desc(rankingsTable.createdAt))
        .limit(limit)
    : [];

  const ratingTargetSearchFields = [
    ratingTargetsTable.title,
    ratingTargetsTable.summary,
    ratingTargetsTable.brandName,
    aircraftModelsTable.name
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
          rankingId: rankingsTable.id,
          title: ratingTargetsTable.title,
          summary: ratingTargetsTable.summary,
          brandName: ratingTargetsTable.brandName,
          linkedModelName: aircraftModelsTable.name,
          rankingTitle: rankingsTable.title,
          createdAt: ratingTargetsTable.createdAt
        })
        .from(ratingTargetsTable)
        .innerJoin(rankingsTable, eq(ratingTargetsTable.rankingId, rankingsTable.id))
        .leftJoin(aircraftModelsTable, eq(ratingTargetsTable.linkedModelId, aircraftModelsTable.id))
        .where(
          and(
            eq(ratingTargetsTable.status, "published"),
            eq(rankingsTable.status, "published"),
            ratingTargetKeywordCondition
          )
        )
        .orderBy(desc(ratingTargetMatchRank), desc(ratingTargetsTable.likeCount), desc(ratingTargetsTable.createdAt))
        .limit(limit)
    : [];

  const userFollowerCounts = db
    .select({
      followeeId: userFollowsTable.followeeId,
      followerCount: sql<number>`cast(count(*) as int)`.as("follower_count")
    })
    .from(userFollowsTable)
    .groupBy(userFollowsTable.followeeId)
    .as("search_user_follower_counts");

  const userSearchFields = [usersTable.displayName];
  const userMatchRank = buildMatchRankSql(userSearchFields, patterns);
  const userKeywordCondition = buildIlikeAnyCondition(userSearchFields, patterns.contains);
  const userVisibility = sql<string>`coalesce(${userSettingsTable.profileVisibility}, 'community')`;
  const followerVisibilityCondition =
    input.currentUserId
      ? or(
          eq(userFollowsTable.followerId, input.currentUserId),
          eq(usersTable.id, input.currentUserId)
        ) ?? sql`false`
      : sql`false`;
  const userVisibilityCondition =
    input.currentUserId
      ? or(
          sql`${userVisibility} = 'community'`,
          and(sql`${userVisibility} = 'followers'`, followerVisibilityCondition),
          and(sql`${userVisibility} = 'private'`, eq(usersTable.id, input.currentUserId))
        ) ?? sql`false`
      : sql`${userVisibility} = 'community'`;

  const userRows = userKeywordCondition
    ? await db
        .select({
          id: usersTable.id,
          displayName: usersTable.displayName,
          bio: usersTable.bio,
          followerCount: sql<number>`cast(coalesce(${userFollowerCounts.followerCount}, 0) as int)`,
          createdAt: usersTable.createdAt
        })
        .from(usersTable)
        .leftJoin(userSettingsTable, eq(userSettingsTable.userId, usersTable.id))
        .leftJoin(
          userFollowsTable,
          input.currentUserId
            ? and(
                eq(userFollowsTable.followeeId, usersTable.id),
                eq(userFollowsTable.followerId, input.currentUserId)
              )
            : sql`false`
        )
        .leftJoin(userFollowerCounts, eq(userFollowerCounts.followeeId, usersTable.id))
        .where(and(userKeywordCondition, userVisibilityCondition))
        .orderBy(
          desc(userMatchRank),
          desc(sql`coalesce(${userFollowerCounts.followerCount}, 0)`),
          desc(usersTable.createdAt)
        )
        .limit(limit)
    : [];

  const items: SiteSearchItem[] = [
    ...articleRows.map((row) =>
      buildSiteItem(input.query, {
        id: row.id,
        type: "post_article",
        title: row.title,
        subtitle: row.authorDisplayName,
        summary: truncateSearchText(row.contentPlainText),
        href: `/posts/${row.id}`,
        updatedAt: toIsoString(row.publishedAt ?? row.createdAt),
        fields: [
          { field: "title", value: row.title },
          { field: "content", value: row.contentPlainText }
        ]
      })
    ),
    ...momentRows.map((row) =>
      buildSiteItem(input.query, {
        id: row.id,
        type: "post_moment",
        title: row.title,
        subtitle: row.authorDisplayName,
        summary: truncateSearchText(row.contentPlainText),
        href: `/posts/${row.id}`,
        updatedAt: toIsoString(row.publishedAt ?? row.createdAt),
        fields: [
          { field: "title", value: row.title },
          { field: "content", value: row.contentPlainText }
        ]
      })
    ),
    ...modelRows.map((row) =>
      buildSiteItem(input.query, {
        id: row.id,
        type: "model",
        title: row.name,
        subtitle: row.brandName,
        summary: truncateSearchText(row.summary ?? row.description),
        href: `/models/${row.slug}`,
        updatedAt: toIsoString(row.createdAt),
        fields: [
          { field: "name", value: row.name },
          { field: "brand", value: row.brandName },
          { field: "summary", value: row.summary },
          { field: "description", value: row.description }
        ]
      })
    ),
    ...rankingRows.map((row) =>
      buildSiteItem(input.query, {
        id: row.id,
        type: "ranking",
        title: row.title,
        subtitle: row.authorDisplayName,
        summary: truncateSearchText(row.description),
        href: `/rankings/${row.id}`,
        updatedAt: toIsoString(row.createdAt),
        fields: [
          { field: "title", value: row.title },
          { field: "description", value: row.description }
        ]
      })
    ),
    ...ratingTargetRows.map((row) =>
      buildSiteItem(input.query, {
        id: row.id,
        type: "rating_target",
        title: row.title,
        subtitle: row.rankingTitle,
        summary: truncateSearchText(row.summary ?? row.brandName ?? row.linkedModelName),
        href: `/rating-targets/${row.id}?ranking=${row.rankingId}`,
        updatedAt: toIsoString(row.createdAt),
        fields: [
          { field: "title", value: row.title },
          { field: "summary", value: row.summary },
          { field: "brand", value: row.brandName },
          { field: "model", value: row.linkedModelName }
        ]
      })
    ),
    ...userRows.map((row) =>
      buildSiteItem(input.query, {
        id: row.id,
        type: "user",
        title: row.displayName,
        subtitle: `粉丝 ${row.followerCount}`,
        summary: truncateSearchText(row.bio),
        href: `/users/${row.id}`,
        updatedAt: toIsoString(row.createdAt),
        fields: [{ field: "displayName", value: row.displayName }]
      })
    )
  ].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    const leftUpdated = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
    const rightUpdated = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
    if (rightUpdated !== leftUpdated) {
      return rightUpdated - leftUpdated;
    }

    return left.type.localeCompare(right.type);
  });
  const limitedItems = items.slice(0, input.limit);

  return {
    query: input.query,
    total: items.length,
    items: limitedItems
  };
}
