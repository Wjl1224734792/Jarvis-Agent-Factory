import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ModelDetail } from "@feijia/schemas";
import { APP_ROUTES } from "@feijia/shared";
import {
  ArrowLeftIcon,
  BookmarkIcon,
  HeartIcon,
  MessageSquareTextIcon
} from "lucide-react";
import { SendIcon } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BrandIdentity } from "@/components/brand-identity";
import { DetailPageSkeleton } from "@/components/page-skeletons";
import { ReportActionSheet } from "@/components/report-action-sheet";
import { SiteGrid, SitePage, SitePanel, SitePanelBody, SiteRail } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/auth-store";
import { useLoginPrompt } from "@/features/auth/use-login-prompt";
import { getAvatarImage, getModelGallery, getModelImage } from "@/lib/aviation-media";
import { apiClient } from "@/lib/api-client";
import { formatModelMetric, formatModelPriceRange } from "./model-detail-helpers";
import { ModelCommentsSection } from "./model-comments-section";

const powerTypeLabels = {
  electric: "电动",
  fuel: "燃油",
  hybrid: "混动",
  other: "其他"
} as const;

function formatMetric(label: string, value: number | null, formatter: (input: number) => string) {
  return {
    label,
    value: formatModelMetric(value, formatter)
  };
}

