import { describe, expect, it } from "vitest";
import {
  canConfirmPhoneRebind,
  canRequestPhoneRebind,
  resolveMaskedPhone
} from "../src/features/auth/phone-rebind-state";

describe("phone rebind helpers", () => {
  it("prefers server-provided masked phone and falls back to local masking", () => {
    expect(resolveMaskedPhone("13800138000", "尾号 8000")).toBe("尾号 8000");
    expect(resolveMaskedPhone("13800138000", null)).toBe("****8000");
    expect(resolveMaskedPhone(null, null)).toBe("未绑定手机号");
  });

  it("validates when a phone rebind sms can be requested", () => {
    expect(canRequestPhoneRebind({ nextPhone: "13800138123" })).toBe(true);
    expect(canRequestPhoneRebind({ nextPhone: "123" })).toBe(false);
  });

  it("validates when a phone rebind can be confirmed", () => {
    expect(
      canConfirmPhoneRebind({
        nextPhone: "13800138123",
        requestId: "sms_1",
        smsCode: "123456"
      })
    ).toBe(true);
    expect(
      canConfirmPhoneRebind({
        nextPhone: "13800138123",
        requestId: null,
        smsCode: "123456"
      })
    ).toBe(false);
  });
});
