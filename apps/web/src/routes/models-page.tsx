import { useQuery } from "@tanstack/react-query";
import type { AircraftCategory, ModelListItem } from "@feijia/schemas";
import { APP_ROUTES } from "@feijia/shared";
import { StarIcon } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { SitePage } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiClient } from "../lib/api-client";
import { getModelImage } from "../lib/aviation-media";

function ModelCard({ model, index }: { model: ModelListItem; index: number }) {
  const score = model.ratingSummary.averageScore;
  return (
    <Link
      className="block min-w-0"
      to={APP_ROUTES.modelDetail.replace(":slug", model.slug)}
    >
      <div className="overflow-hidden rounded-[0.95rem]">
        <img
          alt={model.name}
          className="aspect-square w-full object-cover"
          src={getModelImage(model.slug, model.powerType, index)}
        />
      </div>
      <div className="space-y-1.5 px-1 pb-1 pt-3">
        <div className="text-[0.74rem] uppercase tracking-[0.24em] text-muted-foreground">
          {model.brand.name}
        </div>
        <div className="line-clamp-2 text-[1.06rem] leading-6 font-semibold text-foreground">
          {model.name}
        </div>
        <div className="flex items-center gap-1.5 text-[0.82rem] text-amber-500">
          {Array.from({ length: 5 }).map((_, index) => (
            <StarIcon
              className="size-3.5"
              fill={index < Math.round(score / 2) ? "currentColor" : "none"}
              key={index}
            />
          ))}
          <span className="ml-1 text-foreground/68">{score.toFixed(1)}</span>
        </div>
      </div>
    </Link>
  );
}

export function ModelsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get("categorySlug");
  const powerTypes = searchParams.getAll("powerType");

  const modelsQuery = useQuery({
    queryKey: ["models", categorySlug, powerTypes],
    queryFn: () =>
      apiClient.listModels({
        categorySlug: categorySlug ?? undefined,
        powerTypes: powerTypes.length ? powerTypes : undefined
      })
  });

  const filters = modelsQuery.data?.filters;

  function updateParams(next: { categorySlug?: string | null; powerTypes?: string[] }) {
    const nextParams = new URLSearchParams(searchParams);

    if ("categorySlug" in next) {
      nextParams.delete("categorySlug");
      if (next.categorySlug) {
        nextParams.set("categorySlug", next.categorySlug);
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
    <SitePage className="gap-6">
      <div className="space-y-4 border-b border-border/60 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <FilterLabel label="分类" />
          <FilterChip
            active={!categorySlug}
            label="全部"
            onClick={() => updateParams({ categorySlug: null })}
          />
          {(filters?.categories ?? []).map((category: AircraftCategory) => (
            <FilterChip
              active={categorySlug === category.slug}
              key={category.id}
              label={category.name}
              onClick={() => updateParams({ categorySlug: category.slug })}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterLabel label="动力" />
          <FilterChip
            active={powerTypes.length === 0}
            label="全部"
            onClick={() => updateParams({ powerTypes: [] })}
          />
          {(filters?.powerTypes ?? []).map((powerType) => (
            <FilterChip
              active={powerTypes.includes(powerType)}
              key={powerType}
              label={powerType === "electric" ? "电动" : powerType === "fuel" ? "燃油" : "混动"}
              onClick={() => togglePowerType(powerType)}
            />
          ))}
        </div>
      </div>

      {modelsQuery.isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-5 gap-y-7">
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="space-y-3" key={index}>
              <div className="aspect-square animate-pulse rounded-[0.95rem] bg-muted" />
              <div className="h-4 w-2/5 animate-pulse rounded bg-muted" />
              <div className="h-6 w-4/5 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : null}

      {modelsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>飞行器库加载失败</AlertTitle>
          <AlertDescription>{modelsQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {modelsQuery.isSuccess ? (
        <>
          <div className="text-sm text-muted-foreground">
            当前条件下共 {modelsQuery.data.total} 个机型
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-5 gap-y-8">
            {modelsQuery.data.items.map((model, index) => (
              <ModelCard index={index} key={model.id} model={model} />
            ))}
          </div>

          {modelsQuery.data.items.length === 0 ? (
            <Alert>
              <AlertTitle>没有匹配机型</AlertTitle>
              <AlertDescription>可以清空筛选后重新浏览飞行器库。</AlertDescription>
            </Alert>
          ) : null}
        </>
      ) : null}
    </SitePage>
  );
}

function FilterLabel({ label }: { label: string }) {
  return <span className="mr-1 text-sm font-medium text-foreground/62">{label}</span>;
}

function FilterChip(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
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
