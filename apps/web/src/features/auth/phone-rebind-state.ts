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

export function canRequestPhoneRebind(input: {
  nextPhone: string;
  captchaChallengeId: string | null;
  captchaCode: string;
}) {
  return (
    MAINLAND_PHONE_PATTERN.test(input.nextPhone.trim()) &&
    Boolean(input.captchaChallengeId) &&
    input.captchaCode.trim().length >= 4
  );
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
