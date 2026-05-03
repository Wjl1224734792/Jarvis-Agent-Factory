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
  const [captchaRemainingSeconds, setCaptchaRemainingSeconds] = useState(0);
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCooldownSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (!challenge || challenge.expiresInSeconds <= 0) {
      setCaptchaRemainingSeconds(0);
      return;
    }

    setCaptchaRemainingSeconds(challenge.expiresInSeconds);

    const timer = window.setInterval(() => {
      setCaptchaRemainingSeconds((prev) => {
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

  // 统一复用 challenge 拉取逻辑，避免打开弹窗和失败重试走两套状态分支。
  const loadCaptchaChallenge = useCallback(async (input: {
    onError: (message: string) => void;
    errorFallback: string;
    clearCaptchaCode?: boolean;
  }) => {
    setIsCaptchaLoading(true);
    try {
      const nextChallenge = await apiClient.requestCaptchaChallenge();
      setChallenge(nextChallenge);
      if (input.clearCaptchaCode !== false) {
        setCaptchaCode("");
      }
      return nextChallenge;
    } catch (error: unknown) {
      setChallenge(null);
      input.onError(error instanceof Error ? error.message : input.errorFallback);
      return null;
    } finally {
      setIsCaptchaLoading(false);
    }
  }, []);

  const refreshCaptcha = useCallback(
    async (input: {
      onError: (message: string) => void;
      errorFallback: string;
      clearCaptchaCode?: boolean;
    }) => loadCaptchaChallenge(input),
    [loadCaptchaChallenge]
  );

  const sendSmsCode = useCallback(
    async <TResponse,>(input: SendSmsCodeOptions<TResponse>) => {
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
        setChallenge(null);
        setCaptchaCode("");
        return response;
      } catch (error: unknown) {
        input.onError(error instanceof Error ? error.message : input.errorFallback);
        setCaptchaCode("");
        setChallenge(null);
        await loadCaptchaChallenge({
          clearCaptchaCode: false,
          onError: () => {},
          errorFallback: input.errorFallback
        });
        return null;
      } finally {
        setIsSendingSms(false);
      }
    },
    [captchaCode, challenge, loadCaptchaChallenge]
  );

  const reset = useCallback(() => {
    setChallenge(null);
    setCaptchaCode("");
    setSmsCode("");
    setRequestHint(null);
    setCooldownSeconds(0);
    setCaptchaRemainingSeconds(0);
    setIsSendingSms(false);
    setIsCaptchaLoading(false);
  }, []);

  return useMemo(
    () => ({
      challenge,
      captchaCode,
      cooldownSeconds,
      captchaRemainingSeconds,
      isCaptchaExpired,
      isCaptchaLoading,
      isSendingSms,
      requestHint,
      reset,
      refreshCaptcha,
      sendSmsCode,
      setCaptchaCode,
      setRequestHint,
      setSmsCode,
      smsCode
    }),
    [
      captchaCode,
      challenge,
      cooldownSeconds,
      captchaRemainingSeconds,
      isCaptchaExpired,
      isCaptchaLoading,
      isSendingSms,
      requestHint,
      refreshCaptcha,
      reset,
      sendSmsCode,
      smsCode
    ]
  );
}
