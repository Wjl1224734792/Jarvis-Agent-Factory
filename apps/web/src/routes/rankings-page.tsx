import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CommunityRanking, RankingItem } from "@feijia/schemas";
import { APP_ROUTES } from "@feijia/shared";
import {
  ArrowRightIcon,
  MessageSquareTextIcon,
  SparklesIcon,
  StarIcon,
  TrophyIcon
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuthStore } from "../features/auth/auth-store";
import { apiClient } from "../lib/api-client";

const reputationToneClasses: Record<string, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  featured: "border-primary/20 bg-primary/10 text-primary",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  caution: "border-amber-200 bg-amber-50 text-amber-700",
  negative: "border-rose-200 bg-rose-50 text-rose-700"
};

const powerTypeLabels = {
  electric: "电动",
  fuel: "燃油",
  hybrid: "混动"
} as const;

function getPowerTypeLabel(powerType: string) {
  if (powerType in powerTypeLabels) {
    return powerTypeLabels[powerType as keyof typeof powerTypeLabels];
  }

  return powerType;
}

function modelDetailPath(slug: string) {
  return APP_ROUTES.modelDetail.replace(":slug", slug);
}

function QuickRatingStars({
  rating,
  busy,
  disabled,
  onRate
}: {
  rating: number | null;
  busy?: boolean;
  disabled?: boolean;
  onRate?: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          className={cn(
            "rounded-full p-1 text-amber-500 transition-transform",
            disabled ? "cursor-not-allowed opacity-60" : "hover:scale-110"
          )}
          disabled={disabled || busy}
          key={value}
          onClick={() => {
            onRate?.(value);
          }}
          type="button"
        >
          <StarIcon
            className="size-4.5"
            fill={value <= (rating ?? 0) ? "currentColor" : "none"}
            strokeWidth={1.75}
          />
        </button>
      ))}
    </div>
  );
}

function ScoreBadges({ item }: { item: RankingItem }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge className="h-auto rounded-full px-3 py-1" variant="secondary">
        综合 {item.bayesianScore.toFixed(1)}
      </Badge>
      <Badge className="h-auto rounded-full px-3 py-1" variant="outline">
        口碑 {item.averageScore.toFixed(1)}
      </Badge>
      <Badge className="h-auto rounded-full px-3 py-1" variant="outline">
        点评 {item.totalReviews}
      </Badge>
      <Badge
        className={cn(
          "h-auto rounded-full border px-3 py-1",
          reputationToneClasses[item.reputation.tone]
        )}
      >
        {item.reputation.label}
      </Badge>
    </div>
  );
}

