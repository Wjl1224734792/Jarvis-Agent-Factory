import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  ArrowLeftIcon,
  BookmarkIcon,
  HeartIcon,
  MessageSquareTextIcon,
  RadioTowerIcon,
  StarIcon
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "../features/auth/auth-store";
import { apiClient } from "../lib/api-client";
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
  hybrid: "混动"
} as const;

function ReviewStars({
  rating,
  onSelect
}: {
  rating: number;
  onSelect?: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          className="rounded-full p-1 text-amber-500"
          key={value}
          onClick={() => {
            onSelect?.(value);
          }}
          type="button"
        >
          <StarIcon
            className="size-5"
            fill={value <= rating ? "currentColor" : "none"}
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

  const [formState, setFormState] = useState<ReviewFormState>(() =>
    createReviewFormState(null)
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

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
    return (
      <Card className="rounded-[1.125rem] border-border/80">
        <CardContent className="px-6 py-8 text-sm text-muted-foreground">
          正在加载机型详情与用户点评...
        </CardContent>
      </Card>
    );
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

  return (
    <main className="flex flex-col gap-8">
      <Button asChild className="w-fit" variant="ghost">
        <Link to={APP_ROUTES.models}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回机型库
        </Link>
      </Button>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-5 rounded-[1.25rem] bg-card px-6 py-7 ring-1 ring-border/80 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{item.brand.name}</Badge>
            <Badge variant="outline">{item.category.name}</Badge>
            <Badge variant="outline">{powerTypeLabels[item.powerType]}</Badge>
          </div>

          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {item.name}
            </h1>
            <p className="mt-4 text-base leading-8 text-muted-foreground">
              {item.description ??
                item.summary ??
                "查看核心参数、真实口碑和当前公开的社区评价，帮助你更快完成判断。"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline">
              <BookmarkIcon data-icon="inline-start" />
              收藏
            </Button>
            <Button type="button" variant="outline">
              <HeartIcon data-icon="inline-start" />
              想买
            </Button>
          </div>
        </div>

        <Card className="rounded-[1.25rem] border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl">{reviewPayload.summary.averageScore.toFixed(1)} / 10</CardTitle>
            <CardDescription>共 {reviewPayload.summary.totalReviews} 条有效点评</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-xl bg-secondary/45 p-4">
              <RadioTowerIcon className="mt-0.5 size-4.5 text-primary" />
              <div>
                <div className="text-sm font-medium text-foreground">当前口碑状态</div>
                <div className="mt-2 text-sm leading-7 text-muted-foreground">
                  {reviewPayload.summary.totalReviews > 0
                    ? "已有真实口碑可参考。先看评分，再读用户补充说明。"
                    : "还没有公开点评，欢迎留下第一条真实口碑。"}
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/80 bg-card p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">最大飞行时间</div>
                <div className="mt-3 text-base font-medium text-foreground">
                  {item.parameters.maxFlightTimeMinutes
                    ? `${item.parameters.maxFlightTimeMinutes} 分钟`
                    : "待补充"}
                </div>
              </div>
              <div className="rounded-lg border border-border/80 bg-card p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">最大续航距离</div>
                <div className="mt-3 text-base font-medium text-foreground">
                  {item.parameters.maxRangeKilometers
                    ? `${item.parameters.maxRangeKilometers} km`
                    : "待补充"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <Tabs
          className="gap-0"
          onValueChange={(value) => {
            setActiveTab(value);
          }}
          value={activeTab}
        >
          <TabsList variant="default">
            <TabsTrigger value="overview">参数</TabsTrigger>
            <TabsTrigger value="reviews">点评</TabsTrigger>
          </TabsList>
        </Tabs>
      </section>

      {activeTab === "overview" ? (
        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <Card className="rounded-[1.125rem] border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">核心参数</CardTitle>
              <CardDescription>先看最常用的判断项。</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {[
                ["动力类型", powerTypeLabels[item.powerType]],
                ["品牌", item.brand.name],
                ["分类", item.category.name],
                [
                  "起飞重量",
                  item.parameters.takeoffWeightGrams
                    ? `${item.parameters.takeoffWeightGrams} g`
                    : "待补充"
                ]
              ].map(([label, value], index, array) => (
                <div key={label}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-sm text-muted-foreground">{label}</div>
                    <div className="text-sm font-medium text-foreground">{value}</div>
                  </div>
                  {index < array.length - 1 ? <Separator className="mt-4" /> : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[1.125rem] border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">详细参数</CardTitle>
              <CardDescription>当前已公开的机型基础字段都收在这里。</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {[
                [
                  "最大速度",
                  item.parameters.maxSpeedKph ? `${item.parameters.maxSpeedKph} km/h` : "待补充"
                ],
                [
                  "最大续航距离",
                  item.parameters.maxRangeKilometers
                    ? `${item.parameters.maxRangeKilometers} km`
                    : "待补充"
                ],
                [
                  "最大飞行时间",
                  item.parameters.maxFlightTimeMinutes
                    ? `${item.parameters.maxFlightTimeMinutes} 分钟`
                    : "待补充"
                ],
                ["发布状态", item.isPublished ? "已发布" : "未发布"]
              ].map(([label, value], index, array) => (
                <div key={label}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-sm text-muted-foreground">{label}</div>
                    <div className="text-sm font-medium text-foreground">{value}</div>
                  </div>
                  {index < array.length - 1 ? <Separator className="mt-4" /> : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="rounded-[1.125rem] border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">写点评</CardTitle>
              <CardDescription>说出最打动你的地方，也可以只做快速评分。</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ReviewStars
                onSelect={(value) => {
                  setFormState((current) => updateReviewRating(current, value));
                }}
                rating={formState.rating}
              />
              <Textarea
                className="min-h-28"
                onChange={(event) => {
                  setFormState((current) => updateReviewContent(current, event.target.value));
                }}
                placeholder="比如：续航稳定、控制逻辑清晰、适合新手上手。"
                value={formState.content}
              />

              {submitError ? (
                <Alert variant="destructive">
                  <AlertTitle>提交失败</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              ) : null}

              {authStatus !== "authenticated" ? (
                <Alert>
                  <AlertTitle>登录后可写点评</AlertTitle>
                  <AlertDescription>当前未登录，只能浏览已有评分与公开评论。</AlertDescription>
                </Alert>
              ) : null}

              <Button
                disabled={
                  authStatus !== "authenticated" || !isReviewFormValid(formState) || isSubmitting
                }
                onClick={() => {
                  setSubmitError(null);
                  setIsSubmitting(true);

                  void apiClient
                    .submitModelReview(slug, buildSubmitReviewInput(formState))
                    .then(() => {
                      setFormState((current) => ({ ...current, dirty: false }));
                      reviewsQuery.refetch();
                    })
                    .catch((reason: unknown) => {
                      setSubmitError(reason instanceof Error ? reason.message : "提交点评失败");
                    })
                    .finally(() => {
                      setIsSubmitting(false);
                    });
                }}
                size="lg"
                type="button"
              >
                <MessageSquareTextIcon data-icon="inline-start" />
                {isSubmitting ? "提交中..." : "提交 / 更新点评"}
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            {reviewPayload.items.length > 0 ? (
              reviewPayload.items.map((review) => (
                <Card className="rounded-[1.125rem] border-border/80 shadow-sm" key={review.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">{review.author.displayName}</CardTitle>
                        <CardDescription>
                          {new Date(review.updatedAt).toLocaleString("zh-CN", { hour12: false })}
                        </CardDescription>
                      </div>
                      <ReviewStars rating={review.rating} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-7 text-muted-foreground">
                      {review.content ?? "该用户只做了快速评分，没有补充文字。"}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Alert>
                <AlertTitle>还没有公开点评</AlertTitle>
                <AlertDescription>欢迎留下第一条真实口碑，帮助后续用户判断。</AlertDescription>
              </Alert>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
