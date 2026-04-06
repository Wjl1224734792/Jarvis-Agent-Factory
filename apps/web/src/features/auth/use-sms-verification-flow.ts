import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../../lib/api-client";

export type CaptchaChallenge = {
  challengeId: string;
  imageOrText: string;
  expiresInSeconds: number;
};

type SendSmsCodeOptions<TResponse> = {
  request: (input: {
    challengeId: string;
    captchaCode: string;
  }) => Promise<TResponse>;
  successHint: (response: TResponse) => string;
  onError: (message: string) => void;
  errorFallback: string;
  onSuccess?: (response: TResponse) => void;
  cooldownSeconds?: number;
};

export function useSmsVerificationFlow() {
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [captchaCode, setCaptchaCode] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [requestHint, setRequestHint] = useState<string | null>(null);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCooldownSeconds(current => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  const refreshCaptcha = useCallback(async (input: {
    onError: (message: string) => void;
    errorFallback: string;
    clearCaptchaCode?: boolean;
  }) => {
    try {
      const nextChallenge = await apiClient.requestCaptchaChallenge();
      setChallenge(nextChallenge);
      if (input.clearCaptchaCode !== false) {
        setCaptchaCode("");
      }
      return nextChallenge;
    } catch (error: unknown) {
      input.onError(error instanceof Error ? error.message : input.errorFallback);
      return null;
    }
  }, []);

  const sendSmsCode = useCallback(async <TResponse,>(input: SendSmsCodeOptions<TResponse>) => {
    if (!challenge) {
      return null;
    }

    setIsSendingSms(true);

    try {
      const response = await input.request({
        challengeId: challenge.challengeId,
        captchaCode: captchaCode.trim().toUpperCase()
      });

      setRequestHint(input.successHint(response));
      setSmsCode("");
      setCooldownSeconds(input.cooldownSeconds ?? 60);
      input.onSuccess?.(response);
      await refreshCaptcha({
        onError: input.onError,
        errorFallback: input.errorFallback
      });
      return response;
    } catch (error: unknown) {
      input.onError(error instanceof Error ? error.message : input.errorFallback);
      return null;
    } finally {
      setIsSendingSms(false);
    }
  }, [captchaCode, challenge, refreshCaptcha]);

  const reset = useCallback(() => {
    setChallenge(null);
    setCaptchaCode("");
    setSmsCode("");
    setRequestHint(null);
    setCooldownSeconds(0);
    setIsSendingSms(false);
  }, []);

  return useMemo(() => ({
    challenge,
    captchaCode,
    cooldownSeconds,
    isSendingSms,
    requestHint,
    reset,
    refreshCaptcha,
    sendSmsCode,
    setCaptchaCode,
    setRequestHint,
    setSmsCode,
    smsCode
  }), [
    captchaCode,
    challenge,
    cooldownSeconds,
    isSendingSms,
    requestHint,
    refreshCaptcha,
    reset,
    sendSmsCode,
    smsCode
  ]);
}
