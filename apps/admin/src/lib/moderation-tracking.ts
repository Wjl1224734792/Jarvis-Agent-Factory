export type ModerationTraceTone = "default" | "success" | "warning" | "muted";

export type ModerationTraceItem = {
  label: string;
  value: string;
  tone?: ModerationTraceTone;
};

export const MODERATION_TRACE_PLACEHOLDER =
  "现有接口暂未返回 AI 结果摘要、回调状态或人工复核记录，当前仅展示审核模式、队列数量和最终状态。";

export function formatModerationCount(
  count: number,
  options: {
    unit?: string;
    zeroText?: string;
  } = {}
) {
  if (count <= 0) {
    return options.zeroText ?? "0 项";
  }

  return `${count} ${options.unit ?? "项"}`;
}

export function buildModerationTraceItems(
  items: Array<{
    label: string;
    count: number;
    tone?: ModerationTraceTone;
    hideWhenZero?: boolean;
    zeroText?: string;
    unit?: string;
  }>
): ModerationTraceItem[] {
  return items
    .filter((item) => !(item.hideWhenZero && item.count <= 0))
    .map((item) => ({
      label: item.label,
      value: formatModerationCount(item.count, {
        unit: item.unit,
        zeroText: item.zeroText
      }),
      tone: item.tone
    }));
}

export function resolveModerationModeCopy(input: {
  enabled: boolean;
  aiCopy?: string;
  manualCopy?: string;
  autoCopy?: string;
}) {
  if (input.enabled) {
    return (
      input.aiCopy ?? "新提交内容会先进入 AI 审核；仍需人工处理的对象会继续留在当前审核队列。"
    );
  }

  return (
    input.manualCopy ??
    input.autoCopy ??
    "新提交内容会直接进入人工审核队列，不再按“自动通过”语义处理。"
  );
}
