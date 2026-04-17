import { ApiClientError } from "@feijia/http-client";
import { describe, expect, it } from "vitest";
import {
  getWebErrorRetryable,
  isWebAuthInvalidError,
  mapWebApiError,
  sanitizeWebApiErrorMessage
} from "../src/lib/api-client";

const LOGIN_REQUIRED = "\u8bf7\u5148\u767b\u5f55\u540e\u518d\u7ee7\u7eed\u64cd\u4f5c\u3002";
const FORBIDDEN = "\u5f53\u524d\u65e0\u6743\u6267\u884c\u6b64\u64cd\u4f5c\u3002";
const NOT_FOUND = "\u8bf7\u6c42\u7684\u5185\u5bb9\u4e0d\u5b58\u5728\u6216\u5df2\u88ab\u79fb\u9664\u3002";
const INVALID_CONTENT = "\u63d0\u4ea4\u5185\u5bb9\u6709\u8bef\uff0c\u8bf7\u68c0\u67e5\u540e\u91cd\u8bd5\u3002";
const DISPLAY_NAME_TAKEN = "\u7528\u6237\u540d\u5df2\u88ab\u5360\u7528\uff0c\u8bf7\u66f4\u6362\u540e\u91cd\u8bd5\u3002";
const SERVER_UNAVAILABLE = "\u670d\u52a1\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002";

describe("sanitizeWebApiErrorMessage", () => {
  it("maps auth and permission errors to safe messages", () => {
    expect(sanitizeWebApiErrorMessage("UNAUTHORIZED")).toBe(LOGIN_REQUIRED);
    expect(sanitizeWebApiErrorMessage("FORBIDDEN")).toBe(FORBIDDEN);
  });

  it("maps not found and validation errors to safe messages", () => {
    expect(sanitizeWebApiErrorMessage("Post not found.")).toBe(NOT_FOUND);
    expect(sanitizeWebApiErrorMessage("Invalid uploaded images.")).toBe(INVALID_CONTENT);
    expect(sanitizeWebApiErrorMessage(DISPLAY_NAME_TAKEN)).toBe(DISPLAY_NAME_TAKEN);
  });

  it("masks internal server details", () => {
    expect(sanitizeWebApiErrorMessage("Unexpected server error. stack=sql")).toBe(
      SERVER_UNAVAILABLE
    );
  });

  it("preserves ApiClientError codes for field-level error handling", () => {
    const result = mapWebApiError(new ApiClientError(DISPLAY_NAME_TAKEN, "DISPLAY_NAME_TAKEN"));

    expect(result).toBeInstanceOf(ApiClientError);
    expect((result as ApiClientError).code).toBe("DISPLAY_NAME_TAKEN");
    expect(result.message).toBe(DISPLAY_NAME_TAKEN);
  });

  it("marks explicit unauthorized errors as auth-invalid and non-retriable", () => {
    const result = mapWebApiError(new ApiClientError("Login required.", "UNAUTHORIZED"), {
      status: 401
    });

    expect(isWebAuthInvalidError(result)).toBe(true);
    expect(getWebErrorRetryable(result)).toBe(false);
  });

  it("keeps transient server failures retriable", () => {
    const result = mapWebApiError(new Error("Unexpected server error."), {
      status: 503
    });

    expect(isWebAuthInvalidError(result)).toBe(false);
    expect(getWebErrorRetryable(result)).toBe(true);
    expect(result.message).toBe(SERVER_UNAVAILABLE);
  });
});
