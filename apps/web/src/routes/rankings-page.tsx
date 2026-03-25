import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowRightIcon, SparklesIcon, TrendingUpIcon } from "lucide-react";
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
import { buildRankingDetailPath, buildRankingItemDetailPath } from "@/lib/web-routes";
import { apiClient } from "../lib/api-client";
import { getEditorialImage, getModelImage } from "../lib/aviation-media";

const officialCardLabels = [
  { eyebrow: "效率", title: "续航之王", id: "official-endurance" },
  { eyebrow: "价格", title: "性价比之选", id: "official-value" },
  { eyebrow: "实用", title: "载重先锋", id: "official-utility" }
] as const;

function OfficialRankingCard({
  eyebrow,
  title,
  items
}: {
  eyebrow: string;
  title: string;
  items: Awaited<ReturnType<typeof apiClient.listRankings>>["official"]["items"];
}) {
  return (
    <SitePanel>
      <SitePanelBody className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <SitePageEyebrow className="text-primary">{eyebrow}</SitePageEyebrow>
            <div className="mt-3 text-[2rem] font-semibold leading-tight text-foreground">{title}</div>
          </div>
          <Badge variant="tone">只读</Badge>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <Link
              className="grid grid-cols-[3rem_4rem_minmax(0,1fr)_3rem] items-center gap-4 border-b border-border/60 py-3 last:border-b-0"
              key={item.id}
              to={buildRankingItemDetailPath(item.id)}
            >
              <div className="text-4xl font-semibold italic text-primary/30">{item.rank.toString().padStart(2, "0")}</div>
              <img
                alt={item.title}
                className="size-16 object-cover"
                src={
                  item.imageUrl ??
                  getModelImage(
                    item.linkedModel?.slug ?? item.id,
                    item.linkedModel?.powerType ?? "electric"
                  )
                }
              />
              <div className="min-w-0">
                <div className="truncate text-xl font-semibold text-foreground">{item.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{item.brandName ?? item.linkedModel?.brand.name ?? "官方榜单项"}</div>
              </div>
              <div className="text-right text-lg font-semibold text-amber-700">{item.averageScore.toFixed(1)}</div>
            </Link>
          ))}
        </div>

        <Button asChild className="w-full" variant="outline">
          <Link to={buildRankingItemDetailPath(items[0]?.id ?? "")}>
            查看条目详情
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </SitePanelBody>
    </SitePanel>
  );
}

function CommunityRankingCard({
  ranking
}: {
  ranking: Awaited<ReturnType<typeof apiClient.listRankings>>["community"][number];
}) {
  return (
    <SitePanel variant="muted">
      <SitePanelBody className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <SitePageEyebrow className="text-primary">Community Ranking</SitePageEyebrow>
            <div className="mt-3 text-[2rem] font-semibold leading-tight text-foreground">{ranking.title}</div>
          </div>
          <Badge variant="outline">{ranking.author.displayName}</Badge>
        </div>

        <p className="text-sm leading-7 text-muted-foreground">{ranking.description}</p>

        <div className="space-y-4">
          {ranking.items.slice(0, 3).map((item) => (
            <Link
              className="flex items-center gap-4 border-b border-border/60 py-3 last:border-b-0"
              key={item.id}
              to={buildRankingItemDetailPath(item.id)}
            >
              <div className="flex size-12 items-center justify-center bg-primary/10 text-lg font-semibold text-primary">
                {item.rank}
              </div>
              <img
                alt={item.title}
                className="size-14 object-cover"
                src={
                  item.imageUrl ??
                  getModelImage(
                    item.linkedModel?.slug ?? item.id,
                    item.linkedModel?.powerType ?? "electric"
                  )
                }
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-semibold text-foreground">{item.title}</div>
                <div className="text-sm text-muted-foreground">{item.summary ?? "混合条目点评入口"}</div>
              </div>
            </Link>
          ))}
        </div>

        <Button asChild className="w-full" variant="outline">
          <Link to={buildRankingDetailPath(ranking.id)}>
            查看榜单详情
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </SitePanelBody>
    </SitePanel>
  );
}

