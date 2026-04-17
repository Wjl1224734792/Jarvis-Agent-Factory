import { ApiClientError } from "@feijia/http-client";
import { describe, expect, it } from "vitest";
import { resolveBootstrapFailureAction } from "../src/features/auth/use-bootstrap-auth";

describe("useBootstrapAuth helpers", () => {
  it("keeps the persisted user on transient bootstrap failures", () => {
    expect(resolveBootstrapFailureAction("authenticated", new Error("Network timeout"))).toBe(
      "keep-user"
    );
  });

  it("clears auth on explicit unauthorized bootstrap failures", () => {
    expect(
      resolveBootstrapFailureAction(
        "authenticated",
        new ApiClientError("Login required.", "UNAUTHORIZED")
      )
    ).toBe("clear-auth");
  });

  it("falls back to anonymous when no authenticated user is present", () => {
    expect(resolveBootstrapFailureAction("idle", new Error("Network timeout"))).toBe(
      "clear-auth"
    );
  });
});
