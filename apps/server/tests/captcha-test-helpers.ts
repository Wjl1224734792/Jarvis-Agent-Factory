import { ensureRedisConnected, redis } from "../src/modules/auth/redis-client";

/** Reads the captcha answer from Redis before the challenge is consumed. */
export async function readCaptchaAnswerForTests(challengeId: string): Promise<string> {
  await ensureRedisConnected();
  const code = await redis.get(`captcha_test:${challengeId}`);
  if (!code) {
    throw new Error(`missing captcha record for ${challengeId}`);
  }

  return code;
}

/** Falls back to Redis when the SMS provider doesn't expose the mock code inline. */
export async function resolveSmsCodeForTests(
  phone: string,
  payload: { mockCode?: string }
): Promise<string> {
  if (payload.mockCode) {
    return payload.mockCode;
  }

  await ensureRedisConnected();
  const code = await redis.get(`sms_test:${phone}`);
  if (!code) {
    throw new Error(`missing sms code for ${phone}`);
  }

  return code;
}