export function RankingsPage() {
  const [activeTab, setActiveTab] = useState<"official" | "community">("official");
  const rankingsQuery = useQuery({
    queryKey: ["rankings"],
    queryFn: () => apiClient.listRankings()
  });

  const officialGroups = useMemo(() => {
    const items = rankingsQuery.data?.official.items ?? [];
    return [items.slice(0, 3), items.slice(1, 4), items.slice(2, 5)];
  }, [rankingsQuery.data?.official.items]);

  return (
    <SitePage className="relative">
      <div className="flex justify-end">
        <Tabs onValueChange={(value) => setActiveTab(value as "official" | "community")} value={activeTab}>
          <TabsList className="w-full" variant="pills">
            <TabsTrigger value="official">全站榜单</TabsTrigger>
            <TabsTrigger value="community">用户榜单</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {rankingsQuery.isLoading ? (
        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-4 py-6">
                <div className="h-10 w-48 animate-pulse rounded bg-muted" />
                <div className="h-48 w-full animate-pulse rounded bg-muted" />
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
                    <OfficialRankingCard
                      eyebrow={officialCardLabels[index]?.eyebrow ?? "精选"}
                      items={group}
                      key={officialCardLabels[index]?.title ?? index}
                      title={officialCardLabels[index]?.title ?? "飞行榜单"}
                    />
                  ) : null
                )
              : rankingsQuery.data.community.map((ranking) => (
                  <CommunityRankingCard key={ranking.id} ranking={ranking} />
                ))}
          </div>

          <SiteRail>
            {rankingsQuery.data.official.spotlight ? (
              <SitePanel variant="muted">
                <SitePanelBody className="space-y-5">
                  <Badge variant="tone">热门趋势</Badge>
                  <div className="text-[2rem] font-semibold leading-tight text-foreground">榜单发现</div>
                  <p className="text-sm leading-7 text-muted-foreground">
                    总览页不再承载直接评分，评分和评论统一进入榜单详情与榜单项详情。
                  </p>

                  <img
                    alt={rankingsQuery.data.official.spotlight.title}
                    className="h-56 w-full object-cover"
                    src={getEditorialImage(rankingsQuery.data.official.spotlight.id)}
                  />

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-3xl font-semibold text-foreground">{rankingsQuery.data.official.spotlight.title}</div>
                      <div className="mt-2 text-sm leading-7 text-muted-foreground">
                        {rankingsQuery.data.official.spotlight.summary ?? "当前热度最高的榜单条目。"}
                      </div>
                    </div>
                    <div className="bg-secondary/42 px-4 py-3 text-4xl font-semibold text-amber-700">
                      {rankingsQuery.data.official.spotlight.averageScore.toFixed(1)}
                    </div>
                  </div>
                </SitePanelBody>
              </SitePanel>
            ) : null}

            <SitePanel variant="muted">
              <SitePanelBody className="space-y-4">
                <div className="flex items-center gap-3 text-xl font-semibold text-foreground">
                  <TrendingUpIcon className="size-5 text-primary" />
                  创建榜单
                </div>
                <p className="text-sm leading-7 text-muted-foreground">
                  创建入口保留，评分与评论迁移到详情页，避免总览页过载。
                </p>
                <Button asChild className="w-full" size="xl" variant="hero">
                  <Link to={APP_ROUTES.rankingEditor}>创建榜单</Link>
                </Button>
              </SitePanelBody>
            </SitePanel>

            <SitePanel variant="highlight">
              <SitePanelBody className="space-y-4">
                <div className="flex size-14 items-center justify-center bg-white/14">
                  <SparklesIcon className="size-6" />
                </div>
                <div className="text-[2rem] font-semibold leading-tight">榜单消费链路已拆开</div>
                <p className="text-sm leading-7 text-panel-highlight-foreground/84">
                  先看总览，再进榜单详情讨论，最后进入条目详情评分与评论。
                </p>
              </SitePanelBody>
            </SitePanel>
          </SiteRail>
        </SiteGrid>
      ) : null}
    </SitePage>
  );
}
