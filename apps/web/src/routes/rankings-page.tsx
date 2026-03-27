import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ListPageSkeleton } from "@/components/page-skeletons";
import { RatingStars, toFiveStarRating } from "@/components/rating-stars";
import { SitePage } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buildRankingDetailPath } from "@/lib/web-routes";
import { useAuthStore } from "../features/auth/auth-store";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { apiClient } from "../lib/api-client";
import { getModelImage } from "../lib/aviation-media";

function RankingCard(props: {
  ranking: Awaited<ReturnType<typeof apiClient.listRankings>>["official"][number];
  tone: "official" | "community";
}) {
  return (
    <Link
      className="flex w-[276px] min-w-0 flex-col gap-3 rounded-[0.95rem] border border-border bg-white px-3.5 py-3.5 shadow-[var(--shadow-panel)] transition hover:border-primary/35 hover:bg-sky-50/70"
      to={buildRankingDetailPath(props.ranking.id)}
    >
      <div className="space-y-1">
        <div className="text-[0.74rem] font-semibold tracking-[0.16em] text-primary">
          {props.tone === "official" ? "官方榜单" : "社区榜单"}
        </div>
        <div className="line-clamp-2 text-[1rem] leading-6 font-semibold text-foreground">
          {props.ranking.title}
        </div>
      </div>

      <div className="space-y-2.5">
        {props.ranking.items.slice(0, 3).map((item) => (
          <div
            className="grid grid-cols-[1rem_2.75rem_minmax(0,1fr)_3.25rem] items-center gap-2.5 border-t border-border pt-2.5 first:border-t-0 first:pt-0"
            key={item.id}
          >
            <div className="text-[0.82rem] font-semibold text-primary/76">{item.rank}</div>
            <img
              alt={item.title}
              className="h-11 w-11 rounded-[0.75rem] object-cover"
              src={
                item.imageUrl ??
                getModelImage(item.linkedModel?.slug ?? item.id, item.linkedModel?.powerType ?? "electric")
              }
            />
            <div className="min-w-0 space-y-1">
              <div className="truncate text-[0.82rem] font-medium text-foreground">{item.title}</div>
              <RatingStars size="xs" value={toFiveStarRating(item.averageScore)} />
            </div>
            <div className="text-right text-[1.35rem] font-semibold leading-none text-rating-blue">
              {item.averageScore.toFixed(1)}
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
  const [activeTab, setActiveTab] = useState<"official" | "community">("official");
  const rankingsQuery = useQuery({
    queryKey: ["rankings"],
    queryFn: () => apiClient.listRankings()
  });

  if (rankingsQuery.isLoading) {
    return <ListPageSkeleton rows={4} />;
  }

  return (
    <SitePage className="mx-auto w-full max-w-[1200px] gap-4 px-1">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-3">
        <div className="flex gap-5 overflow-x-auto whitespace-nowrap">
          {[
            { id: "official", label: "全站榜单" },
            { id: "community", label: "用户榜单" }
          ].map((tab) => (
            <button
              className={`site-tab-trigger border-b-2 px-0 py-2 text-[0.94rem] transition-colors ${
                activeTab === tab.id
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-foreground/64 hover:text-foreground"
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "official" | "community")}
              type="button"
            >
              {tab.label}
            </button>
          ))}
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

      {rankingsQuery.isSuccess ? (
        <div
          className="site-tab-panel grid justify-start gap-3"
          key={activeTab}
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(276px, 276px))" }}
        >
          {(activeTab === "official" ? rankingsQuery.data.official : rankingsQuery.data.community).map((ranking) => (
            <RankingCard
              key={ranking.id}
              ranking={ranking}
              tone={activeTab === "official" ? "official" : "community"}
            />
          ))}
        </div>
      ) : null}
    </SitePage>
  );
}
