import { useQuery } from "@tanstack/react-query";
import type { AircraftCategory, Brand } from "@feijia/schemas";
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
import { apiClient } from "../lib/api-client";

const powerTypeLabels = {
  electric: "电动",
  fuel: "燃油",
  hybrid: "混动"
} as const;

function BrandFilter({
  brands,
  activeBrandSlug,
  onSelectBrand
}: {
  brands: Brand[];
  activeBrandSlug: string | null;
  onSelectBrand: (slug: string | null) => void;
}) {
  return (
    <Card className="rounded-[1.125rem] border-border/80">
      <CardHeader>
        <CardTitle className="text-lg">品牌</CardTitle>
        <CardDescription>先从品牌收敛结果。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {brands.length > 0 ? (
          brands.map((brand) => (
            <Button
              className="justify-start rounded-full"
              key={brand.id}
              onClick={() => {
                onSelectBrand(activeBrandSlug === brand.slug ? null : brand.slug);
              }}
              type="button"
              variant={activeBrandSlug === brand.slug ? "default" : "ghost"}
            >
              {brand.name}
            </Button>
          ))
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
      <TabsList variant="default">
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
    <main className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 rounded-[1.25rem] bg-card px-6 py-7 ring-1 ring-border/80 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>飞行器库</Badge>
          <Badge variant="outline">按条件浏览</Badge>
        </div>
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            先用分类和品牌收敛，再进入参数和口碑做判断。
          </h1>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            这里按飞行器类型、品牌和动力方式浏览。逻辑尽量简单，减少来回切换。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
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

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-card px-4 py-4 shadow-sm">
          <Badge variant="outline">
            <SlidersHorizontalIcon />
            动力类型
          </Badge>
          {(filters?.powerTypes ?? []).map((powerType) => (
            <Button
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
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-[104px] xl:self-start">
          <BrandFilter
            activeBrandSlug={brandSlug}
            brands={filters?.brands ?? []}
            onSelectBrand={(slug) => {
              updateParams({ brandSlug: slug });
            }}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card px-4 py-4 shadow-sm">
            <div className="text-sm text-muted-foreground">
              当前条件下共 <span className="font-semibold text-foreground">{modelsQuery.data?.total ?? 0}</span> 个机型
            </div>
            <Badge variant="secondary">
              <SearchCheckIcon />
              {categorySlug || brandSlug || powerTypes.length ? "筛选已生效" : "显示全部"}
            </Badge>
          </div>

          {modelsQuery.isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Card className="rounded-[1.125rem] border-border/80" key={index}>
                <CardHeader>
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-8 w-3/5 animate-pulse rounded bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))
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

          {modelsQuery.isSuccess
            ? modelsQuery.data.items.map((model) => (
                <article
                  className="rounded-[1.125rem] border border-border/80 bg-card px-6 py-6 shadow-sm"
                  key={model.id}
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{model.brand.name}</Badge>
                        <Badge variant="outline">{model.category.name}</Badge>
                        <Badge variant="outline">{powerTypeLabels[model.powerType]}</Badge>
                      </div>
                      <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                        {model.name}
                      </h3>
                      <p className="mt-3 text-base leading-8 text-muted-foreground">
                        {model.summary ?? "可继续进入详情页查看参数、评分和用户点评。"}
                      </p>
                    </div>

                    <Button asChild>
                      <Link to={APP_ROUTES.models + "/" + model.slug}>
                        查看详情
                        <ArrowRightIcon data-icon="inline-end" />
                      </Link>
                    </Button>
                  </div>
                </article>
              ))
            : null}
        </div>
      </section>
    </main>
  );
}
