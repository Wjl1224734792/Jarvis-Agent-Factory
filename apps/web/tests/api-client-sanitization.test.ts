import { describe, expect, it } from "vitest";
import { sanitizeWebApiErrorMessage } from "../src/lib/api-client";

describe("sanitizeWebApiErrorMessage", () => {
  it("maps auth and permission errors to safe messages", () => {
    expect(sanitizeWebApiErrorMessage("UNAUTHORIZED")).toBe("请先登录后再继续操作。");
    expect(sanitizeWebApiErrorMessage("FORBIDDEN")).toBe("当前无权执行此操作。");
  });

  it("maps not found and validation errors to safe messages", () => {
    expect(sanitizeWebApiErrorMessage("Post not found.")).toBe("请求的内容不存在或已被移除。");
    expect(sanitizeWebApiErrorMessage("Invalid uploaded images.")).toBe("提交内容有误，请检查后重试。");
  });

  it("masks internal server details", () => {
    expect(sanitizeWebApiErrorMessage("Unexpected server error. stack=sql")).toBe(
      "服务暂时不可用，请稍后重试。"
    );
  });
});
