import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowLeftIcon, MessageCircleIcon, StarIcon } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { SitePage, SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buildRankingItemDetailPath } from "@/lib/web-routes";
import { apiClient } from "../lib/api-client";
import { getEditorialImage, getModelImage } from "../lib/aviation-media";

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
    <SitePage className="gap-6">
      <Button asChild className="w-fit rounded-full" variant="ghost">
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
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <img
              alt={ranking.title}
              className="h-[260px] w-full object-cover"
              src={ranking.coverImageUrl ?? getEditorialImage(ranking.id)}
            />
            <div className="space-y-4">
              <div className="text-sm uppercase tracking-[0.24em] text-primary">{ranking.author.displayName}</div>
              <h1 className="text-[2.8rem] font-semibold leading-[1] tracking-[-0.05em] text-foreground">{ranking.title}</h1>
              <p className="text-base leading-8 text-muted-foreground">{ranking.description}</p>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <StarIcon className="size-4 text-amber-500" />
                  {ranking.averageScore.toFixed(1)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MessageCircleIcon className="size-4" />
                  {ranking.commentCount} 条评论
                </span>
              </div>
            </div>
          </div>

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="text-xl font-semibold text-foreground">完整排名</div>
              <div className="space-y-3">
                {ranking.items.map((item) => (
                  <Link
                    className="grid items-center gap-4 border-b border-border/60 py-3 last:border-b-0 md:grid-cols-[3rem_88px_minmax(0,1fr)_72px]"
                    key={item.id}
                    to={buildRankingItemDetailPath(item.id)}
                  >
                    <div className="text-3xl font-semibold italic text-primary/45">{item.rank}</div>
                    <img
                      alt={item.title}
                      className="h-18 w-full object-cover"
                      src={
                        item.imageUrl ??
                        getModelImage(item.linkedModel?.slug ?? item.id, item.linkedModel?.powerType ?? "electric")
                      }
                    />
                    <div>
                      <div className="text-lg font-semibold text-foreground">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.summary ?? "榜单条目说明"}</div>
                    </div>
                    <div className="text-right text-lg font-semibold text-amber-700">{item.averageScore.toFixed(1)}</div>
                  </Link>
                ))}
              </div>
            </SitePanelBody>
          </SitePanel>
        </div>
      ) : null}
    </SitePage>
  );
}
