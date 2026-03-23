import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  ArrowLeft,
  Bookmark,
  Heart,
  Info,
  MessageSquareText,
  RadioTower,
  Star
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuthStore } from "../features/auth/auth-store";
import {
  buildSubmitReviewInput,
  createReviewFormState,
  isReviewFormValid,
  syncReviewFormState,
  updateReviewContent,
  updateReviewRating,
  type ReviewFormState
} from "./model-review-form";
import { apiClient } from "../lib/api-client";

const powerTypeLabels = {
  electric: "电动",
  fuel: "燃油",
  hybrid: "混动"
} as const;

const placeholderActions = [
  {
    label: "收藏",
    hint: "收藏夹能力正在整理中",
    icon: Bookmark
  },
  {
    label: "想买",
    hint: "心愿单能力即将开放",
    icon: Heart
  }
] as const;

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
          <Star
            className="h-5 w-5"
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

  useEffect(() => {
    setFormState((current) =>
      syncReviewFormState(current, reviewsQuery.data?.summary.myReview ?? null)
    );
  }, [reviewsQuery.data?.summary.myReview]);

  if (!slug) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
        缺少机型标识，无法加载详情。
      </div>
    );
  }

  if (detailQuery.isLoading || reviewsQuery.isLoading) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-sm text-slate-500">
        正在加载机型详情与口碑……
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
        {detailQuery.error.message}
      </div>
    );
  }

  if (reviewsQuery.isError) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
        {reviewsQuery.error.message}
      </div>
    );
  }

  const item = detailQuery.data?.item;
  const reviewPayload = reviewsQuery.data;

  if (!item || !reviewPayload) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-sm text-slate-500">
        当前机型详情暂无可展示数据。
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
        to={APP_ROUTES.models}
      >
        <ArrowLeft className="h-4 w-4" />
        返回机型列表
      </Link>

      <section className="rounded-[32px] border border-white/80 bg-white/85 p-8 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600">
              <RadioTower className="h-4 w-4" />
              {item.brand.name} · {item.category.name}
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              {item.name}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {item.description ??
                item.summary ??
                "查看核心参数、真实口碑和当前公开的社区评价，帮助你更快完成判断。"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {placeholderActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  aria-disabled
                  className="inline-flex cursor-default items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]"
                  key={action.label}
                  title={action.hint}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    规划中
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
          <div className="flex items-center gap-2 text-slate-950">
            <Info className="h-5 w-5" />
            <h3 className="text-lg font-semibold">核心参数</h3>
          </div>

          <dl className="mt-5 grid gap-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">动力类型</dt>
              <dd className="mt-2 text-base font-medium text-slate-950">
                {powerTypeLabels[item.powerType]}
              </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">最大飞行时间</dt>
              <dd className="mt-2 text-base font-medium text-slate-950">
                {item.parameters.maxFlightTimeMinutes
                  ? `${item.parameters.maxFlightTimeMinutes} 分钟`
                  : "待补充"}
              </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">最大续航距离</dt>
                  <dd className="mt-2 text-base font-medium text-slate-950">
                    {item.parameters.maxRangeKilometers
                      ? `${item.parameters.maxRangeKilometers} km`
                      : "待补充"}
                  </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">口碑状态</dt>
              <dd className="mt-2 text-base font-medium text-slate-950">
                {reviewPayload.summary.totalReviews > 0 ? "已有真实点评" : "等待首批评价"}
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
          <h3 className="text-lg font-semibold text-slate-950">详细参数</h3>
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <tbody>
                {[
                  ["品牌", item.brand.name],
                  ["分类", item.category.name],
                  ["最大速度", item.parameters.maxSpeedKph ? `${item.parameters.maxSpeedKph} km/h` : "待补充"],
                  [
                    "起飞重量",
                    item.parameters.takeoffWeightGrams
                      ? `${item.parameters.takeoffWeightGrams} g`
                      : "待补充"
                  ],
                  ["发布状态", item.isPublished ? "已发布" : "未发布"]
                ].map(([label, value]) => (
                  <tr className="border-b border-slate-200 last:border-b-0" key={label}>
                    <th className="w-40 bg-slate-50 px-4 py-3 font-medium text-slate-500">
                      {label}
                    </th>
                    <td className="px-4 py-3 text-slate-900">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Rating Summary</p>
          <div className="mt-4 flex items-end gap-3">
            <span className="text-4xl font-semibold text-slate-950">
              {reviewPayload.summary.averageScore.toFixed(1)}
            </span>
            <span className="pb-1 text-sm text-slate-500">/ 10 分</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            共 {reviewPayload.summary.totalReviews} 条有效点评
          </p>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="flex items-center gap-2 text-slate-950">
              <MessageSquareText className="h-5 w-5" />
              <h3 className="text-lg font-semibold">写点评</h3>
            </div>

            <div className="mt-4 space-y-4">
              <ReviewStars
                onSelect={(value) => {
                  setFormState((current) => updateReviewRating(current, value));
                }}
                rating={formState.rating}
              />

              <textarea
                className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                onChange={(event) => {
                  setFormState((current) => updateReviewContent(current, event.target.value));
                }}
                placeholder="这台机型最打动你的地方是什么？也可以只打分不写文字。"
                value={formState.content}
              />

              {submitError ? <p className="text-sm text-rose-600">{submitError}</p> : null}

              <button
                className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={authStatus !== "authenticated" || !isReviewFormValid(formState) || isSubmitting}
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
                type="button"
              >
                {authStatus !== "authenticated"
                  ? "登录后可提交点评"
                  : isSubmitting
                    ? "提交中"
                    : "提交 / 更新点评"}
              </button>
            </div>
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
          <h3 className="text-lg font-semibold text-slate-950">点评列表</h3>
          <div className="mt-5 space-y-4">
            {reviewPayload.items.map((review) => (
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={review.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-950">{review.author.displayName}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(review.updatedAt).toLocaleString("zh-CN", { hour12: false })}
                    </div>
                  </div>
                  <ReviewStars rating={review.rating} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {review.content ?? "该用户仅进行了快速评分。"}
                </p>
              </article>
            ))}

            {reviewPayload.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                还没有公开点评，欢迎留下第一条真实口碑。
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
