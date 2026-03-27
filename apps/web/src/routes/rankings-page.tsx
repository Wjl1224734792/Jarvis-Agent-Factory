import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RatingStars, toFiveStarRating } from "@/components/rating-stars";
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

function OfficialRankingCard(props: {
  id: string;
  eyebrow: string;
  title: string;
  items: Awaited<ReturnType<typeof apiClient.listRankings>>["official"]["items"];
}) {
  return (
    <Link
      className="flex w-[276px] min-w-0 flex-col gap-3 rounded-[0.95rem] border border-border bg-white px-3.5 py-3.5 shadow-[var(--shadow-panel)] transition hover:border-primary/35 hover:bg-sky-50/70"
      to={buildRankingDetailPath(props.id)}
    >
      <div className="space-y-1">
        <div className="text-[0.74rem] font-semibold tracking-[0.16em] text-primary">{props.eyebrow}</div>
        <div className="text-[1rem] font-semibold text-foreground">{props.title}</div>
      </div>

      <div className="space-y-2.5">
        {props.items.slice(0, 3).map((item) => (
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

function CommunityRankingCard(props: {
  ranking: Awaited<ReturnType<typeof apiClient.listRankings>>["community"][number];
}) {
  return (
    <Link
      className="flex w-[276px] min-w-0 flex-col gap-3 rounded-[0.95rem] border border-border bg-white px-3.5 py-3.5 shadow-[var(--shadow-panel)] transition hover:border-primary/35 hover:bg-sky-50/70"
      to={buildRankingDetailPath(props.ranking.id)}
    >
      <div className="space-y-1">
        <div className="text-[0.74rem] font-semibold tracking-[0.16em] text-primary">社区榜单</div>
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
    <SitePage className="mx-auto w-full max-w-[1200px] gap-4 px-1">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-3">
        <div className="flex gap-5 overflow-x-auto whitespace-nowrap">
          {[
            { id: "official", label: "全站榜单" },
            { id: "community", label: "用户榜单" }
          ].map((tab) => (
            <button
              className={`border-b-2 px-0 py-2 text-[0.94rem] transition-colors ${
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
        <div
          className="grid justify-start gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(276px, 276px))" }}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="space-y-3 rounded-[0.95rem] border border-border/60 px-4 py-4" key={index}>
              <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" />
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
        <div
          className="grid justify-start gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(276px, 276px))" }}
        >
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
