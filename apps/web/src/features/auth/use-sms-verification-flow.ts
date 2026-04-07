import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [captchaRemainingSeconds, setCaptchaRemainingSeconds] = useState(0);

  // 短信发送倒计时
  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCooldownSeconds(current => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  // 图形验证码过期倒计时
  useEffect(() => {
    if (!challenge || challenge.expiresInSeconds <= 0) {
      setCaptchaRemainingSeconds(0);
      return;
    }

    setCaptchaRemainingSeconds(challenge.expiresInSeconds);

    const timer = window.setInterval(() => {
      setCaptchaRemainingSeconds(prev => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [challenge?.challengeId]);

  const isCaptchaExpired = captchaRemainingSeconds <= 0 && challenge !== null;

  // 用 ref 持有 onError / errorFallback，避免 refreshCaptcha 引用变化
  const errorRef = useRef<{ onError: (message: string) => void; errorFallback: string }>({
    onError: () => {},
    errorFallback: ""
  });

  const refreshCaptcha = useCallback(async (input: {
    onError: (message: string) => void;
    errorFallback: string;
    clearCaptchaCode?: boolean;
  }) => {
    errorRef.current = { onError: input.onError, errorFallback: input.errorFallback };
    try {
      const nextChallenge = await apiClient.requestCaptchaChallenge();
      setChallenge(nextChallenge);
      if (input.clearCaptchaCode !== false) {
        setCaptchaCode("");
      }
      return nextChallenge;
    } catch (error: unknown) {
      const { onError, errorFallback } = errorRef.current;
      onError(error instanceof Error ? error.message : errorFallback);
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
      // 不再自动刷新验证码，有效期内可重复发送
      return response;
    } catch (error: unknown) {
      input.onError(error instanceof Error ? error.message : input.errorFallback);
      return null;
    } finally {
      setIsSendingSms(false);
    }
  }, [captchaCode, challenge]);

  const reset = useCallback(() => {
    setChallenge(null);
    setCaptchaCode("");
    setSmsCode("");
    setRequestHint(null);
    setCooldownSeconds(0);
    setCaptchaRemainingSeconds(0);
    setIsSendingSms(false);
  }, []);

  return useMemo(() => ({
    challenge,
    captchaCode,
    cooldownSeconds,
    captchaRemainingSeconds,
    isCaptchaExpired,
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
    captchaRemainingSeconds,
    isCaptchaExpired,
    isSendingSms,
    requestHint,
    refreshCaptcha,
    reset,
    sendSmsCode,
    smsCode
  ]);
}
