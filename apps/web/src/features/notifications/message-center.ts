import { APP_ROUTES } from "@feijia/shared";

export type MessageCenterCategory = "engagement" | "follow" | "comment" | "system";

export type MessageCenterTarget = {
  href: string;
  label: string;
  openInNewTab: boolean;
};

export type MessageCenterActor = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
};

export type MessageCenterItem = {
  id: string;
  category: MessageCenterCategory;
  kindLabel: string;
  title: string;
  summary: string;
  preview: string | null;
  isRead: boolean;
  createdAt: string;
  actor: MessageCenterActor | null;
  target: MessageCenterTarget;
};

type RawMessageItem = {
  id?: string | null;
  category?: string | null;
  type?: string | null;
  isRead?: boolean | null;
  createdAt?: string | null;
  title?: string | null;
  summary?: string | null;
  actor?: {
    id?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
  preview?: {
    text?: string | null;
    imageUrl?: string | null;
  } | null;
  target?: {
    type?: string | null;
    id?: string | null;
    title?: string | null;
    status?: string | null;
    href?: string | null;
  } | null;
};

export type MessageCenterAdaptedPayload = {
  items: MessageCenterItem[];
  stats: {
    total: number;
    unread: number;
    byCategory: Record<MessageCenterCategory, number>;
  };
  contract: {
    invalidItemCount: number;
    missingCategoryCount: number;
    totalReceived: number;
  };
};

function emptyCategoryCounts(): Record<MessageCenterCategory, number> {
  return {
    engagement: 0,
    follow: 0,
    comment: 0,
    system: 0
  };
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function replaceRouteParam(path: string, key: string, value: string) {
  return path.replace(`:${key}`, value);
}

export function normalizeMessageCenterCategory(value: unknown): MessageCenterCategory {
  switch (value) {
    case "likes_and_favorites":
      return "engagement";
    case "new_followers":
      return "follow";
    case "comments_and_mentions":
      return "comment";
    case "system":
    default:
      return "system";
  }
}

function getKindLabel(type: string | null, fallbackCategory: MessageCenterCategory) {
  switch (type) {
    case "post_liked":
    case "circle_post_liked":
      return "点赞";
    case "post_favorited":
      return "收藏";
    case "post_shared":
      return "分享";
    case "post_commented":
    case "circle_post_commented":
      return "评论";
    case "comment_replied":
    case "circle_comment_replied":
      return "回复";
    case "followed":
      return "新增关注";
    case "post_status_changed":
    case "ranking_status_changed":
    case "rating_target_status_changed":
    case "aircraft_submission_status_changed":
    case "brand_application_status_changed":
      return "系统消息";
    default:
      switch (fallbackCategory) {
        case "engagement":
          return "点赞和收藏";
        case "follow":
          return "新增关注";
        case "comment":
          return "评论和@";
        case "system":
        default:
          return "系统消息";
      }
  }
}

function buildFallbackTarget(raw: RawMessageItem): MessageCenterTarget | null {
  const target = raw.target;
  const targetType = normalizeString(target?.type);
  const targetId = normalizeString(target?.id);
  const targetHref = normalizeString(target?.href);

  if (targetHref) {
    return {
      href: targetHref,
      label: "查看详情",
      openInNewTab:
        targetType === "post" ||
        targetType === "comment" ||
        targetType === "ranking" ||
        targetType === "rating_target"
    };
  }

  if (!targetType || !targetId) {
    return null;
  }

  switch (targetType) {
    case "user":
      return {
        href: replaceRouteParam(APP_ROUTES.webUserProfile, "id", targetId),
        label: "查看主页",
        openInNewTab: false
      };
    case "post":
    case "comment":
      return {
        href: replaceRouteParam(APP_ROUTES.postDetail, "id", targetId),
        label: "查看内容",
        openInNewTab: true
      };
    case "ranking":
      return {
        href: replaceRouteParam(APP_ROUTES.rankingDetail, "id", targetId),
        label: "查看榜单",
        openInNewTab: true
      };
    case "rating_target":
      return {
        href: replaceRouteParam(APP_ROUTES.ratingTargetDetail, "id", targetId),
        label: "查看评分对象",
        openInNewTab: true
      };
    case "aircraft_submission":
    case "brand_application":
    case "status":
    default:
      return {
        href: APP_ROUTES.webProfile,
        label: "查看状态",
        openInNewTab: false
      };
  }
}

function adaptMessageCenterItem(raw: RawMessageItem): MessageCenterItem | null {
  const id = normalizeString(raw.id);
  const createdAt = normalizeString(raw.createdAt);
  const title = normalizeString(raw.title);
  const summary = normalizeString(raw.summary);
  const rawCategory = normalizeString(raw.category);

  if (!id || !createdAt || !title || !summary || !rawCategory) {
    return null;
  }

  const target = buildFallbackTarget(raw);
  if (!target) {
    return null;
  }

  const actorId = normalizeString(raw.actor?.id);
  const actorDisplayName = normalizeString(raw.actor?.displayName);
  const actor =
    actorId && actorDisplayName
      ? {
          id: actorId,
          displayName: actorDisplayName,
          avatarUrl: normalizeString(raw.actor?.avatarUrl)
        }
      : null;

  const category = normalizeMessageCenterCategory(rawCategory);

  return {
    id,
    category,
    kindLabel: getKindLabel(normalizeString(raw.type), category),
    title,
    summary,
    preview: normalizeString(raw.preview?.text),
    isRead: raw.isRead === true,
    createdAt,
    actor,
    target
  };
}

export function adaptMessageCenterPayload(payload: {
  unreadCount?: number | null;
  unreadByCategory?: {
    likesAndFavorites?: number | null;
    newFollowers?: number | null;
    commentsAndMentions?: number | null;
    system?: number | null;
  } | null;
  items?: unknown[] | null;
}): MessageCenterAdaptedPayload {
  const items: MessageCenterItem[] = [];
  let missingCategoryCount = 0;
  let invalidItemCount = 0;

  for (const candidate of payload.items ?? []) {
    const raw = candidate as RawMessageItem;
    if (!normalizeString(raw.category)) {
      missingCategoryCount += 1;
      continue;
    }

    const item = adaptMessageCenterItem(raw);
    if (!item) {
      invalidItemCount += 1;
      continue;
    }

    items.push(item);
  }

  const byCategory = emptyCategoryCounts();
  if (payload.unreadByCategory) {
    byCategory.engagement = payload.unreadByCategory.likesAndFavorites ?? 0;
    byCategory.follow = payload.unreadByCategory.newFollowers ?? 0;
    byCategory.comment = payload.unreadByCategory.commentsAndMentions ?? 0;
    byCategory.system = payload.unreadByCategory.system ?? 0;
  } else {
    for (const item of items) {
      if (!item.isRead) {
        byCategory[item.category] += 1;
      }
    }
  }

  return {
    items,
    stats: {
      total: items.length,
      unread:
        typeof payload.unreadCount === "number"
          ? payload.unreadCount
          : items.filter((item) => !item.isRead).length,
      byCategory
    },
    contract: {
      invalidItemCount,
      missingCategoryCount,
      totalReceived: payload.items?.length ?? 0
    }
  };
}

export function hasMessageCenterContractMismatch(payload: MessageCenterAdaptedPayload) {
  return payload.contract.invalidItemCount > 0 || payload.contract.missingCategoryCount > 0;
}

export function formatMessageCenterContractWarning(
  contract: MessageCenterAdaptedPayload["contract"]
) {
  const parts: string[] = [];
  if (contract.missingCategoryCount > 0) {
    parts.push(`${contract.missingCategoryCount} 条消息缺少 category`);
  }
  if (contract.invalidItemCount > 0) {
    parts.push(`${contract.invalidItemCount} 条消息字段不完整`);
  }

  return parts.length > 0 ? `${parts.join("，")}，暂不展示。` : null;
}
