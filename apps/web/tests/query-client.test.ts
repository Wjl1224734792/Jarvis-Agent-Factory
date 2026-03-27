import { describe, expect, it } from "vitest";
import { shouldRetryQuery } from "../src/lib/query-client";
import { buildPublishStatusPath } from "../src/lib/web-routes";

describe("query retry policy", () => {
  it("does not retry 404-like errors", () => {
    expect(shouldRetryQuery(0, new Error("Post not found."))).toBe(false);
    expect(shouldRetryQuery(0, new Error("Request failed with status 404"))).toBe(false);
  });

  it("does not retry after the second failure", () => {
    expect(shouldRetryQuery(2, new Error("Temporary error"))).toBe(false);
  });

  it("retries transient errors before max failures", () => {
    expect(shouldRetryQuery(0, new Error("Network timeout"))).toBe(true);
  });
});

describe("publish status routing", () => {
  it("builds publish status paths for each content kind", () => {
    expect(buildPublishStatusPath("article", "post_1")).toBe("/publish/status/article/post_1");
    expect(buildPublishStatusPath("moment", "post_2")).toBe("/publish/status/moment/post_2");
    expect(buildPublishStatusPath("aircraft", "sub_3")).toBe("/publish/status/aircraft/sub_3");
    expect(buildPublishStatusPath("ranking", "ranking_4")).toBe("/publish/status/ranking/ranking_4");
  });
});
