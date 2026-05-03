import { isChinaMainlandMobilePhone } from "@feijia/schemas";

/** 仅保留数字并截断为 11 位，供输入框与校验使用 */
export function normalizeChinaMobilePhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function resolveMaskedPhone(phone: string | null | undefined, phoneMasked?: string | null) {
  if (phoneMasked && phoneMasked.trim()) {
    return phoneMasked.trim();
  }

  if (phone && isChinaMainlandMobilePhone(phone)) {
    return `****${phone.slice(-4)}`;
  }

  return "未绑定手机号";
}

/** 仅校验新手机号格式；图形验证在发送短信前的弹窗内完成 */
export function canRequestPhoneRebind(input: { nextPhone: string }) {
  return isChinaMainlandMobilePhone(normalizeChinaMobilePhoneInput(input.nextPhone));
}

export function canConfirmPhoneRebind(input: {
  nextPhone: string;
  requestId: string | null;
  smsCode: string;
}) {
  return (
    isChinaMainlandMobilePhone(normalizeChinaMobilePhoneInput(input.nextPhone)) &&
    Boolean(input.requestId) &&
    input.smsCode.trim().length === 6
  );
}
