import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowLeftIcon, BookmarkIcon, HeartIcon, MessageSquareTextIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DetailPageSkeleton } from "@/components/page-skeletons";
import { ProfileLink } from "@/components/profile-link";
import {
  SiteGrid,
  SitePage,
  SitePageDescription,
  SitePageEyebrow,
  SitePageHead,
  SitePageTitle,
  SitePanel,
  SitePanelBody,
  SiteRail
} from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        <div className="text-[0.8rem] font-semibold text-foreground">评论回复</div>
        <button
          className="text-[0.72rem] text-primary"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? "收起回复" : "查看回复"}
        </button>
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
          placeholder={replyTarget ? `回复 @${replyTarget.displayName}` : "继续补充这条评论..."}
          value={content}
        />
      ) : expanded ? (
        <Button
          className="w-full"
          onClick={() => {
            promptLogin({
              title: "登录后才能回复评论",
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
  const currentUserId = useAuthStore((state) => state.user?.id);
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

  useEffect(() => {
    setFormState((current) => syncReviewFormState(current, reviewsQuery.data?.summary.myReview ?? null));
  }, [reviewsQuery.data?.summary.myReview]);

  if (!slug) {
    return (
      <Alert variant="destructive">
        <AlertTitle>缺少机型标识</AlertTitle>
        <AlertDescription>当前页面无法确定要查看哪一款机型。</AlertDescription>
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
        <AlertTitle>评论数据加载失败</AlertTitle>
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
        <AlertDescription>这款机型暂时没有公开参数或评论。</AlertDescription>
      </Alert>
    );
  }

  const gallery = getModelGallery(item.slug, item.powerType, 4);
  const hotModels =
    hotModelsQuery.data?.items.filter((model) => model.slug !== item.slug).slice(0, 3) ?? [];

  const metrics = [
    {
      label: "续航",
      value: item.parameters.maxFlightTimeMinutes ? `${item.parameters.maxFlightTimeMinutes} 分钟` : "45 分钟"
    },
    {
      label: "极速",
      value: item.parameters.maxSpeedKph ? `${item.parameters.maxSpeedKph} km/h` : "72 km/h"
    },
    {
      label: "起飞重量",
      value: item.parameters.takeoffWeightGrams
        ? `${(item.parameters.takeoffWeightGrams / 1000).toFixed(1)} kg`
        : "1.2 kg"
    },
    {
      label: "航程",
      value: item.parameters.maxRangeKilometers ? `${item.parameters.maxRangeKilometers} km` : "15 km"
    }
  ];

  const specSections = [
    {
      title: "基础信息",
      rows: [
        ["品牌", item.brand.name],
        ["分类", item.category.name],
        ["动力", powerTypeLabels[item.powerType]],
        ["状态", item.isPublished ? "已发布" : "未发布"]
      ]
    },
    {
      title: "参数表现",
      rows: [
        ["最大飞行时长", item.parameters.maxFlightTimeMinutes ? `${item.parameters.maxFlightTimeMinutes} 分钟` : "-"],
        ["最大速度", item.parameters.maxSpeedKph ? `${item.parameters.maxSpeedKph} km/h` : "-"],
        ["最大航程", item.parameters.maxRangeKilometers ? `${item.parameters.maxRangeKilometers} km` : "-"],
        ["起飞重量", item.parameters.takeoffWeightGrams ? `${item.parameters.takeoffWeightGrams} g` : "-"]
      ]
    }
  ];

  return (
    <SitePage className="mx-auto w-full max-w-[72rem] gap-4">
      <Button asChild className="w-fit" variant="ghost">
        <Link to={APP_ROUTES.models}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回机型库
        </Link>
      </Button>

      <SiteGrid variant="detail">
        <div className="flex min-w-0 flex-col gap-4">
          <SitePageHead>
            <SitePageEyebrow>机型详情</SitePageEyebrow>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{item.brand.name}</Badge>
              <Badge variant="outline">{item.category.name}</Badge>
              <Badge variant="outline">{powerTypeLabels[item.powerType]}</Badge>
            </div>
            <SitePageTitle className="text-[1.95rem] md:text-[2.4rem]">{item.name}</SitePageTitle>
            <SitePageDescription>{item.description ?? item.summary ?? "查看参数、图集与真实评论。"}</SitePageDescription>
          </SitePageHead>

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
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {metrics.map((metric) => (
                    <div
                      className="rounded-[calc(var(--radius-control)-0.05rem)] border border-border bg-muted/15 px-4 py-3.5"
                      key={metric.label}
                    >
                      <div className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {metric.label}
                      </div>
                      <div className="mt-1.5 text-[1.3rem] font-semibold leading-none text-foreground">
                        {metric.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-[calc(var(--radius-control)-0.05rem)] border border-border bg-surface-1 p-3">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <Button
                      onClick={() => {
                        promptLogin({
                          title: "登录后才能互动",
                          description: "想进一步互动请先登录。"
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
                        document.getElementById("model-comments")?.scrollIntoView({
                          behavior: "smooth",
                          block: "start"
                        });
                      }}
                      size="sm"
                      type="button"
                      variant="panel"
                    >
                      <MessageSquareTextIcon data-icon="inline-start" />
                      去评论区
                    </Button>
                  </div>
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    <Button disabled size="sm" type="button" variant="outline">
                      <BookmarkIcon data-icon="inline-start" />
                      收藏功能开发中
                    </Button>
                    <div className="flex items-center justify-center rounded-[var(--radius-control)] border border-dashed border-border/70 px-3 text-sm text-muted-foreground">
                      分享功能稍后开放
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

          <section className="space-y-4" id="model-comments">
            <div className="space-y-1">
              <SitePageEyebrow>用户评论</SitePageEyebrow>
              <h2 className="text-[1.55rem] font-semibold tracking-tight text-foreground">评论区</h2>
              <div className="text-sm text-muted-foreground">
                共 {reviewPayload.summary.totalReviews.toLocaleString("zh-CN")} 条公开评论
              </div>
            </div>

            <div className="overflow-hidden rounded-[0.95rem] border border-border bg-white">
              <div className="grid gap-6 border-b border-border px-5 py-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
                <div className="space-y-3">
                  <div className="text-[1.1rem] font-semibold text-foreground">写评论</div>
                  <div className="text-sm leading-6 text-muted-foreground">
                    当前只保留文字评论与回复，不再展示星级或评分摘要。
                  </div>

                  {submitError ? (
                    <Alert variant="destructive">
                      <AlertTitle>提交失败</AlertTitle>
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  ) : null}

                  {!isAuthenticated ? (
                    <Button
                      className="w-full"
                      onClick={() => {
                        promptLogin({
                          title: "登录后才能发表评论",
                          description: "评论前请先登录。"
                        });
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      登录后评论
                    </Button>
                  ) : (
                    <InlineCommentComposer
                      busy={isSubmitting}
                      disabled={isSubmitting || !isReviewFormValid(formState)}
                      onChange={(value) => {
                        setFormState((current) => updateReviewContent(current, value));
                      }}
                      onSubmit={() => {
                        setSubmitError(null);
                        setIsSubmitting(true);

                        void apiClient
                          .submitModelReview(slug, buildSubmitReviewInput(formState))
                          .then(() => {
                            setFormState((current) => ({ ...current, dirty: false }));
                            void reviewsQuery.refetch();
                          })
                          .catch((reason: unknown) => {
                            setSubmitError(reason instanceof Error ? reason.message : "提交评论失败");
                          })
                          .finally(() => {
                            setIsSubmitting(false);
                          });
                      }}
                      placeholder="写下你的使用体验..."
                      value={formState.content}
                    />
                  )}
                </div>

                <div className="space-y-4">
                  {reviewPayload.items.length > 0 ? (
                    reviewPayload.items.map((review) => (
                      <div className="rounded-[0.9rem] border border-border/70 bg-background/60 px-4 py-4" key={review.id}>
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
                                {new Date(review.updatedAt).toLocaleString("zh-CN", { hour12: false })}
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="mt-2.5 text-[0.82rem] leading-6 text-foreground/78">
                          {review.content ?? "这条评论暂未填写正文。"}
                        </p>
                        <ReviewCommentSection
                          canInteract={isAuthenticated}
                          currentUserId={currentUserId}
                          reviewId={review.id}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="px-1 py-1 text-[0.82rem] text-muted-foreground">还没有公开评论。</div>
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
                  className="grid grid-cols-[58px_minmax(0,1fr)] items-center gap-2.5 rounded-[calc(var(--radius-control)-0.05rem)] border border-transparent p-1.5 transition hover:border-primary/18 hover:bg-background"
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
