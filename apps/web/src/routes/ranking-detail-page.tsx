import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowLeftIcon, PlusIcon, StarIcon } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { SitePage } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { apiClient } from "../lib/api-client";
import { getEditorialImage, getModelImage } from "../lib/aviation-media";

function RatingStars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <StarIcon
          className="size-4"
          fill={index < Math.round(score / 2) ? "currentColor" : "none"}
          key={index}
        />
      ))}
      <span className="ml-1 text-sm text-foreground/68">{score.toFixed(1)}</span>
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

  return (
    <SitePage className="mx-auto w-full max-w-[1080px] gap-6">
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
          <AlertDescription>当前榜单不存在，或还没有可展示的数据。</AlertDescription>
        </Alert>
      ) : null}

      {ranking ? (
        <>
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[0.95rem]">
                <img
                  alt={ranking.title}
                  className="h-[260px] w-full object-cover md:h-[320px]"
                  src={ranking.coverImageUrl ?? getEditorialImage(ranking.id)}
                />
              </div>

              <div className="space-y-3">
                <div className="text-sm text-primary">{ranking.type === "official" ? "官方榜单" : ranking.author.displayName}</div>
                <h1 className="text-[2.1rem] leading-[1.05] font-semibold tracking-[-0.05em] text-foreground">
                  {ranking.title}
                </h1>
                <p className="max-w-[48rem] text-[0.98rem] leading-8 text-foreground/72">{ranking.description}</p>
                <RatingStars score={ranking.averageScore} />
              </div>
            </div>

            <div className="space-y-3 border border-border/60 p-4">
              <div className="text-lg font-semibold text-foreground">榜单操作</div>
              {ranking.viewer.canEdit ? (
                <Button asChild className="w-full" variant="hero">
                  <Link to={`${APP_ROUTES.rankingEditor}?edit=${ranking.id}`}>编辑榜单</Link>
                </Button>
              ) : null}
              {ranking.viewer.canAddItems ? (
                <Button asChild className="w-full" variant="outline">
                  <Link to={`${APP_ROUTES.rankingEditor}?edit=${ranking.id}&add=1`}>
                    <PlusIcon data-icon="inline-start" />
                    新增排行对象
                  </Link>
                </Button>
              ) : null}
              {!ranking.viewer.canEdit && !ranking.viewer.canAddItems ? (
                <div className="text-sm leading-7 text-muted-foreground">
                  当前榜单为只读状态。点击下方排行项可查看评分与点评。
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4 border-t border-border/60 pt-6">
            <div className="text-lg font-semibold text-foreground">完整排行</div>
            <div className="space-y-4">
              {ranking.items.map((item) => (
                <Link
                  className="grid gap-4 border-b border-border/60 pb-4 last:border-b-0 md:grid-cols-[52px_108px_minmax(0,1fr)]"
                  key={item.id}
                  to={`${APP_ROUTES.rankingItemDetail.replace(":id", item.id)}?ranking=${ranking.id}`}
                >
                  <div className="text-[1.8rem] font-semibold italic text-primary/46">{String(item.rank).padStart(2, "0")}</div>
                  <img
                    alt={item.title}
                    className="h-[88px] w-full rounded-[0.85rem] object-cover"
                    src={
                      item.imageUrl ??
                      getModelImage(item.linkedModel?.slug ?? item.id, item.linkedModel?.powerType ?? "electric")
                    }
                  />
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-[1.04rem] font-semibold text-foreground">{item.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.brandName ?? item.linkedModel?.brand.name ?? "榜单条目"}
                        </div>
                      </div>
                      <RatingStars score={item.averageScore} />
                    </div>
                    <p className="line-clamp-2 text-sm leading-6 text-foreground/66">
                      {item.summary ?? "进入条目详情页查看完整评分与点评。"}
                    </p>
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