function RankingRow({
  item,
  busy,
  disabled,
  note,
  onRate
}: {
  item: RankingItem;
  busy?: boolean;
  disabled?: boolean;
  note?: string | null;
  onRate?: (value: number) => void;
}) {
  return (
    <article className="rounded-[1.5rem] border border-border/80 bg-card/90 px-5 py-5 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
            {item.rank}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{item.model.brand.name}</Badge>
              <Badge variant="outline">{item.model.category.name}</Badge>
              <Badge variant="outline">{getPowerTypeLabel(item.model.powerType)}</Badge>
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {item.model.name}
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {note ?? item.highlight ?? item.model.summary ?? "查看详情页获取更多参数与真实点评。"}
            </p>
            <div className="mt-4">
              <ScoreBadges item={item} />
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-4 rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              快速评分
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <QuickRatingStars
                busy={busy}
                disabled={disabled}
                onRate={onRate}
                rating={item.myRating}
              />
              <div className="text-sm text-muted-foreground">
                {item.myRating ? `已评 ${item.myRating} 星` : "未评分"}
              </div>
            </div>
          </div>

          <Button asChild className="w-full rounded-2xl" variant="outline">
            <Link to={modelDetailPath(item.model.slug)}>
              写详细点评
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function CommunityRankingCard({
  ranking,
  pendingSlug,
  disabled,
  onRate
}: {
  ranking: CommunityRanking;
  pendingSlug: string | null;
  disabled: boolean;
  onRate: (slug: string, value: number) => void;
}) {
  return (
    <Card className="rounded-[1.75rem] border-border/80 bg-card/90 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">{ranking.title}</CardTitle>
            <CardDescription className="mt-2 text-sm leading-7">
              {ranking.description}
            </CardDescription>
          </div>
          <Badge className="h-auto rounded-full px-3 py-1" variant="outline">
            {ranking.curator.name} · {ranking.curator.role}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {ranking.items.map((item) => (
          <RankingRow
            busy={pendingSlug === item.model.slug}
            disabled={disabled}
            item={item}
            key={`${ranking.id}-${item.model.slug}`}
            note={item.note}
            onRate={(value) => {
              onRate(item.model.slug, value);
            }}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function RankingsPage() {
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated";
  const [activeTab, setActiveTab] = useState<"official" | "community">("official");
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const rankingsQuery = useQuery({
    queryKey: ["rankings", authStatus],
    queryFn: () => apiClient.listRankings()
  });

  function handleQuickRating(slug: string, rating: number) {
    if (!isAuthenticated) {
      return;
    }

    setSubmitError(null);
    setPendingSlug(slug);

    void apiClient
      .submitModelReview(slug, {
        rating,
        content: null
      })
      .then(async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["rankings"] }),
          queryClient.invalidateQueries({ queryKey: ["model-reviews", slug] }),
          queryClient.invalidateQueries({ queryKey: ["model-detail", slug] })
        ]);
      })
      .catch((reason: unknown) => {
        setSubmitError(reason instanceof Error ? reason.message : "快速评分提交失败");
      })
      .finally(() => {
        setPendingSlug(null);
      });
  }

  return (
    <main className="flex flex-col gap-8">
      <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-card/90 px-6 py-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>榜单</Badge>
          <Badge variant="outline">官方榜 + 用户榜</Badge>
        </div>
        <div className="mt-6 max-w-4xl">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            先看真实口碑排序，再看不同飞友视角下的推荐清单。
          </h1>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            官方榜按综合评分和点评人数生成，用户榜先以精选榜单形式落地。你可以直接在这里做快速评分，评分会即时回流到榜单排序与机型口碑。
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Badge className="h-auto rounded-full px-3 py-1" variant="secondary">
            <SparklesIcon />
            口碑标签自动映射
          </Badge>
          <Badge className="h-auto rounded-full px-3 py-1" variant="outline">
            <MessageSquareTextIcon />
            榜单页支持快速评分
          </Badge>
        </div>
      </section>

      {!isAuthenticated ? (
        <Alert>
          <AlertTitle>登录后可参与快速评分</AlertTitle>
          <AlertDescription>
            当前可以先浏览官方榜和用户榜。登录后，你就能在榜单里直接点星评分，并同步刷新机型口碑。
          </AlertDescription>
        </Alert>
      ) : null}

      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>评分提交失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col gap-4">
        <Tabs
          className="gap-0"
          onValueChange={(value) => {
            setActiveTab(value as "official" | "community");
          }}
          value={activeTab}
        >
          <TabsList variant="default">
            <TabsTrigger value="official">官方榜</TabsTrigger>
            <TabsTrigger value="community">用户榜</TabsTrigger>
          </TabsList>
        </Tabs>
      </section>

      {rankingsQuery.isLoading ? (
        <section className="grid gap-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card className="rounded-[1.75rem] border-border/80" key={index}>
              <CardHeader>
                <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {rankingsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>榜单加载失败</AlertTitle>
          <AlertDescription>{rankingsQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {rankingsQuery.isSuccess && activeTab === "official" ? (
        <section className="flex flex-col gap-6">
          {rankingsQuery.data.official.spotlight ? (
            <Card className="overflow-hidden rounded-[1.75rem] border-border/80 bg-card/90 shadow-sm">
              <CardContent className="grid gap-6 px-6 py-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[1.5rem] border border-border/70 bg-[linear-gradient(135deg,rgba(30,136,229,0.18),rgba(14,165,233,0.08))] px-5 py-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{rankingsQuery.data.official.title}</Badge>
                    <Badge variant="outline">榜首机型</Badge>
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                    {rankingsQuery.data.official.spotlight.model.name}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {rankingsQuery.data.official.spotlight.highlight}
                  </p>
                  <div className="mt-5">
                    <ScoreBadges item={rankingsQuery.data.official.spotlight} />
                  </div>
                  <Button asChild className="mt-6 rounded-2xl">
                    <Link to={modelDetailPath(rankingsQuery.data.official.spotlight.model.slug)}>
                      查看机型详情
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                </div>

                <div className="rounded-[1.5rem] border border-border/70 bg-background/70 px-5 py-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <TrophyIcon className="size-4.5 text-primary" />
                    排序说明
                  </div>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    {rankingsQuery.data.official.algorithmNote}
                  </p>
                  <div className="mt-6 rounded-2xl border border-border/70 bg-card px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      更新时间
                    </div>
                    <div className="mt-2 text-sm font-medium text-foreground">
                      {new Date(rankingsQuery.data.official.generatedAt).toLocaleString("zh-CN", {
                        hour12: false
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {rankingsQuery.data.official.items.map((item) => (
            <RankingRow
              busy={pendingSlug === item.model.slug}
              disabled={!isAuthenticated}
              item={item}
              key={item.model.slug}
              onRate={(value) => {
                handleQuickRating(item.model.slug, value);
              }}
            />
          ))}
        </section>
      ) : null}

      {rankingsQuery.isSuccess && activeTab === "community" ? (
        <section className="flex flex-col gap-6">
          {rankingsQuery.data.community.map((ranking) => (
            <CommunityRankingCard
              disabled={!isAuthenticated}
              key={ranking.id}
              onRate={handleQuickRating}
              pendingSlug={pendingSlug}
              ranking={ranking}
            />
          ))}
        </section>
      ) : null}
    </main>
  );
}
