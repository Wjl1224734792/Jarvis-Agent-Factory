import { z } from "zod";

/** 中国大陆手机号：1 开头，第二位 3–9，共 11 位数字 */
export const CHINA_MAINLAND_MOBILE_PHONE_REGEX = /^1[3-9]\d{9}$/;

export const chinaMainlandMobilePhoneSchema = z
  .string()
  .regex(CHINA_MAINLAND_MOBILE_PHONE_REGEX, "请输入有效的手机号");

export function isChinaMainlandMobilePhone(value: string): boolean {
  return CHINA_MAINLAND_MOBILE_PHONE_REGEX.test(value.trim());
}
