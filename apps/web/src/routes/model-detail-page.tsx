import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  ArrowLeftIcon,
  BookmarkIcon,
  HeartIcon,
  MessageSquareTextIcon,
  Share2Icon,
  StarIcon,
  XIcon
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  SiteGrid,
  SitePage,
  SitePageEyebrow,
  SitePanel,
  SitePanelBody,
  SiteRail
} from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "../features/auth/auth-store";
import { apiClient } from "../lib/api-client";
import { getAvatarImage, getModelGallery, getModelImage } from "../lib/aviation-media";
import {
  buildSubmitReviewInput,
  createReviewFormState,
  isReviewFormValid,
  syncReviewFormState,
  updateReviewContent,
  updateReviewRating,
  type ReviewFormState
} from "./model-review-form";

const powerTypeLabels = {
  electric: "电动",
  fuel: "燃油",
  hybrid: "混动",
  other: "其他"
} as const;

function RatingStars({
  value,
  onSelect
}: {
  value: number;
  onSelect?: (value: number) => void;
}) {
  const normalized = Math.round(value);
  const toneClassName = value < 3 ? "text-destructive" : "text-rating-orange";

  return (
    <div className={toneClassName + " flex items-center gap-1"}>
      {Array.from({ length: 5 }).map((_, index) => (
        <button
          className="rounded-full p-1 transition hover:scale-105 disabled:opacity-50"
          disabled={!onSelect}
          key={index}
          onClick={() => onSelect?.(index + 1)}
          type="button"
        >
          <StarIcon
            className="size-5"
            fill={index < normalized ? "currentColor" : "none"}
            strokeWidth={1.75}
          />
        </button>
      ))}
    </div>
  );
}

