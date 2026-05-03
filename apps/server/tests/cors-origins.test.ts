import { APP_PORTS } from "@feijia/shared";
import { afterEach, describe, expect, it } from "vitest";
import { buildDefaultCorsOrigins, parseDevPort } from "../src/lib/cors-origins";

describe("cors default origins", () => {
  const prevWeb = process.env.WEB_DEV_PORT;
  const prevAdmin = process.env.ADMIN_DEV_PORT;

  afterEach(() => {
    if (prevWeb === undefined) {
      delete process.env.WEB_DEV_PORT;
    } else {
      process.env.WEB_DEV_PORT = prevWeb;
    }
    if (prevAdmin === undefined) {
      delete process.env.ADMIN_DEV_PORT;
    } else {
      process.env.ADMIN_DEV_PORT = prevAdmin;
    }
  });

  it("parseDevPort falls back when empty or invalid", () => {
    expect(parseDevPort(undefined, 3000)).toBe(3000);
    expect(parseDevPort("", 3000)).toBe(3000);
    expect(parseDevPort("abc", 3000)).toBe(3000);
    expect(parseDevPort("0", 3000)).toBe(3000);
    expect(parseDevPort("65536", 3000)).toBe(3000);
  });

  it("parseDevPort accepts 1–65535", () => {
    expect(parseDevPort("1", 3000)).toBe(1);
    expect(parseDevPort("65535", 3000)).toBe(65535);
  });

  it("buildDefaultCorsOrigins uses APP_PORTS when env unset", () => {
    delete process.env.WEB_DEV_PORT;
    delete process.env.ADMIN_DEV_PORT;
    expect(buildDefaultCorsOrigins()).toEqual([
      `http://localhost:${APP_PORTS.web}`,
      `http://127.0.0.1:${APP_PORTS.web}`,
      `http://localhost:${APP_PORTS.admin}`,
      `http://127.0.0.1:${APP_PORTS.admin}`
    ]);
  });

  it("buildDefaultCorsOrigins respects WEB_DEV_PORT and ADMIN_DEV_PORT", () => {
    process.env.WEB_DEV_PORT = "7001";
    process.env.ADMIN_DEV_PORT = "7002";
    expect(buildDefaultCorsOrigins()).toEqual([
      "http://localhost:7001",
      "http://127.0.0.1:7001",
      "http://localhost:7002",
      "http://127.0.0.1:7002"
    ]);
  });
});
