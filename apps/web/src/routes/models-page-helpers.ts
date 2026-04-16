import type { ModelListItem } from "@feijia/schemas";

/** 卡片宽度归一化为 1 时的相对高度，用于瀑布流最短列估算 */
export function estimateModelListItemRelativeHeight(item: ModelListItem, absoluteIndex: number): number {
  const image = 3 / 4;
  const summaryLen = (item.summary?.length ?? 0) + item.name.length;
  const textBump = Math.min(0.14, summaryLen / 600);
  return image + 0.92 + textBump + (absoluteIndex % 4) * 0.015;
}

export type ModelFilterParams = {
  categorySlugs: string[];
  brandSlugs: string[];
  powerTypes: string[];
  keyword: string;
};

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function readModelFilterParams(searchParams: URLSearchParams): ModelFilterParams {
  return {
    categorySlugs: uniqueValues(searchParams.getAll("categorySlug")),
    brandSlugs: uniqueValues(searchParams.getAll("brandSlug")),
    powerTypes: uniqueValues(searchParams.getAll("powerType")),
    keyword: searchParams.get("keyword")?.trim() ?? ""
  };
}

export function toggleModelFilterValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function buildModelFilterSearchParams(
  current: URLSearchParams,
  next: Partial<ModelFilterParams>
) {
  const params = new URLSearchParams(current);

  if ("categorySlugs" in next) {
    params.delete("categorySlug");
    for (const slug of next.categorySlugs ?? []) {
      params.append("categorySlug", slug);
    }
  }

  if ("brandSlugs" in next) {
    params.delete("brandSlug");
    for (const slug of next.brandSlugs ?? []) {
      params.append("brandSlug", slug);
    }
  }

  if ("powerTypes" in next) {
    params.delete("powerType");
    for (const slug of next.powerTypes ?? []) {
      params.append("powerType", slug);
    }
  }

  if ("keyword" in next) {
    params.delete("keyword");
    if (next.keyword?.trim()) {
      params.set("keyword", next.keyword.trim());
    }
  }

  return params;
}
