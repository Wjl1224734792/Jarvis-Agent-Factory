import { describe, expect, it } from "vitest";
import {
  CHINA_MAINLAND_MOBILE_PHONE_REGEX,
  chinaMainlandMobilePhoneSchema,
  isChinaMainlandMobilePhone
} from "../src/phone";
import { phoneChangeConfirmInputSchema, phoneChangeRequestInputSchema } from "../src/social";

describe("china mainland mobile phone", () => {
  it("matches valid samples", () => {
    expect(isChinaMainlandMobilePhone("13800138000")).toBe(true);
    expect(CHINA_MAINLAND_MOBILE_PHONE_REGEX.test("15900000000")).toBe(true);
    expect(chinaMainlandMobilePhoneSchema.safeParse("13800138000").success).toBe(true);
  });

  it("rejects second digit outside 3–9", () => {
    expect(isChinaMainlandMobilePhone("12000000000")).toBe(false);
    expect(chinaMainlandMobilePhoneSchema.safeParse("12000000000").success).toBe(false);
  });

  it("rejects wrong length or non-digit", () => {
    expect(isChinaMainlandMobilePhone("1380013800")).toBe(false);
    expect(isChinaMainlandMobilePhone("abcdefghijk")).toBe(false);
  });

  it("trims before test", () => {
    expect(isChinaMainlandMobilePhone("  13800138000  ")).toBe(true);
  });
});

describe("phone change schemas", () => {
  const baseRequest = {
    captchaChallengeId: "c1",
    captchaCode: "ABCD"
  };

  it("accepts valid phone on request", () => {
    const parsed = phoneChangeRequestInputSchema.parse({
      ...baseRequest,
      phone: "13800138000"
    });
    expect(parsed.phone).toBe("13800138000");
  });

  it("rejects 120… on request", () => {
    expect(() =>
      phoneChangeRequestInputSchema.parse({
        ...baseRequest,
        phone: "12000000000"
      })
    ).toThrow();
  });

  it("accepts valid phone on confirm", () => {
    const parsed = phoneChangeConfirmInputSchema.parse({
      phone: "13800138000",
      requestId: "req_1",
      smsCode: "123456"
    });
    expect(parsed.phone).toBe("13800138000");
  });

  it("rejects 120… on confirm", () => {
    expect(() =>
      phoneChangeConfirmInputSchema.parse({
        phone: "12000000000",
        requestId: "req_1",
        smsCode: "123456"
      })
    ).toThrow();
  });
});
