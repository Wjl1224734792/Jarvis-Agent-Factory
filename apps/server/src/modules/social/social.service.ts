import { socialRepo } from "./social.repo";
import { rankingsRepo } from "../rankings/rankings.repo";
import { AuthError, authService } from "../auth/auth.service";
import { postsRepo } from "../posts/posts.repo";
import {
  resolvePublicUploadedFileUrl,
  resolveUploadedFileUrl
} from "../uploads/uploads.helpers";
import { APP_ROUTES } from "@feijia/shared";
import {
  isNotificationType,
  normalizeCategory,
  NOTIFICATION_CATEGORY_BY_TYPE,
  type NotificationTargetType,
  type NotificationType
} from "./notification-types";
import { resolveSystemNotificationHref } from "./system-notification-targets";
import {
  isValidAuthRole,
  isValidPostType,
  isValidPostStatus,
  isValidRankingStatus,
  isValidAircraftSubmissionStatus,
  isValidBrandApplicationStatus
} from "../../lib/type-guards";
import { usersService } from "../users/users.service";

function parseMetadata(value: string | null | undefined): Record<string, unknown> {
  if (!value) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toPreview(content: string) {
  return content.length > 80 ? `${content.slice(0, 80)}...` : content;
}

async function resolveFileUrlMap(fileIds: Iterable<string | null | undefined>) {
  const unique = [
    ...new Set(
      [...fileIds].filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    )
  ];
  const entries = await Promise.all(
    unique.map(async (id) => [id, await resolvePublicUploadedFileUrl(id)] as const)
  );
  return new Map(entries);
}

async function buildFirstPostCoverUrlMap(postIds: string[]) {
  if (postIds.length === 0) {
    return new Map<string, string | null>();
  }

  const images = await postsRepo.listPostImages(postIds);
  const byPost = new Map<string, typeof images>();
  for (const img of images) {
    if (!img.postId) {
      continue;
    }
    const list = byPost.get(img.postId) ?? [];
    list.push(img);
    byPost.set(img.postId, list);
  }

  const firstFileIds: { postId: string; fileId: string }[] = [];
  for (const [postId, list] of byPost) {
    list.sort((a, b) => {
      const ta =
        a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const tb =
        b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return ta - tb;
    });
    const first = list[0];
    if (first) {
      firstFileIds.push({ postId, fileId: first.id });
    }
  }

  const urlByFile = await resolveFileUrlMap(firstFileIds.map((row) => row.fileId));
  const result = new Map<string, string | null>();
  for (const { postId, fileId } of firstFileIds) {
    result.set(postId, urlByFile.get(fileId) ?? null);
  }
  return result;
}

function postViewCountForViewer(
  status: string,
  viewCount: number | null | undefined,
  isSelf: boolean
): number | null {
  if (status === "published") {
    return viewCount ?? 0;
  }
  return isSelf ? (viewCount ?? 0) : null;
}

/** 与 rankings.service 中 toTenPointScore 一致：原始均分 1–5 星制 → 0–10 分展示 */
function toTenPointScoreFromRaw(rawAverage: number): number {
  if (rawAverage <= 0) {
    return 0;
  }
  return Number((rawAverage * 2).toFixed(1));
}

function toPhoneMasked(phone: string | null) {
  if (!phone) {
    return null;
  }

  const value = phone.trim();
  if (value.length < 4) {
    return value;
  }

  return `****${value.slice(-4)}`;
}

function canViewProfileContent(input: {
  profileVisibility: "community" | "followers" | "private";
  isSelf: boolean;
  isFollowing: boolean;
}) {
  if (input.isSelf) {
    return true;
  }

  if (input.profileVisibility === "community") {
    return true;
  }

  if (input.profileVisibility === "followers") {
    return input.isFollowing;
  }

  return false;
}

type AdminMessageDomain =
  | "posts"
  | "post_comments"
  | "model_comments"
  | "reviews"
  | "review_comments"
  | "rankings"
  | "ranking_comments"
  | "rating_targets"
  | "rating_target_comments"
  | "aircraft_submissions"
  | "brand_applications"
  | "circle_posts"
  | "circle_post_comments";

type AdminMessageReadStatus = "all" | "read" | "unread";

const ADMIN_MESSAGE_DOMAIN_BY_TYPE: Partial<Record<NotificationType, AdminMessageDomain>> = {
  post_status_changed: "posts",
  ranking_status_changed: "rankings",
  rating_target_status_changed: "rating_targets",
  aircraft_submission_status_changed: "aircraft_submissions",
  brand_application_status_changed: "brand_applications",
  post_audit_result: "posts",
  review_audit_result: "reviews",
  ranking_audit_result: "rankings",
  rating_target_audit_result: "rating_targets",
  aircraft_submission_audit_result: "aircraft_submissions",
  brand_application_audit_result: "brand_applications",
  circle_post_audit_result: "circle_posts",
  circle_comment_audit_result: "circle_post_comments"
};

const ADMIN_TODO_TITLES: Record<AdminMessageDomain, string> = {
  posts: "内容待审核",
  post_comments: "帖子评论待审核",
  model_comments: "机型评论待审核",
  reviews: "评测待审核",
  review_comments: "评测评论待审核",
  rankings: "榜单待审核",
  ranking_comments: "榜单评论待审核",
  rating_targets: "榜单条目待审核",
  rating_target_comments: "榜单条目评论待审核",
  aircraft_submissions: "机型投稿待审核",
  brand_applications: "品牌申请待审核",
  circle_posts: "圈子帖子待审核",
  circle_post_comments: "圈子评论待审核"
};

const ADMIN_TODO_HREFS: Record<AdminMessageDomain, string> = {
  posts: APP_ROUTES.adminPosts,
  post_comments: APP_ROUTES.adminPostComments,
  model_comments: APP_ROUTES.adminModels,
  reviews: APP_ROUTES.adminReviews,
  review_comments: APP_ROUTES.adminReviewComments,
  rankings: APP_ROUTES.adminRankings,
  ranking_comments: APP_ROUTES.adminRankingComments,
  rating_targets: APP_ROUTES.adminRankings,
  rating_target_comments: APP_ROUTES.adminRatingTargetComments,
  aircraft_submissions: APP_ROUTES.adminAircraftSubmissions,
  brand_applications: APP_ROUTES.adminBrandApplications,
  circle_posts: APP_ROUTES.adminPosts,
  circle_post_comments: APP_ROUTES.adminPostComments
};

const ADMIN_TODO_STATUS_FILTER: Record<AdminMessageDomain, string> = {
  posts: "pending",
  post_comments: "pending",
  model_comments: "pending",
  reviews: "pending",
  review_comments: "pending",
  rankings: "pending",
  ranking_comments: "pending",
  rating_targets: "pending",
  rating_target_comments: "pending",
  aircraft_submissions: "submitted",
  brand_applications: "pending",
  circle_posts: "",
  circle_post_comments: "pending"
};

/**
 * Admin 待办总是回落到管理端自己的 canonical 落点，避免把历史 alias 路由固化到消费层。
 */
function getAdminMessageDomain(type: NotificationType): AdminMessageDomain | null {
  return ADMIN_MESSAGE_DOMAIN_BY_TYPE[type] ?? null;
}

const ADMIN_MESSAGE_TYPES_BY_DOMAIN: Partial<Record<AdminMessageDomain, NotificationType[]>> = {
  posts: ["post_audit_result", "post_status_changed"],
  reviews: ["review_audit_result"],
  rankings: ["ranking_audit_result", "ranking_status_changed"],
  rating_targets: ["rating_target_audit_result", "rating_target_status_changed"],
  aircraft_submissions: [
    "aircraft_submission_audit_result",
    "aircraft_submission_status_changed"
  ],
  brand_applications: [
    "brand_application_audit_result",
    "brand_application_status_changed"
  ],
  circle_posts: [
    "circle_post_audit_result"
  ],
  circle_post_comments: [
    "circle_comment_audit_result"
  ]
};

function toNavigationFilters(input: {
  domain: AdminMessageDomain;
  targetId: string;
  targetStatus: string | null;
  metadata: Record<string, unknown>;
}) {
  const filters: Record<string, string> = {};
  if (input.targetStatus) {
    filters.status = input.targetStatus;
  }
  filters.targetId = input.targetId;

  const rankingId =
    typeof input.metadata.rankingId === "string" ? input.metadata.rankingId : null;
  if (rankingId) {
    filters.rankingId = rankingId;
  }
  if (input.domain === "rating_targets") {
    filters.entity = "rating_target";
  }

  return filters;
}

export const socialService = {
  async toggleFollow(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      return { kind: "invalid_self" as const };
    }

    const targetUser = await socialRepo.getUserById(targetUserId);

    if (!targetUser || targetUser.role !== "user") {
      return { kind: "not_found" as const };
    }

    const result = await socialRepo.toggleFollow(currentUserId, targetUserId);

    if (result.following) {
      await this.recordNotification({
        userId: targetUserId,
        actorId: currentUserId,
        type: "followed"
      });
    }

    return { kind: "ok" as const, following: result.following };
  },
  async recordNotification(input: {
    userId: string;
    actorId: string;
    type: Extract<
      NotificationType,
      | "followed"
      | "post_liked"
      | "post_favorited"
      | "post_shared"
      | "post_commented"
      | "comment_replied"
      | "circle_post_liked"
      | "circle_post_commented"
      | "circle_comment_replied"
    >;
    postId?: string | null;
    commentId?: string | null;
    target?: {
      type: NotificationTargetType;
      id: string;
      title: string;
      status?: string | null;
      href?: string | null;
    };
    title?: string;
    summary?: string;
    preview?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    if (input.userId === input.actorId) {
      return;
    }

    const settings = await socialRepo.getResolvedUserSettings(input.userId);
    if (
      (input.type === "post_commented" || input.type === "circle_post_commented") &&
      !settings.notifyComments
    ) {
      return;
    }
    if (
      (input.type === "comment_replied" || input.type === "circle_comment_replied") &&
      !settings.notifyMentions
    ) {
      return;
    }

    const [actor, post, comment] = await Promise.all([
      socialRepo.getUserById(input.actorId),
      input.postId ? socialRepo.getPostById(input.postId) : Promise.resolve(null),
      input.commentId ? socialRepo.getCommentById(input.commentId) : Promise.resolve(null)
    ]);
    if (!actor || !isValidAuthRole(actor.role)) {
      return;
    }

    const fallbackPost = !post && comment?.postId ? await socialRepo.getPostById(comment.postId) : null;
    const targetPost = post ?? fallbackPost;
    const targetId = input.target?.id ?? targetPost?.id ?? comment?.id ?? actor.id;
    const targetTitle = input.target?.title ?? targetPost?.title ?? "相关动态";
    const commentPreview = comment?.content ? toPreview(comment.content) : null;

    let title = input.title;
    let summary = input.summary;
    if (!title || !summary) {
      title = title ?? "互动提醒";
      summary = summary ?? `${actor.displayName} 与你的内容发生了互动`;
      switch (input.type) {
        case "followed":
          title = "新增关注";
          summary = `${actor.displayName} 关注了你`;
          break;
        case "post_liked":
          title = "收到新的点赞";
          summary = `${actor.displayName} 点赞了你的《${targetTitle}》`;
          break;
        case "post_favorited":
          title = "收到新的收藏";
          summary = `${actor.displayName} 收藏了你的《${targetTitle}》`;
          break;
        case "post_shared":
          title = "内容被分享";
          summary = `${actor.displayName} 分享了你的《${targetTitle}》`;
          break;
        case "post_commented":
          title = "收到新的评论";
          summary = `${actor.displayName} 评论了你的《${targetTitle}》`;
          break;
        case "comment_replied":
          title = "收到新的回复";
          summary = `${actor.displayName} 回复了你的评论`;
          break;
        case "circle_post_liked":
          title = "圈子帖子获赞";
          summary = `${actor.displayName} 点赞了你在圈子中的帖子`;
          break;
        case "circle_post_commented":
          title = "圈子帖子新评论";
          summary = `${actor.displayName} 评论了你在圈子中的帖子`;
          break;
        case "circle_comment_replied":
          title = "圈子评论新回复";
          summary = `${actor.displayName} 回复了你在圈子中的评论`;
          break;
      }
    }

    const targetType: NotificationTargetType =
      input.target?.type ?? (input.type === "followed" ? "user" : "post");
    const targetStatus = input.target?.status ?? null;
    const targetHref = input.target?.href ?? null;
    await socialRepo.createNotification({
      userId: input.userId,
      actorId: actor.id,
      category: NOTIFICATION_CATEGORY_BY_TYPE[input.type],
      type: input.type,
      targetType,
      targetId,
      targetTitle: targetType === "user" ? actor.displayName : targetTitle,
      targetStatus,
      title,
      summary,
      preview: input.preview ?? commentPreview,
      metadata: {
        ...(input.metadata ?? {}),
        trigger: input.type,
        postId: targetPost?.id ?? null,
        commentId: comment?.id ?? null,
        href: targetHref
      },
      postId: targetPost?.id ?? input.postId ?? comment?.postId ?? null,
      commentId: comment?.id ?? input.commentId ?? null
    });
  },
  async recordSystemNotification(input: {
    userId: string;
    type: Extract<
      NotificationType,
      | "post_audit_result"
      | "review_audit_result"
      | "ranking_audit_result"
      | "rating_target_audit_result"
      | "aircraft_submission_audit_result"
      | "brand_application_audit_result"
      | "circle_post_audit_result"
      | "circle_comment_audit_result"
    >;
    title: string;
    summary: string;
    target: {
      type: NotificationTargetType;
      id: string;
      title: string;
      status?: string | null;
      href?: string | null;
    };
    preview?: {
      text?: string | null;
      imageUrl?: string | null;
    } | null;
    metadata?: Record<string, unknown>;
  }) {
    const owner = await socialRepo.getUserById(input.userId);
    const metadata = {
      ...(input.metadata ?? {}),
      href: resolveSystemNotificationHref({ target: input.target })
    };

    // 原作者保留终端侧系统消息，管理员则收到 admin inbox 副本。
    // 这样能在不改 notifications 表结构的前提下，给管理端提供完整的审核消息流。
    await socialRepo.createNotification({
      userId: input.userId,
      actorId: null,
      category: NOTIFICATION_CATEGORY_BY_TYPE[input.type],
      type: input.type,
      targetType: input.target.type,
      targetId: input.target.id,
      targetTitle: input.target.title,
      targetStatus: input.target.status ?? null,
      title: input.title,
      summary: input.summary,
      preview: input.preview?.text ?? null,
      metadata
    });

    const admins = await socialRepo.listAdminUsers();
    const adminRecipients = admins.filter((admin) => admin.id !== input.userId);
    await Promise.all(
      adminRecipients.map(async (admin) =>
        socialRepo.createNotification({
          userId: admin.id,
          actorId: null,
          category: NOTIFICATION_CATEGORY_BY_TYPE[input.type],
          type: input.type,
          targetType: input.target.type,
          targetId: input.target.id,
          targetTitle: input.target.title,
          targetStatus: input.target.status ?? null,
          title: input.title,
          summary: input.summary,
          preview: input.preview?.text ?? null,
          metadata: {
            ...metadata,
            adminInbox: true,
            subjectUserId: input.userId,
            subjectUserDisplayName: owner?.displayName ?? null
          }
        })
      )
    );
  },
  async listAdminMessages(
    adminUserId: string,
    input?: {
      domain?: AdminMessageDomain;
      type?: NotificationType;
      readStatus?: AdminMessageReadStatus;
      limit?: number;
    }
  ) {
    const query = {
      domain: input?.domain,
      type: input?.type,
      readStatus: input?.readStatus ?? ("all" as AdminMessageReadStatus),
      limit: input?.limit ?? 50
    };
    const queryTypes = query.type
      ? [query.type]
      : query.domain
        ? (ADMIN_MESSAGE_TYPES_BY_DOMAIN[query.domain] ?? [])
        : undefined;
    if (query.domain && queryTypes && queryTypes.length === 0) {
      return {
        unreadCount: 0,
        items: []
      };
    }

    const [adminRows, unreadCount] = await Promise.all([
      socialRepo.listAdminInboxNotifications({
        userId: adminUserId,
        readStatus: query.readStatus,
        types: queryTypes,
        limit: query.limit
      }),
      query.readStatus === "read"
        ? Promise.resolve(0)
        : socialRepo.countAdminInboxUnreadNotifications({
            userId: adminUserId,
            types: queryTypes
          })
    ]);

    const subjectUserIds = Array.from(
      new Set(
        adminRows
          .map((row) => {
            const metadata = parseMetadata(row.metadata);
            return typeof metadata.subjectUserId === "string" ? metadata.subjectUserId : null;
          })
          .filter((value): value is string => Boolean(value))
      )
    );
    const subjectUsers = await socialRepo.listUsersByIds(subjectUserIds);
    const subjectUserById = new Map(subjectUsers.map((user) => [user.id, user]));

    const items = (
      await Promise.all(
        adminRows.map(async (item) => {
          if (!isNotificationType(item.type)) {
            return null;
          }
          const domain = getAdminMessageDomain(item.type);
          if (!domain) {
            return null;
          }

          const metadata = parseMetadata(item.metadata);
          const rawHref = typeof metadata.href === "string" ? metadata.href : null;
          const subjectUserId =
            typeof metadata.subjectUserId === "string" ? metadata.subjectUserId : null;
          const subjectUserRecord = subjectUserId ? subjectUserById.get(subjectUserId) ?? null : null;
          const subjectUser =
            subjectUserRecord && isValidAuthRole(subjectUserRecord.role)
              ? {
                  id: subjectUserRecord.id,
                  displayName: subjectUserRecord.displayName,
                  avatarUrl: await resolveUploadedFileUrl(subjectUserRecord.avatarFileId ?? null),
                  role: subjectUserRecord.role
                }
              : null;

          const targetType: NotificationTargetType =
            item.targetType === "user" ||
            item.targetType === "post" ||
            item.targetType === "comment" ||
            item.targetType === "ranking" ||
            item.targetType === "rating_target" ||
            item.targetType === "aircraft_submission" ||
            item.targetType === "brand_application" ||
            item.targetType === "circle_posts" ||
            item.targetType === "circle_post_comments" ||
            item.targetType === "status"
              ? item.targetType
              : "status";
          const href = resolveSystemNotificationHref({
            target: {
              type: targetType,
              id: item.targetId,
              title: item.targetTitle,
              status: item.targetStatus ?? null,
              href: rawHref
            }
          });

          return {
            id: item.id,
            category: "system" as const,
            type: item.type,
            domain,
            isRead: item.isRead,
            createdAt: item.createdAt.toISOString(),
            title: item.title,
            summary: item.summary,
            target: {
              type: targetType,
              id: item.targetId,
              title: item.targetTitle,
              status: item.targetStatus ?? null,
              href
            },
            actor: null,
            preview: item.preview
              ? {
                  text: item.preview,
                  imageUrl: null
                }
              : null,
            metadata,
            subjectUser,
            navigation: {
              href: ADMIN_TODO_HREFS[domain],
              filters: toNavigationFilters({
                domain,
                targetId: item.targetId,
                targetStatus: item.targetStatus ?? null,
                metadata
              })
            }
          };
        })
      )
    ).filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      unreadCount,
      items
    };
  },
  async markAllAdminMessagesRead(adminUserId: string) {
    await socialRepo.markAllAdminInboxNotificationsRead(adminUserId);
    return { success: true as const };
  },
  async listAdminModerationTodos() {
    const counts = await socialRepo.getAdminModerationTodoCounts();
    const domainCounts: Record<AdminMessageDomain, number> = {
      posts: counts.posts,
      post_comments: counts.postComments,
      model_comments: counts.modelComments,
      reviews: counts.reviews,
      review_comments: counts.reviewComments,
      rankings: counts.rankings,
      ranking_comments: counts.rankingComments,
      rating_targets: counts.ratingTargets,
      rating_target_comments: counts.ratingTargetComments,
      aircraft_submissions: counts.aircraftSubmissions,
      brand_applications: counts.brandApplications,
      circle_posts: counts.circlePosts,
      circle_post_comments: counts.circlePostComments
    };

    const items = (Object.entries(domainCounts) as Array<[AdminMessageDomain, number]>).map(
      ([domain, pendingCount]) => ({
        domain,
        title: ADMIN_TODO_TITLES[domain],
        pendingCount,
        navigation: {
          href: ADMIN_TODO_HREFS[domain],
          filters: {
            status: ADMIN_TODO_STATUS_FILTER[domain]
          }
        }
      })
    );

    return {
      pendingCount: items.reduce((sum, item) => sum + item.pendingCount, 0),
      items
    };
  },
  async listFollowingStateSet(currentUserId: string, authorIds: string[]) {
    const rows = await socialRepo.listFollowingStates(
      currentUserId,
      Array.from(new Set(authorIds))
    );

    return new Set(rows.map((row) => row.followeeId));
  },
  async listNotifications(userId: string) {
    const rows = await socialRepo.listNotifications(userId);
    const actorIds = Array.from(
      new Set(rows.map((item) => item.actorId).filter((id): id is string => Boolean(id)))
    );
    const actors = await socialRepo.listUsersByIds(actorIds);
    const actorById = new Map(actors.map((actor) => [actor.id, actor]));

    const unreadByCategory = {
      likesAndFavorites: 0,
      newFollowers: 0,
      commentsAndMentions: 0,
      system: 0
    };

    const items = (
      await Promise.all(
        rows.map(async (item) => {
          if (!isNotificationType(item.type)) {
            return null;
          }

          const category = normalizeCategory(item.category, item.type);
          if (!item.isRead) {
            if (category === "likes_and_favorites") {
              unreadByCategory.likesAndFavorites += 1;
            } else if (category === "new_followers") {
              unreadByCategory.newFollowers += 1;
            } else if (category === "comments_and_mentions") {
              unreadByCategory.commentsAndMentions += 1;
            } else {
              unreadByCategory.system += 1;
            }
          }

          const actorRecord = item.actorId ? actorById.get(item.actorId) ?? null : null;
          const actor =
            actorRecord && isValidAuthRole(actorRecord.role)
              ? {
                  id: actorRecord.id,
                  displayName: actorRecord.displayName,
                  avatarUrl: await resolveUploadedFileUrl(actorRecord.avatarFileId ?? null),
                  role: actorRecord.role
                }
              : null;
          const metadata = parseMetadata(item.metadata);
          const rawHref = typeof metadata.href === "string" ? metadata.href : null;

          const targetType: NotificationTargetType =
            item.targetType === "user" ||
            item.targetType === "post" ||
            item.targetType === "comment" ||
            item.targetType === "ranking" ||
            item.targetType === "rating_target" ||
            item.targetType === "aircraft_submission" ||
            item.targetType === "brand_application" ||
            item.targetType === "circle_posts" ||
            item.targetType === "circle_post_comments" ||
            item.targetType === "status"
              ? item.targetType
              : "status";
          const href = resolveSystemNotificationHref({
            target: {
              type: targetType,
              id: item.targetId,
              title: item.targetTitle,
              status: item.targetStatus ?? null,
              href: rawHref
            }
          });

          return {
            id: item.id,
            category,
            type: item.type,
            isRead: item.isRead,
            createdAt: item.createdAt.toISOString(),
            title: item.title,
            summary: item.summary,
            target: {
              type: targetType,
              id: item.targetId,
              title: item.targetTitle,
              status: item.targetStatus ?? null,
              href
            },
            actor,
            preview: item.preview
              ? {
                  text: item.preview,
                  imageUrl: null
                }
              : null,
            metadata
          };
        })
      )
    ).filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      unreadCount: rows.filter((item) => !item.isRead).length,
      unreadByCategory,
      items
    };
  },
  async markAllNotificationsRead(userId: string) {
    await socialRepo.markAllNotificationsRead(userId);
    return { success: true as const };
  },
  async markNotificationRead(userId: string, notificationId: string) {
    const updated = await socialRepo.markNotificationRead(userId, notificationId);
    if (!updated) {
      return { kind: "not_found" as const };
    }

    return { kind: "ok" as const, success: true as const };
  },
  async markAdminMessageRead(adminUserId: string, notificationId: string) {
    const updated = await socialRepo.markAdminInboxNotificationRead(adminUserId, notificationId);
    if (!updated) {
      return { kind: "not_found" as const };
    }

    return { kind: "ok" as const, success: true as const };
  },
  async getUserProfile(targetUserId: string, currentUserId?: string | null) {
    const user = await socialRepo.getUserById(targetUserId);
    if (!user || user.role !== "user") {
      return null;
    }

    const [
      settings,
      followerCount,
      followingCount,
      favoritePostCount,
      favoriteModelCount,
      postCount,
      rankingCount,
      aircraftCount,
      reviewCount,
      isFollowing,
      ipLocationLabelMap
    ] = await Promise.all([
      socialRepo.getResolvedUserSettings(targetUserId),
      socialRepo.countFollowers(targetUserId),
      socialRepo.countFollowing(targetUserId),
      socialRepo.countFavoritePosts(targetUserId),
      socialRepo.countFavoriteModels(targetUserId),
      socialRepo.countPublishedPosts(targetUserId),
      socialRepo.countUserRankings(targetUserId),
      socialRepo.countUserAircraftSubmissions(targetUserId),
      socialRepo.countVisibleReviews(targetUserId),
      currentUserId ? socialRepo.isFollowing(currentUserId, targetUserId) : Promise.resolve(false),
      usersService.resolvePublicIpLocationLabelMap([targetUserId])
    ]);
    const isSelf = currentUserId === targetUserId;
    const canViewContent = canViewProfileContent({
      profileVisibility: settings.profileVisibility,
      isSelf,
      isFollowing
    });

    return {
      item: {
        user: {
          id: user.id,
          displayName: user.displayName,
          avatarUrl: await resolvePublicUploadedFileUrl(user.avatarFileId ?? null),
          bio: user.bio ?? null,
          ipLocationLabel: ipLocationLabelMap.get(targetUserId) ?? null,
          role: isValidAuthRole(user.role) ? user.role : ("user" as "user" | "admin")
        },
        followerCount,
        followingCount,
        favoriteCount: favoritePostCount + favoriteModelCount,
        postCount,
        rankingCount,
        aircraftCount,
        reviewCount,
        viewer: {
          isSelf,
          isFollowing,
          canFollow: Boolean(currentUserId) && !isSelf,
          canViewProfile: true,
          canViewContent
        }
      }
    };
  },
  async listUserContent(targetUserId: string, currentUserId?: string | null) {
    const user = await socialRepo.getUserById(targetUserId);
    if (!user || user.role !== "user") {
      return { kind: "not_found" as const };
    }
    const isSelf = currentUserId === targetUserId;
    const [settings, isFollowing] = await Promise.all([
      socialRepo.getResolvedUserSettings(targetUserId),
      currentUserId && !isSelf
        ? socialRepo.isFollowing(currentUserId, targetUserId)
        : Promise.resolve(false)
    ]);
    const canViewContent = canViewProfileContent({
      profileVisibility: settings.profileVisibility,
      isSelf,
      isFollowing
    });
    if (!canViewContent) {
      return { kind: "forbidden" as const };
    }

    const [posts, favoritePosts, favoriteModels, rankings, ratingTargets, aircraft, reviews, brandApplications] = await Promise.all([
      socialRepo.listUserPosts(targetUserId, isSelf),
      socialRepo.listUserFavoritedPosts(targetUserId),
      socialRepo.listUserFavoritedModels(targetUserId),
      socialRepo.listUserRankings(targetUserId, isSelf),
      socialRepo.listUserRatingTargets(targetUserId, isSelf),
      socialRepo.listUserAircraftSubmissions(targetUserId, isSelf),
      socialRepo.listUserVisibleReviews(targetUserId),
      socialRepo.listUserBrandApplications(targetUserId, isSelf)
    ]);

    const postIdsForCovers = [...new Set([...posts.map((p) => p.id), ...favoritePosts.map((p) => p.id)])];
    const [firstCoverByPostId, coverFileUrlMap] = await Promise.all([
      buildFirstPostCoverUrlMap(postIdsForCovers),
      resolveFileUrlMap([
        ...rankings.map((r) => r.coverImageFileId),
        ...ratingTargets.map((t) => t.imageFileId),
        ...favoriteModels.map((m) => m.coverImageFileId),
        ...reviews.map((r) => r.model.coverImageFileId)
      ])
    ]);

    const ratingTargetIds = ratingTargets.map((t) => t.id);
    const ratingAggregates = await rankingsRepo.listRatingTargetRatingAggregates(ratingTargetIds);
    const ratingAggById = new Map(
      ratingAggregates.map((row) => [
        row.ratingTargetId,
        {
          totalRatings: Number(row.totalRatings ?? 0),
          averageRaw: Number(row.averageRaw ?? 0)
        }
      ])
    );

    const items = [
      ...posts.map((post) => {
        const status = isValidPostStatus(post.status) ? post.status : ("published" as const);
        return {
          type: "post" as const,
          id: post.id,
          postType: isValidPostType(post.type) ? post.type : ("article" as "article" | "moment"),
          status,
          rejectionReason: post.rejectionReason ?? null,
          title: post.title,
          contentPreview: toPreview(post.content),
          coverImageUrl: firstCoverByPostId.get(post.id) ?? null,
          viewCount: postViewCountForViewer(status, post.viewCount ?? 0, isSelf),
          commentCount: post.commentCount ?? 0,
          likeCount: post.likeCount ?? 0,
          favoriteCount: post.favoriteCount ?? 0,
          shareCount: post.shareCount ?? 0,
          canManage: isSelf,
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString()
        };
      }),
      ...favoritePosts.map((post) => ({
        type: "favorite-post" as const,
        id: post.id,
        postType: isValidPostType(post.type) ? post.type : ("article" as "article" | "moment"),
        title: post.title,
        contentPreview: toPreview(post.content),
        coverImageUrl: firstCoverByPostId.get(post.id) ?? null,
        viewCount: post.viewCount ?? 0,
        commentCount: post.commentCount ?? 0,
        likeCount: post.likeCount ?? 0,
        favoriteCount: post.favoriteCount ?? 0,
        shareCount: post.shareCount ?? 0,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString()
      })),
      ...favoriteModels.map((entry) => ({
        type: "favorite-model" as const,
        id: entry.id,
        model: {
          id: entry.modelId,
          slug: entry.slug,
          name: entry.name,
          powerType: entry.powerType,
          coverImageUrl: entry.coverImageFileId
            ? (coverFileUrlMap.get(entry.coverImageFileId) ?? null)
            : null,
          viewCount: entry.viewCount ?? 0
        },
        createdAt: new Date(entry.createdAt).toISOString(),
        updatedAt: new Date(entry.updatedAt).toISOString()
      })),
      ...rankings.map((ranking) => ({
        type: "ranking" as const,
        id: ranking.id,
        status: isValidRankingStatus(ranking.status) ? ranking.status : ("published" as "pending" | "published" | "rejected" | "hidden"),
        rejectionReason: ranking.rejectionReason ?? null,
        title: ranking.title,
        commentCount: ranking.commentCount ?? 0,
        coverImageUrl: ranking.coverImageFileId
          ? (coverFileUrlMap.get(ranking.coverImageFileId) ?? null)
          : null,
        canManage: isSelf,
        createdAt: ranking.createdAt.toISOString(),
        updatedAt: ranking.updatedAt.toISOString()
      })),
      ...ratingTargets.map((item) => {
        const agg = ratingAggById.get(item.id);
        const averageRaw = agg?.averageRaw ?? 0;
        const totalRatings = agg?.totalRatings ?? 0;
        return {
          type: "rating-target" as const,
          id: item.id,
          rankingId: item.rankingId,
          rankingTitle: item.rankingTitle,
          status: isValidRankingStatus(item.status) ? item.status : ("published" as "pending" | "published" | "rejected" | "hidden"),
          rejectionReason: item.rejectionReason ?? null,
          title: item.title,
          summary: item.summary,
          likeCount: item.likeCount ?? 0,
          commentCount: item.commentCount ?? 0,
          averageScore: toTenPointScoreFromRaw(averageRaw),
          totalRatings,
          coverImageUrl: item.imageFileId ? (coverFileUrlMap.get(item.imageFileId) ?? null) : null,
          canManage: isSelf,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString()
        };
      }),
      ...aircraft.map((submission) => ({
        type: "aircraft" as const,
        id: submission.id,
        modelName: submission.modelName,
        summary: submission.summary,
        status: isValidAircraftSubmissionStatus(submission.status) ? submission.status : ("draft" as "draft" | "submitted" | "approved" | "rejected"),
        rejectionReason: submission.rejectionReason ?? null,
        viewCount: isSelf ? (submission.approvedModelViewCount ?? 0) : null,
        canManage: isSelf,
        createdAt: submission.createdAt.toISOString(),
        updatedAt: submission.updatedAt.toISOString()
      })),
      ...brandApplications.map((application) => ({
        type: "brand-application" as const,
        id: application.id,
        status: isValidBrandApplicationStatus(application.status) ? application.status : ("pending" as "pending" | "approved" | "rejected" | "hidden"),
        rejectionReason: application.rejectionReason ?? null,
        name: application.name,
        description: application.description,
        canManage: isSelf,
        createdAt: application.createdAt.toISOString(),
        updatedAt: application.updatedAt.toISOString()
      })),
      ...reviews.map((review) => ({
        type: "review" as const,
        id: review.id,
        content: review.content,
        likeCount: review.likeCount ?? 0,
        model: {
          id: review.model.id,
          slug: review.model.slug,
          name: review.model.name,
          coverImageUrl: review.model.coverImageFileId
            ? (coverFileUrlMap.get(review.model.coverImageFileId) ?? null)
            : null
        },
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString()
      }))
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return { kind: "ok" as const, items };
  },
  async getCurrentUserProfile(currentUserId: string) {
    const [user, settings, ipLocationLabelMap] = await Promise.all([
      socialRepo.getCurrentUserProfile(currentUserId),
      socialRepo.getResolvedUserSettings(currentUserId),
      usersService.resolvePublicIpLocationLabelMap([currentUserId])
    ]);
    if (!user) {
      return null;
    }

    return {
      item: {
        id: user.id,
        displayName: user.displayName,
        avatarFileId: user.avatarFileId ?? null,
        coverImageFileId: user.coverImageFileId ?? null,
        bio: user.bio ?? null,
        avatarUrl: await resolveUploadedFileUrl(user.avatarFileId ?? null),
        ipLocationLabel: ipLocationLabelMap.get(currentUserId) ?? null,
        coverImageUrl: await resolveUploadedFileUrl(user.coverImageFileId ?? null),
        phone: user.phone ?? null,
        phoneMasked: toPhoneMasked(user.phone ?? null),
        hasPassword: Boolean(user.passwordHash),
        profileVisibility: settings.profileVisibility,
        notifyComments: settings.notifyComments,
        notifyMentions: settings.notifyMentions,
        sessionAlerts: settings.sessionAlerts,
        emailDigest: settings.emailDigest
      }
    };
  },
  async requestPhoneChange(
    currentUserId: string,
    input: {
      phone: string;
      captchaChallengeId: string;
      captchaCode: string;
    },
    metadata?: { clientIp?: string | null }
  ) {
    const currentProfile = await socialRepo.getCurrentUserProfile(currentUserId);
    if (!currentProfile) {
      return null;
    }

    if (!currentProfile.passwordHash) {
      return { kind: "password_required" as const };
    }

    const existingPhoneOwner = await socialRepo.findUserByPhone(input.phone);
    if (existingPhoneOwner && existingPhoneOwner.id !== currentUserId) {
      return { kind: "conflict" as const };
    }

    const payload = await authService.requestSmsCode(input, metadata);
    return { kind: "ok" as const, payload };
  },
  async confirmPhoneChange(
    currentUserId: string,
    input: {
      phone: string;
      requestId: string;
      smsCode: string;
    }
  ) {
    const currentProfile = await socialRepo.getCurrentUserProfile(currentUserId);
    if (!currentProfile) {
      return { kind: "not_found" as const };
    }

    if (!currentProfile.passwordHash) {
      return { kind: "password_required" as const };
    }

    try {
      await authService.verifySmsCodeForRequest(input);
    } catch (error) {
      if (error instanceof AuthError) {
        return { kind: "invalid_sms" as const };
      }

      throw error;
    }

    const existingPhoneOwner = await socialRepo.findUserByPhone(input.phone);
    if (existingPhoneOwner && existingPhoneOwner.id !== currentUserId) {
      return { kind: "conflict" as const };
    }

    await socialRepo.updateCurrentUserProfile(currentUserId, {
      phone: input.phone
    });
    const refreshed = await this.getCurrentUserProfile(currentUserId);
    if (!refreshed) {
      return { kind: "not_found" as const };
    }

    return { kind: "ok" as const, payload: refreshed };
  },
  async updateCurrentUserProfile(
    currentUserId: string,
    input: {
      displayName?: string;
      bio?: string | null;
      avatarFileId?: string | null;
      coverImageFileId?: string | null;
      profileVisibility?: "community" | "followers" | "private";
      notifyComments?: boolean;
      notifyMentions?: boolean;
      sessionAlerts?: boolean;
      emailDigest?: boolean;
    }
  ) {
    const currentProfile = await socialRepo.getCurrentUserProfile(currentUserId);
    if (!currentProfile) {
      return null;
    }
    if (input.displayName !== undefined) {
      const normalizedDisplayName = input.displayName.trim();
      const existingDisplayNameOwner = await socialRepo.findUserByDisplayName(normalizedDisplayName);
      if (existingDisplayNameOwner && existingDisplayNameOwner.id !== currentUserId) {
        return { kind: "display_name_conflict" as const };
      }
    }
    const currentSettings = await socialRepo.getResolvedUserSettings(currentUserId);

    const profilePatch: {
      displayName?: string;
      bio?: string | null;
      avatarFileId?: string | null;
      coverImageFileId?: string | null;
    } = {
      displayName: input.displayName,
      bio: input.bio
    };

    if (Object.prototype.hasOwnProperty.call(input, "avatarFileId")) {
      profilePatch.avatarFileId = input.avatarFileId ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(input, "coverImageFileId")) {
      profilePatch.coverImageFileId = input.coverImageFileId ?? null;
    }
    const hasProfilePatch = Object.values(profilePatch).some((value) => value !== undefined);
    if (hasProfilePatch) {
      await socialRepo.updateCurrentUserProfile(currentUserId, profilePatch);
    }

    const hasSettingsPatch =
      input.profileVisibility !== undefined ||
      input.notifyComments !== undefined ||
      input.notifyMentions !== undefined ||
      input.sessionAlerts !== undefined ||
      input.emailDigest !== undefined;
    if (hasSettingsPatch) {
      await socialRepo.upsertUserSettings(currentUserId, {
        profileVisibility: input.profileVisibility ?? currentSettings.profileVisibility,
        notifyComments: input.notifyComments ?? currentSettings.notifyComments,
        notifyMentions: input.notifyMentions ?? currentSettings.notifyMentions,
        sessionAlerts: input.sessionAlerts ?? currentSettings.sessionAlerts,
        emailDigest: input.emailDigest ?? currentSettings.emailDigest
      });
    }

    const refreshed = await this.getCurrentUserProfile(currentUserId);
    if (!refreshed) {
      return null;
    }

    if (input.avatarFileId !== undefined) {
      refreshed.item.avatarFileId = input.avatarFileId ?? null;
      refreshed.item.avatarUrl = await resolveUploadedFileUrl(input.avatarFileId ?? null);
    }
    if (input.coverImageFileId !== undefined) {
      refreshed.item.coverImageFileId = input.coverImageFileId ?? null;
      refreshed.item.coverImageUrl = await resolveUploadedFileUrl(input.coverImageFileId ?? null);
    }

    return refreshed;
  }
};
