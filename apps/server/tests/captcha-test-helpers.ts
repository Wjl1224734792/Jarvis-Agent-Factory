import { ensureRedisConnected, redis } from "../src/modules/auth/redis-client";

/** Reads the captcha answer from Redis before the challenge is consumed. */
export async function readCaptchaAnswerForTests(challengeId: string): Promise<string> {
  await ensureRedisConnected();
  const raw = await redis.get(`captcha:${challengeId}`);
  if (!raw) {
    throw new Error(`missing captcha record for ${challengeId}`);
  }

  const record = JSON.parse(raw) as { code: string };
  return record.code;
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
  const raw = await redis.get(`sms:${phone}`);
  if (!raw) {
    throw new Error(`missing sms code for ${phone}`);
  }

  const record = JSON.parse(raw) as { code: string };
  return record.code;
}
