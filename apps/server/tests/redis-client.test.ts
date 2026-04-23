import { afterEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.fn((options: { url: string }) => ({
  options,
  connect: vi.fn(async () => undefined),
  flushDb: vi.fn(async () => undefined)
}));

vi.mock("redis", () => ({
  createClient: createClientMock
}));

const originalRedisUrl = process.env.REDIS_URL;

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();

  if (originalRedisUrl === undefined) {
    delete process.env.REDIS_URL;
  } else {
    process.env.REDIS_URL = originalRedisUrl;
  }
});

describe("redis client env bootstrap", () => {
  it("loads server env before resolving REDIS_URL at module import time", async () => {
    delete process.env.REDIS_URL;

    vi.doMock("../src/lib/load-env", () => ({
      ensureServerEnvLoaded: () => {
        process.env.REDIS_URL = "redis://env-loaded-first:6379/9";
      }
    }));

    await import("../src/modules/auth/redis-client");

    expect(createClientMock).toHaveBeenCalledWith({
      url: "redis://env-loaded-first:6379/9"
    });
  });
});
