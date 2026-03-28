import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { DetailPageSkeleton } from "@/components/page-skeletons";
import { RatingValue } from "@/components/rating-value";
import { RatingStars, toFiveStarRating } from "@/components/rating-stars";
import { SitePage } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient } from "../lib/api-client";
import { getEditorialImage, getModelImage } from "../lib/aviation-media";

function RankingItemScore({ score, totalRatings }: { score: number; totalRatings: number }) {
  return (
    <div className="flex min-w-[6.25rem] flex-col items-end justify-center gap-1 text-right">
      <RatingValue score={score} size="lg" />
      <RatingStars size="xs" tone="rating" value={toFiveStarRating(score)} />
      {totalRatings > 0 ? <span className="text-[0.72rem] text-muted-foreground">{totalRatings} 评</span> : null}
    </div>
  );
}

export function RankingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const rankingQuery = useQuery({
    queryKey: ["ranking-detail", id],
    queryFn: () => apiClient.getRankingDetail(id),
    enabled: Boolean(id)
  });

  const ranking = rankingQuery.data?.item;

  if (rankingQuery.isLoading) {
    return <DetailPageSkeleton />;
  }

  return (
    <SitePage className="mx-auto w-full max-w-[72rem] gap-4">
      <Button asChild className="w-fit" variant="ghost">
        <Link to={APP_ROUTES.rankings}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回榜单
        </Link>
      </Button>

      {rankingQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>榜单详情加载失败</AlertTitle>
          <AlertDescription>{rankingQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {!id || (!rankingQuery.isLoading && !ranking) ? (
        <Alert>
          <AlertTitle>榜单详情不可用</AlertTitle>
          <AlertDescription>当前榜单不存在或暂无可展示数据。</AlertDescription>
        </Alert>
      ) : null}

      {ranking ? (
        <>
          <div className="grid gap-4 border border-border/80 bg-white p-4 md:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
            <div className="overflow-hidden">
              <img
                alt={ranking.title}
                className="h-[220px] w-full object-cover md:h-[300px]"
                src={ranking.coverImageUrl ?? getEditorialImage(ranking.id)}
              />
            </div>

            <div className="flex min-w-0 flex-col justify-between gap-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[1.9rem] font-semibold tracking-[-0.04em] text-foreground md:text-[2.25rem]">
                    {ranking.title}
                  </div>
                  {ranking.type === "official" ? <Badge variant="outline">官方</Badge> : null}
                </div>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{ranking.description}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "条目数", value: ranking.itemCount },
                  { label: "评论数", value: ranking.commentCount },
                  { label: "发布时间", value: new Date(ranking.createdAt).toLocaleDateString("zh-CN") }
                ].map((item) => (
                  <div className="border border-border/70 px-4 py-3" key={item.label}>
                    <div className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="mt-1.5 text-base font-semibold text-foreground">{item.value}</div>
                  </div>
                ))}
              </div>

              {ranking.viewer.canEdit || ranking.viewer.canAddItems ? (
                <div className="flex flex-wrap gap-2.5 border-t border-border/70 pt-3">
                  {ranking.viewer.canEdit ? (
                    <Button asChild size="sm" variant="hero">
                      <Link to={`${APP_ROUTES.rankingEditor}?edit=${ranking.id}`}>编辑榜单</Link>
                    </Button>
                  ) : null}
                  {ranking.viewer.canAddItems ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to={`${APP_ROUTES.rankingEditor}?edit=${ranking.id}&add=1`}>
                        <PlusIcon data-icon="inline-start" />
                        新增条目
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 border-t border-border/60 pt-4">
            <div className="text-base font-semibold text-foreground">完整排行</div>
            <div className="space-y-3">
              {ranking.items.map((item) => (
                <Link
                  className="grid gap-3 border border-border/80 bg-white px-4 py-4 transition hover:border-primary/30 hover:bg-sky-50/50 md:grid-cols-[44px_88px_minmax(0,1fr)]"
                  key={item.id}
                  to={`${APP_ROUTES.rankingItemDetail.replace(":id", item.id)}?ranking=${ranking.id}`}
                >
                  <div className="text-[1.4rem] font-semibold italic leading-none text-primary/46">
                    {String(item.rank).padStart(2, "0")}
                  </div>
                  <img
                    alt={item.title}
                    className="h-[74px] w-full object-cover"
                    src={
                      item.imageUrl ??
                      getModelImage(item.linkedModel?.slug ?? item.id, item.linkedModel?.powerType ?? "electric")
                    }
                  />
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="space-y-2">
                      <div className="truncate text-[0.96rem] font-semibold text-foreground">{item.title}</div>
                      <div className="text-[0.78rem] text-muted-foreground">
                        {item.brandName ?? item.linkedModel?.brand.name ?? "榜单条目"}
                      </div>
                      {item.summary ? (
                        <p className="line-clamp-2 text-[0.78rem] leading-5 text-foreground/68">{item.summary}</p>
                      ) : null}
                    </div>
                    <RankingItemScore score={item.averageScore} totalRatings={item.totalRatings} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </SitePage>
  );
}
