import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CommunityRanking, RankingItem } from "@feijia/schemas";
import { APP_ROUTES } from "@feijia/shared";
import { PlusIcon, SparklesIcon, StarIcon, TrendingUpIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  SiteGrid,
  SitePage,
  SitePageEyebrow,
  SitePanel,
  SitePanelBody,
  SiteRail
} from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "../lib/api-client";
import { getEditorialImage, getModelImage } from "../lib/aviation-media";
import { useAuthStore } from "../features/auth/auth-store";

const officialCardLabels = [
  { eyebrow: "效率", title: "续航之王" },
  { eyebrow: "价值", title: "性价比之选" },
  { eyebrow: "实用性", title: "载重先锋" }
] as const;

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
    <div className="flex items-center gap-1 text-amber-500">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          className="rounded-full p-1 transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || busy}
          key={value}
          onClick={() => onRate?.(value)}
          type="button"
        >
          <StarIcon
            className="size-5"
            fill={value <= (rating ?? 0) ? "currentColor" : "none"}
            strokeWidth={1.75}
          />
        </button>
      ))}
    </div>
  );
}

function RankingCard({
  eyebrow,
  title,
  items,
  pendingSlug,
  disabled,
  onRate
}: {
  eyebrow: string;
  title: string;
  items: RankingItem[];
  pendingSlug: string | null;
  disabled: boolean;
  onRate: (slug: string, value: number) => void;
}) {
  return (
    <SitePanel>
      <SitePanelBody className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <SitePageEyebrow className="text-primary">{eyebrow}</SitePageEyebrow>
            <div className="mt-3 text-[2rem] font-semibold leading-tight text-foreground">
              {title}
            </div>
          </div>
          <Badge variant="tone">神机</Badge>
        </div>

        <div className="space-y-5">
          {items.map((item) => (
            <div
              className="grid grid-cols-[52px_64px_minmax(0,1fr)_72px] items-center gap-4"
              key={item.model.slug}
            >
              <div className="text-5xl font-semibold italic text-primary/30">
                {item.rank.toString().padStart(2, "0")}
              </div>
              <img
                alt={item.model.name}
                className="size-16 rounded-[calc(var(--radius-control)-0.05rem)] object-cover"
                src={getModelImage(item.model.slug, item.model.powerType)}
              />
              <div className="min-w-0">
                <div className="truncate text-2xl font-semibold text-foreground">
                  {item.model.name}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {item.model.brand.name} · {item.averageScore.toFixed(1)}
                </div>
                <QuickRatingStars
                  busy={pendingSlug === item.model.slug}
                  disabled={disabled}
                  onRate={(value) => onRate(item.model.slug, value)}
                  rating={item.myRating}
                />
              </div>
              <div className="text-right">
                <div className="text-4xl font-semibold text-amber-700">
                  {item.bayesianScore.toFixed(1)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border/80 pt-6">
          <div className="text-sm text-muted-foreground">为当前领头者快速评分</div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <QuickRatingStars
              busy={pendingSlug === items[0]?.model.slug}
              disabled={disabled}
              onRate={(value) => items[0] && onRate(items[0].model.slug, value)}
              rating={items[0]?.myRating ?? null}
            />
            <Button asChild size="sm" variant="panel">
              <Link to={APP_ROUTES.modelDetail.replace(":slug", items[0]?.model.slug ?? "")}>
                发布点评
              </Link>
            </Button>
          </div>
        </div>
      </SitePanelBody>
    </SitePanel>
  );
}

function CommunityCard({ ranking }: { ranking: CommunityRanking }) {
  return (
    <SitePanel variant="muted">
      <SitePanelBody className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <SitePageEyebrow className="text-primary">{ranking.curator.role}</SitePageEyebrow>
            <div className="mt-3 text-[2rem] font-semibold leading-tight text-foreground">
              {ranking.title}
            </div>
          </div>
          <Badge variant="outline">{ranking.curator.name}</Badge>
        </div>

        <p className="text-sm leading-7 text-muted-foreground">{ranking.description}</p>

        <div className="space-y-4">
          {ranking.items.slice(0, 3).map((item) => (
            <div className="flex items-center gap-4" key={item.model.slug}>
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-semibold text-primary">
                {item.rank}
              </div>
              <img
                alt={item.model.name}
                className="size-14 rounded-[calc(var(--radius-control)-0.15rem)] object-cover"
                src={getModelImage(item.model.slug, item.model.powerType)}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-semibold text-foreground">
                  {item.model.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.note ?? item.highlight ?? "社区精选推荐"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SitePanelBody>
    </SitePanel>
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

  const officialGroups = useMemo(() => {
    const items = rankingsQuery.data?.official.items ?? [];
    return [items.slice(0, 3), items.slice(1, 4), items.slice(2, 5)];
  }, [rankingsQuery.data?.official.items]);

  function handleQuickRating(slug: string, rating: number) {
    if (!isAuthenticated) {
      return;
    }

    setSubmitError(null);
    setPendingSlug(slug);

    void apiClient
      .submitModelReview(slug, { rating, content: null })
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
    <SitePage className="relative">
      <div className="flex justify-end">
        <Tabs
          onValueChange={(value) => setActiveTab(value as "official" | "community")}
          value={activeTab}
        >
          <TabsList className="w-full" variant="pills">
            <TabsTrigger value="official">全站榜单</TabsTrigger>
            <TabsTrigger value="community">用户榜单</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!isAuthenticated ? (
        <Alert>
          <AlertTitle>登录后可参与快速评分</AlertTitle>
          <AlertDescription>当前可先浏览榜单，登录后就能直接点星评分并同步刷新排序。</AlertDescription>
        </Alert>
      ) : null}

      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>评分提交失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      {rankingsQuery.isLoading ? (
        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-4 py-6">
                <div className="h-10 w-48 animate-pulse rounded bg-muted" />
                <div className="h-48 w-full animate-pulse rounded-[calc(var(--radius-panel)-0.2rem)] bg-muted" />
              </CardContent>
            </Card>
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
        <SiteGrid variant="sidebar">
          <div className="grid gap-[var(--page-gap)] md:grid-cols-2">
            {activeTab === "official"
              ? officialGroups.map((group, index) =>
                  group.length > 0 ? (
                    <RankingCard
                      disabled={!isAuthenticated}
                      eyebrow={officialCardLabels[index]?.eyebrow ?? "精选"}
                      items={group}
                      key={officialCardLabels[index]?.title ?? index}
                      onRate={handleQuickRating}
                      pendingSlug={pendingSlug}
                      title={officialCardLabels[index]?.title ?? "飞行榜单"}
                    />
                  ) : null
                )
              : rankingsQuery.data.community.map((ranking) => (
                  <CommunityCard key={ranking.id} ranking={ranking} />
                ))}
          </div>

          <SiteRail>
            {rankingsQuery.data.official.spotlight ? (
              <SitePanel variant="muted">
                <SitePanelBody className="space-y-5">
                  <Badge variant="tone">热门趋势</Badge>
                  <div className="text-[2rem] font-semibold leading-tight text-foreground">
                    设计大赏
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">
                    由社区投票选出的、符合人体工程学控制和机身美学的飞行器。
                  </p>

                  <div className="overflow-hidden rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/80">
                    <img
                      alt={rankingsQuery.data.official.spotlight.model.name}
                      className="h-56 w-full object-cover"
                      src={getEditorialImage(rankingsQuery.data.official.spotlight.model.slug)}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-3xl font-semibold text-foreground">
                        {rankingsQuery.data.official.spotlight.model.name}
                      </div>
                      <div className="mt-2 text-sm leading-7 text-muted-foreground">
                        {rankingsQuery.data.official.spotlight.highlight}
                      </div>
                    </div>
                    <div className="rounded-[calc(var(--radius-control)-0.05rem)] bg-secondary/42 px-4 py-3 text-4xl font-semibold text-amber-700">
                      {rankingsQuery.data.official.spotlight.bayesianScore.toFixed(1)}
                    </div>
                  </div>
                </SitePanelBody>
              </SitePanel>
            ) : null}

            <SitePanel variant="muted">
              <SitePanelBody className="space-y-4">
                <div className="flex items-center gap-3 text-xl font-semibold text-foreground">
                  <TrendingUpIcon className="size-5 text-primary" />
                  加入评审团
                </div>
                <p className="text-sm leading-7 text-muted-foreground">
                  通过认证后，你可以对榜单候选项进行加权评分，并参与每周专题榜单评审。
                </p>
                <Button asChild className="w-full" size="xl" variant="hero">
                  <Link to={APP_ROUTES.rankingEditor}>创建榜单</Link>
                </Button>
              </SitePanelBody>
            </SitePanel>

            <SitePanel variant="highlight">
              <SitePanelBody className="space-y-4">
                <div className="flex size-14 items-center justify-center rounded-[calc(var(--radius-control)+0.1rem)] bg-white/14">
                  <SparklesIcon className="size-6" />
                </div>
                <div className="text-[2rem] font-semibold leading-tight">
                  让你的榜单也出现在首页右栏
                </div>
                <p className="text-sm leading-7 text-panel-highlight-foreground/84">
                  只要结构清晰、点评有依据，我们会优先推荐到飞友圈专题区域。
                </p>
              </SitePanelBody>
            </SitePanel>
          </SiteRail>
        </SiteGrid>
      ) : null}

      <Button asChild className="fixed bottom-8 right-8" size="icon-lg" variant="hero">
        <Link to={APP_ROUTES.rankingEditor}>
          <PlusIcon className="size-8" />
          <span className="sr-only">创建榜单</span>
        </Link>
      </Button>
    </SitePage>
  );
}
