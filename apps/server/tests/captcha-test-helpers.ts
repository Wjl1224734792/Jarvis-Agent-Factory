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
