import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  ArrowLeft,
  Bookmark,
  Heart,
  Info,
  MessageSquareText,
  RadioTower
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../lib/api-client";

const powerTypeLabels = {
  electric: "电动",
  fuel: "燃油",
  hybrid: "混动"
} as const;

const placeholderActions = [
  {
    label: "收藏",
    hint: "第 4 阶段再接真实收藏写入",
    icon: Bookmark
  },
  {
    label: "想买",
    hint: "第 4 阶段再接真实意向写入",
    icon: Heart
  },
  {
    label: "写点评",
    hint: "第 4 阶段再接评分点评链路",
    icon: MessageSquareText
  }
] as const;

export function ModelDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const detailQuery = useQuery({
    queryKey: ["model-detail", slug],
    queryFn: () => apiClient.getModelDetail(slug),
    enabled: Boolean(slug)
  });

  if (!slug) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
        缺少机型标识，无法加载详情。
      </div>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-sm text-slate-500">
        正在加载机型详情……
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

  const item = detailQuery.data?.item;

  if (!item) {
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
              {item.description ?? item.summary ?? "当前详情页优先展示最小可读参数。"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {placeholderActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] transition hover:border-slate-300 hover:text-slate-950"
                  key={action.label}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
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

          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            本轮只保留详情页行为入口位。真实的收藏、想买和写点评提交会在下一迭代接入。
          </div>
        </article>
      </section>
    </main>
  );
}
