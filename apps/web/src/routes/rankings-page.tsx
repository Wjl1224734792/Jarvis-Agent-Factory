import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { Clock3Icon, FlameIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RANKING_GRID_CLASS_NAME, RankingCardGridSkeleton } from "@/components/page-skeletons";
import { RatingStars, toFiveStarRating } from "@/components/rating-stars";
import { SitePage } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildRankingDetailPath } from "@/lib/web-routes";
import { useAuthStore } from "../features/auth/auth-store";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { apiClient } from "../lib/api-client";
import { getModelImage } from "../lib/aviation-media";

type RankingListItem = Awaited<ReturnType<typeof apiClient.listRankings>>["official"][number];

function getRankingSortScore(ranking: RankingListItem) {
  return ranking.commentCount * 4 + ranking.itemCount * 2 + (ranking.viewer.canAddItems ? 1 : 0);
}

function mergeRankings(data: Awaited<ReturnType<typeof apiClient.listRankings>>) {
  const merged = [...data.official, ...data.community];
  const latest = [...merged].sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
  const hot = [...merged].sort((left, right) => {
    return getRankingSortScore(right) - getRankingSortScore(left);
  });

  return { hot, latest };
}

function RatingMeta({ score, totalRatings }: { score: number; totalRatings: number }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{score > 0 ? score.toFixed(1) : "暂无评分"}</span>
      <RatingStars size="xs" tone="rating" value={toFiveStarRating(score)} />
      {totalRatings > 0 ? <span>{totalRatings} 评</span> : null}
    </div>
  );
}

function RankingCard({ ranking }: { ranking: RankingListItem }) {
  return (
    <Link
      className="flex min-w-0 flex-col gap-4 border border-border/80 bg-white px-4 py-4 transition hover:border-primary/24 hover:bg-sky-50/40"
      to={buildRankingDetailPath(ranking.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="line-clamp-2 text-[1.05rem] leading-6 font-semibold text-foreground">
              {ranking.title}
            </div>
            {ranking.type === "official" ? <Badge variant="outline">官方</Badge> : null}
          </div>
          <div className="line-clamp-2 text-sm leading-6 text-muted-foreground">{ranking.description}</div>
          <RatingMeta
            score={ranking.averageScore}
            totalRatings={ranking.items.reduce((sum, item) => sum + item.totalRatings, 0)}
          />
        </div>
      </div>

      <div className="border-t border-border/70 pt-3">
        {ranking.items.slice(0, 3).map((item, index) => (
          <div
            className={`grid grid-cols-[1.2rem_3rem_minmax(0,1fr)] items-center gap-3 py-2 ${
              index < ranking.items.slice(0, 3).length - 1 ? "border-b border-border/60" : ""
            }`}
            key={item.id}
          >
            <div className="text-[0.8rem] font-semibold text-primary/76">{item.rank}</div>
            <img
              alt={item.title}
              className="h-12 w-12 object-cover"
              src={
                item.imageUrl ??
                getModelImage(item.linkedModel?.slug ?? item.id, item.linkedModel?.powerType ?? "electric")
              }
            />
            <div className="min-w-0 space-y-1">
              <div className="truncate text-[0.86rem] font-medium text-foreground">{item.title}</div>
              <div className="text-xs text-muted-foreground">
                {item.brandName ?? item.linkedModel?.brand.name ?? "榜单条目"}
              </div>
              <RatingMeta score={item.averageScore} totalRatings={item.totalRatings} />
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}

export function RankingsPage() {
  const authStatus = useAuthStore((state) => state.status);
  const promptLogin = useLoginPrompt();
  const [activeTab, setActiveTab] = useState<"hot" | "latest">("hot");
  const rankingsQuery = useQuery({
    queryKey: ["rankings"],
    queryFn: () => apiClient.listRankings()
  });

  const merged = useMemo(
    () => (rankingsQuery.data ? mergeRankings(rankingsQuery.data) : { hot: [], latest: [] }),
    [rankingsQuery.data]
  );

  const activeItems = activeTab === "hot" ? merged.hot : merged.latest;
  const isRankingsLoading = rankingsQuery.isLoading && !rankingsQuery.data;

  return (
    <SitePage className="mx-auto w-full max-w-[72rem] gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-3">
        <div className="flex gap-5 overflow-x-auto whitespace-nowrap">
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

        <Button asChild className="rounded-full" size="sm" variant="hero">
          <Link
            onClick={(event) => {
              if (authStatus === "authenticated") {
                return;
              }
              event.preventDefault();
              promptLogin({
                title: "登录后才能创建榜单",
                description: "社区榜单需要登录后才能发布。"
              });
            }}
            to={APP_ROUTES.rankingEditor}
          >
            <PlusIcon data-icon="inline-start" />
            创建榜单
          </Link>
        </Button>
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
        <div className={RANKING_GRID_CLASS_NAME}>
          {activeItems.map((ranking) => (
            <RankingCard key={ranking.id} ranking={ranking} />
          ))}
        </div>
      )}

      {!isRankingsLoading && rankingsQuery.isSuccess && activeItems.length === 0 ? (
        <Alert>
          <AlertTitle>还没有榜单</AlertTitle>
          <AlertDescription>可以先创建一份自己的榜单，或稍后再回来查看。</AlertDescription>
        </Alert>
      ) : null}
    </SitePage>
  );
}
