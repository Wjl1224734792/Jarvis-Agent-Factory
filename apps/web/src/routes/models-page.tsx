import { useQuery } from "@tanstack/react-query";
import type { AircraftCategory, Brand } from "@feijia/schemas";
import { APP_ROUTES } from "@feijia/shared";
import {
  ArrowRight,
  Plane,
  Radar,
  RotateCcw,
  SearchCheck,
  SlidersHorizontal
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../lib/api-client";

const powerTypeLabels = {
  electric: "电动",
  fuel: "燃油",
  hybrid: "混动"
} as const;

function BrandIndex({
  brands,
  activeBrandSlug,
  onSelectBrand
}: {
  brands: Brand[];
  activeBrandSlug: string | null;
  onSelectBrand: (slug: string | null) => void;
}) {
  if (brands.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-500">
        当前筛选下没有可用品牌。
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Brand Index</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">品牌索引</h3>
        </div>
        <button
          className="text-sm text-slate-500 transition hover:text-slate-900"
          onClick={() => {
            onSelectBrand(null);
          }}
          type="button"
        >
          清空品牌
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {brands.map((brand) => {
          const isActive = activeBrandSlug === brand.slug;

          return (
            <button
              className={`rounded-full border px-3 py-2 text-sm transition ${
                isActive
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
              }`}
              key={brand.id}
              onClick={() => {
                onSelectBrand(isActive ? null : brand.slug);
              }}
              type="button"
            >
              {brand.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryTabs({
  categories,
  activeCategorySlug,
  onSelectCategory
}: {
  categories: AircraftCategory[];
  activeCategorySlug: string | null;
  onSelectCategory: (slug: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
          !activeCategorySlug
            ? "bg-sky-600 text-white"
            : "bg-white text-slate-600 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]"
        }`}
        onClick={() => {
          onSelectCategory(null);
        }}
        type="button"
      >
        全部类型
      </button>
      {categories.map((category) => {
        const isActive = activeCategorySlug === category.slug;

        return (
          <button
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-600 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]"
            }`}
            key={category.id}
            onClick={() => {
              onSelectCategory(isActive ? null : category.slug);
            }}
            type="button"
          >
            {category.name}
          </button>
        );
      })}
    </div>
  );
}

export function ModelsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const categorySlug = searchParams.get("categorySlug");
  const brandSlug = searchParams.get("brandSlug");
  const powerTypes = searchParams.getAll("powerType");

  const modelsQuery = useQuery({
    queryKey: ["models", categorySlug, brandSlug, powerTypes],
    queryFn: () =>
      apiClient.listModels({
        categorySlug: categorySlug ?? undefined,
        brandSlug: brandSlug ?? undefined,
        powerTypes: powerTypes.length ? powerTypes : undefined
      })
  });

  const filters = modelsQuery.data?.filters;

  function updateParams(next: {
    categorySlug?: string | null;
    brandSlug?: string | null;
    powerTypes?: string[];
  }) {
    const nextParams = new URLSearchParams(searchParams);

    if ("categorySlug" in next) {
      nextParams.delete("categorySlug");
      if (next.categorySlug) {
        nextParams.set("categorySlug", next.categorySlug);
      }
    }

    if ("brandSlug" in next) {
      nextParams.delete("brandSlug");
      if (next.brandSlug) {
        nextParams.set("brandSlug", next.brandSlug);
      }
    }

    if ("powerTypes" in next) {
      nextParams.delete("powerType");
      for (const powerType of next.powerTypes ?? []) {
        nextParams.append("powerType", powerType);
      }
    }

    setSearchParams(nextParams);
  }

  function togglePowerType(powerType: string) {
    const nextPowerTypes = powerTypes.includes(powerType)
      ? powerTypes.filter((item) => item !== powerType)
      : [...powerTypes, powerType];

    updateParams({ powerTypes: nextPowerTypes });
  }

  return (
    <main className="space-y-6">
      <section className="rounded-[32px] border border-white/80 bg-white/85 p-8 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
              <Plane className="h-4 w-4" />
              Aircraft Atlas
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              从分类、品牌和动力类型切入，快速找到值得深入了解的飞行器。
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              这里汇集了飞加网当前公开的机型主数据与真实口碑入口。你可以先筛选，再进入详情页查看核心参数、
              综合评分和用户点评。
            </p>
          </div>

          <button
            className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] transition hover:border-slate-300 hover:text-slate-950"
            onClick={() => {
              setSearchParams(new URLSearchParams());
            }}
            type="button"
          >
            <RotateCcw className="h-4 w-4" />
            不限 / 重置
          </button>
        </div>
      </section>

      <section className="space-y-5">
        <CategoryTabs
          activeCategorySlug={categorySlug}
          categories={filters?.categories ?? []}
          onSelectCategory={(slug) => {
            updateParams({
              categorySlug: slug,
              brandSlug: null
            });
          }}
        />

        <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-500">
              <SlidersHorizontal className="h-4 w-4" />
              动力类型
            </div>
            {(filters?.powerTypes ?? []).map((powerType) => {
              const isActive = powerTypes.includes(powerType);

              return (
                <button
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    isActive
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                  }`}
                  key={powerType}
                  onClick={() => {
                    togglePowerType(powerType);
                  }}
                  type="button"
                >
                  {powerTypeLabels[powerType]}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <BrandIndex
          activeBrandSlug={brandSlug}
          brands={filters?.brands ?? []}
          onSelectBrand={(slug) => {
            updateParams({ brandSlug: slug });
          }}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-[28px] border border-slate-200 bg-white/90 px-5 py-4 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Result</p>
              <p className="mt-2 text-sm text-slate-600">
                当前筛选下共 <span className="font-semibold text-slate-950">{modelsQuery.data?.total ?? 0}</span> 个机型
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-500">
              <SearchCheck className="h-4 w-4" />
              {categorySlug || brandSlug || powerTypes.length ? "筛选已生效" : "显示全部"}
            </div>
          </div>

          {modelsQuery.isLoading ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-sm text-slate-500">
              正在加载机型列表……
            </div>
          ) : null}

          {modelsQuery.isError ? (
            <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
              {modelsQuery.error.message}
            </div>
          ) : null}

          {modelsQuery.isSuccess && modelsQuery.data.items.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-sm text-slate-500">
              当前筛选组合下没有可展示的机型。
            </div>
          ) : null}

          {modelsQuery.isSuccess ? (
            <div className="grid gap-4 md:grid-cols-2">
              {modelsQuery.data.items.map((model) => (
                <article
                  className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.45)]"
                  key={model.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                        {model.brand.name}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-950">{model.name}</h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {powerTypeLabels[model.powerType]}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {model.summary ?? "参数卡与真实点评已开放，适合进一步查看详细信息。"}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                      {model.category.name}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      品牌索引：{model.brand.slug.toUpperCase()}
                    </span>
                  </div>

                  <Link
                    className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-950 transition hover:text-sky-700"
                    to={APP_ROUTES.models + "/" + model.slug}
                  >
                    查看详情
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
