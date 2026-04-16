import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type {
  AircraftCategory,
  Brand,
  ModelListItem,
  PowerType
} from "@feijia/schemas";
import { APP_ROUTES } from "@feijia/shared";
import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BrandIdentity } from "@/components/brand-identity";
import { ModelThumbCover } from "@/components/model-thumb-cover";
import { FeedRefetchFooter } from "@/components/feed-refetch-footer";
import { ModelsPageSkeleton } from "@/components/page-skeletons";
import { SitePage } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCircleColumnCount } from "@/hooks/use-circle-column-count";
import { partitionByShortestColumn } from "@/lib/masonry-partition";
import { apiClient } from "../lib/api-client";
import { cn } from "../lib/utils";
import { CIRCLE_CARD_COLUMN_GAP } from "./circle-page-helpers";
import { DETAIL_PAGE_LINK_PROPS } from "../lib/web-routes";
import { formatModelPriceRange } from "./model-detail-helpers";
import {
  buildModelFilterSearchParams,
  estimateModelListItemRelativeHeight,
  readModelFilterParams,
  toggleModelFilterValue
} from "./models-page-helpers";

type FilterOption = {
  slug: string;
  name: string;
  id?: string;
  logoUrl?: string | null;
};

type WebBrand = Brand & { logoUrl?: string | null };
type WebModelListItem = ModelListItem & {
  brand: ModelListItem["brand"] & { logoUrl?: string | null };
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

  return [...items, { slug: "other", name: "其他" } as T];
}

function formatActiveNames(items: FilterOption[], activeSlugs: string[], fallback: string) {
  if (activeSlugs.length === 0) {
    return fallback;
  }

  const names = activeSlugs
    .map((slug) => items.find((item) => item.slug === slug)?.name ?? slug)
    .filter(Boolean);

  return names.length > 0 ? names.join(" / ") : fallback;
}

