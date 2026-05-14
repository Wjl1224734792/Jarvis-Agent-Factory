import { db, postsTable } from "@feijia/db";
import { eq } from "drizzle-orm";
import { CacheService } from "../../lib/cache-service";
import { aiRateLimitRepo } from "./ai-rate-limit.repo";
import { aiSettingsService } from "./ai-settings.service";

const CACHE_TTL_SECONDS = 86400;
const RATE_LIMIT_HOURS = 24;
const CONTENT_MAX_LENGTH = 4000;
const FORMAT_CONTENT_MAX_LENGTH = 8000;
const LLM_TIMEOUT_MS = 30000;
const RATE_LIMIT_MS = RATE_LIMIT_HOURS * 3600 * 1000;

const SUMMARY_PROMPT_TEMPLATE =
  "你是一个专业的文章摘要助手。请对以下文章内容进行摘要。\n" +
  "要求：摘要字数 150-300 字，概括核心观点，保持客观中立，使用流畅中文。\n" +
  "文章内容：{content}";

const BEAUTIFY_PROMPT_TEMPLATE =
  "优化以下 HTML 的排版：修正标点符号、统一中英文空格、优化段落分割、规范列表格式。" +
  "以 JSON 格式返回：{\"html\":\"优化后的HTML\",\"changes\":[\"修改说明1\",\"修改说明2\"]}。只返回 JSON，不要其他内容。\n" +
  "原始 HTML：{content}";

const STRUCTURE_PROMPT_TEMPLATE =
  "分析以下文章内容，重新组织结构：识别标题层级(h2/h3)、拆分段落、规范化列表。" +
  "以 JSON 格式返回：{\"html\":\"结构化后的HTML\",\"changes\":[\"修改说明1\",\"修改说明2\"]}。只返回 JSON，不要其他内容。\n" +
  "原始内容：{content}";

const cache = new CacheService();

/**
 * 生成文章 AI 摘要。三层缓存路径：Redis -> DB -> LLM API。
 *
 * @param postId - 文章 ID。
 * @param content - 文章内容（可选，LLM 生成时使用）。
 * @returns 摘要文本及是否来自缓存。
 * @throws Error 含 "403" 表示功能关闭；含 "429" 表示频率限制；含 "LLM_API_ERROR" 表示 API 失败。
 */
export async function generateSummary(
  userId: string,
  postId: string,
  content?: string
): Promise<{ summary: string; cached: boolean }> {
  const settings = await aiSettingsService.getRawSettings();

  if (!settings.features.summary) {
    throw new Error("403: AI 摘要功能已关闭，请联系管理员开启");
  }

  return cache.getOrSet<{ summary: string; cached: boolean }>(
    `ai:summary:${postId}`,
    CACHE_TTL_SECONDS,
    async () => {
      const rows = await db
        .select({
          aiSummary: postsTable.aiSummary,
          aiSummaryGeneratedAt: postsTable.aiSummaryGeneratedAt
        })
        .from(postsTable)
        .where(eq(postsTable.id, postId))
        .limit(1);

      const post = rows[0];

      if (!post) {
        if (!content) {
          throw new Error("文章不存在");
        }

        const summaryText = await withRateLimit(userId, "summary", () =>
          callLlm(userId, settings, content.slice(0, CONTENT_MAX_LENGTH))
        );
        return { summary: summaryText, cached: false };
      }

      if (post.aiSummary) {
        const generatedAt = post.aiSummaryGeneratedAt;
        if (generatedAt) {
          const elapsed = Date.now() - new Date(generatedAt).getTime();
          if (elapsed < RATE_LIMIT_MS) {
            throw new Error(
              "429: 该文章 24 小时内已生成过摘要，请稍后再试"
            );
          }
        }

        return { summary: post.aiSummary, cached: true };
      }

      const truncatedContent = (content ?? "").slice(0, CONTENT_MAX_LENGTH);
      const summary = await withRateLimit(userId, "summary", () =>
        callLlm(userId, settings, truncatedContent)
      );

      await db
        .update(postsTable)
        .set({
          aiSummary: summary,
          aiSummaryGeneratedAt: new Date()
        })
        .where(eq(postsTable.id, postId));

      return { summary, cached: false };
    }
  );
}

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
 * 调用 OpenAI 兼容 LLM API 生成摘要。
 *
 * @param settings - AI 配置（apiKey / baseUrl / summaryModel）。
 * @param content - 待摘要的文章内容（已裁剪）。
 * @returns 生成的摘要文本。
 * @throws Error 含 "LLM_API_ERROR" 前缀表示 API 调用失败。
 */
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

async function callLlm(
  userId: string,
  settings: { apiKey: string; baseUrl: string; summaryModel: string },
  content: string
): Promise<string> {
  try {
    const url = `${settings.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const prompt = SUMMARY_PROMPT_TEMPLATE.replace("{content}", content);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.summaryModel || "qwen-plus",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512,
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

    const result = data.choices?.[0]?.message?.content?.trim();

    if (!result) {
      throw new Error("LLM 返回空摘要");
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`LLM_API_ERROR: 502 - ${message}`);
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
