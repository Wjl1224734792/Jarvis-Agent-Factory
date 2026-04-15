import { ensureRedisConnected, redis } from "../src/modules/auth/redis-client";

/** 从 Redis 读取图形验证码答案（须在消费该挑战的请求之前调用） */
export async function readCaptchaAnswerForTests(challengeId: string): Promise<string> {
  await ensureRedisConnected();
  const raw = await redis.get(`captcha:${challengeId}`);
  if (!raw) {
    throw new Error(`missing captcha record for ${challengeId}`);
  }

  const record = JSON.parse(raw) as { code: string };
  return record.code;
}

/** Web/App 登录请求体仍带图形验证码字段，但服务端登录流程不校验；与前端占位一致 */
export const WEB_LOGIN_CAPTCHA_PLACEHOLDER = {
  captchaChallengeId: "web-login",
  captchaCode: "0000"
} as const;
