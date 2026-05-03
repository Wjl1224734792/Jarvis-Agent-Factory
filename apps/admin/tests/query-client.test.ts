import { describe, expect, it } from "vitest";
import { shouldRetryAdminQuery } from "../src/lib/query-client";

describe("admin query retry policy", () => {
  it("does not retry non-retriable api errors", () => {
    expect(shouldRetryAdminQuery(0, new Error("Request failed with status 401"))).toBe(false);
    expect(shouldRetryAdminQuery(0, new Error("Forbidden"))).toBe(false);
  });

  it("stops retrying after the first failure", () => {
    expect(shouldRetryAdminQuery(1, new Error("Temporary error"))).toBe(false);
  });

  it("allows a single retry for transient failures", () => {
    expect(shouldRetryAdminQuery(0, new Error("Network timeout"))).toBe(true);
  });
});
