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
