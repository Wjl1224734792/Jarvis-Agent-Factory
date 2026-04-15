const MAINLAND_PHONE_PATTERN = /^1\d{10}$/;

export function resolveMaskedPhone(phone: string | null | undefined, phoneMasked?: string | null) {
  if (phoneMasked && phoneMasked.trim()) {
    return phoneMasked.trim();
  }

  if (phone && MAINLAND_PHONE_PATTERN.test(phone)) {
    return `****${phone.slice(-4)}`;
  }

  return "未绑定手机号";
}

/** 仅校验新手机号格式；图形验证在发送短信前的弹窗内完成 */
export function canRequestPhoneRebind(input: { nextPhone: string }) {
  return MAINLAND_PHONE_PATTERN.test(input.nextPhone.trim());
}

export function canConfirmPhoneRebind(input: {
  nextPhone: string;
  requestId: string | null;
  smsCode: string;
}) {
  return (
    MAINLAND_PHONE_PATTERN.test(input.nextPhone.trim()) &&
    Boolean(input.requestId) &&
    input.smsCode.trim().length === 6
  );
}
