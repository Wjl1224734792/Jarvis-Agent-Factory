import { useQuery } from "@tanstack/react-query";
import type { AircraftCategory, Brand, ModelListItem } from "@feijia/schemas";
import { APP_ROUTES } from "@feijia/shared";
import { SearchCheckIcon, SlidersHorizontalIcon, StarIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SiteGrid, SitePage, SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient } from "../lib/api-client";
import { getModelImage } from "../lib/aviation-media";

const powerTypeLabels = {
  electric: "电动",
  fuel: "燃油",
  hybrid: "混动"
} as const;

function getPowerTypeLabel(powerType: string) {
  if (powerType in powerTypeLabels) {
    return powerTypeLabels[powerType as keyof typeof powerTypeLabels];
  }

  return powerType;
}

function getBrandGroups(brands: Brand[]) {
  const groups = new Map<string, Brand[]>();

  for (const brand of brands) {
    const firstChar = brand.name.trim().charAt(0).toUpperCase() || "#";
    const key = /[A-Z]/.test(firstChar) ? firstChar : "#";
    const existing = groups.get(key) ?? [];
    existing.push(brand);
    groups.set(key, existing);
  }

  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, "en-US"));
}

function ModelCard({
  model,
  index,
  score
}: {
  model: ModelListItem;
  index: number;
  score: number;
}) {
  const detailPath = APP_ROUTES.modelDetail.replace(":slug", model.slug);

  return (
    <Link
      className="flex min-w-[280px] max-w-[460px] flex-col overflow-hidden rounded-[0.75rem] border border-border/60 bg-white transition hover:-translate-y-1 hover:shadow-[0_20px_40px_-28px_rgba(15,23,42,0.28)]"
      to={detailPath}
    >
      <img
        alt={model.name}
        className="h-56 w-full object-cover"
        src={getModelImage(model.slug, model.powerType, index)}
      />

      <div className="space-y-3 p-4">
        <div className="text-sm uppercase tracking-[0.22em] text-muted-foreground">{model.brand.name}</div>
        <h3 className="text-[1.8rem] leading-tight font-semibold tracking-[-0.04em] text-foreground">
          {model.name}
        </h3>

        <div className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-amber-500">
            {Array.from({ length: 5 }).map((_, starIndex) => (
              <StarIcon
                className="size-4"
                fill={starIndex < Math.round(score / 2) ? "currentColor" : "none"}
                key={starIndex}
              />
            ))}
            <span className="ml-1 text-foreground/78">{score.toFixed(1)}</span>
          </div>
          <span className="text-muted-foreground">{getPowerTypeLabel(model.powerType)}</span>
        </div>
      </div>
    </Link>
  );
}

