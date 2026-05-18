import { createClient, type RedisClientType } from "redis";
import { ensureServerEnvLoaded } from "../../lib/load-env";

// Test helpers may import this module before app.ts evaluates, so load env
// here before resolving REDIS_URL.
ensureServerEnvLoaded();

/**
 * Redis 连接 URL。
 *
 * 生产环境中必须通过 REDIS_URL 环境变量配置，禁止硬编码凭据。
 * 本地开发请在 .env 中设置 REDIS_URL。
 */
const redisUrl = process.env.REDIS_URL?.trim();

// 测试环境下可能未配置 REDIS_URL，允许延迟报错
if (!redisUrl && process.env.NODE_ENV !== "test") {
  throw new Error(
    "REDIS_URL is not set. Please configure it in your .env file. " +
    "Example: redis://:your_password@localhost:6379/0"
  );
}

export const redis: RedisClientType = createClient({
  url: redisUrl || "redis://localhost:6379/0",
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 20) {
        return new Error("Redis 重试次数耗尽");
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

redis.on("error", (err) => {
  console.error("[Redis] 连接错误:", err.message);
});

/**
 * 连接状态标志。
 * 使用 connectingPromise 防止并发调用时多次 connect()。
 */
let connected = false;
let connectingPromise: Promise<void> | null = null;

/**
 * 确保 Redis 已连接。
 *
 * 使用 Promise 锁模式防止并发调用时多次执行 redis.connect()。
 * 多个异步调用同时进入时，只有第一个会发起连接，其余等待同一 Promise。
 */
export async function ensureRedisConnected() {
  if (connected) {
    return;
  }

  if (!connectingPromise) {
    connectingPromise = redis.connect().then(() => {
      connected = true;
    }).catch((error: unknown) => {
      connectingPromise = null;
      throw error;
    });
  }

  await connectingPromise;
}

export async function resetRedisForTesting() {
  await ensureRedisConnected();
  await redis.flushDb();
}
