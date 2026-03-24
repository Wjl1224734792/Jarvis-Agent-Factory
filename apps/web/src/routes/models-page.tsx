import { useQuery } from "@tanstack/react-query";
import type { AircraftCategory, Brand, ModelListItem } from "@feijia/schemas";
import { APP_ROUTES } from "@feijia/shared";
import {
  ArrowRightIcon,
  RotateCcwIcon,
  SearchCheckIcon,
  SlidersHorizontalIcon
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { apiClient } from "../lib/api-client";

const powerTypeLabels = {
  electric: "电动",
  fuel: "燃油",
  hybrid: "混动"
} as const;

const coverClassNames = {
  electric:
    "bg-[linear-gradient(135deg,rgba(30,136,229,0.18),rgba(14,165,233,0.08))]",
  fuel:
    "bg-[linear-gradient(135deg,rgba(245,124,0,0.18),rgba(251,191,36,0.08))]",
  hybrid:
    "bg-[linear-gradient(135deg,rgba(8,145,178,0.18),rgba(16,185,129,0.08))]"
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

function BrandFilter({
  brands,
  activeBrandSlug,
  onSelectBrand
}: {
  brands: Brand[];
  activeBrandSlug: string | null;
  onSelectBrand: (slug: string | null) => void;
}) {
  const brandGroups = getBrandGroups(brands);

  return (
    <Card className="overflow-hidden rounded-[1.5rem] border-border/80 bg-card/90 shadow-sm">
      <CardHeader className="border-b border-border/70 pb-4">
        <CardTitle className="text-lg">品牌索引</CardTitle>
        <CardDescription>按字母收拢品牌，左侧固定区便于快速切换。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap gap-2">
          <Button
            className="rounded-full"
            onClick={() => {
              onSelectBrand(null);
            }}
            size="sm"
            type="button"
            variant={activeBrandSlug ? "outline" : "default"}
          >
            不限
          </Button>
          {brandGroups.map(([letter]) => (
            <Button
              className="rounded-full px-3"
              key={letter}
              onClick={() => {
                document.getElementById(`brand-group-${letter}`)?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest"
                });
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              {letter}
            </Button>
          ))}
        </div>

        {brandGroups.length > 0 ? (
          <div className="flex max-h-[440px] flex-col gap-5 overflow-y-auto pr-1">
            {brandGroups.map(([letter, group]) => (
              <section className="flex flex-col gap-3" id={`brand-group-${letter}`} key={letter}>
                <div className="text-xs font-semibold tracking-[0.28em] text-muted-foreground">
                  {letter}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.map((brand) => (
                    <Button
                      className="rounded-full"
                      key={brand.id}
                      onClick={() => {
                        onSelectBrand(activeBrandSlug === brand.slug ? null : brand.slug);
                      }}
                      size="sm"
                      type="button"
                      variant={activeBrandSlug === brand.slug ? "default" : "outline"}
                    >
                      {brand.name}
                    </Button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <Alert>
            <AlertTitle>暂无品牌</AlertTitle>
            <AlertDescription>当前筛选条件下没有可用品牌。</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
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
    <Tabs
      className="gap-0"
      onValueChange={(value) => {
        onSelectCategory(value === "all" ? null : value);
      }}
      value={activeCategorySlug ?? "all"}
    >
      <TabsList className="w-full max-w-full justify-start overflow-x-auto" variant="default">
        <TabsTrigger value="all">全部类型</TabsTrigger>
        {categories.map((category) => (
          <TabsTrigger key={category.id} value={category.slug}>
            {category.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function ModelCard({ model }: { model: ModelListItem }) {
  const detailPath = APP_ROUTES.modelDetail.replace(":slug", model.slug);
  const brandMonogram = model.brand.name.slice(0, 2).toUpperCase();

  return (
    <article className="group overflow-hidden rounded-[1.5rem] border border-border/80 bg-card/90 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
      <div className={cn("relative overflow-hidden px-5 pb-5 pt-4", coverClassNames[model.powerType])}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.9),transparent_48%)]" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{model.brand.name}</Badge>
            <Badge variant="outline">{model.category.name}</Badge>
          </div>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/85 text-sm font-semibold tracking-[0.18em] text-slate-700 shadow-sm backdrop-blur">
            {brandMonogram}
          </div>
        </div>

        <div className="relative mt-10">
          <div className="text-xs uppercase tracking-[0.28em] text-foreground/60">
            {powerTypeLabels[model.powerType]}
          </div>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            {model.name}
          </h3>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-5 pb-5 pt-4">
        <p className="min-h-16 text-sm leading-7 text-muted-foreground">
          {model.summary ?? "继续进入详情页查看参数、评分和真实用户点评。"}
        </p>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">分类</div>
            <div className="mt-1 font-medium text-foreground">{model.category.name}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">动力</div>
            <div className="mt-1 font-medium text-foreground">{powerTypeLabels[model.powerType]}</div>
          </div>
        </div>

        <Button asChild className="w-full rounded-2xl" variant="outline">
          <Link to={detailPath}>
            查看详情
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </article>
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
  const activeFilterPills = [
    categorySlug
      ? filters?.categories.find((item) => item.slug === categorySlug)?.name ?? categorySlug
      : null,
    brandSlug ? filters?.brands.find((item) => item.slug === brandSlug)?.name ?? brandSlug : null,
    ...powerTypes.map((item) => getPowerTypeLabel(item))
  ].filter((item): item is string => Boolean(item));

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
    <main className="flex flex-col gap-8">
      <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-card/90 px-6 py-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>飞行器库</Badge>
          <Badge variant="outline">卡片流浏览</Badge>
        </div>
        <div className="mt-6 max-w-4xl">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            像翻阅机型情报墙一样筛选、对比，再决定下一步要深入研究哪一台。
          </h1>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            顶部按飞行器类型切换，左侧保留品牌索引，右侧改为卡片网格。动力类型支持多选 OR
            逻辑，方便快速收敛到一批可比较机型。
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => {
              setSearchParams(new URLSearchParams());
            }}
            type="button"
            variant="outline"
          >
            <RotateCcwIcon data-icon="inline-start" />
            重置筛选
          </Button>
          <Badge className="h-auto rounded-full px-3 py-1 text-xs" variant="secondary">
            当前机型总数 {modelsQuery.data?.total ?? 0}
          </Badge>
        </div>
      </section>

      <section className="flex flex-col gap-4">
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

        <div className="flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-border/80 bg-card/90 px-5 py-5 shadow-sm">
          <Badge variant="outline">
            <SlidersHorizontalIcon />
            动力类型
          </Badge>
          <Button
            className="rounded-full"
            onClick={() => {
              updateParams({ powerTypes: [] });
            }}
            size="sm"
            type="button"
            variant={powerTypes.length ? "outline" : "default"}
          >
            不限
          </Button>
          {(filters?.powerTypes ?? []).map((powerType) => (
            <Button
              className="rounded-full"
              key={powerType}
              onClick={() => {
                togglePowerType(powerType);
              }}
              size="sm"
              type="button"
              variant={powerTypes.includes(powerType) ? "default" : "outline"}
            >
              {powerTypeLabels[powerType]}
            </Button>
          ))}
          <div className="text-sm text-muted-foreground">
            多选采用 OR 逻辑，同时命中任一动力类型的机型都会展示。
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-6 xl:self-start">
          <BrandFilter
            activeBrandSlug={brandSlug}
            brands={filters?.brands ?? []}
            onSelectBrand={(slug) => {
              updateParams({ brandSlug: slug });
            }}
          />
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-[1.5rem] border border-border/80 bg-card/90 px-5 py-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-muted-foreground">筛选结果</div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  当前条件下共 {modelsQuery.data?.total ?? 0} 个机型
                </div>
              </div>
              <Badge variant="secondary">
                <SearchCheckIcon />
                {activeFilterPills.length > 0 ? "筛选已生效" : "显示全部"}
              </Badge>
            </div>

            {activeFilterPills.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {activeFilterPills.map((item) => (
                  <Badge className="h-auto rounded-full px-3 py-1" key={item} variant="outline">
                    {item}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          {modelsQuery.isLoading ? (
            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card className="rounded-[1.5rem] border-border/80" key={index}>
                  <CardHeader>
                    <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="h-20 w-full animate-pulse rounded-2xl bg-muted" />
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
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
            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {modelsQuery.data.items.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
