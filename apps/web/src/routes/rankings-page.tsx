import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Clock3Icon, FlameIcon } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FeedRefetchFooter } from "@/components/feed-refetch-footer";
import { RankingCardGridSkeleton } from "@/components/page-skeletons";
import { RatingValue } from "@/components/rating-value";
import { RatingStars, toFiveStarRating } from "@/components/rating-stars";
import { SitePage } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageShareControl } from "@/components/page-share-control";
import { Badge } from "@/components/ui/badge";
import { buildRankingDetailPath, DETAIL_PAGE_LINK_PROPS } from "@/lib/web-routes";
import { useCircleColumnCount } from "@/hooks/use-circle-column-count";
import { partitionByShortestColumn } from "@/lib/masonry-partition";
import { apiClient } from "../lib/api-client";
import { getModelImage } from "../lib/aviation-media";
import { CIRCLE_CARD_COLUMN_GAP, RANKING_GRID_MIN_COLUMNS } from "./circle-page-helpers";
import {
  estimateRankingListItemRelativeHeight,
  mergeRankingsByTab,
  RANKING_CARD_MIN_WIDTH_PX
} from "./rankings-page-helpers";

type RankingListItem = Awaited<ReturnType<typeof apiClient.listRankings>>["official"][number];

/** 卡片内预览条：与榜单详情一致展示分数 + 五星 + 评数 */
function RatingTargetScoreCompact({ score, totalRatings }: { score: number; totalRatings: number }) {
  return (
    <div className="flex w-max max-w-[4.75rem] shrink-0 flex-col items-end gap-0.5 text-right">
      <RatingValue className="tabular-nums" score={score} size="sm" />
      <RatingStars className="shrink-0 flex-nowrap" size="xs" tone="rating" value={toFiveStarRating(score)} />
      {totalRatings > 0 ? (
        <span className="text-[0.7rem] leading-none text-muted-foreground">{totalRatings} 评</span>
      ) : null}
    </div>
  );
}

const RankingCard = memo(function RankingCard({ ranking }: { ranking: RankingListItem }) {
  const previewItems = ranking.items.slice(0, 3);
  const detailPath = buildRankingDetailPath(ranking.id);

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-panel)] bg-white transition hover:bg-sky-50/40">
      <div className="absolute top-2 right-2 z-10">
        <PageShareControl sharePath={detailPath} stopPointerPropagation />
      </div>
      <Link className="flex min-w-0 flex-col gap-4 px-4 pt-4 pr-12 pb-4" {...DETAIL_PAGE_LINK_PROPS} to={detailPath}>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 space-y-2 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2">
              <div className="line-clamp-2 text-[1.05rem] leading-6 font-semibold text-foreground">
                {ranking.title}
              </div>
              {ranking.type === "official" ? <Badge variant="outline">官方</Badge> : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{ranking.commentCount} 条评论</span>
              <span>均分 {ranking.averageScore.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="min-w-0 border-t border-border/70 pt-3">
          {previewItems.map((item, index) => (
            <div
              className={`grid min-w-0 grid-cols-[1.25rem_3rem_minmax(0,1fr)_minmax(4.5rem,max-content)] items-start gap-x-2 gap-y-0 py-2 ${
                index < previewItems.length - 1 ? "border-b border-border/60" : ""
              }`}
              key={item.id}
            >
              <div className="pt-0.5 text-center text-[0.8rem] font-semibold text-primary/76 tabular-nums">
                {item.rank}
              </div>
              <img
                alt={item.title}
                className="h-12 w-12 shrink-0 object-cover"
                src={
                  item.imageUrl ??
                  getModelImage(item.linkedModel?.slug ?? item.id, item.linkedModel?.powerType ?? "electric")
                }
              />
              <div className="min-w-0 space-y-1 overflow-hidden pt-0.5">
                <div className="truncate text-[0.86rem] font-medium text-foreground">{item.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {item.brandName ?? item.linkedModel?.brand.name ?? "榜单条目"}
                </div>
              </div>
              <div className="shrink-0 justify-self-end">
                <RatingTargetScoreCompact score={item.averageScore} totalRatings={item.totalRatings} />
              </div>
            </div>
          ))}
        </div>
      </Link>
    </div>
  );
});

export function RankingsPage() {
  const [activeTab, setActiveTab] = useState<"hot" | "latest">("hot");
  const rankingsQuery = useQuery({
    queryKey: ["rankings"],
    placeholderData: keepPreviousData,
    queryFn: () => apiClient.listRankings()
  });

  const merged = useMemo(
    () => (rankingsQuery.data ? mergeRankingsByTab(rankingsQuery.data) : { hot: [], latest: [] }),
    [rankingsQuery.data]
  );

  const activeItems = activeTab === "hot" ? merged.hot : merged.latest;
  const isRankingsLoading = rankingsQuery.isLoading && !rankingsQuery.data;
  const columnCount = useCircleColumnCount(undefined, {
    minColumns: RANKING_GRID_MIN_COLUMNS,
    minTrackWidthPx: RANKING_CARD_MIN_WIDTH_PX
  });
  const rankingColumns = useMemo(
    () =>
      partitionByShortestColumn(activeItems, columnCount, estimateRankingListItemRelativeHeight),
    [activeItems, columnCount]
  );

  return (
    <SitePage className="w-full min-w-0 gap-4">
      <div className="flex flex-wrap items-center gap-4 border-b border-border/60 pb-3">
        <div className="flex min-w-0 gap-5 overflow-x-auto whitespace-nowrap">
          {[
            { id: "hot" as const, label: "热门", icon: FlameIcon },
            { id: "latest" as const, label: "最新", icon: Clock3Icon }
          ].map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                className={`site-tab-trigger inline-flex items-center gap-2 border-b-2 px-0 py-2 text-[0.94rem] transition-colors ${
                  activeTab === tab.id
                    ? "border-primary font-semibold text-primary"
                    : "border-transparent text-foreground/64 hover:text-foreground"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {rankingsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>榜单加载失败</AlertTitle>
          <AlertDescription>{rankingsQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {isRankingsLoading ? (
        <RankingCardGridSkeleton count={6} />
      ) : (
        <div className="space-y-0">
          {activeItems.length > 0 ? (
            <div
              className="grid w-full min-w-0"
              style={{
                gap: CIRCLE_CARD_COLUMN_GAP,
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`
              }}
            >
              {rankingColumns.map((column, colIndex) => (
                <div
                  className="flex min-w-0 flex-col"
                  key={colIndex}
                  style={{ gap: CIRCLE_CARD_COLUMN_GAP }}
                >
                  {column.map(({ item: ranking }) => (
                    <RankingCard key={ranking.id} ranking={ranking} />
                  ))}
                </div>
              ))}
            </div>
          ) : null}
          <FeedRefetchFooter show={rankingsQuery.isRefetching} />
        </div>
      )}

      {!isRankingsLoading && rankingsQuery.isSuccess && activeItems.length === 0 ? (
        <Alert className="rounded-none border-0 shadow-none">
          <AlertTitle>还没有榜单</AlertTitle>
          <AlertDescription>可以先创建一份自己的榜单，或稍后再回来查看。</AlertDescription>
        </Alert>
      ) : null}
    </SitePage>
  );
}
