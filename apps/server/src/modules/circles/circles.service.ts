import { circlesRepo } from "./circles.repo";
import { resolvePublicUploadedFileUrl, resolveUploadedFileUrl } from "../uploads/uploads.helpers";

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
  }) {
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
    return circlesRepo.createPost(input);
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

  async updateCircle(id: string, input: {
    name?: string;
    slug?: string;
    description?: string | null;
    joinMode?: "free" | "audit";
    isEnabled?: boolean;
  }) {
    const updated = await circlesRepo.update(id, input);
    if (!updated) return null;
    const coverImageUrl = updated.coverImageFileId
      ? await resolvePublicUploadedFileUrl(updated.coverImageFileId)
      : null;
    return { ...updated, coverImageUrl };
  },

  async deleteCircle(id: string) {
    await circlesRepo.deleteById(id);
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
