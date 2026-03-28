import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { DetailPageSkeleton } from "@/components/page-skeletons";
import {
  SitePage,
  SitePageDescription,
  SitePageEyebrow,
  SitePageHead,
  SitePageTitle
} from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
          <SitePageHead>
            <SitePageEyebrow>榜单详情</SitePageEyebrow>
            <div className="flex flex-wrap items-center gap-2">
              <SitePageTitle className="text-[1.9rem] md:text-[2.25rem]">{ranking.title}</SitePageTitle>
              {ranking.type === "official" ? <Badge variant="outline">官方</Badge> : null}
            </div>
            <SitePageDescription>{ranking.description}</SitePageDescription>
          </SitePageHead>

          <div className="grid gap-4 rounded-[0.95rem] border border-border bg-white p-4 shadow-[var(--shadow-panel)] md:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-[0.85rem]">
              <img
                alt={ranking.title}
                className="h-[220px] w-full object-cover md:h-[280px]"
                src={ranking.coverImageUrl ?? getEditorialImage(ranking.id)}
              />
            </div>

            <div className="flex min-w-0 flex-col justify-between gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "条目数", value: ranking.itemCount },
                  { label: "评论数", value: ranking.commentCount },
                  { label: "发布时间", value: new Date(ranking.createdAt).toLocaleDateString("zh-CN") }
                ].map((item) => (
                  <div
                    className="rounded-[0.85rem] border border-border/70 bg-background/70 px-4 py-3"
                    key={item.label}
                  >
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
                  className="grid gap-3 rounded-[0.95rem] border border-border bg-white px-3.5 py-3.5 shadow-[var(--shadow-soft)] transition hover:border-primary/30 hover:bg-sky-50/60 md:grid-cols-[44px_88px_minmax(0,1fr)]"
                  key={item.id}
                  to={`${APP_ROUTES.rankingItemDetail.replace(":id", item.id)}?ranking=${ranking.id}`}
                >
                  <div className="text-[1.4rem] font-semibold italic leading-none text-primary/46">
                    {String(item.rank).padStart(2, "0")}
                  </div>
                  <img
                    alt={item.title}
                    className="h-[74px] w-full rounded-[0.8rem] object-cover"
                    src={
                      item.imageUrl ??
                      getModelImage(
                        item.linkedModel?.slug ?? item.id,
                        item.linkedModel?.powerType ?? "electric"
                      )
                    }
                  />
                  <div className="space-y-1.5">
                    <div className="min-w-0">
                      <div className="truncate text-[0.96rem] font-semibold text-foreground">
                        {item.title}
                      </div>
                      <div className="text-[0.78rem] text-muted-foreground">
                        {item.brandName ?? item.linkedModel?.brand.name ?? "榜单条目"}
                      </div>
                    </div>
                    {item.summary ? (
                      <p className="line-clamp-2 text-[0.78rem] leading-5 text-foreground/68">
                        {item.summary}
                      </p>
                    ) : null}
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
