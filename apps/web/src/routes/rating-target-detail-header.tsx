import { APP_ROUTES } from "@feijia/shared";
import { AlertTriangleIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { IpLocationText } from "@/components/ip-location-text";
import { PageShareControl } from "@/components/page-share-control";
import { ProfileLink } from "@/components/profile-link";
import { RatingBreakdown } from "@/components/rating-breakdown";
import { RatingValue } from "@/components/rating-value";
import { RatingStars, toFiveStarRating } from "@/components/rating-stars";
import { ReportActionSheet } from "@/components/report-action-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getEditorialImage, getModelImage } from "@/lib/aviation-media";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { buildRatingTargetDetailPath, DETAIL_PAGE_LINK_PROPS } from "@/lib/web-routes";
import type { RatingTargetDetail } from "./rating-target-detail-types";

type RatingTargetReportInput = {
  reason: string;
  imageIds: string[];
};

type RatingTargetDetailHeaderProps = {
  item: RatingTargetDetail;
  totalRatings: number;
  locationSearch: string;
  isEditMode: boolean;
  itemTitle: string;
  itemSummary: string;
  itemBrandName: string;
  setItemTitle: (value: string) => void;
  setItemSummary: (value: string) => void;
  setItemBrandName: (value: string) => void;
  busy: boolean;
  setBusy: (value: boolean) => void;
  setActionError: (value: string | null) => void;
  onReportItem: (input: RatingTargetReportInput) => Promise<void>;
  refreshAll: () => Promise<void>;
};

export function RatingTargetDetailHeader(props: RatingTargetDetailHeaderProps) {
  const sharePath = `${buildRatingTargetDetailPath(props.item.id)}${props.locationSearch}`;

  async function handleSave() {
    props.setBusy(true);
    props.setActionError(null);

    try {
      await apiClient.updateRatingTarget(props.item.id, {
        title: props.itemTitle.trim(),
        summary: props.itemSummary.trim() || null,
        imageFileId: props.item.imageFileId ?? null,
        brandName: props.itemBrandName.trim() || null,
        linkedModelSlug: props.item.linkedModel?.slug ?? null
      });
      await props.refreshAll();
    } catch (reason: unknown) {
      props.setActionError(reason instanceof Error ? reason.message : "评分对象更新失败。");
    } finally {
      props.setBusy(false);
    }
  }

  async function handleDelete() {
    props.setBusy(true);
    props.setActionError(null);

    try {
      await apiClient.deleteRatingTarget(props.item.id);
      window.location.assign(APP_ROUTES.rankingDetail.replace(":id", props.item.ranking.id));
    } catch (reason: unknown) {
      props.setActionError(reason instanceof Error ? reason.message : "评分对象删除失败。");
      props.setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 border border-border/80 bg-white p-4 md:grid-cols-[320px_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-none">
        <img
          alt={props.item.title}
          className="h-[240px] w-full object-cover md:h-[280px]"
          src={
            props.item.imageUrl ??
            getModelImage(
              props.item.linkedModel?.slug ?? props.item.id,
              props.item.linkedModel?.powerType ?? "electric"
            ) ??
            getEditorialImage(props.item.id)
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-[0.8rem] font-semibold tracking-[0.16em] text-primary">
              {props.item.brandName ?? props.item.linkedModel?.brand.name ?? props.item.ranking.title}
            </div>
            <div className="text-[1.9rem] font-semibold tracking-[-0.04em] text-foreground md:text-[2.2rem]">
              {props.item.title}
            </div>
            {props.item.author ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <ProfileLink className="hover:text-foreground" userId={props.item.author.id}>
                  {props.item.author.displayName}
                </ProfileLink>
                <IpLocationText label={props.item.author.ipLocationLabel} />
              </div>
            ) : null}
            {props.item.summary ? (
              <p className="text-sm leading-7 text-muted-foreground">{props.item.summary}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex flex-col items-start gap-2">
              <RatingValue className="tracking-[-0.04em]" score={props.item.averageScore} size="xl" />
              <RatingStars size="md" tone="rating" value={toFiveStarRating(props.item.averageScore)} />
            </div>
            <div className="text-sm text-muted-foreground">
              {props.totalRatings > 0 ? `${props.totalRatings} 人评分` : "还没有用户评分"}
            </div>
          </div>

          <div className="border-t border-border/70 pt-4">
            <RatingBreakdown entries={props.item.ratingBreakdown} totalCount={props.totalRatings} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {props.item.linkedModel ? (
              <Button asChild size="sm" variant="outline">
                <Link
                  {...DETAIL_PAGE_LINK_PROPS}
                  to={APP_ROUTES.modelDetail.replace(":slug", props.item.linkedModel.slug)}
                >
                  查看飞行器详情
                </Link>
              </Button>
            ) : null}

            <PageShareControl sharePath={sharePath} />

            <ReportActionSheet
              description="请填写举报理由，并至少上传 1 张证据图。"
              onSubmit={props.onReportItem}
              title="举报评分对象"
              trigger={
                <Button
                  aria-label="举报评分对象"
                  className={cn(
                    "group inline-flex size-auto min-h-0 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0.5 shadow-none",
                    "hover:!bg-transparent active:translate-y-0",
                    "focus-visible:ring-2 focus-visible:ring-orange-400/45 focus-visible:ring-offset-2"
                  )}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <AlertTriangleIcon
                    className={cn(
                      "size-4 transition-transform duration-150 ease-out",
                      "text-orange-600/90 group-hover:text-orange-700 group-active:scale-[0.92]",
                      "dark:text-orange-400 dark:group-hover:text-orange-300",
                      props.item.viewer.hasReported &&
                        "fill-orange-500/40 text-orange-800 dark:fill-orange-400/45 dark:text-orange-300"
                    )}
                  />
                  <span className="sr-only">举报评分对象</span>
                </Button>
              }
            />
          </div>

          {props.isEditMode && props.item.viewer.canEdit ? (
            <div className="space-y-3 border-t border-border/70 pt-4">
              <div className="text-sm font-medium text-foreground">编辑评分对象</div>
              <Input onChange={(event) => props.setItemTitle(event.target.value)} value={props.itemTitle} />
              <Input onChange={(event) => props.setItemBrandName(event.target.value)} value={props.itemBrandName} />
              <Textarea
                className="min-h-28"
                onChange={(event) => props.setItemSummary(event.target.value)}
                value={props.itemSummary}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={props.busy || !props.itemTitle.trim()}
                  onClick={() => {
                    void handleSave();
                  }}
                  size="sm"
                  type="button"
                  variant="hero"
                >
                  保存返修
                </Button>
                <Button
                  disabled={props.busy}
                  onClick={() => {
                    void handleDelete();
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  删除评分对象
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border border-border/70 px-4 py-4">
          <div className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">所属榜单</div>
          <div className="mt-1.5 text-sm font-medium text-foreground">{props.item.ranking.title}</div>
          <div className="mt-4 text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">评论数</div>
          <div className="mt-1.5 text-2xl font-semibold text-foreground">{props.item.commentCount}</div>
        </div>
      </div>
    </div>
  );
}
