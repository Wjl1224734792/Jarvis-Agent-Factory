export function formatModelMetric(value: number | null, formatter: (input: number) => string) {
  return value === null ? "未公开" : formatter(value);
}
