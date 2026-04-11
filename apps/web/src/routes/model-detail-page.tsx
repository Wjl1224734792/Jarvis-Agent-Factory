import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ModelDetail } from "@feijia/schemas";
import { APP_ROUTES } from "@feijia/shared";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BookmarkIcon,
  HeartIcon,
  MessageSquareTextIcon,
  PlayIcon
} from "lucide-react";
import { Fragment, startTransition, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BrandIdentity } from "@/components/brand-identity";
import { ImmersivePageShell } from "@/components/immersive-page-shell";
import { ModelThumbCover } from "@/components/model-thumb-cover";
import { DetailPageSkeleton } from "@/components/page-skeletons";
import { PageShareControl } from "@/components/page-share-control";
import { ReportActionSheet } from "@/components/report-action-sheet";
import { SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/auth-store";
import { useLoginPrompt } from "@/features/auth/use-login-prompt";
import { getModelGallery, getModelImage } from "@/lib/aviation-media";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { shouldRecordSessionView } from "@/lib/view-session";
import { DETAIL_PAGE_LINK_PROPS } from "@/lib/web-routes";
import { formatModelMetric, formatModelPriceRange } from "./model-detail-helpers";
import { ModelCommentsSection } from "./model-comments-section";

const powerTypeLabels = {
  electric: "电动",
  fuel: "燃油",
  hybrid: "混动",
  other: "其他"
} as const;

const lifecycleStatusLabels = {
  concept: "概念",
  development: "研发",
  testing: "测试",
  unreleased: "未发布",
  released: "已发布",
  not_in_market: "未上市",
  marketed: "已上市"
} as const;

function formatMetric(label: string, value: number | null, formatter: (input: number) => string) {
  return {
    label,
    value: formatModelMetric(value, formatter)
  };
}

type ModelGalleryItem = { kind: "image" | "video"; url: string };

function buildModelDetailGallery(item: {
  slug: string;
  powerType: ModelDetail["powerType"];
  coverImageUrl: string | null;
  coverVideoUrl: string | null;
  galleryImageUrls: string[];
}): ModelGalleryItem[] {
  const slots: ModelGalleryItem[] = [];
  const seen = new Set<string>();

  if (item.coverVideoUrl) {
    slots.push({ kind: "video", url: item.coverVideoUrl });
    seen.add(item.coverVideoUrl);
  } else if (item.coverImageUrl) {
    slots.push({ kind: "image", url: item.coverImageUrl });
    seen.add(item.coverImageUrl);
  }

  for (const url of item.galleryImageUrls) {
    if (url && !seen.has(url)) {
      slots.push({ kind: "image", url });
      seen.add(url);
    }
  }

  if (slots.length === 0) {
    return getModelGallery(item.slug, item.powerType, 4).map((url) => ({ kind: "image" as const, url }));
  }
  return slots;
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
  const item = detailQuery.data?.item as ModelDetail | undefined;

  const hotModelsQuery = useQuery({
    queryKey: ["hot-models-sidebar", detailQuery.data?.item.category.slug, slug],
    queryFn: () =>
      apiClient.listModels({
        categorySlug: detailQuery.data?.item.category.slug,
        sort: "hot",
        limit: 4
      }),
    enabled: Boolean(detailQuery.data?.item.category.slug)
  });

  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [interactionBusy, setInteractionBusy] = useState<string | null>(null);
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);

  const gallery = useMemo(() => {
    const raw = detailQuery.data?.item;
    if (!raw) {
      return [] as ModelGalleryItem[];
    }
    return buildModelDetailGallery({
      slug: raw.slug,
      powerType: raw.powerType,
      coverImageUrl: raw.coverImageUrl ?? null,
      coverVideoUrl: raw.coverVideoUrl ?? null,
      galleryImageUrls: raw.galleryImageUrls ?? []
    });
  }, [detailQuery.data?.item]);

  useEffect(() => {
    setActiveGalleryIndex(0);
  }, [slug]);

  useEffect(() => {
    mainVideoRef.current?.pause();
  }, [activeGalleryIndex]);

  useEffect(() => {
    if (gallery.length === 0) {
      return;
    }
    setActiveGalleryIndex((index) => Math.min(index, gallery.length - 1));
  }, [gallery.length]);

  useEffect(() => {
    if (!item || !item.isPublished || !shouldRecordSessionView("model", item.slug)) {
      return;
    }

    void apiClient.recordModelView(item.slug).catch(() => {
      // Passive analytics failure should not affect detail rendering.
    });
  }, [item]);

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

  if (!item) {
    return (
      <Alert>
        <AlertTitle>暂无可展示数据</AlertTitle>
        <AlertDescription>这款飞行器暂时没有公开参数或评论。</AlertDescription>
      </Alert>
    );
  }

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
        ["状态", lifecycleStatusLabels[item.lifecycleStatus]]
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

  function patchModelInteractionState(
    type: "interested" | "favorite" | "share",
    active: boolean
  ) {
    const summaryKey =
      type === "interested"
        ? "interestCount"
        : type === "favorite"
          ? "favoriteCount"
          : "shareCount";
    const viewerKey =
      type === "interested"
        ? "isInterested"
        : type === "favorite"
          ? "isFavorited"
          : "hasShared";
    const delta = active ? 1 : -1;

    queryClient.setQueryData<Awaited<ReturnType<typeof apiClient.getModelDetail>>>(
      ["model-detail", slug],
      (current) => {
        if (!current?.item) {
          return current;
        }

        return {
          ...current,
          item: {
            ...current.item,
            interactionSummary: {
              ...current.item.interactionSummary,
              [summaryKey]: Math.max(0, current.item.interactionSummary[summaryKey] + delta)
            },
            viewer: {
              ...current.item.viewer,
              [viewerKey]: active
            }
          }
        };
      }
    );

    queryClient.setQueriesData<Awaited<ReturnType<typeof apiClient.listModels>>>(
      { queryKey: ["home-shell-models"] },
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          items: current.items.map((model) =>
            model.slug !== modelSlug
              ? model
              : {
                  ...model,
                  favoriteCount:
                    type === "favorite"
                      ? Math.max(0, model.favoriteCount + delta)
                      : model.favoriteCount
                }
          )
        };
      }
    );

    queryClient.setQueriesData<Awaited<ReturnType<typeof apiClient.listModels>>>(
      { queryKey: ["hot-models-sidebar"] },
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          items: current.items.map((model) =>
            model.slug !== modelSlug
              ? model
              : {
                  ...model,
                  favoriteCount:
                    type === "favorite"
                      ? Math.max(0, model.favoriteCount + delta)
                      : model.favoriteCount
                }
          )
        };
      }
    );
  }

  async function handleInteraction(type: "interested" | "favorite") {
    if (!isAuthenticated) {
      promptLogin({
        title: "登录后才能互动",
        description: "收藏、想买前请先登录。"
      });
      return;
    }

    setInteractionBusy(type);
    try {
      const response = await apiClient.interactModel(modelSlug, type);
      patchModelInteractionState(type, response.item.active);
      startTransition(() => {
        void queryClient.invalidateQueries({ queryKey: ["self-profile", currentUserId] });
        void queryClient.invalidateQueries({ queryKey: ["self-profile-content", currentUserId] });
      });
    } finally {
      setInteractionBusy(null);
    }
  }

  async function recordModelShareAfterCopy() {
    if (!isAuthenticated) {
      return;
    }
    setInteractionBusy("share");
    try {
      const response = await apiClient.interactModel(modelSlug, "share");
      patchModelInteractionState("share", response.item.active);
      startTransition(() => {
        void queryClient.invalidateQueries({ queryKey: ["self-profile", currentUserId] });
        void queryClient.invalidateQueries({ queryKey: ["self-profile-content", currentUserId] });
      });
    } finally {
      setInteractionBusy(null);
    }
  }

  return (
    <ImmersivePageShell className="max-w-[1180px] gap-6">
      <Button asChild className="w-fit border-0" variant="ghost">
        <Link to={APP_ROUTES.models}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回机型库
        </Link>
      </Button>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="space-y-6 border border-border/75 bg-white p-4">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
              <div className="min-w-0 space-y-3 lg:min-h-0">
                <div className="overflow-hidden bg-black">
                  {gallery[activeGalleryIndex]?.kind === "video" ? (
                    <video
                      ref={mainVideoRef}
                      className="h-[280px] w-full object-cover sm:h-[320px] lg:h-[340px]"
                      controls
                      key={gallery[activeGalleryIndex]?.url}
                      playsInline
                      preload="metadata"
                      src={gallery[activeGalleryIndex]?.url}
                    />
                  ) : (
                    <img
                      alt={item.name}
                      className="h-[280px] w-full object-cover sm:h-[320px] lg:h-[340px]"
                      src={gallery[activeGalleryIndex]?.url ?? getModelImage(item.slug, item.powerType)}
                    />
                  )}
                </div>

                <div className="flex gap-2 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5">
                  {gallery.map((slot, index) => (
                    <button
                      className={`h-16 w-20 shrink-0 overflow-hidden rounded-none border transition ${
                        activeGalleryIndex === index ? "border-primary" : "border-border/70"
                      }`}
                      key={`${slot.url}-${index}`}
                      onClick={() => setActiveGalleryIndex(index)}
                      type="button"
                    >
                      {slot.kind === "video" ? (
                        <span className="relative block h-full w-full">
                          <video
                            aria-hidden
                            className="h-full w-full object-cover pointer-events-none"
                            muted
                            playsInline
                            preload="metadata"
                            src={slot.url}
                          />
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
                            <PlayIcon className="size-4 fill-white text-white" />
                          </span>
                        </span>
                      ) : (
                        <img alt={`${item.name}-${index + 1}`} className="h-full w-full object-cover" src={slot.url} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex min-h-0 min-w-0 flex-col lg:h-full">
                <div className="shrink-0 space-y-3">
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
                </div>

                <div className="flex min-h-0 max-h-[280px] flex-1 flex-col overflow-y-auto pr-1 sm:max-h-[320px] lg:max-h-[340px]">
                  <p className="max-w-3xl shrink-0 text-sm leading-7 text-muted-foreground">
                    {item.description ?? item.summary ?? "查看参数、图集与社区评论。"}
                  </p>
                  {priceLabel ? (
                    <div className="mt-auto shrink-0 border-t border-border/25 pt-3">
                      <div className="text-xl font-semibold tracking-tight text-primary md:text-[1.625rem]">
                        {priceLabel}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/25 pt-3">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <button
                      aria-label={`想买，${item.interactionSummary.interestCount} 人`}
                      aria-pressed={item.viewer.isInterested ? "true" : "false"}
                      className={cn(
                        "group inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-sm font-medium tabular-nums shadow-none outline-none transition-colors",
                        "focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-rose-400/45 focus-visible:ring-offset-2",
                        "disabled:cursor-not-allowed disabled:opacity-45",
                        item.viewer.isInterested
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
                      )}
                      disabled={interactionBusy === "interested"}
                      onClick={() => {
                        void handleInteraction("interested");
                      }}
                      type="button"
                    >
                      <HeartIcon
                        className={cn(
                          "size-[1.125rem] shrink-0 transition-transform duration-150 ease-out",
                          item.viewer.isInterested
                            ? "scale-105 fill-rose-500 text-rose-600 dark:fill-rose-400 dark:text-rose-300"
                            : "text-current group-active:scale-[0.92]"
                        )}
                      />
                      <span>{item.interactionSummary.interestCount}</span>
                    </button>
                    <button
                      aria-label={`收藏，${item.interactionSummary.favoriteCount} 人`}
                      aria-pressed={item.viewer.isFavorited ? "true" : "false"}
                      className={cn(
                        "group inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-sm font-medium tabular-nums shadow-none outline-none transition-colors",
                        "focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-amber-400/45 focus-visible:ring-offset-2",
                        "disabled:cursor-not-allowed disabled:opacity-45",
                        item.viewer.isFavorited
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-muted-foreground hover:text-amber-700 dark:hover:text-amber-400"
                      )}
                      disabled={interactionBusy === "favorite"}
                      onClick={() => {
                        void handleInteraction("favorite");
                      }}
                      type="button"
                    >
                      <BookmarkIcon
                        className={cn(
                          "size-[1.125rem] shrink-0 transition-transform duration-150 ease-out",
                          item.viewer.isFavorited
                            ? "scale-105 fill-amber-500 text-amber-700 dark:fill-amber-400 dark:text-amber-300"
                            : "text-current group-active:scale-[0.92]"
                        )}
                      />
                      <span>{item.interactionSummary.favoriteCount}</span>
                    </button>
                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5 text-sm font-medium tabular-nums",
                        item.viewer.hasShared
                          ? "text-sky-700 dark:text-sky-300"
                          : "text-muted-foreground"
                      )}
                    >
                      <PageShareControl
                        active={item.viewer.hasShared}
                        aria-label={`分享，${item.interactionSummary.shareCount} 次`}
                        className="[&_button]:p-0"
                        disabled={interactionBusy === "share"}
                        iconClassName="size-[1.125rem]"
                        onCopySuccess={() => {
                          void recordModelShareAfterCopy();
                        }}
                        sharePath={APP_ROUTES.modelDetail.replace(":slug", modelSlug)}
                        tone="sky"
                      />
                      <span>{item.interactionSummary.shareCount}</span>
                    </div>
                    <button
                      aria-label="前往评论区"
                      className={cn(
                        "inline-flex items-center justify-center border-0 bg-transparent p-0 text-muted-foreground shadow-none outline-none transition",
                        "hover:text-foreground focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
                      )}
                      onClick={() => {
                        document.getElementById("model-comment-area")?.scrollIntoView({
                          behavior: "smooth",
                          block: "start"
                        });
                      }}
                      type="button"
                    >
                      <MessageSquareTextIcon className="size-[1.125rem] shrink-0" />
                    </button>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center max-sm:ml-0 max-sm:w-full max-sm:flex-[1_1_100%] max-sm:justify-end">
                    <ReportActionSheet
                      description="请说明机型存在的问题，并至少上传 1 张证据图。"
                      onSubmit={(input) => apiClient.reportModel(modelSlug, input).then(() => {})}
                      title="举报机型"
                      trigger={
                        <button
                          aria-label="举报机型"
                          className={cn(
                            "inline-flex items-center justify-center border-0 bg-transparent p-0 shadow-none outline-none transition",
                            "focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-orange-400/45 focus-visible:ring-offset-2",
                            item.viewer.hasReported
                              ? "text-orange-700 dark:text-orange-400"
                              : "text-orange-600/90 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400"
                          )}
                          type="button"
                        >
                          <AlertTriangleIcon
                            className={cn(
                              "size-[1.125rem] shrink-0 transition",
                              item.viewer.hasReported &&
                                "scale-105 fill-orange-500 text-orange-700 dark:fill-orange-400 dark:text-orange-300"
                            )}
                          />
                        </button>
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full overflow-x-auto border-y border-border/35 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="mx-auto flex min-w-min max-w-full flex-nowrap items-center justify-center gap-x-0 px-4 text-[0.8125rem]">
                {metrics.map((metric, index) => (
                  <Fragment key={metric.label}>
                    {index > 0 ? (
                      <span aria-hidden className="shrink-0 px-2 text-muted-foreground/35 sm:px-3">
                        |
                      </span>
                    ) : null}
                    <div className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
                      <span className="text-muted-foreground">{metric.label}</span>
                      <span className="font-semibold text-foreground">{metric.value}</span>
                    </div>
                  </Fragment>
                ))}
              </div>
            </div>
          </div>

          <SitePanel className="rounded-none bg-white">
            <SitePanelBody className="space-y-6">
              <div className="space-y-5">
                {specSections.map((section) => (
                  <div key={section.title}>
                    <div className="text-[0.78rem] font-semibold uppercase tracking-[0.2em] text-primary">
                      {section.title}
                    </div>
                    <div className="mt-3 rounded-none border border-border/70">
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

        <aside className="space-y-5">
          <SitePanel variant="muted">
            <SitePanelBody className="space-y-2.5">
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-primary">热门机型</div>
              {hotModels.map((model, index) => (
                <Link
                  className="grid grid-cols-[58px_minmax(0,1fr)] items-center gap-2.5 border border-transparent p-1.5 transition hover:border-primary/18 hover:bg-background"
                  key={model.slug}
                  {...DETAIL_PAGE_LINK_PROPS}
                  to={APP_ROUTES.modelDetail.replace(":slug", model.slug)}
                >
                  <ModelThumbCover
                    alt={model.name}
                    className="h-[58px] w-full"
                    coverImageUrl={model.coverImageUrl ?? null}
                    coverVideoUrl={model.coverVideoUrl ?? null}
                    index={index}
                    slug={model.slug}
                    powerType={model.powerType}
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
        </aside>
      </section>
    </ImmersivePageShell>
  );
}
