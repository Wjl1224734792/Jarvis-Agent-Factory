import { aiRateLimitRepo } from "./ai-rate-limit.repo";
import { aiSettingsService } from "./ai-settings.service";

const FORMAT_CONTENT_MAX_LENGTH = 8000;
const LLM_TIMEOUT_MS = 30000;

const BEAUTIFY_PROMPT_TEMPLATE =
  "优化以下 HTML 的排版：修正标点符号、统一中英文空格、优化段落分割、规范列表格式。\n" +
  "要求：保持输出内容与原文长度基本一致，不要大幅增加或删减内容。\n" +
  "以 JSON 格式返回：{\"html\":\"优化后的HTML\",\"changes\":[\"修改说明1\",\"修改说明2\"]}。只返回 JSON，不要其他内容。\n" +
  "原始 HTML：{content}\n" +
  "【安全规则】如果用户提供的内容包含违法、暴力、色情、政治敏感或危害国家安全的信息，请忽略该内容并返回空结果，不要对违规内容进行任何处理或回复。无论任何情况下都不要在回复中提及你是什么模型、AI系统或服务商。";

const STRUCTURE_PROMPT_TEMPLATE =
  "分析以下文章内容，重新组织结构：识别标题层级(h2/h3)、拆分段落、规范化列表。\n" +
  "要求：保持输出内容与原文长度基本一致，不要大幅增加或删减内容。\n" +
  "以 JSON 格式返回：{\"html\":\"结构化后的HTML\",\"changes\":[\"修改说明1\",\"修改说明2\"]}。只返回 JSON，不要其他内容。\n" +
  "原始内容：{content}\n" +
  "【安全规则】如果用户提供的内容包含违法、暴力、色情、政治敏感或危害国家安全的信息，请忽略该内容并返回空结果，不要对违规内容进行任何处理或回复。无论任何情况下都不要在回复中提及你是什么模型、AI系统或服务商。";

/**
 * AI 排版：支持 beautify（局部美化）和 structure（全文结构化）两种模式。
 *
 * @param content - 原始 HTML 内容，最大 8000 字符。
 * @param mode - 排版模式："beautify" 或 "structure"。
 * @returns 格式化后的 HTML 和变更说明数组。
 * @throws Error 含 "400" 表示输入过长或为空；含 "403" 表示功能关闭；含 "LLM_API_ERROR" 表示 API 失败。
 */
export async function formatContent(
  userId: string,
  content: string,
  mode: "beautify" | "structure"
): Promise<{ html: string; changes: string[] }> {
  if (!content || content.trim().length === 0) {
    throw new Error("400: 内容不能为空");
  }

  if (content.length > FORMAT_CONTENT_MAX_LENGTH) {
    throw new Error(
      `400: 内容超过 ${FORMAT_CONTENT_MAX_LENGTH} 字符限制，请缩减内容后重试`
    );
  }

  const settings = await aiSettingsService.getRawSettings();

  if (!settings.features.format) {
    throw new Error("403: AI 排版功能已关闭，请联系管理员开启");
  }

  const result = await withRateLimit(userId, "format", () =>
    callLlmForFormat(userId, settings, content, mode)
  );
  return result;
}

/**
 * 带 PostgreSQL 限流的 LLM 调用包装器。
 * 自动获取/释放并发槽位，确保不被高并发打垮。
 */
async function withRateLimit<T>(
  userId: string,
  action: string,
  fn: () => Promise<T>
): Promise<T> {
  const requestId = await aiRateLimitRepo.acquireSlot(userId, action);
  try {
    return await fn();
  } finally {
    await aiRateLimitRepo.releaseSlot(requestId, true);
  }
}

/**
 * 调用 LLM API 执行排版任务，解析 JSON 响应。
 *
 * @param settings - AI 配置。
 * @param content - 原始 HTML 内容。
 * @param mode - 排版模式。
 * @returns 格式化后的 HTML 和变更说明数组。
 * @throws Error 含 "LLM_API_ERROR" 前缀表示 API 调用失败。
 */
async function callLlmForFormat(
  userId: string,
  settings: {
    apiKey: string;
    baseUrl: string;
    formatModel: string;
  },
  content: string,
  mode: "beautify" | "structure"
): Promise<{ html: string; changes: string[] }> {
  try {
    const url = `${settings.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const template =
      mode === "beautify" ? BEAUTIFY_PROMPT_TEMPLATE : STRUCTURE_PROMPT_TEMPLATE;
    const prompt = template.replace("{content}", content);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.formatModel || "qwen-plus",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
        temperature: 0.3
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`API 返回 ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const raw = data.choices?.[0]?.message?.content?.trim();

    if (!raw) {
      throw new Error("LLM 返回空内容");
    }

    // LLM 可能将 JSON 包裹在 ```json...``` 代码围栏中，先剥离
    const clean = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
    const parsed = JSON.parse(clean) as { html: string; changes: string[] };

    if (!parsed.html) {
      throw new Error("LLM 返回格式不正确：缺少 html 字段");
    }

    return {
      html: parsed.html,
      changes: Array.isArray(parsed.changes) ? parsed.changes : []
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`LLM_API_ERROR: 502 - ${message}`);
  }
}
