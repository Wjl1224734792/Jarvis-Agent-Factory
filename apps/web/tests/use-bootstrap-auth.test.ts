import { ApiClientError } from "@feijia/http-client";
import { describe, expect, it } from "vitest";
import {
  resolveBootstrapFailureAction,
  shouldKeepCurrentAuthOnBootstrapResult
} from "../src/features/auth/use-bootstrap-auth";

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

  it("keeps a newly authenticated state when bootstrap started as unauthenticated", () => {
    expect(shouldKeepCurrentAuthOnBootstrapResult("idle", "authenticated")).toBe(true);
    expect(shouldKeepCurrentAuthOnBootstrapResult("loading", "authenticated")).toBe(true);
  });

  it("does not keep stale persisted auth when bootstrap also started authenticated", () => {
    expect(shouldKeepCurrentAuthOnBootstrapResult("authenticated", "authenticated")).toBe(false);
  });
});
