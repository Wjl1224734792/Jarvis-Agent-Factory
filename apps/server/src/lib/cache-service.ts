import { createClient, type RedisClientType } from "redis";
import { logger } from "./logger";

/**
 * 通用缓存服务 — 读穿（cache-aside）模式 + 自动降级。
 *
 * Redis 不可用时自动降级为直接读取数据源，不抛异常。
 */
export class CacheService {
  private readonly redis: RedisClientType;

  constructor() {
    this.redis = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379/0"
    });
  }

  /**
   * 读穿缓存：先查 Redis → 未命中 → 调 fetchFn → 写回 Redis。
   *
   * @param key - 缓存 key，格式如 `ai:summary:<postId>`
   * @param ttlSeconds - 过期时间（秒）
   * @param fetchFn - 缓存未命中时的数据获取函数
   * @returns 缓存值或 fetchFn 返回值
   */
  async getOrSet<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
    try {
      if (!this.redis.isOpen) {
        await this.redis.connect();
      }

      const cached = await this.redis.get(key);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      logger.warn("Redis 操作失败，降级读取数据源", {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    const value = await fetchFn();

    try {
      if (!this.redis.isOpen) {
        await this.redis.connect();
      }

      await this.redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (error) {
      logger.warn("Redis 写入失败，降级跳过缓存", {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return value;
  }

  /**
   * 主动清除指定 key 的缓存。
   *
   * @param key - 要清除的缓存 key
   */
  async invalidate(key: string): Promise<void> {
    try {
      if (!this.redis.isOpen) {
        await this.redis.connect();
      }

      await this.redis.del(key);
    } catch (error) {
      logger.warn("Redis invalidate 失败，静默降级", {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
