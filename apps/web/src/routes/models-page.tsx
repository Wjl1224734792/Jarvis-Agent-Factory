import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AircraftCategory, Brand, ModelListItem, PowerType } from "@feijia/schemas";
import { SearchIcon } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ModelGridSkeleton } from "@/components/page-skeletons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { SitePage } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { APP_ROUTES } from "@feijia/shared";
import { apiClient } from "../lib/api-client";
import { getModelImage } from "../lib/aviation-media";

type FilterOption = {
  slug: string;
  name: string;
  id?: string;
};

const MODEL_GRID_CLASS_NAME =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,11.5rem),1fr))] gap-x-3 gap-y-4";

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

  return [...items, { slug: "other", name: "其他" } as T];
}

function FilterSection(props: {
  title: string;
  items: FilterOption[];
  activeSlug: string | null;
  onSelect: (slug: string | null) => void;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-3 border border-border/80 bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-foreground">{props.title}</div>
        <div className="text-[0.72rem] text-muted-foreground">{props.items.length} 项</div>
      </div>

      {props.searchable ? (
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(event) => props.onSearchChange?.(event.target.value)}
            placeholder={`搜索${props.title}`}
            value={props.searchValue}
          />
        </div>
      ) : null}

      <ScrollArea className="h-56 border border-border/70">
        <div className="divide-y divide-border/70">
          <button
            className={`flex w-full items-center justify-between px-3 py-3 text-left text-sm transition ${
              props.activeSlug === null ? "bg-primary/8 text-primary" : "hover:bg-accent/28"
            }`}
            onClick={() => props.onSelect(null)}
            type="button"
          >
            <span>全部</span>
            {props.activeSlug === null ? <span className="text-[0.72rem]">当前</span> : null}
          </button>

          {props.items.map((item) => (
            <button
              className={`flex w-full items-center justify-between px-3 py-3 text-left text-sm transition ${
                props.activeSlug === item.slug ? "bg-primary/8 text-primary" : "hover:bg-accent/28"
              }`}
              key={item.id ?? item.slug}
              onClick={() => props.onSelect(item.slug)}
              type="button"
            >
              <span className="truncate">{item.name}</span>
              {props.activeSlug === item.slug ? <span className="text-[0.72rem]">当前</span> : null}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function PowerSection(props: {
  options: Array<{ slug: string; name: string }>;
  activePowerTypes: string[];
  onToggle: (slug: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-3 border border-border/80 bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-foreground">动力</div>
        <button className="text-[0.72rem] text-primary" onClick={props.onReset} type="button">
          清空
        </button>
      </div>

      <ScrollArea className="h-56 border border-border/70">
        <div className="divide-y divide-border/70">
          {props.options.map((option) => {
            const active = props.activePowerTypes.includes(option.slug);

            return (
              <button
                className={`flex w-full items-center justify-between px-3 py-3 text-left text-sm transition ${
                  active ? "bg-primary/8 text-primary" : "hover:bg-accent/28"
                }`}
                key={option.slug}
                onClick={() => props.onToggle(option.slug)}
                type="button"
              >
                <span>{option.name}</span>
                {active ? <span className="text-[0.72rem]">已选</span> : null}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function ModelCard({ model, index }: { model: ModelListItem; index: number }) {
  return (
    <Link
      className="group block min-w-0 border border-border/80 bg-white px-2.5 py-2.5 transition hover:border-primary/24 hover:bg-sky-50/34"
      to={APP_ROUTES.modelDetail.replace(":slug", model.slug)}
    >
      <div className="overflow-hidden border border-border/70">
        <img
          alt={model.name}
          className="aspect-[4/3] w-full object-cover transition duration-200 group-hover:scale-[1.02]"
          src={getModelImage(model.slug, model.powerType, index)}
        />
      </div>
      <div className="space-y-1.5 pt-2.5">
        <div className="truncate text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {model.brand.name}
        </div>
        <div className="line-clamp-2 text-[0.92rem] leading-5 font-semibold text-foreground">
          {model.name}
        </div>
        <div className="line-clamp-2 text-[0.8rem] leading-5 text-muted-foreground">
          {model.summary ?? `${model.category.name} · ${powerTypeLabels[model.powerType]}`}
        </div>
      </div>
    </Link>
  );
}

export function ModelsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categorySearch, setCategorySearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const deferredCategorySearch = useDeferredValue(categorySearch.trim().toLowerCase());
  const deferredBrandSearch = useDeferredValue(brandSearch.trim().toLowerCase());
  const deferredModelSearch = useDeferredValue(modelSearch.trim().toLowerCase());
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

  const visibleCategories = useMemo(
    () =>
      categories.filter((item) =>
        !deferredCategorySearch ? true : item.name.toLowerCase().includes(deferredCategorySearch)
      ),
    [categories, deferredCategorySearch]
  );
  const visibleBrands = useMemo(
    () =>
      brands.filter((item) =>
        !deferredBrandSearch ? true : item.name.toLowerCase().includes(deferredBrandSearch)
      ),
    [brands, deferredBrandSearch]
  );
  const visibleModels = useMemo(
    () =>
      (modelsQuery.data?.items ?? []).filter((model) => {
        if (!deferredModelSearch) {
          return true;
        }

        const keyword = deferredModelSearch;
        return (
          model.name.toLowerCase().includes(keyword) ||
          model.brand.name.toLowerCase().includes(keyword) ||
          (model.summary ?? "").toLowerCase().includes(keyword)
        );
      }),
    [modelsQuery.data?.items, deferredModelSearch]
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
    <SitePage className="mx-auto w-full max-w-[76rem] gap-4">
      <div className="grid gap-3 xl:grid-cols-[14rem_18rem_12rem_minmax(0,1fr)]">
        <FilterSection
          activeSlug={categorySlug}
          items={visibleCategories}
          onSearchChange={setCategorySearch}
          onSelect={(slug) => updateParams({ categorySlug: slug })}
          searchValue={categorySearch}
          searchable
          title="分类"
        />
        <FilterSection
          activeSlug={brandSlug}
          items={visibleBrands}
          onSearchChange={setBrandSearch}
          onSelect={(slug) => updateParams({ brandSlug: slug })}
          searchValue={brandSearch}
          searchable
          title="品牌"
        />
        <PowerSection
          activePowerTypes={powerTypes}
          onReset={() => updateParams({ powerTypes: [] })}
          onToggle={togglePowerType}
          options={powerTypeOptions}
        />

        <div className="space-y-3 border border-border/80 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-foreground">机型列表</div>
            <div className="text-[0.72rem] text-muted-foreground">
              {visibleModels.length} / {modelsQuery.data?.total ?? 0}
            </div>
          </div>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(event) => setModelSearch(event.target.value)}
              placeholder="搜索机型、品牌或摘要"
              value={modelSearch}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            用左侧列表筛选，用这里的搜索快速定位目标机型。
          </div>
        </div>
      </div>

      {modelsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>飞行器库加载失败</AlertTitle>
          <AlertDescription>{modelsQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {(modelsQuery.isSuccess || isGridLoading) ? (
        <div className="relative">
          {isGridLoading ? (
            <ModelGridSkeleton count={10} />
          ) : (
            <div className={MODEL_GRID_CLASS_NAME}>
              {visibleModels.map((model, index) => (
                <ModelCard index={index} key={model.id} model={model} />
              ))}
            </div>
          )}

          {isGridRefreshing ? (
            <div className="absolute inset-0 z-10 bg-background/76 backdrop-blur-[1px]">
              <ModelGridSkeleton count={10} />
            </div>
          ) : null}
        </div>
      ) : null}

      {!isGridLoading && modelsQuery.data && visibleModels.length === 0 ? (
        <Alert>
          <AlertTitle>没有匹配机型</AlertTitle>
          <AlertDescription>换个筛选组合，或者清空品牌和机型搜索再试试。</AlertDescription>
        </Alert>
      ) : null}
    </SitePage>
  );
}
