import {
  circleCategoryAssignmentsTable,
  circleMembersTable,
  circlePostCommentLikesTable,
  circlePostCommentReportsTable,
  circlePostCommentsTable,
  circlePostInteractionsTable,
  circlePostReportsTable,
  circlePostsTable,
  circleUserCategoriesTable,
  circlesTable,
  createId,
  db,
  userFollowsTable,
  usersTable,
} from "@feijia/db";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";

export const circlesRepo = {
  // ── 圈子 CRUD ──

  async listCircles(filters: {
    keyword?: string;
    sort?: "hot" | "latest";
    limit?: number;
    offset?: number;
  }) {
    const conditions: ReturnType<typeof eq>[] = [];
    if (filters.keyword) {
      const kw = `%${filters.keyword}%`;
      conditions.push(
        or(
          sql`${circlesTable.name} ILIKE ${kw}`,
          sql`${circlesTable.description} ILIKE ${kw}`
        )!
      );
    }

    const orderBy = filters.sort === "latest"
      ? desc(circlesTable.createdAt)
      : desc(circlesTable.memberCount);

    return db
      .select({
        id: circlesTable.id,
        slug: circlesTable.slug,
        name: circlesTable.name,
        description: circlesTable.description,
        coverImageFileId: circlesTable.coverImageFileId,
        joinMode: circlesTable.joinMode,
        memberCount: circlesTable.memberCount,
        postCount: circlesTable.postCount,
        viewCount: circlesTable.viewCount,
        createdAt: circlesTable.createdAt,
        owner: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
        },
      })
      .from(circlesTable)
      .innerJoin(usersTable, eq(circlesTable.ownerId, usersTable.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(filters.limit ?? 20)
      .offset(filters.offset ?? 0);
  },

  async findBySlug(slug: string) {
    const items = await db
      .select({
        id: circlesTable.id,
        slug: circlesTable.slug,
        name: circlesTable.name,
        description: circlesTable.description,
        coverImageFileId: circlesTable.coverImageFileId,
        ownerId: circlesTable.ownerId,
        joinMode: circlesTable.joinMode,
        memberCount: circlesTable.memberCount,
        postCount: circlesTable.postCount,
        viewCount: circlesTable.viewCount,
        isEnabled: circlesTable.isEnabled,
        createdAt: circlesTable.createdAt,
        updatedAt: circlesTable.updatedAt,
        owner: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
        },
      })
      .from(circlesTable)
      .innerJoin(usersTable, eq(circlesTable.ownerId, usersTable.id))
      .where(eq(circlesTable.slug, slug))
      .limit(1);
    return items[0] ?? null;
  },

  async create(input: {
    slug: string;
    name: string;
    description: string | null;
    coverImageFileId: string | null;
    ownerId: string;
    joinMode: "free" | "audit";
  }) {
    const id = createId("circle");
    await db.insert(circlesTable).values({
      id,
      slug: input.slug,
      name: input.name,
      description: input.description,
      coverImageFileId: input.coverImageFileId,
      ownerId: input.ownerId,
      joinMode: input.joinMode,
    });
    // 创建者自动成为 owner 成员
    await db.insert(circleMembersTable).values({
      id: createId("cm"),
      circleId: id,
      userId: input.ownerId,
      role: "owner",
    });
    return this.findById(id);
  },

  async findById(id: string) {
    const items = await db
      .select({
        id: circlesTable.id,
        slug: circlesTable.slug,
        name: circlesTable.name,
        description: circlesTable.description,
        coverImageFileId: circlesTable.coverImageFileId,
        ownerId: circlesTable.ownerId,
        joinMode: circlesTable.joinMode,
        memberCount: circlesTable.memberCount,
        postCount: circlesTable.postCount,
        viewCount: circlesTable.viewCount,
        isEnabled: circlesTable.isEnabled,
        createdAt: circlesTable.createdAt,
        updatedAt: circlesTable.updatedAt,
      })
      .from(circlesTable)
      .where(eq(circlesTable.id, id))
      .limit(1);
    return items[0] ?? null;
  },

  // ── 成员管理 ──

  async getMember(circleId: string, userId: string) {
    const items = await db
      .select()
      .from(circleMembersTable)
      .where(
        and(
          eq(circleMembersTable.circleId, circleId),
          eq(circleMembersTable.userId, userId)
        )
      )
      .limit(1);
    return items[0] ?? null;
  },

  async addMember(input: {
    circleId: string;
    userId: string;
    role?: "admin" | "member";
  }) {
    const id = createId("cm");
    await db.insert(circleMembersTable).values({
      id,
      circleId: input.circleId,
      userId: input.userId,
      role: input.role ?? "member",
    });
    await db
      .update(circlesTable)
      .set({ memberCount: sql`${circlesTable.memberCount} + 1` })
      .where(eq(circlesTable.id, input.circleId));
  },

  async removeMember(circleId: string, userId: string) {
    await db
      .delete(circleMembersTable)
      .where(
        and(
          eq(circleMembersTable.circleId, circleId),
          eq(circleMembersTable.userId, userId)
        )
      );
    await db
      .update(circlesTable)
      .set({ memberCount: sql`GREATEST(0, ${circlesTable.memberCount} - 1)` })
      .where(eq(circlesTable.id, circleId));
  },

  async listMembers(circleId: string) {
    return db
      .select({
        id: circleMembersTable.id,
        circleId: circleMembersTable.circleId,
        userId: circleMembersTable.userId,
        role: circleMembersTable.role,
        joinedAt: circleMembersTable.joinedAt,
        user: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
        },
      })
      .from(circleMembersTable)
      .innerJoin(usersTable, eq(circleMembersTable.userId, usersTable.id))
      .where(eq(circleMembersTable.circleId, circleId))
      .orderBy(asc(circleMembersTable.joinedAt));
  },

  async listUserCircles(userId: string) {
    return db
      .select({
        id: circlesTable.id,
        slug: circlesTable.slug,
        name: circlesTable.name,
        description: circlesTable.description,
        coverImageFileId: circlesTable.coverImageFileId,
        joinMode: circlesTable.joinMode,
        memberCount: circlesTable.memberCount,
        postCount: circlesTable.postCount,
        role: circleMembersTable.role,
        joinedAt: circleMembersTable.joinedAt,
      })
      .from(circleMembersTable)
      .innerJoin(circlesTable, eq(circleMembersTable.circleId, circlesTable.id))
      .where(eq(circleMembersTable.userId, userId))
      .orderBy(desc(circleMembersTable.joinedAt));
  },

  // ── 帖子 ──

  async listPosts(circleId: string, filters: {
    tab?: "recommended" | "latest";
    limit?: number;
    offset?: number;
  }) {
    const orderBy = filters.tab === "latest"
      ? desc(circlePostsTable.createdAt)
      : desc(circlePostsTable.hotScore);

    return db
      .select({
        id: circlePostsTable.id,
        circleId: circlePostsTable.circleId,
        title: circlePostsTable.title,
        content: circlePostsTable.content,
        images: circlePostsTable.images,
        videos: circlePostsTable.videos,
        likeCount: circlePostsTable.likeCount,
        commentCount: circlePostsTable.commentCount,
        shareCount: circlePostsTable.shareCount,
        viewCount: circlePostsTable.viewCount,
        hotScore: circlePostsTable.hotScore,
        createdAt: circlePostsTable.createdAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
        },
      })
      .from(circlePostsTable)
      .innerJoin(usersTable, eq(circlePostsTable.authorId, usersTable.id))
      .where(and(eq(circlePostsTable.circleId, circleId), eq(circlePostsTable.status, "published")))
      .orderBy(orderBy)
      .limit(filters.limit ?? 20)
      .offset(filters.offset ?? 0);
  },

  async createPost(input: {
    circleId: string;
    authorId: string;
    title: string;
    content: string | null;
    images: string[];
    videos: string[];
    status?: string;
  }) {
    const id = createId("cp");
    await db.insert(circlePostsTable).values({
      id,
      circleId: input.circleId,
      authorId: input.authorId,
      title: input.title,
      content: input.content,
      images: JSON.stringify(input.images),
      videos: JSON.stringify(input.videos),
      status: input.status,
    });
    await db
      .update(circlesTable)
      .set({ postCount: sql`${circlesTable.postCount} + 1` })
      .where(eq(circlesTable.id, input.circleId));
    return id;
  },

  async findPostById(postId: string) {
    const items = await db
      .select({
        id: circlePostsTable.id,
        circleId: circlePostsTable.circleId,
        title: circlePostsTable.title,
        content: circlePostsTable.content,
        images: circlePostsTable.images,
        videos: circlePostsTable.videos,
        status: circlePostsTable.status,
        likeCount: circlePostsTable.likeCount,
        commentCount: circlePostsTable.commentCount,
        shareCount: circlePostsTable.shareCount,
        viewCount: circlePostsTable.viewCount,
        hotScore: circlePostsTable.hotScore,
        createdAt: circlePostsTable.createdAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
        },
      })
      .from(circlePostsTable)
      .innerJoin(usersTable, eq(circlePostsTable.authorId, usersTable.id))
      .where(eq(circlePostsTable.id, postId))
      .limit(1);
    return items[0] ?? null;
  },

  // ── 帖子互动 ──

  async togglePostInteraction(postId: string, userId: string, type: "like" | "favorite" | "share") {
    const existing = await db
      .select()
      .from(circlePostInteractionsTable)
      .where(
        and(
          eq(circlePostInteractionsTable.postId, postId),
          eq(circlePostInteractionsTable.userId, userId),
          eq(circlePostInteractionsTable.type, type)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(circlePostInteractionsTable)
        .where(eq(circlePostInteractionsTable.id, existing[0].id));
      if (type === "like") {
        await db
          .update(circlePostsTable)
          .set({ likeCount: sql`GREATEST(0, ${circlePostsTable.likeCount} - 1)` })
          .where(eq(circlePostsTable.id, postId));
      }
      return false;
    }

    await db.insert(circlePostInteractionsTable).values({
      id: createId("cpi"),
      postId,
      userId,
      type,
    });
    if (type === "like") {
      await db
        .update(circlePostsTable)
        .set({ likeCount: sql`${circlePostsTable.likeCount} + 1` })
        .where(eq(circlePostsTable.id, postId));
    }
    return true;
  },

  // ── 帖子评论 ──

  async listPostComments(postId: string) {
    return db
      .select({
        id: circlePostCommentsTable.id,
        postId: circlePostCommentsTable.postId,
        content: circlePostCommentsTable.content,
        parentCommentId: circlePostCommentsTable.parentCommentId,
        replyToUserId: circlePostCommentsTable.replyToUserId,
        likeCount: circlePostCommentsTable.likeCount,
        createdAt: circlePostCommentsTable.createdAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
        },
      })
      .from(circlePostCommentsTable)
      .innerJoin(usersTable, eq(circlePostCommentsTable.authorId, usersTable.id))
      .where(and(eq(circlePostCommentsTable.postId, postId), eq(circlePostCommentsTable.status, "visible")))
      .orderBy(asc(circlePostCommentsTable.createdAt));
  },

  async createComment(input: {
    postId: string;
    authorId: string;
    content: string;
    parentCommentId?: string | null;
    replyToUserId?: string | null;
    status?: string;
  }) {
    const id = createId("cc");
    await db.insert(circlePostCommentsTable).values({
      id,
      postId: input.postId,
      authorId: input.authorId,
      content: input.content,
      parentCommentId: input.parentCommentId ?? null,
      replyToUserId: input.replyToUserId ?? null,
      status: input.status,
    });
    await db
      .update(circlePostsTable)
      .set({ commentCount: sql`${circlePostsTable.commentCount} + 1` })
      .where(eq(circlePostsTable.id, input.postId));
    return id;
  },

  // ── 统一Feed ──

  async listFeed(filters: {
    tab?: "recommended" | "latest" | "following";
    currentUserId?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions: ReturnType<typeof eq>[] = [];

    // 只显示已发布的帖子
    conditions.push(eq(circlePostsTable.status, "published"));

    // "最新" Tab: 匿名用户返回空数组
    if (filters.tab === "latest" && !filters.currentUserId) {
      return [];
    }

    // "最新" Tab: 只显示已加入圈子的帖子（含无圈子归属的历史帖子）
    if (filters.tab === "latest" && filters.currentUserId) {
      conditions.push(
        or(
          sql`${circlePostsTable.circleId} IN (
            SELECT ${circleMembersTable.circleId}
            FROM ${circleMembersTable}
            WHERE ${circleMembersTable.userId} = ${filters.currentUserId}
          )`,
          sql`${circlePostsTable.circleId} IS NULL`
        )!
      );
    }

    // "关注" Tab: 只显示已关注作者的帖子
    if (filters.tab === "following" && filters.currentUserId) {
      conditions.push(
        sql`${circlePostsTable.authorId} IN (
          SELECT ${userFollowsTable.followeeId}
          FROM ${userFollowsTable}
          WHERE ${userFollowsTable.followerId} = ${filters.currentUserId}
        )`
      );
    }

    const orderBy = filters.tab === "latest" || filters.tab === "following"
      ? desc(circlePostsTable.createdAt)
      : desc(circlePostsTable.hotScore);

    return db
      .select({
        id: circlePostsTable.id,
        circleId: circlePostsTable.circleId,
        title: circlePostsTable.title,
        content: circlePostsTable.content,
        images: circlePostsTable.images,
        videos: circlePostsTable.videos,
        likeCount: circlePostsTable.likeCount,
        commentCount: circlePostsTable.commentCount,
        shareCount: circlePostsTable.shareCount,
        viewCount: circlePostsTable.viewCount,
        hotScore: circlePostsTable.hotScore,
        createdAt: circlePostsTable.createdAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
        },
        circle: {
          id: circlesTable.id,
          slug: circlesTable.slug,
          name: circlesTable.name,
        },
      })
      .from(circlePostsTable)
      .innerJoin(usersTable, eq(circlePostsTable.authorId, usersTable.id))
      .leftJoin(circlesTable, eq(circlePostsTable.circleId, circlesTable.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(filters.limit ?? 20)
      .offset(filters.offset ?? 0);
  },

  // ── 热度计算（连续指数衰减 + 浏览权重 + 新内容发现加成） ──

  async updatePostHotScore(postId: string) {
    const now = new Date();
    const hoursSinceCreation = sql<number>`EXTRACT(EPOCH FROM (${now} - ${circlePostsTable.createdAt})) / 3600`;
    // 连续指数衰减：7天半衰期，避免阶梯式跳变
    const timeDecay = sql<number>`POW(0.5, ${hoursSinceCreation} / 168.0)`;
    // 新内容发现加成：6小时内额外 +20%，帮助新内容获得初始曝光
    const discoveryBoost = sql<number>`CASE WHEN ${hoursSinceCreation} <= 6 THEN 1.2 ELSE 1.0 END`;
    // 热度 = (点赞 + 评论×2 + 分享×1.5 + 浏览×0.1) × 时间衰减 × 发现加成
    const hotScore = sql<number>`
      (${circlePostsTable.likeCount} + ${circlePostsTable.commentCount} * 2 + ${circlePostsTable.shareCount} * 1.5 + ${circlePostsTable.viewCount} * 0.1) * ${timeDecay} * ${discoveryBoost}
    `;
    await db
      .update(circlePostsTable)
      .set({ hotScore: sql`${hotScore}` })
      .where(eq(circlePostsTable.id, postId));
  },

  // ── 用户圈子分类 ──

  async listUserCategories(userId: string) {
    return db
      .select()
      .from(circleUserCategoriesTable)
      .where(eq(circleUserCategoriesTable.userId, userId))
      .orderBy(asc(circleUserCategoriesTable.sortOrder));
  },

  async createUserCategory(input: { userId: string; name: string }) {
    const id = createId("cuc");
    await db.insert(circleUserCategoriesTable).values({
      id,
      userId: input.userId,
      name: input.name,
    });
    return id;
  },

  async deleteUserCategory(id: string, userId: string) {
    await db
      .delete(circleCategoryAssignmentsTable)
      .where(eq(circleCategoryAssignmentsTable.categoryId, id));
    await db
      .delete(circleUserCategoriesTable)
      .where(
        and(
          eq(circleUserCategoriesTable.id, id),
          eq(circleUserCategoriesTable.userId, userId)
        )
      );
  },

  async findCategoryById(id: string) {
    const items = await db
      .select()
      .from(circleUserCategoriesTable)
      .where(eq(circleUserCategoriesTable.id, id))
      .limit(1);
    return items[0] ?? null;
  },

  async assignCircleToCategory(categoryId: string, circleId: string) {
    const existing = await db
      .select()
      .from(circleCategoryAssignmentsTable)
      .where(
        and(
          eq(circleCategoryAssignmentsTable.categoryId, categoryId),
          eq(circleCategoryAssignmentsTable.circleId, circleId)
        )
      )
      .limit(1);
    if (existing.length > 0) return;
    await db.insert(circleCategoryAssignmentsTable).values({
      id: createId("cca"),
      categoryId,
      circleId,
    });
  },

  async removeCircleFromCategory(categoryId: string, circleId: string) {
    await db
      .delete(circleCategoryAssignmentsTable)
      .where(
        and(
          eq(circleCategoryAssignmentsTable.categoryId, categoryId),
          eq(circleCategoryAssignmentsTable.circleId, circleId)
        )
      );
  },

  // ── 圈子更新/删除 ──

  async update(id: string, input: {
    name?: string;
    slug?: string;
    description?: string | null;
    joinMode?: "free" | "audit";
    isEnabled?: boolean;
  }) {
    const sets: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) sets.name = input.name;
    if (input.slug !== undefined) sets.slug = input.slug;
    if (input.description !== undefined) sets.description = input.description;
    if (input.joinMode !== undefined) sets.joinMode = input.joinMode;
    if (input.isEnabled !== undefined) sets.isEnabled = input.isEnabled;
    await db.update(circlesTable).set(sets).where(eq(circlesTable.id, id));
    return this.findById(id);
  },

  async deleteById(id: string) {
    // 先删帖子相关（评论 → 互动 → 帖子），再删圈子元数据
    const postRows = await db.select({ id: circlePostsTable.id }).from(circlePostsTable).where(eq(circlePostsTable.circleId, id));
    const postIds = postRows.map(r => r.id);
    if (postIds.length > 0) {
      await db.delete(circlePostCommentsTable).where(sql`${circlePostCommentsTable.postId} = ANY(ARRAY[${sql.join(postIds.map(p => sql`${p}`), sql`, `)}])`);
      await db.delete(circlePostInteractionsTable).where(sql`${circlePostInteractionsTable.postId} = ANY(ARRAY[${sql.join(postIds.map(p => sql`${p}`), sql`, `)}])`);
    }
    await db.delete(circlePostsTable).where(eq(circlePostsTable.circleId, id));
    await db.delete(circleCategoryAssignmentsTable).where(eq(circleCategoryAssignmentsTable.circleId, id));
    await db.delete(circleMembersTable).where(eq(circleMembersTable.circleId, id));
    await db.delete(circlesTable).where(eq(circlesTable.id, id));
  },

  // ── 反垃圾：用户贡献统计 ──

  // ── 帖子举报 ──

  async createPostReport(input: {
    postId: string;
    reporterId: string;
    reason: string;
    imageFileIds?: string[];
  }) {
    const id = createId("cpr");
    await db.insert(circlePostReportsTable).values({
      id,
      postId: input.postId,
      reporterId: input.reporterId,
      reason: input.reason,
      imageFileIds: JSON.stringify(input.imageFileIds ?? []),
    });
    await db
      .update(circlePostsTable)
      .set({ reportCount: sql`${circlePostsTable.reportCount} + 1` })
      .where(eq(circlePostsTable.id, input.postId));
    return id;
  },

  async listPostReports(postId: string) {
    return db
      .select({
        id: circlePostReportsTable.id,
        postId: circlePostReportsTable.postId,
        reporterId: circlePostReportsTable.reporterId,
        reason: circlePostReportsTable.reason,
        imageFileIds: circlePostReportsTable.imageFileIds,
        createdAt: circlePostReportsTable.createdAt,
        reporter: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
        },
      })
      .from(circlePostReportsTable)
      .innerJoin(usersTable, eq(circlePostReportsTable.reporterId, usersTable.id))
      .where(eq(circlePostReportsTable.postId, postId))
      .orderBy(desc(circlePostReportsTable.createdAt));
  },

  // ── 评论举报 ──

  async createCommentReport(input: {
    commentId: string;
    reporterId: string;
    reason: string;
    imageFileIds?: string[];
  }) {
    const id = createId("ccr");
    await db.insert(circlePostCommentReportsTable).values({
      id,
      commentId: input.commentId,
      reporterId: input.reporterId,
      reason: input.reason,
      imageFileIds: JSON.stringify(input.imageFileIds ?? []),
    });
    await db
      .update(circlePostCommentsTable)
      .set({ reportCount: sql`${circlePostCommentsTable.reportCount} + 1` })
      .where(eq(circlePostCommentsTable.id, input.commentId));
    return id;
  },

  async listCommentReports(commentId: string) {
    return db
      .select({
        id: circlePostCommentReportsTable.id,
        commentId: circlePostCommentReportsTable.commentId,
        reporterId: circlePostCommentReportsTable.reporterId,
        reason: circlePostCommentReportsTable.reason,
        imageFileIds: circlePostCommentReportsTable.imageFileIds,
        createdAt: circlePostCommentReportsTable.createdAt,
        reporter: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
        },
      })
      .from(circlePostCommentReportsTable)
      .innerJoin(usersTable, eq(circlePostCommentReportsTable.reporterId, usersTable.id))
      .where(eq(circlePostCommentReportsTable.commentId, commentId))
      .orderBy(desc(circlePostCommentReportsTable.createdAt));
  },

  // ── 评论点赞 toggle ──

  async toggleCommentLike(commentId: string, userId: string) {
    const existing = await db
      .select()
      .from(circlePostCommentLikesTable)
      .where(
        and(
          eq(circlePostCommentLikesTable.commentId, commentId),
          eq(circlePostCommentLikesTable.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(circlePostCommentLikesTable)
        .where(eq(circlePostCommentLikesTable.id, existing[0].id));
      await db
        .update(circlePostCommentsTable)
        .set({ likeCount: sql`GREATEST(0, ${circlePostCommentsTable.likeCount} - 1)` })
        .where(eq(circlePostCommentsTable.id, commentId));
      return false;
    }

    await db.insert(circlePostCommentLikesTable).values({
      id: createId("ccl"),
      commentId,
      userId,
    });
    await db
      .update(circlePostCommentsTable)
      .set({ likeCount: sql`${circlePostCommentsTable.likeCount} + 1` })
      .where(eq(circlePostCommentsTable.id, commentId));
    return true;
  },

  async isCommentLikedByUser(commentId: string, userId: string) {
    const rows = await db
      .select()
      .from(circlePostCommentLikesTable)
      .where(
        and(
          eq(circlePostCommentLikesTable.commentId, commentId),
          eq(circlePostCommentLikesTable.userId, userId)
        )
      )
      .limit(1);
    return rows.length > 0;
  },

  // ── 帖子编辑/删除 ──

  async updatePost(postId: string, input: {
    title?: string;
    content?: string | null;
    images?: string[];
    videos?: string[];
  }) {
    const sets: Record<string, unknown> = { updatedAt: new Date() };
    if (input.title !== undefined) sets.title = input.title;
    if (input.content !== undefined) sets.content = input.content;
    if (input.images !== undefined) sets.images = JSON.stringify(input.images);
    if (input.videos !== undefined) sets.videos = JSON.stringify(input.videos);
    await db.update(circlePostsTable).set(sets).where(eq(circlePostsTable.id, postId));
    return this.findPostById(postId);
  },

  async deletePost(postId: string) {
    await db.delete(circlePostCommentLikesTable).where(
      sql`${circlePostCommentLikesTable.commentId} IN (
        SELECT ${circlePostCommentsTable.id} FROM ${circlePostCommentsTable}
        WHERE ${circlePostCommentsTable.postId} = ${postId}
      )`
    );
    await db.delete(circlePostCommentReportsTable).where(
      sql`${circlePostCommentReportsTable.commentId} IN (
        SELECT ${circlePostCommentsTable.id} FROM ${circlePostCommentsTable}
        WHERE ${circlePostCommentsTable.postId} = ${postId}
      )`
    );
    await db.delete(circlePostCommentsTable).where(eq(circlePostCommentsTable.postId, postId));
    await db.delete(circlePostReportsTable).where(eq(circlePostReportsTable.postId, postId));
    await db.delete(circlePostInteractionsTable).where(eq(circlePostInteractionsTable.postId, postId));
    await db.delete(circlePostsTable).where(eq(circlePostsTable.id, postId));
  },

  // ── 评论编辑/删除 ──

  async updateComment(commentId: string, content: string) {
    await db
      .update(circlePostCommentsTable)
      .set({ content, updatedAt: new Date() })
      .where(eq(circlePostCommentsTable.id, commentId));
    return this.findCommentById(commentId);
  },

  async deleteComment(commentId: string) {
    await db.delete(circlePostCommentLikesTable).where(eq(circlePostCommentLikesTable.commentId, commentId));
    await db.delete(circlePostCommentReportsTable).where(eq(circlePostCommentReportsTable.commentId, commentId));
    await db.delete(circlePostCommentsTable).where(eq(circlePostCommentsTable.id, commentId));
  },

  async findCommentById(commentId: string) {
    const items = await db
      .select({
        id: circlePostCommentsTable.id,
        postId: circlePostCommentsTable.postId,
        authorId: circlePostCommentsTable.authorId,
        content: circlePostCommentsTable.content,
        parentCommentId: circlePostCommentsTable.parentCommentId,
        replyToUserId: circlePostCommentsTable.replyToUserId,
        status: circlePostCommentsTable.status,
        likeCount: circlePostCommentsTable.likeCount,
        reportCount: circlePostCommentsTable.reportCount,
        createdAt: circlePostCommentsTable.createdAt,
        updatedAt: circlePostCommentsTable.updatedAt,
      })
      .from(circlePostCommentsTable)
      .where(eq(circlePostCommentsTable.id, commentId))
      .limit(1);
    return items[0] ?? null;
  },

  // ── Admin 查询 ──

  async listAllPosts(filters: {
    status?: string;
    circleId?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions: ReturnType<typeof eq>[] = [];
    if (filters.status) {
      conditions.push(eq(circlePostsTable.status, filters.status));
    }
    if (filters.circleId) {
      conditions.push(eq(circlePostsTable.circleId, filters.circleId));
    }
    return db
      .select({
        id: circlePostsTable.id,
        circleId: circlePostsTable.circleId,
        title: circlePostsTable.title,
        content: circlePostsTable.content,
        images: circlePostsTable.images,
        videos: circlePostsTable.videos,
        status: circlePostsTable.status,
        likeCount: circlePostsTable.likeCount,
        commentCount: circlePostsTable.commentCount,
        shareCount: circlePostsTable.shareCount,
        reportCount: circlePostsTable.reportCount,
        viewCount: circlePostsTable.viewCount,
        hotScore: circlePostsTable.hotScore,
        createdAt: circlePostsTable.createdAt,
        updatedAt: circlePostsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
        },
        circle: {
          id: circlesTable.id,
          slug: circlesTable.slug,
          name: circlesTable.name,
        },
      })
      .from(circlePostsTable)
      .innerJoin(usersTable, eq(circlePostsTable.authorId, usersTable.id))
      .leftJoin(circlesTable, eq(circlePostsTable.circleId, circlesTable.id))
      .where(and(...conditions))
      .orderBy(desc(circlePostsTable.createdAt))
      .limit(filters.limit ?? 20)
      .offset(filters.offset ?? 0);
  },

  async listAllComments(filters: {
    status?: string;
    circleId?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions: ReturnType<typeof eq>[] = [];
    if (filters.status) {
      conditions.push(eq(circlePostCommentsTable.status, filters.status));
    }
    if (filters.circleId) {
      conditions.push(
        sql`${circlePostCommentsTable.postId} IN (
          SELECT ${circlePostsTable.id} FROM ${circlePostsTable}
          WHERE ${circlePostsTable.circleId} = ${filters.circleId}
        )`
      );
    }
    return db
      .select({
        id: circlePostCommentsTable.id,
        postId: circlePostCommentsTable.postId,
        content: circlePostCommentsTable.content,
        status: circlePostCommentsTable.status,
        likeCount: circlePostCommentsTable.likeCount,
        reportCount: circlePostCommentsTable.reportCount,
        createdAt: circlePostCommentsTable.createdAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
        },
        postTitle: circlePostsTable.title,
      })
      .from(circlePostCommentsTable)
      .innerJoin(usersTable, eq(circlePostCommentsTable.authorId, usersTable.id))
      .innerJoin(circlePostsTable, eq(circlePostCommentsTable.postId, circlePostsTable.id))
      .where(and(...conditions))
      .orderBy(desc(circlePostCommentsTable.createdAt))
      .limit(filters.limit ?? 20)
      .offset(filters.offset ?? 0);
  },

  async updatePostStatus(postId: string, status: string) {
    const result = await db
      .update(circlePostsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(circlePostsTable.id, postId));
    return result.rowCount !== null && result.rowCount > 0;
  },

  async updateCommentStatus(commentId: string, status: string) {
    const result = await db
      .update(circlePostCommentsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(circlePostCommentsTable.id, commentId));
    return result.rowCount !== null && result.rowCount > 0;
  },

  /** 单次合并查询：帖子数 + 评论数 + 互动数 + 24h 圈子创建数 + 账户年龄（小时） */
  async getUserContributionStats(userId: string) {
    const result = await db.execute(
      sql<{
        post_count: string;
        comment_count: string;
        interaction_count: string;
        recent_circle_count: string;
        account_age_hours: string | null;
      }>`
      SELECT
        (SELECT COUNT(*) FROM ${circlePostsTable} WHERE ${circlePostsTable.authorId} = ${userId}) AS post_count,
        (SELECT COUNT(*) FROM ${circlePostCommentsTable} WHERE ${circlePostCommentsTable.authorId} = ${userId}) AS comment_count,
        (SELECT COUNT(*) FROM ${circlePostInteractionsTable} WHERE ${circlePostInteractionsTable.userId} = ${userId}) AS interaction_count,
        (SELECT COUNT(*) FROM ${circlesTable} WHERE ${circlesTable.ownerId} = ${userId} AND ${circlesTable.createdAt} > NOW() - INTERVAL '24 hours') AS recent_circle_count,
        (SELECT EXTRACT(EPOCH FROM (NOW() - ${usersTable.createdAt})) / 3600 FROM ${usersTable} WHERE ${usersTable.id} = ${userId}) AS account_age_hours
    `
    );
    const row = result.rows[0];
    return {
      postCount: Number(row?.post_count ?? 0),
      commentCount: Number(row?.comment_count ?? 0),
      interactionCount: Number(row?.interaction_count ?? 0),
      recentCircleCount: Number(row?.recent_circle_count ?? 0),
      accountAgeHours: row?.account_age_hours != null ? Number(row.account_age_hours) : 0,
    };
  },
};
