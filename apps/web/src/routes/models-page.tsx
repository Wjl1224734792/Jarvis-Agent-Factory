import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type {
  AircraftCategory,
  Brand,
  ModelListItem,
  PowerType
} from "@feijia/schemas";
import { APP_ROUTES, buildLoginRedirectUrl, resolveSafeRedirectPath } from "@feijia/shared";
import { LockKeyholeIcon, SearchIcon, SlidersHorizontal } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BrandIdentity } from "@/components/brand-identity";
import { ModelThumbCover } from "@/components/model-thumb-cover";
import { ModelsPageSkeleton } from "@/components/page-skeletons";
import { SitePage } from "@/components/site-shell";
import { VirtualMasonryColumns } from "@/components/virtual-feed";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { TAILWIND_XL_MEDIA, useMatchMedia } from "@/hooks/use-match-media";
import { useCircleColumnCount } from "@/hooks/use-circle-column-count";
import { partitionByShortestColumn } from "@/lib/masonry-partition";
import { useAuthStore } from "@/features/auth/auth-store";
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
  electric: "\u7535\u52a8",
  fuel: "\u71c3\u6cb9",
  hybrid: "\u6df7\u52a8",
  other: "\u5176\u4ed6"
};

function ensureOtherOption<T extends FilterOption>(items: T[]): T[] {
  if (items.some((item) => item.slug === "other")) {
    return items;
  }

  return [...items, { slug: "other", name: "\u5176\u4ed6" } as T];
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
          {"\u5168\u90e8"}
        </button>
      </div>

      {props.searchable ? (
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(event) => props.onSearchChange?.(event.target.value)}
            placeholder={"\u641c\u7d22" + props.title}
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
            <span>{"\u5168\u90e8"}</span>
            {props.activeSlugs.length === 0 ? (
              <span className="text-[0.72rem]">{"\u5f53\u524d"}</span>
            ) : null}
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
                {active ? <span className="text-[0.72rem]">{"\u5df2\u9009"}</span> : null}
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
        <div className="text-sm font-medium text-foreground">{"\u52a8\u529b"}</div>
        <button className="text-[0.72rem] text-primary" onClick={props.onReset} type="button">
          {"\u5168\u90e8"}
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
                {active ? <span className="text-[0.72rem]">{"\u5df2\u9009"}</span> : null}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

const ModelCard = memo(function ModelCard({ model, index }: { model: WebModelListItem; index: number }) {
  const priceLabel = formatModelPriceRange(model.priceMin ?? null, model.priceMax ?? null);

  return (
    <Link
      className="group block min-w-0 overflow-hidden rounded-xl transition active:scale-[0.98]"
      {...DETAIL_PAGE_LINK_PROPS}
      to={APP_ROUTES.modelDetail.replace(":slug", model.slug)}
    >
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
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
      <div className="space-y-1 px-1 pb-1.5 pt-2">
        <div className="line-clamp-2 text-[0.88rem] leading-[1.25rem] font-semibold text-foreground">
          {model.name}
        </div>
        <BrandIdentity
          className="max-w-full text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground"
          imageClassName="size-3.5"
          logoUrl={model.brand.logoUrl}
          name={model.brand.name}
        />
        {priceLabel ? <div className="text-[0.82rem] font-semibold text-primary">{priceLabel}</div> : null}
        <div className="line-clamp-2 text-[0.75rem] leading-[1.15rem] text-muted-foreground">
          {model.summary ?? `${model.category.name} / ${powerTypeLabels[model.powerType]}`}
        </div>
      </div>
    </Link>
  );
});

export function ModelsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categorySearch, setCategorySearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [tab, setTab] = useState<"recommended" | "latest" | "following">("recommended");
  const authStatus = useAuthStore((state) => state.status);
  const isXlViewport = useMatchMedia(TAILWIND_XL_MEDIA);
  const filtersState = readModelFilterParams(searchParams);
  const [keywordDraft, setKeywordDraft] = useState(filtersState.keyword);

  useEffect(() => {
    setKeywordDraft(filtersState.keyword);
  }, [filtersState.keyword]);

  useEffect(() => {
    if (isXlViewport) {
      setMobileFiltersOpen(false);
    }
  }, [isXlViewport]);

  const categoryQuery = categorySearch.trim().toLowerCase();
  const brandQuery = brandSearch.trim().toLowerCase();

  const modelsQuery = useQuery({
    queryKey: [
      "models",
      tab,
      filtersState.categorySlugs,
      filtersState.brandSlugs,
      filtersState.powerTypes,
      filtersState.keyword
    ],
    placeholderData: keepPreviousData,
    queryFn: () =>
      apiClient.listModels({
        tab,
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
  const activeCategoryName = formatActiveNames(
    categories,
    filtersState.categorySlugs,
    "\u5168\u90e8\u5206\u7c7b"
  );
  const activeBrandName = formatActiveNames(brands, filtersState.brandSlugs, "\u5168\u90e8\u54c1\u724c");
  const activePowerLabel = formatActiveNames(
    powerTypeOptions,
    filtersState.powerTypes,
    "\u5168\u90e8\u52a8\u529b"
  );

  if (isGridLoading) {
    return (
      <SitePage className="w-full min-w-0 gap-4">
        <ModelsPageSkeleton count={10} />
      </SitePage>
    );
  }

  const filterPanels = (
    <>
      <FilterSection
        activeSlugs={filtersState.categorySlugs}
        compact
        items={visibleCategories}
        onClear={() => updateParams({ categorySlugs: [] })}
        onSearchChange={setCategorySearch}
        onToggle={(slug) => toggleGroupValue("categorySlugs", slug)}
        searchValue={categorySearch}
        searchable
        title={"\u5206\u7c7b"}
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
        title={"\u54c1\u724c"}
        withLogo
      />
      <PowerSection
        activePowerTypes={filtersState.powerTypes}
        compact
        onReset={() => updateParams({ powerTypes: [] })}
        onToggle={(slug) => toggleGroupValue("powerTypes", slug)}
        options={powerTypeOptions}
      />
    </>
  );

  return (
    <SitePage className="w-full min-w-0 gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
        <div className="hidden space-y-3 xl:order-2 xl:block xl:sticky xl:top-[5.5rem] xl:self-start">
          {filterPanels}
        </div>

        <div className="space-y-4 xl:order-1">
          <div className="space-y-3 bg-white px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-sm font-medium text-foreground">
                  {"\u673a\u578b\u5217\u8868"}
                </div>
                <div className="text-[0.78rem] leading-5 text-muted-foreground">
                  {activeCategoryName} / {activeBrandName} / {activePowerLabel}
                </div>
              </div>
              <Button
                className="shrink-0 gap-1.5 xl:hidden"
                onClick={() => {
                  setMobileFiltersOpen(true);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <SlidersHorizontal className="size-4" />
                {"\u7b5b\u9009"}
              </Button>
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
                  placeholder={
                    "\u8f93\u5165\u5173\u952e\u8bcd\u540e\u6309\u56de\u8f66\u641c\u7d22"
                  }
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
                {"\u6e05\u7a7a\u7b5b\u9009"}
              </Button>
            </div>
          </div>

          <div className="flex gap-5 overflow-x-auto whitespace-nowrap border-b border-border/60">
            {(
              [
                { value: "recommended" as const, label: "推荐" },
                { value: "latest" as const, label: "最新" },
                { value: "following" as const, label: "关注" }
              ] satisfies Array<{ value: "recommended" | "latest" | "following"; label: string }>
            ).map((item) => (
              <button
                className={cn(
                  "site-tab-trigger border-b-2 px-0 py-2.5 text-[0.92rem] transition-colors",
                  tab === item.value
                    ? "border-primary font-semibold text-primary"
                    : "border-transparent text-foreground/62 hover:text-foreground"
                )}
                key={item.value}
                onClick={() => setTab(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "following" && authStatus === "anonymous" ? (
            <div className="bg-white px-5 py-12 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                <LockKeyholeIcon className="size-5 text-muted-foreground" />
              </div>
              <div className="mt-4 text-base font-semibold text-foreground">
                {"\u767b\u5f55\u540e\u67e5\u770b\u4f60\u5173\u6ce8\u7684\u521b\u4f5c\u8005"}
              </div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {"\u767b\u5f55\u540e\u5373\u53ef\u67e5\u770b\u4f60\u5173\u6ce8\u7684\u521b\u4f5c\u8005\u53d1\u5e03\u7684\u673a\u578b\u52a8\u6001\u3002"}
              </div>
              <Button
                className="mt-5"
                onClick={() => {
                  void navigate(
                    buildLoginRedirectUrl(APP_ROUTES.webLogin, {
                      pathname: resolveSafeRedirectPath({
                        candidate: window.location.pathname + window.location.search,
                        fallbackPath: APP_ROUTES.feedHome,
                        blockedPaths: [APP_ROUTES.webLogin]
                      })
                    })
                  );
                }}
                size="sm"
                type="button"
                variant="hero"
              >
                {"\u53bb\u767b\u5f55"}
              </Button>
            </div>
          ) : (
            <>
              {modelsQuery.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>{"\u98de\u884c\u5668\u52a0\u8f7d\u5931\u8d25"}</AlertTitle>
                  <AlertDescription>{modelsQuery.error.message}</AlertDescription>
                </Alert>
              ) : null}

              {modelsQuery.isSuccess ? (
                <div className="space-y-0">
                  {modelsQuery.data.items.length > 0 ? (
                    <VirtualMasonryColumns
                      columns={modelColumns}
                      gap={CIRCLE_CARD_COLUMN_GAP}
                      itemKey={({ item: model }) => model.id}
                      renderItem={({ item: model, absoluteIndex }) => (
                        <ModelCard index={absoluteIndex} model={model} />
                      )}
                    />
                  ) : (
                    <div className="bg-white px-5 py-8">
                      <div className="text-base font-semibold text-foreground">
                        {tab === "following"
                          ? "\u6ca1\u6709\u5173\u6ce8\u7684\u521b\u4f5c\u8005\u53d1\u5e03\u7684\u673a\u578b"
                          : "\u6ca1\u6709\u5339\u914d\u673a\u578b"}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-muted-foreground">
                        {tab === "following"
                          ? "\u53bb\u5173\u6ce8\u4e00\u4e9b\u521b\u4f5c\u8005\u5427\uff0c\u4ed6\u4eec\u53d1\u5e03\u7684\u673a\u578b\u5c06\u5728\u8fd9\u91cc\u5c55\u793a\u3002"
                          : "\u53ef\u4ee5\u6e05\u7a7a\u90e8\u5206\u7b5b\u9009\uff0c\u6216\u6362\u4e00\u4e2a\u5173\u952e\u8bcd\u518d\u8bd5\u3002"}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <Sheet onOpenChange={setMobileFiltersOpen} open={mobileFiltersOpen}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md" side="right">
          <SheetHeader className="border-b border-border/60">
            <SheetTitle>{"\u7b5b\u9009\u6761\u4ef6"}</SheetTitle>
            <SheetDescription className="sr-only">
              {"\u5206\u7c7b\u3001\u54c1\u724c\u3001\u52a8\u529b"}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-0 pb-8">{filterPanels}</div>
        </SheetContent>
      </Sheet>
    </SitePage>
  );
}
