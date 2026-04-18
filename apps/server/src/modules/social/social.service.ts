import { socialRepo } from "./social.repo";
import { rankingsRepo } from "../rankings/rankings.repo";
import { AuthError, authService } from "../auth/auth.service";
import { postsRepo } from "../posts/posts.repo";
import { resolveUploadedFileUrl } from "../uploads/uploads.helpers";
import {
  isValidAuthRole,
  isValidPostType,
  isValidPostStatus,
  isValidRankingStatus,
  isValidAircraftSubmissionStatus,
  isValidBrandApplicationStatus
} from "../../lib/type-guards";

type NotificationCategory =
  | "likes_and_favorites"
  | "new_followers"
  | "comments_and_mentions"
  | "system";

type NotificationType =
  | "followed"
  | "post_liked"
  | "post_favorited"
  | "post_shared"
  | "post_commented"
  | "comment_replied"
  | "post_status_changed"
  | "ranking_status_changed"
  | "rating_target_status_changed"
  | "aircraft_submission_status_changed"
  | "brand_application_status_changed";

type NotificationTargetType =
  | "user"
  | "post"
  | "comment"
  | "ranking"
  | "rating_target"
  | "aircraft_submission"
  | "brand_application"
  | "status";

const NOTIFICATION_CATEGORY_BY_TYPE: Record<NotificationType, NotificationCategory> = {
  followed: "new_followers",
  post_liked: "likes_and_favorites",
  post_favorited: "likes_and_favorites",
  post_shared: "likes_and_favorites",
  post_commented: "comments_and_mentions",
  comment_replied: "comments_and_mentions",
  post_status_changed: "system",
  ranking_status_changed: "system",
  rating_target_status_changed: "system",
  aircraft_submission_status_changed: "system",
  brand_application_status_changed: "system"
};

const NOTIFICATION_TYPES = Object.keys(
  NOTIFICATION_CATEGORY_BY_TYPE
) as NotificationType[];

function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === "string" && NOTIFICATION_TYPES.includes(value as NotificationType);
}

function normalizeCategory(
  value: unknown,
  type: NotificationType
): NotificationCategory {
  if (
    value === "likes_and_favorites" ||
    value === "new_followers" ||
    value === "comments_and_mentions" ||
    value === "system"
  ) {
    return value;
  }

  return NOTIFICATION_CATEGORY_BY_TYPE[type];
}

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
    unique.map(async (id) => [id, await resolveUploadedFileUrl(id)] as const)
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
    if (input.type === "post_commented" && !settings.notifyComments) {
      return;
    }
    if (input.type === "comment_replied" && !settings.notifyMentions) {
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
      | "post_status_changed"
      | "ranking_status_changed"
      | "rating_target_status_changed"
      | "aircraft_submission_status_changed"
      | "brand_application_status_changed"
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
      metadata: {
        ...(input.metadata ?? {}),
        href: input.target.href ?? null
      }
    });
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
          const href = typeof metadata.href === "string" ? metadata.href : null;

          const targetType: NotificationTargetType =
            item.targetType === "user" ||
            item.targetType === "post" ||
            item.targetType === "comment" ||
            item.targetType === "ranking" ||
            item.targetType === "rating_target" ||
            item.targetType === "aircraft_submission" ||
            item.targetType === "brand_application" ||
            item.targetType === "status"
              ? item.targetType
              : "status";

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
      isFollowing
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
      currentUserId ? socialRepo.isFollowing(currentUserId, targetUserId) : Promise.resolve(false)
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
          avatarUrl: await resolveUploadedFileUrl(user.avatarFileId ?? null),
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
    const [user, settings] = await Promise.all([
      socialRepo.getCurrentUserProfile(currentUserId),
      socialRepo.getResolvedUserSettings(currentUserId)
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
        coverImageUrl: await resolveUploadedFileUrl(user.coverImageFileId ?? null),
        phone: user.phone ?? null,
        phoneMasked: toPhoneMasked(user.phone ?? null),
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
    }
  ) {
    const currentProfile = await socialRepo.getCurrentUserProfile(currentUserId);
    if (!currentProfile) {
      return null;
    }

    const existingPhoneOwner = await socialRepo.findUserByPhone(input.phone);
    if (existingPhoneOwner && existingPhoneOwner.id !== currentUserId) {
      return { kind: "conflict" as const };
    }

    const payload = await authService.requestSmsCode(input);
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
      phone?: string | null;
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
      phone?: string | null;
    } = {
      displayName: input.displayName,
      bio: input.bio,
      phone: input.phone
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
