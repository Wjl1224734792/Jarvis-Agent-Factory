import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AircraftCategory, Brand, ModelListItem, PowerType } from "@feijia/schemas";
import { APP_ROUTES } from "@feijia/shared";
import { Link, useSearchParams } from "react-router-dom";
import { ModelGridSkeleton } from "@/components/page-skeletons";
import { RatingStars, toFiveStarRating } from "@/components/rating-stars";
import { SitePage } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiClient } from "../lib/api-client";
import { getModelImage } from "../lib/aviation-media";

type FilterOption = {
  slug: string;
  name: string;
};

const powerTypeLabels: Record<PowerType, string> = {
  electric: "电动",
  fuel: "燃油",
  hybrid: "混动",
  other: "其他"
};

function ensureOtherOption<T extends FilterOption>(items: T[]): T[] {
  if (items.some((item) => item.slug === "other")) {
    return items;
  }

  return [
    ...items,
    {
      slug: "other",
      name: "其他"
    } as T
  ];
}

function ModelCard({ model, index }: { model: ModelListItem; index: number }) {
  return (
    <Link
      className="group block min-w-0 rounded-[0.95rem] border border-transparent px-1.5 py-1.5 transition hover:border-primary/24 hover:bg-sky-50/55"
      to={APP_ROUTES.modelDetail.replace(":slug", model.slug)}
    >
      <div className="overflow-hidden rounded-[0.9rem] border border-border/70 transition duration-200 group-hover:border-primary/30 group-hover:shadow-[var(--shadow-panel)]">
        <img
          alt={model.name}
          className="aspect-square w-full object-cover transition duration-200 group-hover:scale-[1.02]"
          src={getModelImage(model.slug, model.powerType, index)}
        />
      </div>
      <div className="space-y-2 px-0.5 pb-0.5 pt-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {model.brand.name}
            </div>
            <div className="line-clamp-2 text-[1rem] leading-[1.35rem] font-semibold text-foreground">
              {model.name}
            </div>
          </div>
          <div className="text-right text-[1.2rem] font-semibold leading-none text-rating-blue">
            {model.ratingSummary.averageScore.toFixed(1)}
          </div>
        </div>
        <RatingStars size="xs" value={toFiveStarRating(model.ratingSummary.averageScore)} />
      </div>
    </Link>
  );
}

function FilterLabel({ label }: { label: string }) {
  return <span className="mr-1 text-[0.82rem] font-medium text-foreground/62">{label}</span>;
}

function FilterChip(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`rounded-full border px-2.5 py-1.5 text-[0.8rem] transition ${
        props.active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/70 text-foreground/72 hover:text-foreground"
      }`}
      onClick={props.onClick}
      type="button"
    >
      {props.label}
    </button>
  );
}

export function ModelsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get("categorySlug");
  const brandSlug = searchParams.get("brandSlug");
  const powerTypes = searchParams.getAll("powerType");

  const modelsQuery = useQuery({
    queryKey: ["models", categorySlug, brandSlug, powerTypes],
    placeholderData: keepPreviousData,
    queryFn: () =>
      apiClient.listModels({
        categorySlug: categorySlug ?? undefined,
        brandSlug: brandSlug ?? undefined,
        powerTypes: powerTypes.length ? powerTypes : undefined
      })
  });

  const filters = modelsQuery.data?.filters;
  const categories = ensureOtherOption((filters?.categories ?? []) as AircraftCategory[]);
  const brands = ensureOtherOption((filters?.brands ?? []) as Brand[]);
  const powerTypeOptions = ensureOtherOption(
    (filters?.powerTypes ?? ["electric", "fuel", "hybrid", "other"]).map((item) => ({
      slug: item,
      name: powerTypeLabels[item]
    }))
  );

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

  const isGridLoading = modelsQuery.isLoading && !modelsQuery.data;
  const isGridRefreshing = modelsQuery.isFetching && !isGridLoading;

  return (
    <SitePage className="gap-5">
      <div className="space-y-3 border-b border-border/60 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <FilterLabel label="分类" />
          <FilterChip active={!categorySlug} label="全部" onClick={() => updateParams({ categorySlug: null })} />
          {categories.map((category) => (
            <FilterChip
              active={categorySlug === category.slug}
              key={category.id ?? category.slug}
              label={category.name}
              onClick={() => updateParams({ categorySlug: category.slug })}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterLabel label="品牌" />
          <FilterChip active={!brandSlug} label="全部" onClick={() => updateParams({ brandSlug: null })} />
          {brands.map((brand) => (
            <FilterChip
              active={brandSlug === brand.slug}
              key={brand.id ?? brand.slug}
              label={brand.name}
              onClick={() => updateParams({ brandSlug: brand.slug })}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterLabel label="动力" />
          <FilterChip active={powerTypes.length === 0} label="全部" onClick={() => updateParams({ powerTypes: [] })} />
          {powerTypeOptions.map((powerType) => (
            <FilterChip
              active={powerTypes.includes(powerType.slug)}
              key={powerType.slug}
              label={powerType.name}
              onClick={() => togglePowerType(powerType.slug)}
            />
          ))}
        </div>
      </div>

      {modelsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>飞行器库加载失败</AlertTitle>
          <AlertDescription>{modelsQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {(modelsQuery.isSuccess || isGridLoading) ? (
        <>
          <div className="text-[0.82rem] text-muted-foreground">
            当前共 {modelsQuery.data?.total ?? 0} 个机型
          </div>

          <div className="relative">
            {isGridLoading ? (
              <ModelGridSkeleton count={8} />
            ) : (
              <div
                className="grid justify-start gap-x-4 gap-y-5"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(218px, 218px))" }}
              >
                {modelsQuery.data?.items.map((model, index) => (
                  <ModelCard index={index} key={model.id} model={model} />
                ))}
              </div>
            )}

            {isGridRefreshing ? (
              <div className="absolute inset-0 z-10 bg-background/76 backdrop-blur-[1px]">
                <ModelGridSkeleton count={8} />
              </div>
            ) : null}
          </div>

          {modelsQuery.data && modelsQuery.data.items.length === 0 ? (
            <Alert>
              <AlertTitle>没有匹配机型</AlertTitle>
              <AlertDescription>可以清空筛选后重新浏览。</AlertDescription>
            </Alert>
          ) : null}
        </>
      ) : null}
    </SitePage>
  );
}