export function ModelsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeLetter, setActiveLetter] = useState<string>("A");

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
  const brandGroups = useMemo(() => getBrandGroups(filters?.brands ?? []), [filters?.brands]);
  const visibleBrands =
    brandGroups.find(([letter]) => letter === activeLetter)?.[1] ??
    brandGroups[0]?.[1] ??
    [];

  useEffect(() => {
    if (brandSlug && filters?.brands) {
      const matchedBrand = filters.brands.find((item) => item.slug === brandSlug);
      if (matchedBrand) {
        const nextLetter = matchedBrand.name.trim().charAt(0).toUpperCase() || "#";
        setActiveLetter(/[A-Z]/.test(nextLetter) ? nextLetter : "#");
        return;
      }
    }

    if (brandGroups[0]?.[0]) {
      setActiveLetter((current) => current || brandGroups[0]![0]);
    }
  }, [brandGroups, brandSlug, filters?.brands]);

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

  const activeFilterPills = [
    categorySlug
      ? filters?.categories.find((item) => item.slug === categorySlug)?.name ?? categorySlug
      : null,
    brandSlug ? filters?.brands.find((item) => item.slug === brandSlug)?.name ?? brandSlug : null,
    ...powerTypes.map((item) => getPowerTypeLabel(item))
  ].filter((item): item is string => Boolean(item));

  return (
    <SitePage>
      <SitePanel variant="muted">
        <SitePanelBody className="space-y-6">
          <div className="grid gap-4 md:grid-cols-[5rem_minmax(0,1fr)] md:items-center">
            <div className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">分类</div>
            <div className="site-chip-row">
              <Button onClick={() => updateParams({ categorySlug: null, brandSlug: null })} variant={!categorySlug ? "hero" : "panel"}>
                全部
              </Button>
              {(filters?.categories ?? []).map((category: AircraftCategory) => (
                <Button
                  key={category.id}
                  onClick={() => updateParams({ categorySlug: category.slug, brandSlug: null })}
                  variant={categorySlug === category.slug ? "hero" : "panel"}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[5rem_minmax(0,1fr)] md:items-center">
            <div className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">动力</div>
            <div className="site-chip-row">
              <Button onClick={() => updateParams({ powerTypes: [] })} variant={!powerTypes.length ? "hero" : "panel"}>
                全部
              </Button>
              {(filters?.powerTypes ?? []).map((powerType) => (
                <Button
                  key={powerType}
                  onClick={() => togglePowerType(powerType)}
                  variant={powerTypes.includes(powerType) ? "hero" : "panel"}
                >
                  {powerTypeLabels[powerType]}
                </Button>
              ))}
            </div>
          </div>
        </SitePanelBody>
      </SitePanel>

      <SiteGrid className="xl:grid-cols-[5.5rem_minmax(0,1fr)]">
        <SitePanel className="xl:sticky xl:top-26 xl:h-fit" variant="muted">
          <SitePanelBody className="space-y-4 px-3 py-5">
            <div className="text-center text-sm font-semibold uppercase tracking-[0.24em] text-primary">Hot</div>
            <div className="flex flex-col gap-2">
              {brandGroups.map(([letter]) => (
                <button
                  className={`px-2 py-2 text-sm transition ${activeLetter === letter ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  key={letter}
                  onClick={() => {
                    setActiveLetter(letter);
                  }}
                  type="button"
                >
                  {letter}
                </button>
              ))}
            </div>
          </SitePanelBody>
        </SitePanel>

        <div className="flex flex-col gap-[var(--page-gap)]">
          <SitePanel variant="default">
            <SitePanelBody className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">筛选结果</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">
                    当前条件下共 {modelsQuery.data?.total ?? 0} 个机型
                  </div>
                </div>
                <Badge variant="tone">
                  <SearchCheckIcon />
                  {activeFilterPills.length > 0 ? "筛选已生效" : "展示全部"}
                </Badge>
              </div>

              <div className="site-chip-row">
                <Badge variant="eyebrow">
                  <SlidersHorizontalIcon />
                  品牌索引 {activeLetter}
                </Badge>
                <Button onClick={() => updateParams({ brandSlug: null })} size="sm" variant={!brandSlug ? "hero" : "panel"}>
                  不限品牌
                </Button>
                {visibleBrands.slice(0, 8).map((brand) => (
                  <Button
                    key={brand.id}
                    onClick={() => updateParams({ brandSlug: brandSlug === brand.slug ? null : brand.slug })}
                    size="sm"
                    variant={brandSlug === brand.slug ? "hero" : "panel"}
                  >
                    {brand.name}
                  </Button>
                ))}
              </div>
            </SitePanelBody>
          </SitePanel>

          {modelsQuery.isLoading ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[var(--page-gap)]">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card className="overflow-hidden rounded-[0.75rem]" key={index} variant="muted">
                  <CardContent className="space-y-4">
                    <div className="h-56 animate-pulse bg-muted" />
                    <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {modelsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>机型列表加载失败</AlertTitle>
              <AlertDescription>{modelsQuery.error.message}</AlertDescription>
            </Alert>
          ) : null}

          {modelsQuery.isSuccess && modelsQuery.data.items.length === 0 ? (
            <Alert>
              <AlertTitle>没有命中结果</AlertTitle>
              <AlertDescription>换一个品牌或动力类型试试，或者先清空筛选条件。</AlertDescription>
            </Alert>
          ) : null}

          {modelsQuery.isSuccess ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[var(--page-gap)]">
              {modelsQuery.data.items.map((model, index) => (
                <ModelCard
                  index={index}
                  key={model.id}
                  model={model}
                  score={model.ratingSummary.averageScore}
                />
              ))}
            </div>
          ) : null}
        </div>
      </SiteGrid>
    </SitePage>
  );
}
