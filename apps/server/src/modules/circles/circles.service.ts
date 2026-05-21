import { circlesRepo } from "./circles.repo";
import { resolvePublicUploadedFileUrl } from "../uploads/uploads.helpers";
import { evaluateTextModeration } from "../audits/text-moderation.service";
import { siteSettingsService } from "../site-settings/site-settings.service";
import { socialService } from "../social/social.service";

export const circlesService = {
  async listCircles(filters: { keyword?: string; sort?: "hot" | "latest"; limit?: number; offset?: number }) {
    const items = await circlesRepo.listCircles(filters);
    return Promise.all(
      items.map(async (item) => ({
        ...item,
        coverImageUrl: item.coverImageFileId
          ? await resolvePublicUploadedFileUrl(item.coverImageFileId)
          : null,
        owner: {
          ...item.owner,
          avatarUrl: item.owner.avatarFileId
            ? await resolvePublicUploadedFileUrl(item.owner.avatarFileId)
            : null,
        },
      }))
    );
  },

  async getCircleDetail(slug: string, currentUserId?: string) {
    const item = await circlesRepo.findBySlug(slug);
    if (!item) return null;

    const [coverImageUrl, ownerAvatarUrl, membership] = await Promise.all([
      item.coverImageFileId ? resolvePublicUploadedFileUrl(item.coverImageFileId) : Promise.resolve(null),
      item.owner.avatarFileId ? resolvePublicUploadedFileUrl(item.owner.avatarFileId) : Promise.resolve(null),
      currentUserId ? circlesRepo.getMember(item.id, currentUserId) : Promise.resolve(null),
    ]);

    return {
      ...item,
      coverImageUrl,
      owner: { ...item.owner, avatarUrl: ownerAvatarUrl },
      viewerRole: membership?.role ?? null,
      isMember: membership !== null,
    };
  },

  async createCircle(input: {
    slug: string;
    name: string;
    description: string | null;
    coverImageFileId: string | null;
    ownerId: string;
    joinMode: "free" | "audit";
    userRole: string;
  }) {
    // 管理员绕过反垃圾校验
    if (input.userRole !== "admin") {
      const stats = await circlesRepo.getUserContributionStats(input.ownerId);
      if (stats.accountAgeHours < 24) {
        return {
          code: "SPAM_BLOCKED" as const,
          message: "账户注册不足 24 小时，不可创建圈子。",
          reason: "account_too_new" as const,
        };
      }
      const totalContributions =
        stats.postCount + stats.commentCount + stats.interactionCount;
      if (totalContributions < 3) {
        return {
          code: "SPAM_BLOCKED" as const,
          message: "内容贡献不足（需至少 3 条帖子/评论/互动），不可创建圈子。",
          reason: "insufficient_contributions" as const,
        };
      }
      if (stats.recentCircleCount >= 3) {
        return {
          code: "SPAM_BLOCKED" as const,
          message: "24 小时内创建圈子已达上限（3 个）。",
          reason: "too_many_circles" as const,
        };
      }
    }
    return circlesRepo.create(input);
  },

  async joinCircle(circleId: string, userId: string) {
    const circle = await circlesRepo.findById(circleId);
    if (!circle) return { kind: "not_found" as const };

    const existing = await circlesRepo.getMember(circleId, userId);
    if (existing) return { kind: "already_member" as const };

    if (circle.joinMode === "free") {
      await circlesRepo.addMember({ circleId, userId });
      return { kind: "joined" as const };
    }

    // audit mode — just add as member for now (notification integration later)
    await circlesRepo.addMember({ circleId, userId });
    return { kind: "joined" as const };
  },

  async leaveCircle(circleId: string, userId: string) {
    const member = await circlesRepo.getMember(circleId, userId);
    if (!member) return { kind: "not_member" as const };
    if (member.role === "owner") return { kind: "owner_cannot_leave" as const };

    await circlesRepo.removeMember(circleId, userId);
    return { kind: "left" as const };
  },

  async listCircleMembers(circleId: string) {
    const members = await circlesRepo.listMembers(circleId);
    return Promise.all(
      members.map(async (m) => ({
        ...m,
        user: {
          ...m.user,
          avatarUrl: m.user.avatarFileId
            ? await resolvePublicUploadedFileUrl(m.user.avatarFileId)
            : null,
        },
      }))
    );
  },

  async listUserCircles(userId: string) {
    const circles = await circlesRepo.listUserCircles(userId);
    return Promise.all(
      circles.map(async (c) => ({
        ...c,
        coverImageUrl: c.coverImageFileId
          ? await resolvePublicUploadedFileUrl(c.coverImageFileId)
          : null,
      }))
    );
  },

  // ── 帖子 ──

  async listCirclePosts(circleId: string, filters: { tab?: "recommended" | "latest"; limit?: number; offset?: number }) {
    const posts = await circlesRepo.listPosts(circleId, filters);
    return this.resolvePostMedia(posts);
  },

  async createCirclePost(input: {
    circleId: string;
    authorId: string;
    title: string;
    content: string | null;
    images: string[];
    videos: string[];
  }) {
    const id = await circlesRepo.createPost(input);
    const mode = await siteSettingsService.getCirclePostModerationMode();
    const result = await evaluateTextModeration({
      mode,
      domain: "circle_post",
      entityId: id,
      text: `${input.title}\n${input.content ?? ""}`,
    });
    if (result.action === "reject") {
      await circlesRepo.updatePostStatus(id, "hidden");
    }
    return id;
  },

  async getPostDetail(postId: string) {
    const post = await circlesRepo.findPostById(postId);
    if (!post) return null;
    const [authorAvatar] = await Promise.all([
      post.author.avatarFileId ? resolvePublicUploadedFileUrl(post.author.avatarFileId) : Promise.resolve(null),
    ]);
    return {
      ...post,
      images: safeParseJsonArray(post.images),
      videos: safeParseJsonArray(post.videos),
      author: { ...post.author, avatarUrl: authorAvatar },
    };
  },

  async togglePostInteraction(postId: string, userId: string, type: "like" | "favorite" | "share") {
    const active = await circlesRepo.togglePostInteraction(postId, userId, type);
    await circlesRepo.updatePostHotScore(postId);
    if (active && type === "like") {
      const post = await circlesRepo.findPostById(postId);
      if (post && post.author.id !== userId) {
        await socialService.recordNotification({
          userId: post.author.id,
          actorId: userId,
          type: "circle_post_liked",
          target: { type: "post", id: postId, title: post.title }
        });
      }
    }
    return active;
  },

  async listPostComments(postId: string) {
    const comments = await circlesRepo.listPostComments(postId);
    return Promise.all(
      comments.map(async (c) => ({
        ...c,
        author: {
          ...c.author,
          avatarUrl: c.author.avatarFileId
            ? await resolvePublicUploadedFileUrl(c.author.avatarFileId)
            : null,
        },
      }))
    );
  },

  async createComment(input: {
    postId: string;
    authorId: string;
    content: string;
    parentCommentId?: string | null;
    replyToUserId?: string | null;
  }) {
    const id = await circlesRepo.createComment(input);
    await circlesRepo.updatePostHotScore(input.postId);

    // 通知帖子作者（非自己评论自己）
    const post = await circlesRepo.findPostById(input.postId);
    if (post && post.author.id !== input.authorId) {
      await socialService.recordNotification({
        userId: post.author.id,
        actorId: input.authorId,
        type: "circle_post_commented",
        target: { type: "post", id: input.postId, title: post.title },
        preview: input.content
      });
    }

    // 如果回复了别人的评论，通知被回复者
    if (input.replyToUserId && input.replyToUserId !== input.authorId) {
      await socialService.recordNotification({
        userId: input.replyToUserId,
        actorId: input.authorId,
        type: "circle_comment_replied",
        target: { type: "comment", id: input.parentCommentId ?? id, title: post?.title ?? "圈子帖子" },
        preview: input.content
      });
    }

    const mode = await siteSettingsService.getCircleCommentModerationMode();
    const result = await evaluateTextModeration({
      mode,
      domain: "circle_comment",
      entityId: id,
      text: input.content,
    });
    if (result.action === "reject") {
      await circlesRepo.updateCommentStatus(id, "hidden");
    }
    return id;
  },

  // ── Feed ──

  async listFeed(filters: { tab?: "recommended" | "latest" | "following"; currentUserId?: string; limit?: number; offset?: number }) {
    const posts = await circlesRepo.listFeed(filters);
    return this.resolvePostMedia(posts);
  },

  // ── 分类 ──

  async listUserCategories(userId: string) {
    return circlesRepo.listUserCategories(userId);
  },

  async createUserCategory(userId: string, name: string) {
    return circlesRepo.createUserCategory({ userId, name });
  },

  async deleteUserCategory(id: string, userId: string) {
    await circlesRepo.deleteUserCategory(id, userId);
  },

  async assignCircleToCategory(categoryId: string, circleId: string) {
    await circlesRepo.assignCircleToCategory(categoryId, circleId);
  },

  async removeCircleFromCategory(categoryId: string, circleId: string) {
    await circlesRepo.removeCircleFromCategory(categoryId, circleId);
  },

  // ── 圈子更新/删除 ──

  async updateCircle(id: string, userId: string, userRole: string, input: {
    name?: string;
    slug?: string;
    description?: string | null;
    joinMode?: "free" | "audit";
    isEnabled?: boolean;
  }) {
    const circle = await circlesRepo.findById(id);
    if (!circle) return { kind: "not_found" as const };
    // "super_admin" is forward-compatible guard; only "admin" reaches this layer today
    if (circle.ownerId !== userId && userRole !== "super_admin" && userRole !== "admin") {
      return { kind: "forbidden" as const };
    }
    const updated = await circlesRepo.update(id, input);
    if (!updated) return { kind: "not_found" as const };
    const coverImageUrl = updated.coverImageFileId
      ? await resolvePublicUploadedFileUrl(updated.coverImageFileId)
      : null;
    return { kind: "ok" as const, circle: { ...updated, coverImageUrl } };
  },

  async deleteCircle(id: string, userId: string, userRole: string) {
    const circle = await circlesRepo.findById(id);
    if (!circle) return { kind: "not_found" as const };
    // "super_admin" is forward-compatible guard; only "admin" reaches this layer today
    if (circle.ownerId !== userId && userRole !== "super_admin" && userRole !== "admin") {
      return { kind: "forbidden" as const };
    }
    await circlesRepo.deleteById(id);
    return { kind: "ok" as const };
  },

  // ── 举报 ──

  async reportPost(postId: string, reporterId: string, reason: string, imageFileIds?: string[]) {
    const post = await circlesRepo.findPostById(postId);
    if (!post || post.status === "deleted") return { kind: "not_found" as const };
    const id = await circlesRepo.createPostReport({ postId, reporterId, reason, imageFileIds });
    return { kind: "ok" as const, id };
  },

  async reportComment(commentId: string, reporterId: string, reason: string, imageFileIds?: string[]) {
    const comment = await circlesRepo.findCommentById(commentId);
    if (!comment) return { kind: "not_found" as const };
    const id = await circlesRepo.createCommentReport({ commentId, reporterId, reason, imageFileIds });
    return { kind: "ok" as const, id };
  },

  // ── 评论点赞 ──

  async toggleCommentLike(commentId: string, userId: string) {
    const liked = await circlesRepo.toggleCommentLike(commentId, userId);
    const comment = await circlesRepo.findCommentById(commentId);
    return { liked, likeCount: comment?.likeCount ?? 0 };
  },

  // ── 帖子编辑/删除 ──

  async updatePost(postId: string, userId: string, input: {
    title?: string;
    content?: string | null;
    images?: string[];
    videos?: string[];
  }) {
    const post = await circlesRepo.findPostById(postId);
    if (!post) return { kind: "not_found" as const };
    if (post.author.id !== userId) {
      const membership = await circlesRepo.getMember(post.circleId ?? "", userId);
      const isCircleAdmin = membership?.role === "owner" || membership?.role === "admin";
      if (!isCircleAdmin) return { kind: "forbidden" as const };
    }
    const updated = await circlesRepo.updatePost(postId, input);
    return updated ? { kind: "ok" as const, post: updated } : { kind: "not_found" as const };
  },

  async deletePost(postId: string, userId: string, userRole?: string) {
    const post = await circlesRepo.findPostById(postId);
    if (!post) return { kind: "not_found" as const };
    if (post.author.id !== userId && userRole !== "super_admin" && userRole !== "admin") {
      const membership = post.circleId ? await circlesRepo.getMember(post.circleId, userId) : null;
      const isCircleAdmin = membership?.role === "owner" || membership?.role === "admin";
      if (!isCircleAdmin) return { kind: "forbidden" as const };
    }
    await circlesRepo.deletePost(postId);
    return { kind: "ok" as const };
  },

  // ── 评论编辑/删除 ──

  async updateComment(commentId: string, userId: string, content: string) {
    const comment = await circlesRepo.findCommentById(commentId);
    if (!comment) return { kind: "not_found" as const };
    if (comment.authorId !== userId) return { kind: "forbidden" as const };
    const updated = await circlesRepo.updateComment(commentId, content);
    return updated ? { kind: "ok" as const, comment: updated } : { kind: "not_found" as const };
  },

  async deleteComment(commentId: string, userId: string, userRole?: string) {
    const comment = await circlesRepo.findCommentById(commentId);
    if (!comment) return { kind: "not_found" as const };
    if (comment.authorId !== userId && userRole !== "super_admin" && userRole !== "admin") {
      const post = await circlesRepo.findPostById(comment.postId);
      if (post && post.author.id !== userId) {
        const membership = post.circleId ? await circlesRepo.getMember(post.circleId, userId) : null;
        const isCircleAdmin = membership?.role === "owner" || membership?.role === "admin";
        if (!isCircleAdmin) return { kind: "forbidden" as const };
      }
    }
    await circlesRepo.deleteComment(commentId);
    return { kind: "ok" as const };
  },

  // ── Admin ──

  async listAllPosts(filters: {
    status?: string;
    circleId?: string;
    limit?: number;
    offset?: number;
  }) {
    const posts = await circlesRepo.listAllPosts(filters);
    return this.resolvePostMedia(posts);
  },

  async listAllComments(filters: {
    status?: string;
    circleId?: string;
    limit?: number;
    offset?: number;
  }) {
    const comments = await circlesRepo.listAllComments(filters);
    return Promise.all(
      comments.map(async (c) => ({
        ...c,
        author: {
          ...c.author,
          avatarUrl: c.author.avatarFileId
            ? await resolvePublicUploadedFileUrl(c.author.avatarFileId)
            : null,
        },
      }))
    );
  },

  async updatePostStatus(postId: string, status: string) {
    const result = await circlesRepo.updatePostStatus(postId, status);
    const post = await circlesRepo.findPostById(postId);
    if (post) {
      const statusLabel = status === "published" ? "通过" : status === "hidden" ? "隐藏" : "删除";
      await socialService.recordSystemNotification({
        userId: post.author.id,
        type: "circle_post_audit_result",
        title: "圈子帖子审核结果",
        summary: `你的圈子帖子《${post.title}》审核结果：${statusLabel}`,
        target: { type: "post", id: postId, title: post.title, status }
      });
    }
    return result;
  },

  async updateCommentStatus(commentId: string, status: string) {
    const result = await circlesRepo.updateCommentStatus(commentId, status);
    const comment = await circlesRepo.findCommentById(commentId);
    if (comment) {
      const post = await circlesRepo.findPostById(comment.postId);
      const statusLabel = status === "visible" ? "通过" : "隐藏";
      await socialService.recordSystemNotification({
        userId: comment.authorId,
        type: "circle_comment_audit_result",
        title: "圈子评论审核结果",
        summary: `你的圈子评论审核结果：${statusLabel}`,
        target: { type: "comment", id: commentId, title: post?.title ?? "圈子帖子", status }
      });
    }
    return result;
  },

  async listPostReports(postId: string) {
    const reports = await circlesRepo.listPostReports(postId);
    return Promise.all(
      reports.map(async (r) => ({
        ...r,
        imageFileIds: safeParseJsonArray(r.imageFileIds),
        reporter: {
          ...r.reporter,
          avatarUrl: r.reporter.avatarFileId
            ? await resolvePublicUploadedFileUrl(r.reporter.avatarFileId)
            : null,
        },
      }))
    );
  },

  async listCommentReports(commentId: string) {
    const reports = await circlesRepo.listCommentReports(commentId);
    return Promise.all(
      reports.map(async (r) => ({
        ...r,
        imageFileIds: safeParseJsonArray(r.imageFileIds),
        reporter: {
          ...r.reporter,
          avatarUrl: r.reporter.avatarFileId
            ? await resolvePublicUploadedFileUrl(r.reporter.avatarFileId)
            : null,
        },
      }))
    );
  },

  // ── helpers ──

  async resolvePostMedia(posts: Awaited<ReturnType<typeof circlesRepo.listPosts>>) {
    return Promise.all(
      posts.map(async (post) => ({
        ...post,
        images: safeParseJsonArray(post.images),
        videos: safeParseJsonArray(post.videos),
        author: {
          ...post.author,
          avatarUrl: post.author.avatarFileId
            ? await resolvePublicUploadedFileUrl(post.author.avatarFileId)
            : null,
        },
      }))
    );
  },
};

function safeParseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
