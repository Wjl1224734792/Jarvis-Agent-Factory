import { APP_ROUTES } from "@feijia/shared";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "./auth-store";

type CaptchaChallenge = {
  challengeId: string;
  imageOrText: string;
  expiresInSeconds: number;
};

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [phone, setPhone] = useState("13800138000");
  const [captchaCode, setCaptchaCode] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [requestHint, setRequestHint] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);

  useEffect(() => {
    void apiClient.requestCaptchaChallenge().then(setChallenge).catch(() => {
      setChallenge(null);
      setSubmitError("图形验证码初始化失败");
    });
  }, []);

  const redirectTo =
    searchParams.get("redirect") && searchParams.get("redirect") !== APP_ROUTES.webLogin
      ? searchParams.get("redirect")
      : APP_ROUTES.webProfile;

  return (
    <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <article className="rounded-[32px] border border-white/70 bg-white/85 p-8 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
        <p className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
          手机号验证码登录
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          先把可替换的开发版身份链路跑通。
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
          当前环境使用图形验证码与 mock 短信验证码。后端接好后，登录成功会写入 HttpOnly Cookie，
          刷新页面可通过 `/auth/me` 恢复身份。
        </p>
      </article>

      <article className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]">
        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">手机号</span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
              onChange={(event) => {
                setPhone(event.target.value);
              }}
              placeholder="请输入手机号"
              value={phone}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">图形验证码</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none transition focus:border-sky-400"
                onChange={(event) => {
                  setCaptchaCode(event.target.value.toUpperCase());
                }}
                placeholder="输入图形验证码"
                value={captchaCode}
              />
            </label>
            <div className="flex flex-col justify-end gap-2">
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center font-mono text-xl tracking-[0.35em] text-slate-900">
                {challenge?.imageOrText ?? "----"}
              </div>
              <button
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                onClick={() => {
                  setSubmitError(null);
                  void apiClient
                    .requestCaptchaChallenge()
                    .then(setChallenge)
                    .catch((error: unknown) => {
                      setSubmitError(error instanceof Error ? error.message : "刷新验证码失败");
                    });
                }}
                type="button"
              >
                刷新验证码
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">短信验证码</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                onChange={(event) => {
                  setSmsCode(event.target.value);
                }}
                placeholder="输入 6 位短信验证码"
                value={smsCode}
              />
            </label>
            <button
              className="self-end rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!challenge || isSendingSms}
              onClick={() => {
                if (!challenge) {
                  return;
                }

                setIsSendingSms(true);
                setSubmitError(null);
                void apiClient
                  .requestSmsCode({
                    phone,
                    captchaChallengeId: challenge.challengeId,
                    captchaCode
                  })
                  .then((response) => {
                    setRequestHint(
                      response.mockCode
                        ? `开发环境验证码：${response.mockCode}`
                        : "短信验证码已发送"
                    );
                  })
                  .catch((error: unknown) => {
                    setSubmitError(error instanceof Error ? error.message : "短信验证码发送失败");
                  })
                  .finally(() => {
                    setIsSendingSms(false);
                  });
              }}
              type="button"
            >
              {isSendingSms ? "发送中" : "获取短信码"}
            </button>
          </div>

          {requestHint ? (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {requestHint}
            </p>
          ) : null}

          {submitError ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</p>
          ) : null}

          <button
            className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!challenge || isSubmitting}
            onClick={() => {
              if (!challenge) {
                return;
              }

              setIsSubmitting(true);
              setSubmitError(null);

              void apiClient
                .loginWeb({
                  phone,
                  captchaChallengeId: challenge.challengeId,
                  captchaCode,
                  smsCode
                })
                .then((response) => {
                  setAuthenticated(response.user);
                  navigate(redirectTo ?? APP_ROUTES.webProfile, { replace: true });
                })
                .catch((error: unknown) => {
                  setSubmitError(error instanceof Error ? error.message : "登录失败");
                })
                .finally(() => {
                  setIsSubmitting(false);
                });
            }}
            type="button"
          >
            {isSubmitting ? "登录中" : "登录 / 注册"}
          </button>
        </div>
      </article>
    </section>
  );
}
