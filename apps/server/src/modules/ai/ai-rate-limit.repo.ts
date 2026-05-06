import { aiRateLimitsTable, aiRequestsTable, db } from "@feijia/db";
import { and, eq, gte, lt, sql } from "drizzle-orm";

const MAX_CONCURRENT = 5;           // 全局最大并发 LLM 调用数
const USER_RATE_LIMIT = 3;          // 单用户每分钟最大请求数
const USER_RATE_WINDOW_MS = 60000;  // 1 分钟
const OLD_REQUEST_MAX_AGE_MS = 300_000; // 5 分钟后清理旧请求

/**
 * PostgreSQL 防高并发限流服务
 *
 * 两层限流：
 * 1. 全局并发控制 — 同时最多 MAX_CONCURRENT 个 LLM 请求在处理中
 * 2. 用户速率限制 — 单用户每分钟最多 USER_RATE_LIMIT 次 AI 请求
 */
export const aiRateLimitRepo = {
  /**
   * 尝试获取 LLM 调用许可。超出并发或频率限制时抛出对应错误。
   *
   * @param userId - 请求用户 ID
   * @param action - 操作类型 "summary" | "format"
   * @returns requestId — 完成时需传入 releaseSlot 释放槽位
   * @throws "429: 当前使用人数较多，请稍后重试" — 全局并发满
   * @throws "429: 请求过于频繁，请稍后再试" — 用户频率超限
   */
  async acquireSlot(
    userId: string,
    action: string
  ): Promise<string> {
    // 清理过期请求
    await cleanupOldRequests();

    // 1. 全局并发控制
    const processing = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiRequestsTable)
      .where(eq(aiRequestsTable.status, "processing"));

    if ((processing[0]?.count ?? 0) >= MAX_CONCURRENT) {
      throw new Error("429: 当前使用人数较多，请稍后重试");
    }

    // 2. 用户速率限制（滑动窗口）
    const now = Date.now();
    const windowKey = Math.floor(now / USER_RATE_WINDOW_MS).toString();
    const rateLimitId = `${userId}:${action}:${windowKey}`;

    const existing = await db
      .select({ counter: aiRateLimitsTable.counter })
      .from(aiRateLimitsTable)
      .where(eq(aiRateLimitsTable.id, rateLimitId))
      .limit(1);

    if ((existing[0]?.counter ?? 0) >= USER_RATE_LIMIT) {
      throw new Error("429: 请求过于频繁，请稍后再试");
    }

    // 更新速率计数器 — upsert
    if (existing.length > 0) {
      await db
        .update(aiRateLimitsTable)
        .set({ counter: sql`${aiRateLimitsTable.counter} + 1` })
        .where(eq(aiRateLimitsTable.id, rateLimitId));
    } else {
      await db.insert(aiRateLimitsTable).values({
        id: rateLimitId,
        counter: 1,
        windowStart: new Date(now)
      });
    }

    // 插入并发请求记录
    const requestId = `${userId}:${action}:${now}`;
    await db.insert(aiRequestsTable).values({
      id: requestId,
      userId,
      action,
      status: "processing"
    });

    return requestId;
  },

  /** 释放并发槽位 */
  async releaseSlot(requestId: string, success: boolean): Promise<void> {
    await db
      .update(aiRequestsTable)
      .set({ status: success ? "completed" : "failed" })
      .where(eq(aiRequestsTable.id, requestId));
  }
};

/** 删除超时的旧请求记录，防止表膨胀 */
async function cleanupOldRequests(): Promise<void> {
  const cutoff = new Date(Date.now() - OLD_REQUEST_MAX_AGE_MS);
  await db
    .delete(aiRequestsTable)
    .where(
      and(
        lt(aiRequestsTable.createdAt, cutoff),
        eq(aiRequestsTable.status, "processing")
      )
    );
}
