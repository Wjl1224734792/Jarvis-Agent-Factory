import { APP_ROUTES } from "@feijia/shared";
import type { UserContentItem } from "@feijia/schemas";
import {
  BookmarkIcon,
  Clock3Icon,
  EyeIcon,
  HeartIcon,
  MessageCircleIcon,
  Share2Icon,
  Trash2Icon
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getEditorialImage } from "@/lib/aviation-media";
import { DETAIL_PAGE_LINK_PROPS } from "@/lib/web-routes";
import { cn } from "@/lib/utils";
import { getProfileItemLifecycle } from "./profile-content-filters";

export type ContentItem = UserContentItem;

export function formatContentMetric(value: number) {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1).replace(/\.0$/, "")}w`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(value);
}

export function getContentMeta(item: ContentItem, viewer: "self" | "visitor" = "self") {
  const isVisitor = viewer === "visitor";
  switch (item.type) {
    case "post":
      return {
        label: item.postType === "article" ? "文章" : "动态",
        href: APP_ROUTES.postDetail.replace(":id", item.id),
        title: item.title,
        summary: item.contentPreview
      };
    case "favorite-post":
      return {
        label: item.postType === "article" ? "收藏文章" : "收藏动态",
        href: APP_ROUTES.postDetail.replace(":id", item.id),
        title: item.title,
        summary: item.contentPreview
      };
    case "favorite-model":
      return {
        label: "收藏机型",
        href: APP_ROUTES.modelDetail.replace(":slug", item.model.slug),
        title: item.model.name,
        summary: isVisitor
          ? "这款机型已出现在对方的收藏列表中。"
          : "这款机型已经加入收藏列表。"
      };
    case "ranking":
      return {
        label: "榜单",
        href: APP_ROUTES.rankingDetail.replace(":id", item.id),
        title: item.title,
        summary: "社区榜单"
      };
    case "rating-target":
      return {
        label: "评分对象",
        href: APP_ROUTES.ratingTargetDetail.replace(":id", item.id),
        title: item.title,
        summary: isVisitor
          ? (item.summary ?? item.rankingTitle)
          : (item.summary ?? `${item.rankingTitle} 评分对象`)
      };
    case "aircraft":
      return {
        label: "飞行器投稿",
        href: null,
        title: item.modelName,
        summary: isVisitor
          ? (item.summary ?? "对方提交了机型资料，等待进一步处理。")
          : (item.summary ?? "机型投稿仍在审核或等待重新提交。")
      };
    case "review":
      return {
        label: isVisitor ? "机型评论" : "机型评测",
        href: APP_ROUTES.modelDetail.replace(":slug", item.model.slug),
        title: item.model.name,
        summary: isVisitor
          ? (item.content ?? "只留下了评分，没有补充长评。")
          : (item.content ?? "这条评测暂时没有补充长文。")
      };
    case "brand-application":
      return {
        label: "品牌申请",
        href: null,
        title: item.name,
        summary: isVisitor
          ? (item.description ?? "品牌申请等待审核处理。")
          : (item.description ?? "品牌申请正在审核或等待修改后重新提交。")
      };
  }
}

export function getManageHref(item: ContentItem) {
  switch (item.type) {
    case "post":
      return item.postType === "article"
        ? `${APP_ROUTES.publishArticle}?edit=${item.id}`
        : `${APP_ROUTES.publishMoment}?edit=${item.id}`;
    case "ranking":
      return `${APP_ROUTES.rankingEditor}?edit=${item.id}`;
    case "rating-target":
      return `${APP_ROUTES.ratingTargetDetail.replace(":id", item.id)}?edit=1&ranking=${item.rankingId}`;
    case "aircraft":
      return `${APP_ROUTES.publishAircraft}?edit=${item.id}`;
    case "brand-application":
      return `${APP_ROUTES.publishBrand}?edit=${item.id}`;
    default:
      return null;
  }
}

export function getRejectionReason(item: ContentItem) {
  if (!("rejectionReason" in item)) {
    return null;
  }
  return typeof item.rejectionReason === "string" && item.rejectionReason.trim().length > 0
    ? item.rejectionReason
    : null;
}

function getLifecycleBadge(item: ContentItem) {
  const lifecycle = getProfileItemLifecycle(item);
  switch (lifecycle) {
    case "draft":
      return {
        label: "草稿",
        className: "border-slate-300/80 bg-slate-50 text-slate-700"
      };
    case "reviewing":
      return {
        label: "审核中",
        className: "border-sky-200 bg-sky-50 text-sky-700"
      };
    case "published":
      return {
        label: "已发布",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700"
      };
    case "rejected":
      return {
        label: "已驳回",
        className: "border-amber-300/90 bg-amber-50 text-amber-800"
      };
    default:
      return null;
  }
}

function resolveCoverImageUrl(item: ContentItem, index: number): string {
  switch (item.type) {
    case "post":
    case "favorite-post":
      return item.coverImageUrl ?? getEditorialImage(item.id, index);
    case "favorite-model":
      return item.model.coverImageUrl ?? getEditorialImage(item.model.slug, index);
    case "ranking":
      return item.coverImageUrl ?? getEditorialImage(item.id, index);
    case "rating-target":
      return item.coverImageUrl ?? getEditorialImage(item.id, index);
    case "review":
      return item.model.coverImageUrl ?? getEditorialImage(item.model.slug, index);
    case "aircraft":
      return getEditorialImage(item.id, index);
    case "brand-application":
      return getEditorialImage(item.id, index);
  }
}

type Metric = { key: string; label: string; Icon: typeof EyeIcon; value: number };

function collectEngagementMetrics(item: ContentItem): Metric[] {
  const metrics: Metric[] = [];

  const pushView = (value: number | null | undefined) => {
    if (typeof value === "number") {
      metrics.push({ key: "view", label: "浏览", Icon: EyeIcon, value });
    }
  };

  const pushLike = (value: number | null | undefined) => {
    if (typeof value === "number") {
      metrics.push({ key: "like", label: "赞", Icon: HeartIcon, value });
    }
  };

  const pushFavorite = (value: number | null | undefined) => {
    if (typeof value === "number") {
      metrics.push({ key: "favorite", label: "收藏", Icon: BookmarkIcon, value });
    }
  };

  const pushShare = (value: number | null | undefined) => {
    if (typeof value === "number") {
      metrics.push({ key: "share", label: "分享", Icon: Share2Icon, value });
    }
  };

  const pushComment = (value: number | null | undefined) => {
    if (typeof value === "number") {
      metrics.push({ key: "comment", label: "评论", Icon: MessageCircleIcon, value });
    }
  };

  switch (item.type) {
    case "post":
      pushView(item.viewCount);
      pushLike(item.likeCount);
      pushFavorite(item.favoriteCount);
      pushShare(item.shareCount);
      pushComment(item.commentCount);
      break;
    case "favorite-post":
      pushView(item.viewCount);
      pushLike(item.likeCount);
      pushFavorite(item.favoriteCount);
      pushShare(item.shareCount);
      pushComment(item.commentCount);
      break;
    case "favorite-model":
      pushView(item.model.viewCount);
      break;
    case "ranking":
      pushComment(item.commentCount);
      break;
    case "rating-target":
      pushLike(item.likeCount);
      pushComment(item.commentCount);
      break;
    case "review":
      pushLike(item.likeCount);
      break;
    case "aircraft":
      pushView(item.viewCount);
      break;
    default:
      break;
  }

  return metrics;
}

export function ContentFeedCard(props: {
  item: ContentItem;
  index: number;
  showManagement?: boolean;
  onDelete?: (item: ContentItem) => void;
  deletingId?: string | null;
  viewer?: "self" | "visitor";
}) {
  const { item, index } = props;
  const meta = getContentMeta(item, props.viewer ?? "self");
  const manageHref = getManageHref(item);
  const rejectionReason = getRejectionReason(item);
  const lifecycleBadge = props.showManagement ? getLifecycleBadge(item) : null;
  const coverSrc = resolveCoverImageUrl(item, index);
  const metrics = collectEngagementMetrics(item);

  const body = (
    <article
      className={cn(
        "flex h-full min-h-[19rem] flex-col overflow-hidden rounded-[0.85rem] border border-border/70 bg-white shadow-sm transition",
        meta.href && "hover:border-primary/28 hover:shadow-md"
      )}
    >
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-slate-100">
        <img alt={meta.title} className="h-full w-full object-cover" decoding="async" src={coverSrc} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{meta.label}</Badge>
          {lifecycleBadge ? (
            <Badge className={lifecycleBadge.className} variant="outline">
              {lifecycleBadge.label}
            </Badge>
          ) : null}
        </div>
        <div className="min-w-0 space-y-1">
          <div className="line-clamp-2 text-[0.92rem] font-semibold leading-snug text-foreground">{meta.title}</div>
          <p className="line-clamp-2 text-[0.8rem] leading-relaxed text-muted-foreground">{meta.summary}</p>
        </div>
        {rejectionReason ? (
          <div className="rounded-[0.65rem] border border-amber-300/80 bg-amber-50 px-2.5 py-1.5 text-[0.72rem] leading-snug text-amber-950">
            驳回原因：{rejectionReason}
          </div>
        ) : null}
        {metrics.length > 0 ? (
          <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[0.72rem] text-muted-foreground">
            {metrics.map((m) => (
              <span className="inline-flex items-center gap-1" key={m.key} title={m.label}>
                <m.Icon aria-hidden className="size-3.5 shrink-0 opacity-80" />
                {formatContentMetric(m.value)}
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
          <Clock3Icon className="size-3.5 shrink-0" />
          <span>{new Date(item.updatedAt).toLocaleString("zh-CN", { hour12: false })}</span>
        </div>
        {props.showManagement ? (
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-2">
            {manageHref ? (
              <Button asChild size="sm" type="button" variant="outline">
                <Link to={manageHref}>编辑</Link>
              </Button>
            ) : null}
            {props.onDelete &&
            (item.type === "post" || item.type === "aircraft" || item.type === "rating-target") ? (
              <Button
                disabled={props.deletingId === item.id}
                onClick={() => props.onDelete?.(item)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Trash2Icon data-icon="inline-start" />
                {props.deletingId === item.id ? "处理中..." : "删除"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );

  if (!meta.href) {
    return body;
  }

  return (
    <Link className="block h-full min-h-0" {...DETAIL_PAGE_LINK_PROPS} to={meta.href}>
      {body}
    </Link>
  );
}
