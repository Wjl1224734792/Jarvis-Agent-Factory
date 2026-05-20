export function formatModelMetric(
  value: number | null,
  formatter: (input: number) => string
) {
  return value === null ? "未公开" : formatter(value);
}

export function formatModelPriceRange(priceMin: number | null, priceMax: number | null) {
  if (priceMin === null || priceMax === null) {
    return null;
  }

  if (priceMin === priceMax) {
    return `¥${priceMin.toLocaleString("zh-CN")}`;
  }

  return `¥${priceMin.toLocaleString("zh-CN")} - ¥${priceMax.toLocaleString("zh-CN")}`;
}

export function getHotModelsSidebarQueryKey(categorySlug?: string | null) {
  return ["hot-models-sidebar", categorySlug ?? null] as const;
}
