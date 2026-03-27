import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { PlusIcon, StarIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SitePage } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buildRankingDetailPath } from "@/lib/web-routes";
import { apiClient } from "../lib/api-client";
import { getModelImage } from "../lib/aviation-media";

const officialCardLabels = [
  { id: "official-endurance", eyebrow: "效率", title: "续航之王", startIndex: 0 },
  { id: "official-value", eyebrow: "价格", title: "性价比之选", startIndex: 1 },
  { id: "official-utility", eyebrow: "实用", title: "实用优先", startIndex: 2 }
] as const;

function RatingStars({ score }: { score: number }) {
  return (
    <div className="inline-flex items-center gap-1 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <StarIcon
          className="size-3.5"
          fill={index < Math.round(score / 2) ? "currentColor" : "none"}
          key={index}
        />
      ))}
      <span className="ml-1 text-[0.82rem] font-medium text-foreground/72">{score.toFixed(1)}</span>
    </div>
  );
}

function OfficialRankingCard(props: {
  id: string;
  eyebrow: string;
  title: string;
  items: Awaited<ReturnType<typeof apiClient.listRankings>>["official"]["items"];
}) {
  return (
    <Link
      className="flex min-w-0 flex-col gap-3 rounded-[1rem] border border-border/65 bg-white px-4 py-4 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.35)] transition hover:border-primary/35 hover:bg-sky-50/70 hover:shadow-[0_24px_50px_-42px_rgba(37,99,235,0.28)]"
      to={buildRankingDetailPath(props.id)}
    >
      <div className="space-y-1">
        <div className="text-[0.75rem] uppercase tracking-[0.24em] text-primary">{props.eyebrow}</div>
        <div className="text-[1.25rem] font-semibold text-foreground">{props.title}</div>
      </div>

      <div className="space-y-3">
        {props.items.slice(0, 3).map((item) => (
          <div
            className="grid grid-cols-[1.3rem_3rem_minmax(0,1fr)] items-center gap-3 border-t border-border/60 pt-3 first:border-t-0 first:pt-0"
            key={item.id}
          >
            <div className="text-sm font-semibold text-primary/80">{item.rank}</div>
            <img
              alt={item.title}
              className="h-12 w-12 rounded-[0.8rem] object-cover"
              src={
                item.imageUrl ??
                getModelImage(item.linkedModel?.slug ?? item.id, item.linkedModel?.powerType ?? "electric")
              }
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{item.title}</div>
              <div className="mt-1">
                <RatingStars score={item.averageScore} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}

function CommunityRankingCard(props: {
  ranking: Awaited<ReturnType<typeof apiClient.listRankings>>["community"][number];
}) {
  return (
    <Link
      className="flex min-w-0 flex-col gap-3 rounded-[1rem] border border-border/65 bg-white px-4 py-4 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.35)] transition hover:border-primary/35 hover:bg-sky-50/70 hover:shadow-[0_24px_50px_-42px_rgba(37,99,235,0.28)]"
      to={buildRankingDetailPath(props.ranking.id)}
    >
      <div className="space-y-1">
        <div className="text-[0.75rem] uppercase tracking-[0.24em] text-primary">社区榜单</div>
        <div className="line-clamp-2 text-[1.18rem] leading-7 font-semibold text-foreground">
          {props.ranking.title}
        </div>
      </div>

      <div className="space-y-3">
        {props.ranking.items.slice(0, 3).map((item) => (
          <div
            className="grid grid-cols-[1.3rem_3rem_minmax(0,1fr)] items-center gap-3 border-t border-border/60 pt-3 first:border-t-0 first:pt-0"
            key={item.id}
          >
            <div className="text-sm font-semibold text-primary/80">{item.rank}</div>
            <img
              alt={item.title}
              className="h-12 w-12 rounded-[0.8rem] object-cover"
              src={
                item.imageUrl ??
                getModelImage(item.linkedModel?.slug ?? item.id, item.linkedModel?.powerType ?? "electric")
              }
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{item.title}</div>
              <div className="mt-1">
                <RatingStars score={item.averageScore} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}

export function RankingsPage() {
  const [activeTab, setActiveTab] = useState<"official" | "community">("official");
  const rankingsQuery = useQuery({
    queryKey: ["rankings"],
    queryFn: () => apiClient.listRankings()
  });

  const officialCards = useMemo(() => {
    const items = rankingsQuery.data?.official.items ?? [];
    return officialCardLabels
      .map((definition) => ({
        ...definition,
        items: items.slice(definition.startIndex, definition.startIndex + 3)
      }))
      .filter((item) => item.items.length > 0);
  }, [rankingsQuery.data?.official.items]);

  return (
    <SitePage className="mx-auto w-full max-w-[1100px] gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex gap-6 overflow-x-auto whitespace-nowrap">
          {[
            { id: "official", label: "全站榜单" },
            { id: "community", label: "用户榜单" }
          ].map((tab) => (
            <button
              className={`border-b-2 px-0 py-2 text-[1rem] transition-colors ${
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
          <Link to={APP_ROUTES.rankingEditor}>
            <PlusIcon data-icon="inline-start" />
            创建榜单
          </Link>
        </Button>
      </div>

      {rankingsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="space-y-4 border border-border/60 px-4 py-4" key={index}>
              <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : null}

      {rankingsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>榜单加载失败</AlertTitle>
          <AlertDescription>{rankingsQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {rankingsQuery.isSuccess ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activeTab === "official"
            ? officialCards.map((card) => (
                <OfficialRankingCard
                  eyebrow={card.eyebrow}
                  id={card.id}
                  items={card.items}
                  key={card.id}
                  title={card.title}
                />
              ))
            : rankingsQuery.data.community.map((ranking) => (
                <CommunityRankingCard key={ranking.id} ranking={ranking} />
              ))}
        </div>
      ) : null}
    </SitePage>
  );
}
