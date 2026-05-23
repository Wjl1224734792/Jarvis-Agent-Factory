import { APP_ROUTES } from "@feijia/shared";
import type { UserContentItem } from "@feijia/schemas";
import {
  BookmarkIcon,
  Clock3Icon,
  EyeIcon,
  HeartIcon,
  MessageCircleIcon,
  Share2Icon,
  StarIcon,
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
      pushView(item.viewCount ?? 0);
      pushLike(item.likeCount ?? 0);
      pushFavorite(item.favoriteCount ?? 0);
      pushShare(item.shareCount ?? 0);
      pushComment(item.commentCount ?? 0);
      break;
    case "favorite-post":
      pushView(item.viewCount ?? 0);
      pushLike(item.likeCount ?? 0);
      pushFavorite(item.favoriteCount ?? 0);
      pushShare(item.shareCount ?? 0);
      pushComment(item.commentCount ?? 0);
      break;
    case "favorite-model":
      pushView(item.model.viewCount);
      break;
    case "ranking":
      pushComment(item.commentCount ?? 0);
      break;
    case "rating-target":
      pushLike(item.likeCount ?? 0);
      pushComment(item.commentCount ?? 0);
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

function RatingTargetScoreStrip(props: { averageScore: number; totalRatings: number }) {
  const filled = Math.min(5, Math.max(0, Math.round(props.averageScore / 2)));
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.68rem] text-muted-foreground sm:text-[0.72rem]">
      <span className="inline-flex items-center gap-0.5 text-amber-500" title="综合评分（10 分制）">
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon
            aria-hidden
            className={cn(
              "size-3.5 shrink-0 sm:size-4",
              i < filled ? "fill-current" : "fill-none opacity-35"
            )}
            key={i}
          />
        ))}
      </span>
      <span className="font-medium text-foreground tabular-nums">{props.averageScore.toFixed(1)}分</span>
      <span className="opacity-90">（{formatContentMetric(props.totalRatings)}人评）</span>
    </div>
  );
}

export function ContentFeedListRow(props: {
  item: ContentItem;
  index: number;
  showManagement?: boolean;
  onDelete?: (item: ContentItem) => void;
  deletingId?: string | null;
  viewer?: "self" | "visitor";
  /** 在管理区域底部追加自定义操作按钮 */
  extraAction?: React.ReactNode;
}) {
  const { item, index } = props;
  const viewer = props.viewer ?? "self";
  const meta = getContentMeta(item, viewer);
  const manageHref = getManageHref(item);
  const rejectionReason = getRejectionReason(item);
  const lifecycleBadge = props.showManagement ? getLifecycleBadge(item) : null;
  const coverSrc = resolveCoverImageUrl(item, index);
  const metrics = collectEngagementMetrics(item);

  const thumb = (
    <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md bg-slate-100 sm:h-24 sm:w-32">
      <img alt={meta.title} className="h-full w-full object-cover" decoding="async" src={coverSrc} />
    </div>
  );

  const textBlock = (
    <div className="min-w-0 flex-1 space-y-1">
      <div className="flex flex-wrap items-center gap-1">
        <Badge className="text-[0.72rem]" variant="outline">
          {meta.label}
        </Badge>
        {lifecycleBadge ? (
          <Badge className={`text-[0.72rem] ${lifecycleBadge.className}`} variant="outline">
            {lifecycleBadge.label}
          </Badge>
        ) : null}
      </div>
      <div className="min-w-0 space-y-0.5">
        <div className="line-clamp-2 text-[0.84rem] font-semibold leading-snug text-foreground sm:text-[0.88rem]">
          {meta.title}
        </div>
        <p className="line-clamp-2 text-[0.75rem] leading-snug text-muted-foreground sm:text-[0.8rem]">
          {meta.summary}
        </p>
      </div>
      {rejectionReason ? (
        <div className="rounded-md border border-amber-300/80 bg-amber-50 px-2 py-1 text-[0.72rem] leading-snug text-amber-950">
          驳回原因：{rejectionReason}
        </div>
      ) : null}
      {item.type === "rating-target" ? (
        <RatingTargetScoreStrip averageScore={item.averageScore ?? 0} totalRatings={item.totalRatings ?? 0} />
      ) : null}
      {metrics.length > 0 ? (
        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[0.68rem] text-muted-foreground sm:gap-x-3 sm:text-[0.72rem]">
          {metrics.map((m) => (
            <span
              aria-label={`${m.label} ${formatContentMetric(m.value)}`}
              className="inline-flex items-center gap-1"
              key={m.key}
              title={`${m.label} ${formatContentMetric(m.value)}`}
            >
              <m.Icon aria-hidden className="size-3.5 shrink-0 opacity-70" />
              <span className="text-[0.7rem] font-medium tabular-nums">{formatContentMetric(m.value)}</span>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex items-center gap-1 text-[0.65rem] text-muted-foreground sm:text-[0.7rem]">
        <Clock3Icon className="size-3 shrink-0 sm:size-3.5" />
        <span>{new Date(item.updatedAt).toLocaleString("zh-CN", { hour12: false })}</span>
      </div>
    </div>
  );

  const management =
    props.showManagement || props.extraAction ? (
      <div className="flex shrink-0 flex-col items-stretch gap-1.5 self-start pt-0.5 sm:min-w-22">
        {props.showManagement && manageHref ? (
          <Button asChild className="h-8 px-2.5 text-[0.76rem]" size="sm" type="button" variant="outline">
            <Link to={manageHref}>编辑</Link>
          </Button>
        ) : null}
        {props.showManagement && props.onDelete && (item.type === "post" || item.type === "aircraft" || item.type === "rating-target") ? (
          <Button
            className="h-8 px-2.5 text-[0.76rem]"
            disabled={props.deletingId === item.id}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              props.onDelete?.(item);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2Icon data-icon="inline-start" />
            {props.deletingId === item.id ? "处理中..." : "删除"}
          </Button>
        ) : null}
        {props.extraAction}
      </div>
    ) : null;

  const main = meta.href ? (
    <Link
      className={cn(
        "flex min-w-0 flex-1 items-start gap-3 rounded-md px-0 py-0.5 outline-none transition",
        "hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring/40"
      )}
      {...DETAIL_PAGE_LINK_PROPS}
      to={meta.href}
    >
      {thumb}
      {textBlock}
    </Link>
  ) : (
    <div className="flex min-w-0 flex-1 items-start gap-3 py-0.5">
      {thumb}
      {textBlock}
    </div>
  );

  return (
    <article className="flex w-full items-start gap-2 px-3 py-3 sm:gap-3 sm:px-4">
      {main}
      {management}
    </article>
  );
}
