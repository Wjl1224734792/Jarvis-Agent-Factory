import { API_ROUTES } from "@feijia/shared";
import { app } from "../src/app";
import { readCaptchaAnswerForTests, resolveSmsCodeForTests } from "./captcha-test-helpers";

type LoginHeaders = Record<string, string>;

const DEFAULT_TEST_PASSWORD = "StrongPass#2026";

type RegistrationOptions = {
  password?: string;
};

async function describeUnexpectedAuthResponse(response: Response) {
  const raw = await response.text();
  return raw.length > 0 ? raw : `<empty body, status=${response.status}>`;
}

/** Extracts only name/value cookie pairs from set-cookie headers. */
export function extractCookies(response: Response): string {
  const setCookies = response.headers.getSetCookie();
  if (setCookies.length === 0) {
    throw new Error("missing set-cookie headers");
  }

  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

/**
 * Completes web registration when login requires it, otherwise returns the
 * existing auth cookies from the login response.
 */
export async function completeRegistrationIfNeeded(
  response: Response,
  headers?: LoginHeaders,
  options?: RegistrationOptions
): Promise<string> {
  if (response.status !== 200) {
    throw new Error(
      `web login/registration prerequisite failed: ${response.status} ${await describeUnexpectedAuthResponse(response)}`
    );
  }

  const payload = (await response.json()) as
    | { kind: "authenticated" }
    | { kind: "registration_required"; registrationToken: string; suggestedDisplayName: string };

  if (payload.kind === "authenticated") {
    return extractCookies(response);
  }

  const completeResponse = await app.request(API_ROUTES.auth.webRegisterComplete, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(headers ?? {})
    },
    body: JSON.stringify({
      registrationToken: payload.registrationToken,
      displayName: payload.suggestedDisplayName,
      password: options?.password ?? DEFAULT_TEST_PASSWORD,
      avatarFileId: null
    })
  });

  if (completeResponse.status !== 200) {
    throw new Error(
      `web registration completion failed: ${completeResponse.status} ${await describeUnexpectedAuthResponse(completeResponse)}`
    );
  }

  return extractCookies(completeResponse);
}

/** Resolves sms code from mock payload or redis fallback. */
export async function resolveSmsCode(phone: string, payload: { mockCode?: string }): Promise<string> {
  return resolveSmsCodeForTests(phone, payload);
}

/** Requests a fresh captcha challenge and returns challenge id + answer. */
export async function requestCaptcha(
  options?: LoginHeaders
): Promise<{ challengeId: string; captchaCode: string; imageOrText: string }> {
  const captchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
    method: "POST",
    headers: options
  });
  if (captchaResponse.status !== 200) {
    throw new Error(
      `captcha challenge failed: ${captchaResponse.status}`
    );
  }

  const captchaPayload = (await captchaResponse.json()) as {
    challengeId: string;
    imageOrText: string;
  };

  return {
    challengeId: captchaPayload.challengeId,
    captchaCode: await readCaptchaAnswerForTests(captchaPayload.challengeId),
    imageOrText: captchaPayload.imageOrText
  };
}

/** Requests captcha + sms in one flow and returns the resolved sms code for testing. */
export async function requestCaptchaAndSms(
  phone: string,
  options?: LoginHeaders
): Promise<{ challengeId: string; captchaCode: string; smsCode: string }> {
  const headers = options;

  const { challengeId, captchaCode } = await requestCaptcha(options);

  const smsResponse = await app.request(API_ROUTES.auth.smsRequest, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(headers ?? {})
    },
    body: JSON.stringify({
      phone,
      captchaChallengeId: challengeId,
      captchaCode
    })
  });
  if (smsResponse.status !== 200) {
    throw new Error(`sms request failed: ${smsResponse.status}`);
  }
  const smsPayload = (await smsResponse.json()) as { mockCode?: string };
  const smsCode = await resolveSmsCode(phone, smsPayload);

  return {
    challengeId,
    captchaCode,
    smsCode
  };
}

/** Performs full web login flow and returns session cookie, completing registration if needed. */
export async function loginWebUser(
  phone: string,
  options?: LoginHeaders
): Promise<string> {
  const loginPayload = await requestCaptchaAndSms(phone, options);
  const headers = options;

  const loginResponse = await app.request(API_ROUTES.auth.webLogin, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(headers ?? {})
    },
    body: JSON.stringify({
      phone,
      smsCode: loginPayload.smsCode
    })
  });

  return completeRegistrationIfNeeded(loginResponse, headers);
}

/** Alias to maintain both legacy helper naming styles across tests. */
export async function loginUser(phone: string, options?: LoginHeaders): Promise<string> {
  return loginWebUser(phone, options);
}

/** Logs in as admin and returns admin session cookie. */
export async function loginAdmin(
  credentials: { account: string; password: string } = { account: "admin", password: "Admin#123" },
  headers?: LoginHeaders
): Promise<string> {
  const { challengeId, captchaCode } = await requestCaptcha(headers);
  const response = await app.request(API_ROUTES.auth.adminLogin, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(headers ?? {})
    },
    body: JSON.stringify({
      ...credentials,
      captchaChallengeId: challengeId,
      captchaCode
    })
  });

  if (response.status !== 200) {
    throw new Error(
      `admin login failed: ${response.status} ${await describeUnexpectedAuthResponse(response)}`
    );
  }

  return extractCookies(response);
}