export function ModelDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated";

  const detailQuery = useQuery({
    queryKey: ["model-detail", slug],
    queryFn: () => apiClient.getModelDetail(slug),
    enabled: Boolean(slug)
  });

  const reviewsQuery = useQuery({
    queryKey: ["model-reviews", slug, authStatus],
    queryFn: () => apiClient.listModelReviews(slug),
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

  const [formState, setFormState] = useState<ReviewFormState>(() => createReviewFormState(null));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [replyTarget, setReplyTarget] = useState<string | null>(null);

  useEffect(() => {
    setFormState((current) =>
      syncReviewFormState(current, reviewsQuery.data?.summary.myReview ?? null)
    );
  }, [reviewsQuery.data?.summary.myReview]);

  if (!slug) {
    return (
      <Alert variant="destructive">
        <AlertTitle>缺少机型标识</AlertTitle>
        <AlertDescription>当前页面无法确定要查看哪一台机型。</AlertDescription>
      </Alert>
    );
  }

  if (detailQuery.isLoading || reviewsQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">正在加载机型详情与用户点评...</div>;
  }

  if (detailQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>机型详情加载失败</AlertTitle>
        <AlertDescription>{detailQuery.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (reviewsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>点评数据加载失败</AlertTitle>
        <AlertDescription>{reviewsQuery.error.message}</AlertDescription>
      </Alert>
    );
  }

  const item = detailQuery.data?.item;
  const reviewPayload = reviewsQuery.data;

  if (!item || !reviewPayload) {
    return (
      <Alert>
        <AlertTitle>暂无可展示数据</AlertTitle>
        <AlertDescription>这台机型的公开参数或口碑还没有准备好。</AlertDescription>
      </Alert>
    );
  }

  const gallery = getModelGallery(item.slug, item.powerType, 4);
  const hotModels =
    hotModelsQuery.data?.items.filter((model) => model.slug !== item.slug).slice(0, 3) ?? [];
  const ratingCounts = [5, 4, 3, 2, 1].map((score) => ({
    score,
    count: reviewPayload.items.filter((review) => review.rating === score).length
  }));
  const maxRatingCount = Math.max(...ratingCounts.map((entry) => entry.count), 1);

  return (
    <SitePage className="rounded-none bg-white px-5 py-5">
      <Button asChild className="w-fit" variant="ghost">
        <Link to={APP_ROUTES.models}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回机型库
        </Link>
      </Button>

      <SiteGrid variant="detail">
        <div className="flex flex-col gap-[var(--page-gap)]">
          <SitePanel className="bg-white">
            <SitePanelBody className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[calc(var(--radius-panel)-0.2rem)] border border-border">
                  <img
                    alt={item.name}
                    className="h-[360px] w-full object-cover"
                    src={gallery[activeGalleryIndex] ?? getModelImage(item.slug, item.powerType)}
                  />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {gallery.map((image, index) => (
                    <button
                      className={`overflow-hidden rounded-[calc(var(--radius-control)-0.1rem)] border transition ${
                        activeGalleryIndex === index
                          ? "border-primary shadow-[var(--shadow-soft)]"
                          : "border-border"
                      }`}
                      key={image}
                      onClick={() => setActiveGalleryIndex(index)}
                      type="button"
                    >
                      <img
                        alt={`${item.name}-${index + 1}`}
                        className="h-20 w-full object-cover"
                        src={image}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex h-full flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="eyebrow">精选系列</Badge>
                  <Badge variant="outline">{item.brand.name}</Badge>
                  <Badge variant="outline">{item.category.name}</Badge>
                  <Badge variant="outline">{powerTypeLabels[item.powerType]}</Badge>
                </div>

                <div className="space-y-4">
                  <h1 className="text-[2.4rem] leading-[1.04] font-semibold tracking-[-0.05em] text-foreground">
                    {item.name}
                  </h1>
                  <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
                    <div className="space-y-3">
                      <RatingStars value={reviewPayload.summary.averageScore / 2} />
                      <div className="text-sm text-muted-foreground">
                        {reviewPayload.summary.totalReviews.toLocaleString("zh-CN")} 条点评
                      </div>
                    </div>
                    <span className="text-[2.8rem] font-semibold leading-none text-rating-blue">
                      {reviewPayload.summary.averageScore.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-base leading-8 text-muted-foreground">
                    {item.description ??
                      item.summary ??
                      "查看公开参数、飞友口碑与热门机型对比，用尽量少的切页完成判断。"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      label: "续航",
                      value: item.parameters.maxFlightTimeMinutes
                        ? `${item.parameters.maxFlightTimeMinutes} MIN`
                        : "45 MIN"
                    },
                    {
                      label: "极速",
                      value: item.parameters.maxSpeedKph
                        ? `${item.parameters.maxSpeedKph} KM/H`
                        : "72 KM/H"
                    },
                    {
                      label: "载重",
                      value: item.parameters.takeoffWeightGrams
                        ? `${(item.parameters.takeoffWeightGrams / 1000).toFixed(1)} KG`
                        : "1.2 KG"
                    },
                    {
                      label: "航程",
                      value: item.parameters.maxRangeKilometers
                        ? `${item.parameters.maxRangeKilometers} KM`
                        : "15 KM"
                    }
                  ].map((metric) => (
                    <div className="border border-border bg-muted/15 px-5 py-5" key={metric.label}>
                      <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        {metric.label}
                      </div>
                      <div className="mt-2 text-[2.2rem] font-semibold text-foreground">
                        {metric.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto grid gap-3 sm:grid-cols-2">
                  <Button size="lg" type="button" variant="hero">
                    <HeartIcon data-icon="inline-start" />
                    想买
                  </Button>
                  <Button size="lg" type="button" variant="panel">
                    <MessageSquareTextIcon data-icon="inline-start" />
                    写点评
                  </Button>
                  <Button type="button" variant="outline">
                    <BookmarkIcon data-icon="inline-start" />
                    收藏
                  </Button>
                  <Button type="button" variant="outline">
                    <Share2Icon data-icon="inline-start" />
                    分享
                  </Button>
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel className="bg-white">
            <SitePanelBody className="space-y-8">
              <div>
                <SitePageEyebrow>详细规格</SitePageEyebrow>
                <div className="mt-6 space-y-6">
                  {[
                    {
                      title: "基础信息",
                      rows: [
                        [
                          "重量（含电池）",
                          item.parameters.takeoffWeightGrams
                            ? `${item.parameters.takeoffWeightGrams} g`
                            : "2,490 g"
                        ],
                        ["品牌", item.brand.name],
                        ["分类", item.category.name]
                      ]
                    },
                    {
                      title: "动力系统",
                      rows: [
                        ["动力类型", powerTypeLabels[item.powerType]],
                        [
                          "动力说明",
                          item.powerType === "electric"
                            ? "智能飞行电池 5000mAh"
                            : item.powerType === "other"
                              ? "按提交资料补充"
                              : "高密度复合能源系统"
                        ],
                        [
                          "补充说明",
                          item.description ?? item.summary ?? "查看用户评论获取更多真实体验反馈。"
                        ]
                      ]
                    },
                    {
                      title: "飞行表现",
                      rows: [
                        [
                          "极速",
                          item.parameters.maxSpeedKph
                            ? `${item.parameters.maxSpeedKph} km/h`
                            : "8 m/s"
                        ],
                        [
                          "航程",
                          item.parameters.maxRangeKilometers
                            ? `${item.parameters.maxRangeKilometers} km`
                            : "6,000 m"
                        ],
                        ["是否发布", item.isPublished ? "是" : "否"]
                      ]
                    }
                  ].map((section) => (
                    <div key={section.title}>
                      <div className="text-sm uppercase tracking-[0.24em] text-primary">
                        {section.title}
                      </div>
                      <div className="mt-4 overflow-hidden border border-border">
                        {section.rows.map(([label, value], index) => (
                          <div
                            className={`grid gap-3 px-5 py-4 md:grid-cols-[220px_minmax(0,1fr)] ${
                              index !== section.rows.length - 1 ? "border-b border-border" : ""
                            }`}
                            key={label}
                          >
                            <div className="text-sm text-muted-foreground">{label}</div>
                            <div className="text-sm font-medium leading-7 text-foreground">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>

          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <SitePageEyebrow>用户口碑</SitePageEyebrow>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
                  用户口碑
                </h2>
                <p className="mt-2 text-base leading-8 text-muted-foreground">
                  紧凑评论流与真实飞行反馈
                </p>
              </div>
              <div className="flex gap-4 text-sm">
                <button className="border-b-2 border-primary pb-1 text-primary" type="button">
                  热门
                </button>
                <button className="pb-1 text-muted-foreground" type="button">
                  最新
                </button>
                <button className="pb-1 text-muted-foreground" type="button">
                  评分
                </button>
              </div>
            </div>

            <div className="border border-border bg-white">
              <div className="grid border-b border-border lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="border-r border-border px-6 py-6">
                  <div className="text-[4.25rem] font-semibold leading-none text-foreground">
                    {reviewPayload.summary.averageScore.toFixed(1)}
                  </div>
                  <div className="mt-4">
                    <RatingStars value={reviewPayload.summary.averageScore / 2} />
                  </div>
                  <div className="mt-4 text-sm uppercase tracking-[0.24em] text-muted-foreground">
                    综合评分
                  </div>
                </div>

                <div className="px-6 py-6">
                  <div className="space-y-4">
                    {ratingCounts.map((entry) => (
                      <div
                        className="grid items-center gap-3 sm:grid-cols-[24px_minmax(0,1fr)_48px]"
                        key={entry.score}
                      >
                        <div className="text-sm text-muted-foreground">{entry.score}</div>
                        <div className="h-3 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-rating-orange"
                            style={{ width: `${(entry.count / maxRatingCount) * 100}%` }}
                          />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {reviewPayload.summary.totalReviews
                            ? `${Math.round((entry.count / reviewPayload.summary.totalReviews) * 100)}%`
                            : "0%"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="border-r border-border px-6 py-6">
                  <div className="text-2xl font-semibold text-foreground">写点评</div>
                  <div className="mt-4">
                    <RatingStars
                      onSelect={(value) => {
                        setFormState((current) => updateReviewRating(current, value));
                      }}
                      value={formState.rating}
                    />
                  </div>
                  {replyTarget ? (
                    <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                      <span>正在回复 @{replyTarget}</span>
                      <button
                        className="text-destructive"
                        onClick={() => {
                          setReplyTarget(null);
                          setFormState((current) => updateReviewContent(current, ""));
                        }}
                        type="button"
                      >
                        <XIcon className="size-4" />
                      </button>
                    </div>
                  ) : null}
                  <Textarea
                    className="mt-4 min-h-32 rounded-none border-border"
                    onChange={(event) => {
                      setFormState((current) => updateReviewContent(current, event.target.value));
                    }}
                    placeholder={
                      replyTarget
                        ? `回复 @${replyTarget}`
                        : "比如：避障系统在密林和近距绕飞中表现如何？"
                    }
                    value={formState.content}
                  />

                  {submitError ? (
                    <Alert className="mt-4" variant="destructive">
                      <AlertTitle>提交失败</AlertTitle>
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  ) : null}

                  {!isAuthenticated ? (
                    <Alert className="mt-4">
                      <AlertTitle>登录后可写点评</AlertTitle>
                      <AlertDescription>当前未登录，只能浏览已有评分与公开评论。</AlertDescription>
                    </Alert>
                  ) : null}

                  <Button
                    className="mt-4 w-full"
                    disabled={!isAuthenticated || !isReviewFormValid(formState) || isSubmitting}
                    onClick={() => {
                      setSubmitError(null);
                      setIsSubmitting(true);

                      void apiClient
                        .submitModelReview(slug, buildSubmitReviewInput(formState))
                        .then(() => {
                          setReplyTarget(null);
                          setFormState((current) => ({ ...current, dirty: false }));
                          void reviewsQuery.refetch();
                        })
                        .catch((reason: unknown) => {
                          setSubmitError(
                            reason instanceof Error ? reason.message : "提交点评失败"
                          );
                        })
                        .finally(() => {
                          setIsSubmitting(false);
                        });
                    }}
                    type="button"
                    variant="hero"
                  >
                    <MessageSquareTextIcon data-icon="inline-start" />
                    {isSubmitting ? "提交中..." : "提交 / 更新点评"}
                  </Button>
                </div>

                <div className="min-w-0">
                  {reviewPayload.items.length > 0 ? (
                    reviewPayload.items.map((review) => (
                      <div className="border-b border-border px-6 py-5 last:border-b-0" key={review.id}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar>
                              <AvatarImage
                                alt={review.author.displayName}
                                src={getAvatarImage(review.author.id)}
                              />
                              <AvatarFallback>{review.author.displayName.slice(0, 1)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground">
                                {review.author.displayName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(review.updatedAt).toLocaleString("zh-CN", {
                                  hour12: false
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <RatingStars value={review.rating} />
                            <button
                              className="text-xs text-primary"
                              onClick={() => {
                                setReplyTarget(review.author.displayName);
                                setFormState((current) =>
                                  updateReviewContent(
                                    current,
                                    current.content.startsWith(`@${review.author.displayName}`)
                                      ? current.content
                                      : `@${review.author.displayName} ${current}`.trim()
                                  )
                                );
                              }}
                              type="button"
                            >
                              回复
                            </button>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-foreground/78">
                          {review.content ?? "该用户只做了快速评分，没有补充文字。"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="px-6 py-6 text-sm text-muted-foreground">
                      还没有公开点评，欢迎留下第一条真实口碑。
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <SiteRail>
          <SitePanel variant="muted">
            <SitePanelBody className="space-y-4">
              <SitePageEyebrow className="text-primary">热门机型</SitePageEyebrow>
              {hotModels.map((model, index) => (
                <Link
                  className="flex items-center gap-3 rounded-[calc(var(--radius-control)+0.05rem)] bg-background/72 p-3 transition hover:bg-secondary/42"
                  key={model.slug}
                  to={APP_ROUTES.modelDetail.replace(":slug", model.slug)}
                >
                  <img
                    alt={model.name}
                    className="h-16 w-20 rounded-[calc(var(--radius-control)-0.1rem)] object-cover"
                    src={getModelImage(model.slug, model.powerType, index)}
                  />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{model.name}</div>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">{model.brand.name}</span>
                      <span className="font-semibold text-rating-blue">
                        {model.ratingSummary.averageScore.toFixed(1)}
                      </span>
                    </div>
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
