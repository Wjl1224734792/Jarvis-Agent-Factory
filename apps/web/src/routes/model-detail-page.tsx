import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowLeftIcon, BookmarkIcon, HeartIcon, MessageSquareTextIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DetailPageSkeleton } from "@/components/page-skeletons";
import { ProfileLink } from "@/components/profile-link";
import { RatingBreakdown } from "@/components/rating-breakdown";
import { RatingStars, toFiveStarRating } from "@/components/rating-stars";
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
import { InlineCommentComposer } from "@/features/posts/inline-comment-composer";
import { useAuthStore } from "../features/auth/auth-store";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
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

function ReviewCommentSection(props: {
  reviewId: string;
  currentUserId?: string;
  canInteract: boolean;
}) {
  const promptLogin = useLoginPrompt();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ id: string; displayName: string } | null>(null);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commentsQuery = useQuery({
    queryKey: ["review-comments", props.reviewId],
    queryFn: () => apiClient.listReviewComments(props.reviewId),
    enabled: expanded
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["review-comments", props.reviewId] });
  }

  return (
    <div className="mt-4 space-y-3 rounded-[0.85rem] border border-border/70 bg-background/70 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[0.8rem] font-semibold text-foreground">点评回复</div>
        <div className="flex items-center gap-3">
          {commentsQuery.isFetching && commentsQuery.data ? (
            <div className="text-[0.72rem] text-muted-foreground">正在更新...</div>
          ) : null}
          <button
            className="text-[0.72rem] text-primary"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            {expanded ? "收起回复" : "查看回复"}
          </button>
        </div>
      </div>

      {expanded && commentsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div className="flex items-start gap-3" key={index}>
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {expanded && commentsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>回复加载失败</AlertTitle>
          <AlertDescription>{commentsQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {expanded && commentsQuery.data?.items.length ? (
        <div className="space-y-3">
          {commentsQuery.data.items.map((comment) => (
            <div className="border-b border-border/70 pb-3 last:border-b-0 last:pb-0" key={comment.id}>
              <div className="flex items-start gap-3">
                <ProfileLink userId={comment.author.id}>
                  <Avatar size="sm">
                    <AvatarImage alt={comment.author.displayName} src={getAvatarImage(comment.author.id)} />
                    <AvatarFallback>{comment.author.displayName.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                </ProfileLink>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <ProfileLink className="font-medium text-foreground hover:text-primary" userId={comment.author.id}>
                      {comment.author.displayName}
                    </ProfileLink>
                    {comment.replyToUser ? (
                      <span className="text-[0.72rem] text-primary">@{comment.replyToUser.displayName}</span>
                    ) : null}
                    <span className="text-[0.72rem] text-muted-foreground">
                      {new Date(comment.updatedAt).toLocaleString("zh-CN", { hour12: false })}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-foreground/80">{comment.content}</p>
                  <div className="flex items-center gap-3">
                    {props.canInteract ? (
                      <button
                        className="text-[0.72rem] text-primary"
                        onClick={() => {
                          setReplyTarget({ id: comment.id, displayName: comment.author.displayName });
                          setContent(`@${comment.author.displayName} `);
                        }}
                        type="button"
                      >
                        回复
                      </button>
                    ) : null}
                    {props.currentUserId === comment.author.id ? (
                      <button
                        className="inline-flex items-center gap-1 text-[0.72rem] text-muted-foreground"
                        onClick={() => {
                          setBusy(true);
                          setError(null);
                          void apiClient
                            .deleteReviewComment(props.reviewId, comment.id)
                            .then(refresh)
                            .catch((reason: unknown) => {
                              setError(reason instanceof Error ? reason.message : "删除回复失败");
                            })
                            .finally(() => {
                              setBusy(false);
                            });
                        }}
                        type="button"
                      >
                        <Trash2Icon className="size-3.5" />
                        删除
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {comment.replies.length > 0 ? (
                <div className="mt-3 space-y-3 border-l border-border/70 pl-4">
                  {comment.replies.map((reply) => (
                    <div className="flex items-start gap-3" key={reply.id}>
                      <ProfileLink userId={reply.author.id}>
                        <Avatar size="sm">
                          <AvatarImage alt={reply.author.displayName} src={getAvatarImage(reply.author.id)} />
                          <AvatarFallback>{reply.author.displayName.slice(0, 1)}</AvatarFallback>
                        </Avatar>
                      </ProfileLink>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                          <ProfileLink className="font-medium text-foreground hover:text-primary" userId={reply.author.id}>
                            {reply.author.displayName}
                          </ProfileLink>
                          {reply.replyToUser ? (
                            <span className="text-[0.72rem] text-primary">@{reply.replyToUser.displayName}</span>
                          ) : null}
                          <span className="text-[0.72rem] text-muted-foreground">
                            {new Date(reply.updatedAt).toLocaleString("zh-CN", { hour12: false })}
                          </span>
                        </div>
                        <p className="text-sm leading-6 text-foreground/80">{reply.content}</p>
                        <div className="flex items-center gap-3">
                          {props.canInteract ? (
                            <button
                              className="text-[0.72rem] text-primary"
                              onClick={() => {
                                setReplyTarget({ id: reply.id, displayName: reply.author.displayName });
                                setContent(`@${reply.author.displayName} `);
                              }}
                              type="button"
                            >
                              回复
                            </button>
                          ) : null}
                          {props.currentUserId === reply.author.id ? (
                            <button
                              className="inline-flex items-center gap-1 text-[0.72rem] text-muted-foreground"
                              onClick={() => {
                                setBusy(true);
                                setError(null);
                                void apiClient
                                  .deleteReviewComment(props.reviewId, reply.id)
                                  .then(refresh)
                                  .catch((reason: unknown) => {
                                    setError(reason instanceof Error ? reason.message : "删除回复失败");
                                  })
                                  .finally(() => {
                                    setBusy(false);
                                  });
                              }}
                              type="button"
                            >
                              <Trash2Icon className="size-3.5" />
                              删除
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {expanded && !commentsQuery.isLoading && !commentsQuery.isError && commentsQuery.data?.items.length === 0 ? (
        <div className="text-[0.8rem] text-muted-foreground">还没有回复，欢迎继续交流。</div>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>回复操作失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {expanded && props.canInteract ? (
        <div className="space-y-2">
          {replyTarget ? (
            <div className="text-[0.72rem] text-muted-foreground">正在回复 @{replyTarget.displayName}</div>
          ) : null}
          <InlineCommentComposer
            busy={busy}
            disabled={busy}
            onChange={setContent}
            onSubmit={() => {
              if (!content.trim()) {
                return;
              }

              setBusy(true);
              setError(null);
              void apiClient
                .createReviewComment(props.reviewId, {
                  content,
                  parentCommentId: replyTarget?.id
                })
                .then(() => {
                  setContent("");
                  setReplyTarget(null);
                  return refresh();
                })
                .catch((reason: unknown) => {
                  setError(reason instanceof Error ? reason.message : "提交回复失败");
                })
                .finally(() => {
                  setBusy(false);
                });
            }}
            placeholder={replyTarget ? `回复 @${replyTarget.displayName}` : "继续补充这条点评..."}
            value={content}
          />
        </div>
      ) : expanded ? (
        <Button
          className="w-full"
          onClick={() => {
            promptLogin({
              title: "登录后才能回复点评",
              description: "回复前请先登录。"
            });
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          登录后回复
        </Button>
      ) : null}
    </div>
  );
}

export function ModelDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated";
  const promptLogin = useLoginPrompt();

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
  const currentUserId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    setFormState((current) => syncReviewFormState(current, reviewsQuery.data?.summary.myReview ?? null));
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
        <AlertDescription>这台机型暂时没有公开参数或口碑。</AlertDescription>
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

  const metrics = [
    {
      label: "续航",
      value: item.parameters.maxFlightTimeMinutes ? `${item.parameters.maxFlightTimeMinutes} MIN` : "45 MIN"
    },
    {
      label: "极速",
      value: item.parameters.maxSpeedKph ? `${item.parameters.maxSpeedKph} KM/H` : "72 KM/H"
    },
    {
      label: "载重",
      value: item.parameters.takeoffWeightGrams
        ? `${(item.parameters.takeoffWeightGrams / 1000).toFixed(1)} KG`
        : "1.2 KG"
    },
    {
      label: "航程",
      value: item.parameters.maxRangeKilometers ? `${item.parameters.maxRangeKilometers} KM` : "15 KM"
    }
  ];

  const specSections = [
    {
      title: "基础信息",
      rows: [
        [
          "重量（含电池）",
          item.parameters.takeoffWeightGrams ? `${item.parameters.takeoffWeightGrams} g` : "2,490 g"
        ],
        ["品牌", item.brand.name],
        ["分类", item.category.name],
        ["动力", powerTypeLabels[item.powerType]]
      ]
    },
    {
      title: "飞行表现",
      rows: [
        ["极速", item.parameters.maxSpeedKph ? `${item.parameters.maxSpeedKph} km/h` : "8 m/s"],
        ["航程", item.parameters.maxRangeKilometers ? `${item.parameters.maxRangeKilometers} km` : "6,000 m"],
        ["状态", item.isPublished ? "已发布" : "未发布"]
      ]
    }
  ];

  return (
    <SitePage className="bg-white px-4 py-4 md:px-5">
      <Button asChild className="w-fit" variant="ghost">
        <Link to={APP_ROUTES.models}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回机型库
        </Link>
      </Button>

      <SiteGrid variant="detail">
        <div className="flex flex-col gap-[var(--page-gap)]">
          <SitePanel className="bg-white">
            <SitePanelBody className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-3">
                <div className="overflow-hidden rounded-[calc(var(--radius-panel)-0.15rem)] border border-border">
                  <img
                    alt={item.name}
                    className="h-[300px] w-full object-cover md:h-[330px]"
                    src={gallery[activeGalleryIndex] ?? getModelImage(item.slug, item.powerType)}
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {gallery.map((image, index) => (
                    <button
                      className={`overflow-hidden rounded-[calc(var(--radius-control)-0.12rem)] border transition ${
                        activeGalleryIndex === index
                          ? "border-primary shadow-[var(--shadow-soft)]"
                          : "border-border"
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

              <div className="flex h-full flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="eyebrow">精选系列</Badge>
                  <Badge variant="outline">{item.brand.name}</Badge>
                  <Badge variant="outline">{item.category.name}</Badge>
                  <Badge variant="outline">{powerTypeLabels[item.powerType]}</Badge>
                </div>

                <div className="space-y-3 border-b border-border/75 pb-3.5">
                  <h1 className="text-[2rem] leading-[1.02] font-semibold tracking-[-0.05em] text-foreground">
                    {item.name}
                  </h1>
                  <div className="flex items-end justify-between gap-4">
                    <div className="space-y-1.5">
                      <RatingStars size="sm" value={toFiveStarRating(reviewPayload.summary.averageScore)} />
                      <div className="text-[0.78rem] text-muted-foreground">
                        {reviewPayload.summary.totalReviews.toLocaleString("zh-CN")} 条点评
                      </div>
                    </div>
                    <span className="text-[2.45rem] font-semibold leading-none text-rating-blue">
                      {reviewPayload.summary.averageScore.toFixed(1)}
                    </span>
                  </div>
                  {item.description ?? item.summary ? (
                    <p className="text-[0.9rem] leading-6 text-foreground/72">
                      {item.description ?? item.summary}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {metrics.map((metric) => (
                    <div
                      className="rounded-[calc(var(--radius-control)-0.05rem)] border border-border bg-muted/15 px-4 py-3.5"
                      key={metric.label}
                    >
                      <div className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {metric.label}
                      </div>
                      <div className="mt-1.5 text-[1.6rem] font-semibold leading-none text-foreground">
                        {metric.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto rounded-[calc(var(--radius-control)-0.05rem)] border border-border bg-surface-1 p-3">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <Button
                      onClick={() => {
                        promptLogin({
                          title: "登录后才能互动",
                          description: "想买前请先登录。"
                        });
                      }}
                      size="sm"
                      type="button"
                      variant="hero"
                    >
                      <HeartIcon data-icon="inline-start" />
                      想买
                    </Button>
                    <Button
                      onClick={() => {
                        if (
                          !promptLogin({
                            title: "登录后才能写点评",
                            description: "点评前请先登录。"
                          })
                        ) {
                          return;
                        }
                        document.getElementById("model-reviews")?.scrollIntoView({
                          behavior: "smooth",
                          block: "start"
                        });
                      }}
                      size="sm"
                      type="button"
                      variant="panel"
                    >
                      <MessageSquareTextIcon data-icon="inline-start" />
                      写点评
                    </Button>
                  </div>
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    <Button
                      disabled
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <BookmarkIcon data-icon="inline-start" />
                      收藏功能开发中
                    </Button>
                    <div className="flex items-center justify-center rounded-[var(--radius-control)] border border-dashed border-border/70 px-3 text-sm text-muted-foreground">
                      分享功能暂未开放
                    </div>
                  </div>
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel className="bg-white">
            <SitePanelBody className="space-y-6">
              <div>
                <SitePageEyebrow>详细规格</SitePageEyebrow>
                <div className="mt-5 space-y-5">
                  {specSections.map((section) => (
                    <div key={section.title}>
                      <div className="text-[0.78rem] font-semibold uppercase tracking-[0.2em] text-primary">
                        {section.title}
                      </div>
                      <div className="mt-3 overflow-hidden rounded-[0.9rem] border border-border">
                        {section.rows.map(([label, value], index) => (
                          <div
                            className={`grid gap-2 px-4 py-3 md:grid-cols-[180px_minmax(0,1fr)] ${
                              index !== section.rows.length - 1 ? "border-b border-border" : ""
                            }`}
                            key={label}
                          >
                            <div className="text-[0.8rem] text-muted-foreground">{label}</div>
                            <div className="text-[0.82rem] font-medium leading-6 text-foreground">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>

          <section className="space-y-4" id="model-reviews">
            <div className="space-y-1">
              <SitePageEyebrow>用户口碑</SitePageEyebrow>
              <h2 className="text-[1.55rem] font-semibold tracking-tight text-foreground">用户口碑</h2>
            </div>

            <div className="overflow-hidden rounded-[0.95rem] border border-border bg-white">
              <div className="grid border-b border-border lg:grid-cols-[240px_minmax(0,1fr)]">
                <div className="border-r border-border px-5 py-5">
                  <div className="text-[3.4rem] font-semibold leading-none text-foreground">
                    {reviewPayload.summary.averageScore.toFixed(1)}
                  </div>
                  <div className="mt-3">
                    <RatingStars size="sm" value={toFiveStarRating(reviewPayload.summary.averageScore)} />
                  </div>
                  <div className="mt-3 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    综合评分
                  </div>
                </div>

                <div className="px-5 py-5">
                  <RatingBreakdown entries={ratingCounts} totalCount={reviewPayload.summary.totalReviews} />
                </div>
              </div>

              <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
                <div className="border-r border-border px-5 py-5">
                  <div className="text-[1.1rem] font-semibold text-foreground">写点评</div>
                  <div className="mt-3">
                    <RatingStars
                      onSelect={(value) => {
                        setFormState((current) => updateReviewRating(current, value));
                      }}
                      size="md"
                      value={formState.rating}
                    />
                  </div>
                  <Textarea
                    className="mt-3 min-h-28 border-border"
                    onChange={(event) => {
                      setFormState((current) => updateReviewContent(current, event.target.value));
                    }}
                    placeholder="写下你的使用感受..."
                    value={formState.content}
                  />

                  {submitError ? (
                    <Alert className="mt-3" variant="destructive">
                      <AlertTitle>提交失败</AlertTitle>
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  ) : null}

                  {!isAuthenticated ? (
                    <Button
                      className="mt-3 w-full"
                      onClick={() => {
                        promptLogin({
                          title: "登录后才能写点评",
                          description: "点评前请先登录。"
                        });
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      登录后写点评
                    </Button>
                  ) : null}

                  <Button
                    className="mt-3 w-full"
                    disabled={!isAuthenticated || !isReviewFormValid(formState) || isSubmitting}
                    onClick={() => {
                      setSubmitError(null);
                      setIsSubmitting(true);

                      void apiClient
                        .submitModelReview(slug, buildSubmitReviewInput(formState))
                        .then(() => {
                          setFormState((current) => ({ ...current, dirty: false }));
                          void reviewsQuery.refetch();
                        })
                        .catch((reason: unknown) => {
                          setSubmitError(reason instanceof Error ? reason.message : "提交点评失败");
                        })
                        .finally(() => {
                          setIsSubmitting(false);
                        });
                    }}
                    size="sm"
                    type="button"
                    variant="hero"
                  >
                    <MessageSquareTextIcon data-icon="inline-start" />
                    {isSubmitting ? "提交中..." : "提交点评"}
                  </Button>
                </div>

                <div className="min-w-0">
                  {reviewPayload.items.length > 0 ? (
                    reviewPayload.items.map((review) => (
                      <div className="border-b border-border px-5 py-4 last:border-b-0" key={review.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <ProfileLink userId={review.author.id}>
                              <Avatar size="sm">
                                <AvatarImage alt={review.author.displayName} src={getAvatarImage(review.author.id)} />
                                <AvatarFallback>{review.author.displayName.slice(0, 1)}</AvatarFallback>
                              </Avatar>
                            </ProfileLink>
                            <div className="min-w-0">
                              <ProfileLink className="font-medium text-foreground hover:text-primary" userId={review.author.id}>
                                {review.author.displayName}
                              </ProfileLink>
                              <div className="text-[0.72rem] text-muted-foreground">
                                {new Date(review.updatedAt).toLocaleString("zh-CN", {
                                  hour12: false
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <RatingStars size="xs" value={review.rating} />
                            <span className="text-[0.72rem] text-muted-foreground">
                              继续交流见下方回复区
                            </span>
                          </div>
                        </div>
                        <p className="mt-2.5 text-[0.82rem] leading-6 text-foreground/78">
                          {review.content ?? "只做了快速评分。"}
                        </p>
                        <ReviewCommentSection
                          canInteract={isAuthenticated}
                          currentUserId={currentUserId}
                          reviewId={review.id}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="px-5 py-5 text-[0.82rem] text-muted-foreground">还没有公开点评。</div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <SiteRail>
          <SitePanel variant="muted">
            <SitePanelBody className="space-y-2.5">
              <SitePageEyebrow className="text-primary">热门机型</SitePageEyebrow>
              {hotModels.map((model, index) => (
                <Link
                  className="grid grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[calc(var(--radius-control)-0.05rem)] border border-transparent p-1.5 transition hover:border-primary/18 hover:bg-background"
                  key={model.slug}
                  to={APP_ROUTES.modelDetail.replace(":slug", model.slug)}
                >
                  <img
                    alt={model.name}
                    className="h-[58px] w-full rounded-[calc(var(--radius-control)-0.15rem)] object-cover"
                    src={getModelImage(model.slug, model.powerType, index)}
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="truncate text-[0.84rem] font-semibold text-foreground">{model.name}</div>
                    <div className="text-[0.72rem] text-muted-foreground">{model.brand.name}</div>
                    <RatingStars size="xs" value={toFiveStarRating(model.ratingSummary.averageScore)} />
                  </div>
                  <div className="text-right">
                    <div className="text-[1.3rem] font-semibold leading-none text-rating-blue">
                      {model.ratingSummary.averageScore.toFixed(1)}
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