export function ModelDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated";
  const currentUserId = useAuthStore((state) => state.user?.id);
  const promptLogin = useLoginPrompt();
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["model-detail", slug],
    queryFn: () => apiClient.getModelDetail(slug),
    enabled: Boolean(slug)
  });

  const hotModelsQuery = useQuery({
    queryKey: ["hot-models-sidebar", detailQuery.data?.item.category.slug, slug],
    queryFn: () =>
      apiClient.listModels({
        categorySlug: detailQuery.data?.item.category.slug
      }),
    enabled: Boolean(detailQuery.data?.item.category.slug)
  });

  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [interactionBusy, setInteractionBusy] = useState<string | null>(null);

  if (!slug) {
    return (
      <Alert variant="destructive">
        <AlertTitle>缺少机型标识</AlertTitle>
        <AlertDescription>当前页面无法确定要查看哪一款飞行器。</AlertDescription>
      </Alert>
    );
  }

  if (detailQuery.isLoading) {
    return <DetailPageSkeleton withRail />;
  }

  if (detailQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>机型详情加载失败</AlertTitle>
        <AlertDescription>{detailQuery.error.message}</AlertDescription>
      </Alert>
    );
  }

  const item = detailQuery.data?.item as ModelDetail | undefined;

  if (!item) {
    return (
      <Alert>
        <AlertTitle>暂无可展示数据</AlertTitle>
        <AlertDescription>这款飞行器暂时没有公开参数或评论。</AlertDescription>
      </Alert>
    );
  }

  const gallery = getModelGallery(item.slug, item.powerType, 4);
  const hotModels = hotModelsQuery.data?.items.filter((model) => model.slug !== item.slug).slice(0, 3) ?? [];
  const modelSlug = item.slug;
  const priceLabel = formatModelPriceRange(item.priceMin ?? null, item.priceMax ?? null);
  const metrics = [
    formatMetric("续航", item.parameters.maxFlightTimeMinutes, (value) => `${value} 分钟`),
    formatMetric("极速", item.parameters.maxSpeedKph, (value) => `${value} km/h`),
    formatMetric("起飞重量", item.parameters.takeoffWeightGrams, (value) => `${(value / 1000).toFixed(1)} kg`),
    formatMetric("航程", item.parameters.maxRangeKilometers, (value) => `${value} km`)
  ];

  const specSections = [
    {
      title: "基础信息",
      rows: [
        ["品牌", item.brand.name],
        ["分类", item.category.name],
        ["动力", powerTypeLabels[item.powerType]],
        ["价格", priceLabel ?? "未公开"],
        ["状态", item.isPublished ? "已发布" : "未发布"]
      ]
    },
    {
      title: "参数表现",
      rows: [
        ["最大飞行时长", item.parameters.maxFlightTimeMinutes ? `${item.parameters.maxFlightTimeMinutes} 分钟` : "未公开"],
        ["最大速度", item.parameters.maxSpeedKph ? `${item.parameters.maxSpeedKph} km/h` : "未公开"],
        ["最大航程", item.parameters.maxRangeKilometers ? `${item.parameters.maxRangeKilometers} km` : "未公开"],
        ["起飞重量", item.parameters.takeoffWeightGrams ? `${item.parameters.takeoffWeightGrams} g` : "未公开"]
      ]
    }
  ];

  async function handleInteraction(type: "interested" | "favorite" | "share") {
    if (!isAuthenticated) {
      promptLogin({
        title: "登录后才能互动",
        description: "收藏、想买和分享前请先登录。"
      });
      return;
    }

    setInteractionBusy(type);
    try {
      await apiClient.interactModel(modelSlug, type);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["model-detail", slug] }),
        queryClient.invalidateQueries({ queryKey: ["self-profile", currentUserId] }),
        queryClient.invalidateQueries({ queryKey: ["self-profile-content", currentUserId] })
      ]);
    } finally {
      setInteractionBusy(null);
    }
  }

  return (
    <SitePage className="mx-auto w-full max-w-[76rem] gap-4">
      <Button asChild className="w-fit" variant="ghost">
        <Link to={APP_ROUTES.models}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回机型库
        </Link>
      </Button>

      <SiteGrid className="items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]" variant="sidebar">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid gap-4 border border-border/80 bg-white p-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  <BrandIdentity imageClassName="size-3.5" logoUrl={item.brand.logoUrl} name={item.brand.name} />
                </Badge>
                <Badge variant="outline">{item.category.name}</Badge>
                <Badge variant="outline">{powerTypeLabels[item.powerType]}</Badge>
              </div>
              <div className="text-[2rem] font-semibold tracking-[-0.04em] text-foreground md:text-[2.5rem]">
                {item.name}
              </div>
              {priceLabel ? (
                <div className="text-base font-semibold text-primary">{priceLabel}</div>
              ) : null}
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                {item.description ?? item.summary ?? "查看参数、图集与社区评论。"}
              </p>

              <div className="overflow-hidden border border-border/70">
                <img
                  alt={item.name}
                  className="h-[340px] w-full object-cover"
                  src={gallery[activeGalleryIndex] ?? getModelImage(item.slug, item.powerType)}
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {gallery.map((image, index) => (
                  <button
                    className={`overflow-hidden border transition ${
                      activeGalleryIndex === index ? "border-primary" : "border-border/70"
                    }`}
                    key={image}
                    onClick={() => setActiveGalleryIndex(index)}
                    type="button"
                  >
                    <img alt={`${item.name}-${index + 1}`} className="h-16 w-full object-cover" src={image} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {metrics.map((metric) => (
                  <div className="border border-border/70 px-4 py-4" key={metric.label}>
                    <div className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {metric.label}
                    </div>
                    <div className="mt-2 text-[1.2rem] font-semibold leading-none text-foreground">
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border border-border/70 px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "想买", value: item.interactionSummary.interestCount },
                    { label: "收藏", value: item.interactionSummary.favoriteCount },
                    { label: "分享", value: item.interactionSummary.shareCount }
                  ].map((entry) => (
                    <div key={entry.label}>
                      <div className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">{entry.label}</div>
                      <div className="mt-1 text-lg font-semibold text-foreground">{entry.value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    disabled={interactionBusy !== null}
                    onClick={() => {
                      void handleInteraction("interested");
                    }}
                    size="sm"
                    type="button"
                    variant={item.viewer.isInterested ? "panel" : "hero"}
                  >
                    <HeartIcon data-icon="inline-start" />
                    {item.viewer.isInterested ? "已想买" : "想买"}
                  </Button>
                  <Button
                    disabled={interactionBusy !== null}
                    onClick={() => {
                      void handleInteraction("favorite");
                    }}
                    size="sm"
                    type="button"
                    variant={item.viewer.isFavorited ? "panel" : "outline"}
                  >
                    <BookmarkIcon data-icon="inline-start" />
                    {item.viewer.isFavorited ? "已收藏" : "收藏"}
                  </Button>
                  <Button
                    className="sm:col-span-2"
                    disabled={interactionBusy !== null}
                    onClick={() => {
                      void handleInteraction("share");
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <SendIcon data-icon="inline-start" />
                    {item.viewer.hasShared ? "已记录分享" : "分享"}
                  </Button>
                  <ReportActionSheet
                    description="请说明机型存在的问题，并至少上传 1 张证据图。"
                    onSubmit={(input) => apiClient.reportModel(modelSlug, input).then(() => {})}
                    title="举报机型"
                    trigger={
                      <Button className="sm:col-span-2" size="sm" type="button" variant="outline">
                        举报机型
                      </Button>
                    }
                  />
                </div>

                <Button
                  onClick={() => {
                    document.getElementById("model-comment-area")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start"
                    });
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <MessageSquareTextIcon data-icon="inline-start" />
                  去评论区
                </Button>
              </div>
            </div>
          </div>

          <SitePanel className="bg-white">
            <SitePanelBody className="space-y-6">
              <div className="space-y-5">
                {specSections.map((section) => (
                  <div key={section.title}>
                    <div className="text-[0.78rem] font-semibold uppercase tracking-[0.2em] text-primary">
                      {section.title}
                    </div>
                    <div className="mt-3 border border-border/70">
                      {section.rows.map(([label, value], index) => (
                        <div
                          className={`grid gap-2 px-4 py-3 md:grid-cols-[180px_minmax(0,1fr)] ${
                            index !== section.rows.length - 1 ? "border-b border-border/70" : ""
                          }`}
                          key={label}
                        >
                          <div className="text-[0.8rem] text-muted-foreground">{label}</div>
                          <div className="text-[0.82rem] font-medium leading-6 text-foreground">
                            {label === "品牌" ? (
                              <BrandIdentity imageClassName="size-4" logoUrl={item.brand.logoUrl} name={item.brand.name} />
                            ) : (
                              value
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SitePanelBody>
          </SitePanel>

          <ModelCommentsSection currentUserId={currentUserId} isAuthenticated={isAuthenticated} slug={slug} />
        </div>

        <SiteRail>
          <SitePanel variant="muted">
            <SitePanelBody className="space-y-2.5">
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-primary">热门机型</div>
              {hotModels.map((model, index) => (
                <Link
                  className="grid grid-cols-[58px_minmax(0,1fr)] items-center gap-2.5 border border-transparent p-1.5 transition hover:border-primary/18 hover:bg-background"
                  key={model.slug}
                  to={APP_ROUTES.modelDetail.replace(":slug", model.slug)}
                >
                  <img
                    alt={model.name}
                    className="h-[58px] w-full object-cover"
                    src={getModelImage(model.slug, model.powerType, index)}
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="truncate text-[0.84rem] font-semibold text-foreground">{model.name}</div>
                    <BrandIdentity
                      className="text-[0.72rem] text-muted-foreground"
                      imageClassName="size-3.5"
                      logoUrl={model.brand.logoUrl}
                      name={model.brand.name}
                    />
                  </div>
                </Link>
              ))}
            </SitePanelBody>
          </SitePanel>
        </SiteRail>
      </SiteGrid>
    </SitePage>
  );
}
