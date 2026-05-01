import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import bcrypt from "bcrypt";

/** 密码哈希的 bcrypt 成本因子（盐轮数）。12 是安全性与性能的平衡点。 */
const BCRYPT_ROUNDS = 12;

/**
 * 生成带前缀的 UUID。
 */
export function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

/**
 * 使用 bcrypt 对密码进行哈希。
 *
 * bcrypt 是慢速哈希算法，能有效抵御彩虹表和暴力破解攻击。
 * 成本因子为 12，单次哈希约需 250ms。
 *
 * @param password - 明文密码
 * @returns bcrypt 哈希字符串
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * 验证密码是否与 bcrypt 哈希匹配。
 *
 * @param password - 明文密码
 * @param hash - bcrypt 哈希字符串
 * @returns 是否匹配
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 对 Token（如 refresh token）进行哈希。
 *
 * 与 hashPassword 不同，此函数使用 SHA-256，因为：
 * 1. Token 是高熵随机字符串，不需要 bcrypt 的慢速保护
 * 2. Session 操作中频繁调用，bcrypt 会显著影响性能
 * 3. Token 泄露风险低于密码（可撤销 session）
 *
 * @param token - 明文 token
 * @returns SHA-256 哈希字符串
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * 使用服务端 pepper 对低熵验证码做 HMAC，避免 Redis 泄露时直接暴露可用验证码。
 */
export function hashVerificationCode(input: {
  code: string;
  purpose: "captcha" | "sms";
  subject: string;
  secret: string;
}): string {
  return createHmac("sha256", input.secret)
    .update(input.purpose)
    .update(":")
    .update(input.subject)
    .update(":")
    .update(input.code)
    .digest("hex");
}

/**
 * 常量时间比较验证码哈希，减少计时侧信道暴露。
 */
export function verifyVerificationCodeHash(
  hash: string,
  input: Parameters<typeof hashVerificationCode>[0]
): boolean {
  const expected = Buffer.from(hashVerificationCode(input), "hex");
  const actual = Buffer.from(hash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * 生成密码学安全的随机 Token。
 *
 * @param bytes - 随机字节数（默认 32，生成约 43 字符的 base64url 字符串）
 * @returns base64url 编码的随机字符串
 */
export function createSecretToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
