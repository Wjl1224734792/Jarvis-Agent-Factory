import {
  aircraftSubmissionsTable,
  aircraftModelsTable,
  aircraftReviewsTable,
  createId,
  db,
  notificationsTable,
  postCommentsTable,
  postInteractionsTable,
  postsTable,
  rankingsTable,
  userFollowsTable,
  usersTable
} from "@feijia/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

type NotificationType =
  | "followed"
  | "post_liked"
  | "post_favorited"
  | "post_shared"
  | "post_commented"
  | "comment_replied";

type ProfileVisibility = "community" | "followers" | "private";

export type UserSettingsRecord = {
  profileVisibility: ProfileVisibility;
  notifyComments: boolean;
  notifyMentions: boolean;
  sessionAlerts: boolean;
  emailDigest: boolean;
};

const defaultUserSettings: UserSettingsRecord = {
  profileVisibility: "community",
  notifyComments: true,
  notifyMentions: true,
  sessionAlerts: true,
  emailDigest: false
};

function toBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    return value === "true" || value === "t" || value === "1";
  }
  return false;
}

function toProfileVisibility(value: unknown): ProfileVisibility {
  if (value === "followers" || value === "private") {
    return value;
  }
  return "community";
}

export const socialRepo = {
  async getUserById(id: string) {
    const rows = await db
      .select({
        id: usersTable.id,
        displayName: usersTable.displayName,
        avatarFileId: usersTable.avatarFileId,
        bio: usersTable.bio,
        role: usersTable.role
      })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async toggleFollow(followerId: string, followeeId: string) {
    const existing = await db
      .select({
        id: userFollowsTable.id
      })
      .from(userFollowsTable)
      .where(
        and(
          eq(userFollowsTable.followerId, followerId),
          eq(userFollowsTable.followeeId, followeeId)
        )
      )
      .limit(1);

    let following = false;

    if (existing.length > 0) {
      await db.delete(userFollowsTable).where(eq(userFollowsTable.id, existing[0].id));
    } else {
      await db.insert(userFollowsTable).values({
        id: createId("follow"),
        followerId,
        followeeId
      });
      following = true;
    }

    return { following };
  },
  async listFollowingStates(followerId: string, followeeIds: string[]) {
    if (followeeIds.length === 0) {
      return [];
    }

    return db
      .select({
        followeeId: userFollowsTable.followeeId
      })
      .from(userFollowsTable)
      .where(
        and(
          eq(userFollowsTable.followerId, followerId),
          inArray(userFollowsTable.followeeId, followeeIds)
        )
      );
  },
  async isFollowing(followerId: string, followeeId: string) {
    const rows = await db
      .select({
        id: userFollowsTable.id
      })
      .from(userFollowsTable)
      .where(
        and(eq(userFollowsTable.followerId, followerId), eq(userFollowsTable.followeeId, followeeId))
      )
      .limit(1);

    return rows.length > 0;
  },
  async countFollowers(userId: string) {
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(userFollowsTable)
      .where(eq(userFollowsTable.followeeId, userId));

    return Number(rows[0]?.count ?? 0);
  },
  async countFollowing(userId: string) {
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(userFollowsTable)
      .where(eq(userFollowsTable.followerId, userId));

    return Number(rows[0]?.count ?? 0);
  },
  async countPublishedPosts(userId: string) {
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(postsTable)
      .where(and(eq(postsTable.authorId, userId), eq(postsTable.status, "published")));

    return Number(rows[0]?.count ?? 0);
  },
  async countVisibleReviews(userId: string) {
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(aircraftReviewsTable)
      .where(and(eq(aircraftReviewsTable.userId, userId), eq(aircraftReviewsTable.status, "visible")));

    return Number(rows[0]?.count ?? 0);
  },
  async countFavoritePosts(userId: string) {
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(postInteractionsTable)
      .where(
        and(eq(postInteractionsTable.userId, userId), eq(postInteractionsTable.type, "favorite"))
      );

    return Number(rows[0]?.count ?? 0);
  },
  async countFavoriteModels(userId: string) {
    const rows = await db.execute(sql<{ count: number }>`
      select cast(count(*) as int) as count
      from "aircraft_model_interactions"
      where "user_id" = ${userId} and "type" = 'favorite'
    `);

    return Number(rows.rows[0]?.count ?? 0);
  },
  async countUserRankings(userId: string) {
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(rankingsTable)
      .where(eq(rankingsTable.authorId, userId));

    return Number(rows[0]?.count ?? 0);
  },
  async countUserAircraftSubmissions(userId: string) {
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(aircraftSubmissionsTable)
      .where(eq(aircraftSubmissionsTable.authorId, userId));

    return Number(rows[0]?.count ?? 0);
  },
  async listUserPublishedPosts(userId: string) {
    return db
      .select({
        id: postsTable.id,
        type: postsTable.type,
        title: postsTable.title,
        content: postsTable.content,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt
      })
      .from(postsTable)
      .where(and(eq(postsTable.authorId, userId), eq(postsTable.status, "published")))
      .orderBy(desc(postsTable.updatedAt));
  },
  async listUserFavoritedPosts(userId: string) {
    return db
      .select({
        id: postsTable.id,
        type: postsTable.type,
        title: postsTable.title,
        content: postsTable.content,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt
      })
      .from(postInteractionsTable)
      .innerJoin(postsTable, eq(postInteractionsTable.postId, postsTable.id))
      .where(
        and(
          eq(postInteractionsTable.userId, userId),
          eq(postInteractionsTable.type, "favorite"),
          eq(postsTable.status, "published")
        )
      )
      .orderBy(desc(postInteractionsTable.createdAt));
  },
  async listUserFavoritedModels(userId: string) {
    const rows = await db.execute(
      sql`
      select
        interaction."id" as "id",
        model."id" as "modelId",
        model."slug" as "slug",
        model."name" as "name",
        model."power_type" as "powerType",
        interaction."created_at" as "createdAt",
        interaction."updated_at" as "updatedAt"
      from "aircraft_model_interactions" as interaction
      inner join "aircraft_models" as model
        on model."id" = interaction."model_id"
      where
        interaction."user_id" = ${userId}
        and interaction."type" = 'favorite'
        and model."is_published" = true
      order by interaction."updated_at" desc
    `
    );

    const typedRows = rows.rows as Array<Record<string, unknown>>;
    return typedRows.map((row) => ({
      id: String(row.id ?? ""),
      modelId: String(row.modelId ?? ""),
      slug: String(row.slug ?? ""),
      name: String(row.name ?? ""),
      powerType:
        row.powerType === "fuel" ||
        row.powerType === "hybrid" ||
        row.powerType === "other"
          ? row.powerType
          : ("electric" as const),
      createdAt:
        row.createdAt instanceof Date ||
        typeof row.createdAt === "string" ||
        typeof row.createdAt === "number"
          ? row.createdAt
          : new Date(0),
      updatedAt:
        row.updatedAt instanceof Date ||
        typeof row.updatedAt === "string" ||
        typeof row.updatedAt === "number"
          ? row.updatedAt
          : new Date(0)
    }));
  },
  async listUserVisibleReviews(userId: string) {
    return db
      .select({
        id: aircraftReviewsTable.id,
        content: aircraftReviewsTable.content,
        createdAt: aircraftReviewsTable.createdAt,
        updatedAt: aircraftReviewsTable.updatedAt,
        model: {
          id: aircraftModelsTable.id,
          slug: aircraftModelsTable.slug,
          name: aircraftModelsTable.name
        }
      })
      .from(aircraftReviewsTable)
      .innerJoin(aircraftModelsTable, eq(aircraftReviewsTable.modelId, aircraftModelsTable.id))
      .where(and(eq(aircraftReviewsTable.userId, userId), eq(aircraftReviewsTable.status, "visible")))
      .orderBy(desc(aircraftReviewsTable.updatedAt));
  },
  async listUserRankings(userId: string) {
    return db
      .select({
        id: rankingsTable.id,
        title: rankingsTable.title,
        description: rankingsTable.description,
        createdAt: rankingsTable.createdAt,
        updatedAt: rankingsTable.updatedAt
      })
      .from(rankingsTable)
      .where(eq(rankingsTable.authorId, userId))
      .orderBy(desc(rankingsTable.updatedAt));
  },
  async listUserAircraftSubmissions(userId: string, includePrivate: boolean) {
    return db
      .select({
        id: aircraftSubmissionsTable.id,
        modelName: aircraftSubmissionsTable.modelName,
        summary: aircraftSubmissionsTable.summary,
        status: aircraftSubmissionsTable.status,
        createdAt: aircraftSubmissionsTable.createdAt,
        updatedAt: aircraftSubmissionsTable.updatedAt
      })
      .from(aircraftSubmissionsTable)
      .where(
        and(
          eq(aircraftSubmissionsTable.authorId, userId),
          includePrivate
            ? sql`true`
            : eq(aircraftSubmissionsTable.status, "approved")
        )
      )
      .orderBy(desc(aircraftSubmissionsTable.updatedAt));
  },
  async createNotification(input: {
    userId: string;
    actorId: string;
    type: NotificationType;
    postId?: string | null;
    commentId?: string | null;
  }) {
    await db.insert(notificationsTable).values({
      id: createId("notice"),
      userId: input.userId,
      actorId: input.actorId,
      type: input.type,
      postId: input.postId ?? null,
      commentId: input.commentId ?? null,
      isRead: false
    });
  },
  async listNotifications(userId: string) {
    return db
      .select({
        id: notificationsTable.id,
        userId: notificationsTable.userId,
        actorId: notificationsTable.actorId,
        type: notificationsTable.type,
        postId: notificationsTable.postId,
        commentId: notificationsTable.commentId,
        isRead: notificationsTable.isRead,
        createdAt: notificationsTable.createdAt
      })
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(desc(notificationsTable.createdAt));
  },
  async markAllNotificationsRead(userId: string) {
    await db
      .update(notificationsTable)
      .set({
        isRead: true
      })
      .where(eq(notificationsTable.userId, userId));
  },
  async markNotificationRead(userId: string, notificationId: string) {
    const rows = await db
      .select({
        id: notificationsTable.id
      })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.id, notificationId)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return false;
    }

    await db
      .update(notificationsTable)
      .set({
        isRead: true
      })
      .where(eq(notificationsTable.id, notificationId));

    return true;
  },
  async listUsersByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return db
      .select({
        id: usersTable.id,
        displayName: usersTable.displayName,
        avatarFileId: usersTable.avatarFileId,
        role: usersTable.role
      })
      .from(usersTable)
      .where(inArray(usersTable.id, ids));
  },
  async getCurrentUserProfile(userId: string) {
    const rows = await db
      .select({
        id: usersTable.id,
        displayName: usersTable.displayName,
        bio: usersTable.bio,
        avatarFileId: usersTable.avatarFileId,
        phone: usersTable.phone
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    return rows[0] ?? null;
  },
  async findUserByPhone(phone: string) {
    const rows = await db
      .select({
        id: usersTable.id
      })
      .from(usersTable)
      .where(eq(usersTable.phone, phone))
      .limit(1);

    return rows[0] ?? null;
  },
  async findUserByDisplayName(displayName: string) {
    const rows = await db
      .select({
        id: usersTable.id
      })
      .from(usersTable)
      .where(eq(usersTable.displayName, displayName))
      .limit(1);

    return rows[0] ?? null;
  },
  async getUserSettings(userId: string) {
    const rows = await db.execute(
      sql`
      select
        "profile_visibility" as "profileVisibility",
        "notify_comments" as "notifyComments",
        "notify_mentions" as "notifyMentions",
        "session_alerts" as "sessionAlerts",
        "email_digest" as "emailDigest"
      from "user_settings"
      where "user_id" = ${userId}
      limit 1
    `
    );

    const row = (rows.rows as Array<Record<string, unknown>>)[0];
    if (!row) {
      return null;
    }

    return {
      profileVisibility: toProfileVisibility(row.profileVisibility),
      notifyComments: toBoolean(row.notifyComments),
      notifyMentions: toBoolean(row.notifyMentions),
      sessionAlerts: toBoolean(row.sessionAlerts),
      emailDigest: toBoolean(row.emailDigest)
    };
  },
  async getResolvedUserSettings(userId: string) {
    const settings = await this.getUserSettings(userId);
    return settings
      ? {
          profileVisibility: settings.profileVisibility,
          notifyComments: settings.notifyComments,
          notifyMentions: settings.notifyMentions,
          sessionAlerts: settings.sessionAlerts,
          emailDigest: settings.emailDigest
        }
      : defaultUserSettings;
  },
  async upsertUserSettings(userId: string, settings: UserSettingsRecord) {
    await db.execute(sql`
      insert into "user_settings" (
        "id",
        "user_id",
        "profile_visibility",
        "notify_comments",
        "notify_mentions",
        "session_alerts",
        "email_digest",
        "created_at",
        "updated_at"
      )
      values (
        ${createId("uset")},
        ${userId},
        ${settings.profileVisibility},
        ${settings.notifyComments},
        ${settings.notifyMentions},
        ${settings.sessionAlerts},
        ${settings.emailDigest},
        now(),
        now()
      )
      on conflict ("user_id")
      do update set
        "profile_visibility" = excluded."profile_visibility",
        "notify_comments" = excluded."notify_comments",
        "notify_mentions" = excluded."notify_mentions",
        "session_alerts" = excluded."session_alerts",
        "email_digest" = excluded."email_digest",
        "updated_at" = now()
    `);
  },
  async updateCurrentUserProfile(
    userId: string,
    input: {
      displayName?: string;
      bio?: string | null;
      avatarFileId?: string | null;
      phone?: string | null;
    }
  ) {
    const updates: Partial<typeof usersTable.$inferInsert> = {};

    if (input.displayName !== undefined) {
      updates.displayName = input.displayName;
    }
    if (input.bio !== undefined) {
      updates.bio = input.bio ?? null;
    }
    if (input.avatarFileId !== undefined) {
      updates.avatarFileId = input.avatarFileId ?? null;
    }
    if (input.phone !== undefined) {
      updates.phone = input.phone ?? null;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
    }

    return this.getCurrentUserProfile(userId);
  },
  async listPostsByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return db
      .select({
        id: postsTable.id,
        title: postsTable.title
      })
      .from(postsTable)
      .where(inArray(postsTable.id, ids));
  },
  async listCommentsByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return db
      .select({
        id: postCommentsTable.id,
        postId: postCommentsTable.postId,
        content: postCommentsTable.content
      })
      .from(postCommentsTable)
      .where(inArray(postCommentsTable.id, ids));
  },
  defaultUserSettings() {
    return defaultUserSettings;
  }
};