function FilterSection(props: {
  title: string;
  items: FilterOption[];
  activeSlugs: string[];
  onToggle: (slug: string) => void;
  onClear: () => void;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  compact?: boolean;
  withLogo?: boolean;
}) {
  return (
    <div className={`space-y-2.5 bg-white ${props.compact ? "px-3 py-3" : "px-4 py-4"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-foreground">{props.title}</div>
        <button className="text-[0.72rem] text-primary" onClick={props.onClear} type="button">
          全部
        </button>
      </div>

      {props.searchable ? (
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(event) => props.onSearchChange?.(event.target.value)}
            placeholder={`搜索${props.title}`}
            value={props.searchValue ?? ""}
          />
        </div>
      ) : null}

      <ScrollArea className={`${props.compact ? "h-40" : "h-56"} border border-border/70`}>
        <div className="divide-y divide-border/70">
          <button
            className={cn(
              "flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition",
              props.activeSlugs.length === 0 ? "bg-primary/8 text-primary" : "hover:bg-accent/28"
            )}
            onClick={props.onClear}
            type="button"
          >
            <span>全部</span>
            {props.activeSlugs.length === 0 ? <span className="text-[0.72rem]">当前</span> : null}
          </button>

          {props.items.map((item) => {
            const active = props.activeSlugs.includes(item.slug);

            return (
              <button
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition",
                  active ? "bg-primary/8 text-primary" : "hover:bg-accent/28"
                )}
                key={item.id ?? item.slug}
                onClick={() => props.onToggle(item.slug)}
                type="button"
              >
                {props.withLogo ? (
                  <BrandIdentity
                    className="min-w-0"
                    imageClassName="size-4"
                    logoUrl={item.logoUrl}
                    name={item.name}
                  />
                ) : (
                  <span className="truncate">{item.name}</span>
                )}
                {active ? <span className="text-[0.72rem]">已选</span> : null}
              </button>
            );
          })}
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
  compact?: boolean;
}) {
  return (
    <div className={`space-y-2.5 bg-white ${props.compact ? "px-3 py-3" : "px-4 py-4"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-foreground">动力</div>
        <button className="text-[0.72rem] text-primary" onClick={props.onReset} type="button">
          全部
        </button>
      </div>

      <ScrollArea className={`${props.compact ? "h-40" : "h-56"} border border-border/70`}>
        <div className="divide-y divide-border/70">
          {props.options.map((option) => {
            const active = props.activePowerTypes.includes(option.slug);

            return (
              <button
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition",
                  active ? "bg-primary/8 text-primary" : "hover:bg-accent/28"
                )}
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

function ModelCard({ model, index }: { model: WebModelListItem; index: number }) {
  const priceLabel = formatModelPriceRange(model.priceMin ?? null, model.priceMax ?? null);

  return (
    <Link
      className="group block min-w-0 overflow-hidden bg-white transition hover:bg-sky-50/34"
      {...DETAIL_PAGE_LINK_PROPS}
      to={APP_ROUTES.modelDetail.replace(":slug", model.slug)}
    >
      <div className="aspect-[4/3] w-full overflow-hidden">
        <ModelThumbCover
          alt={model.name}
          className="h-full w-full transition duration-200 group-hover:scale-[1.02]"
          coverImageUrl={model.coverImageUrl ?? null}
          coverVideoUrl={model.coverVideoUrl ?? null}
          index={index}
          slug={model.slug}
          powerType={model.powerType}
        />
      </div>
      <div className="space-y-1.5 px-2.5 pb-2.5 pt-2.5">
        <div className="line-clamp-2 text-[0.92rem] leading-5 font-semibold text-foreground">
          {model.name}
        </div>
        <BrandIdentity
          className="max-w-full text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground"
          imageClassName="size-3.5"
          logoUrl={model.brand.logoUrl}
          name={model.brand.name}
        />
        {priceLabel ? <div className="text-[0.78rem] font-semibold text-primary">{priceLabel}</div> : null}
        <div className="line-clamp-2 text-[0.8rem] leading-5 text-muted-foreground">
          {model.summary ?? `${model.category.name} / ${powerTypeLabels[model.powerType]}`}
        </div>
      </div>
    </Link>
  );
}

export function ModelsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categorySearch, setCategorySearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const filtersState = readModelFilterParams(searchParams);
  const [keywordDraft, setKeywordDraft] = useState(filtersState.keyword);

  useEffect(() => {
    setKeywordDraft(filtersState.keyword);
  }, [filtersState.keyword]);

  const categoryQuery = categorySearch.trim().toLowerCase();
  const brandQuery = brandSearch.trim().toLowerCase();

  const modelsQuery = useQuery({
    queryKey: [
      "models",
      filtersState.categorySlugs,
      filtersState.brandSlugs,
      filtersState.powerTypes,
      filtersState.keyword
    ],
    placeholderData: keepPreviousData,
    queryFn: () =>
      apiClient.listModels({
        categorySlugs: filtersState.categorySlugs,
        brandSlugs: filtersState.brandSlugs,
        powerTypes: filtersState.powerTypes,
        keyword: filtersState.keyword
      })
  });

  const filters = modelsQuery.data?.filters;
  const categories = ensureOtherOption((filters?.categories ?? []) as AircraftCategory[]);
  const brands = ensureOtherOption((filters?.brands ?? []) as WebBrand[]);
  const powerTypeOptions = ensureOtherOption(
    (filters?.powerTypes ?? ["electric", "fuel", "hybrid", "other"]).map((item) => ({
      slug: item,
      name: powerTypeLabels[item]
    }))
  );

  const visibleCategories = useMemo(
    () =>
      categories.filter((item) =>
        !categoryQuery ? true : item.name.toLowerCase().includes(categoryQuery)
      ),
    [categories, categoryQuery]
  );
  const visibleBrands = useMemo(
    () =>
      brands.filter((item) =>
        !brandQuery ? true : item.name.toLowerCase().includes(brandQuery)
      ),
    [brands, brandQuery]
  );

  function updateParams(next: Partial<ReturnType<typeof readModelFilterParams>>) {
    setSearchParams(buildModelFilterSearchParams(searchParams, next));
  }

  function toggleGroupValue(key: "categorySlugs" | "brandSlugs" | "powerTypes", value: string) {
    updateParams({
      [key]: toggleModelFilterValue(filtersState[key], value)
    });
  }

  const isGridLoading = modelsQuery.isLoading && !modelsQuery.data;
  const columnCount = useCircleColumnCount();
  const modelColumns = useMemo(
    () =>
      partitionByShortestColumn(
        (modelsQuery.data?.items ?? []) as WebModelListItem[],
        columnCount,
        estimateModelListItemRelativeHeight
      ),
    [modelsQuery.data?.items, columnCount]
  );
  const activeCategoryName = formatActiveNames(categories, filtersState.categorySlugs, "全部分类");
  const activeBrandName = formatActiveNames(brands, filtersState.brandSlugs, "全部品牌");
  const activePowerLabel = formatActiveNames(powerTypeOptions, filtersState.powerTypes, "全部动力");

  if (isGridLoading) {
    return (
      <SitePage className="w-full min-w-0 gap-4">
        <ModelsPageSkeleton count={10} />
      </SitePage>
    );
  }

  return (
    <SitePage className="w-full min-w-0 gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
        <div className="space-y-3 xl:order-2 xl:sticky xl:top-[5.5rem] xl:self-start">
          <FilterSection
            activeSlugs={filtersState.categorySlugs}
            compact
            items={visibleCategories}
            onClear={() => updateParams({ categorySlugs: [] })}
            onSearchChange={setCategorySearch}
            onToggle={(slug) => toggleGroupValue("categorySlugs", slug)}
            searchValue={categorySearch}
            searchable
            title="分类"
          />
          <FilterSection
            activeSlugs={filtersState.brandSlugs}
            compact
            items={visibleBrands}
            onClear={() => updateParams({ brandSlugs: [] })}
            onSearchChange={setBrandSearch}
            onToggle={(slug) => toggleGroupValue("brandSlugs", slug)}
            searchValue={brandSearch}
            searchable
            title="品牌"
            withLogo
          />
          <PowerSection
            activePowerTypes={filtersState.powerTypes}
            compact
            onReset={() => updateParams({ powerTypes: [] })}
            onToggle={(slug) => toggleGroupValue("powerTypes", slug)}
            options={powerTypeOptions}
          />
        </div>

        <div className="space-y-4 xl:order-1">
          <div className="space-y-3 bg-white px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">机型列表</div>
                <div className="text-[0.78rem] leading-5 text-muted-foreground">
                  {activeCategoryName} / {activeBrandName} / {activePowerLabel}
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => setKeywordDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") {
                      return;
                    }
                    event.preventDefault();
                    updateParams({ keyword: keywordDraft });
                  }}
                  placeholder="输入关键词后按回车搜索"
                  value={keywordDraft}
                />
              </div>
              <Button
                onClick={() => {
                  setCategorySearch("");
                  setBrandSearch("");
                  setSearchParams(new URLSearchParams());
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                清空筛选
              </Button>
            </div>
          </div>

          {modelsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>飞行器加载失败</AlertTitle>
              <AlertDescription>{modelsQuery.error.message}</AlertDescription>
            </Alert>
          ) : null}

          {modelsQuery.isSuccess ? (
            <div className="space-y-0">
              {modelsQuery.data.items.length > 0 ? (
                <div
                  className="grid w-full min-w-0"
                  style={{
                    gap: CIRCLE_CARD_COLUMN_GAP,
                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`
                  }}
                >
                  {modelColumns.map((column, colIndex) => (
                    <div
                      className="flex min-w-0 flex-col"
                      key={colIndex}
                      style={{ gap: CIRCLE_CARD_COLUMN_GAP }}
                    >
                      {column.map(({ item: model, absoluteIndex }) => (
                        <ModelCard index={absoluteIndex} key={model.id} model={model} />
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white px-5 py-8">
                  <div className="text-base font-semibold text-foreground">没有匹配机型</div>
                  <div className="mt-2 text-sm leading-6 text-muted-foreground">
                    可以清空部分筛选，或换一个关键词再试。
                  </div>
                </div>
              )}

              <FeedRefetchFooter show={modelsQuery.isRefetching} />
            </div>
          ) : null}
        </div>
      </div>
    </SitePage>
  );
}
