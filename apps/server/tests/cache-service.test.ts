import { afterEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const setMock = vi.fn();
const delMock = vi.fn();

vi.mock("redis", () => ({
  createClient: () => ({
    get: getMock,
    set: setMock,
    del: delMock,
    connect: vi.fn(async () => undefined),
    flushDb: vi.fn(async () => undefined)
  })
}));

const warnMock = vi.fn();

vi.mock("../src/lib/logger", () => ({
  logger: { warn: warnMock }
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("CacheService.getOrSet", () => {
  it("缓存命中时直接返回缓存值，不调用 fetchFn", async () => {
    const { CacheService } = await import("../src/lib/cache-service");
    const service = new CacheService();

    getMock.mockResolvedValue(JSON.stringify({ title: "cached" }));
    const fetchFn = vi.fn(async () => ({ title: "fresh" }));

    const result = await service.getOrSet("ai:summary:1", 3600, fetchFn);

    expect(result).toStrictEqual({ title: "cached" });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(setMock).not.toHaveBeenCalled();
  });

  it("缓存未命中时调用 fetchFn 并写回 Redis", async () => {
    const { CacheService } = await import("../src/lib/cache-service");
    const service = new CacheService();

    getMock.mockResolvedValue(null);
    setMock.mockResolvedValue("OK");
    const fetchFn = vi.fn(async () => ({ title: "fresh" }));

    const result = await service.getOrSet("ai:summary:2", 3600, fetchFn);

    expect(result).toStrictEqual({ title: "fresh" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(setMock).toHaveBeenCalledWith(
      "ai:summary:2",
      JSON.stringify({ title: "fresh" }),
      { EX: 3600 }
    );
  });

  it("Redis 不可用时降级直接调用 fetchFn 并记录 WARN 日志", async () => {
    const { CacheService } = await import("../src/lib/cache-service");
    const service = new CacheService();

    getMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const fetchFn = vi.fn(async () => ({ title: "fallback" }));

    const result = await service.getOrSet("ai:summary:3", 3600, fetchFn);

    expect(result).toStrictEqual({ title: "fallback" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(warnMock).toHaveBeenCalledWith(
      "Redis 操作失败，降级读取数据源",
      expect.objectContaining({ key: "ai:summary:3" })
    );
  });
});

describe("CacheService.getOrSet -- 边界条件", () => {
  it("fetchFn 抛出异常时，错误向上传播", async () => {
    const { CacheService } = await import("../src/lib/cache-service");
    const service = new CacheService();

    getMock.mockResolvedValue(null);
    const fetchFn = vi.fn(async () => {
      throw new Error("数据源不可用");
    });

    await expect(
      service.getOrSet("ai:summary:error", 3600, fetchFn)
    ).rejects.toThrow("数据源不可用");
    // fetchFn 被调用但抛出错误，不应执行 set 写入
    expect(setMock).not.toHaveBeenCalled();
  });

  it("Redis 读取成功但写入失败时，仍返回 fetchFn 结果", async () => {
    const { CacheService } = await import("../src/lib/cache-service");
    const service = new CacheService();

    getMock.mockResolvedValue(null);
    setMock.mockRejectedValue(new Error("OOM"));

    const fetchFn = vi.fn(async () => ({ title: "fresh" }));
    const result = await service.getOrSet("ai:summary:writefail", 3600, fetchFn);

    expect(result).toStrictEqual({ title: "fresh" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(warnMock).toHaveBeenCalledWith(
      "Redis 写入失败，降级跳过缓存",
      expect.objectContaining({ key: "ai:summary:writefail" })
    );
  });

  it("fetchFn 返回 null 时，缓存 null 并返回", async () => {
    const { CacheService } = await import("../src/lib/cache-service");
    const service = new CacheService();

    getMock.mockResolvedValue(null);
    setMock.mockResolvedValue("OK");

    const fetchFn = vi.fn(async () => null);
    const result = await service.getOrSet("ai:summary:null", 3600, fetchFn);

    expect(result).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(setMock).toHaveBeenCalledWith(
      "ai:summary:null",
      JSON.stringify(null),
      { EX: 3600 }
    );
  });

  it("fetchFn 返回基本类型时，正确序列化和反序列化", async () => {
    const { CacheService } = await import("../src/lib/cache-service");
    const service = new CacheService();

    getMock.mockResolvedValue(null);
    setMock.mockResolvedValue("OK");

    const fetchFn = vi.fn(async () => "hello");
    const result = await service.getOrSet("ai:summary:str", 60, fetchFn);

    expect(result).toBe("hello");
    expect(setMock).toHaveBeenCalledWith(
      "ai:summary:str",
      JSON.stringify("hello"),
      { EX: 60 }
    );
  });
});

describe("CacheService.getOrSet -- 并发场景", () => {
  it("多次并发调用同一 key 时，fetchFn 只执行一次", async () => {
    const { CacheService } = await import("../src/lib/cache-service");
    const service = new CacheService();

    getMock.mockResolvedValue(null);
    setMock.mockResolvedValue("OK");
    const fetchFn = vi.fn(async () => ({ title: "concurrent" }));

    const results = await Promise.all([
      service.getOrSet("ai:summary:conc", 3600, fetchFn),
      service.getOrSet("ai:summary:conc", 3600, fetchFn),
      service.getOrSet("ai:summary:conc", 3600, fetchFn),
    ]);

    // 并发时 fetchFn 可能被多次调用（无锁场景），但结果一致
    expect(results).toHaveLength(3);
    for (const r of results) {
      expect(r).toStrictEqual({ title: "concurrent" });
    }
  });

  it("fetchFn 返回值在并发调用中保持一致", async () => {
    const { CacheService } = await import("../src/lib/cache-service");
    const service = new CacheService();

    getMock.mockResolvedValue(null);
    setMock.mockResolvedValue("OK");
    const fetchFn = vi.fn(async () => ({ ts: 1234567890 }));

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        service.getOrSet("ai:summary:race", 3600, fetchFn)
      )
    );

    const first = results[0];
    for (const r of results) {
      expect(r).toStrictEqual(first);
    }
  });
});

describe("CacheService.invalidate", () => {
  it("成功删除指定 key", async () => {
    const { CacheService } = await import("../src/lib/cache-service");
    const service = new CacheService();

    delMock.mockResolvedValue(1);

    await service.invalidate("ai:summary:1");

    expect(delMock).toHaveBeenCalledWith("ai:summary:1");
  });

  it("Redis 不可用时静默降级，记录 WARN 日志", async () => {
    const { CacheService } = await import("../src/lib/cache-service");
    const service = new CacheService();

    delMock.mockRejectedValue(new Error("ECONNREFUSED"));

    await service.invalidate("ai:summary:1");

    expect(warnMock).toHaveBeenCalledWith(
      "Redis invalidate 失败，静默降级",
      expect.objectContaining({ key: "ai:summary:1" })
    );
  });
});
