import { APP_ROUTES } from "@feijia/shared";
import { KeyRoundIcon, RefreshCcwIcon, SmartphoneIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
    void apiClient
      .requestCaptchaChallenge()
      .then(setChallenge)
      .catch(() => {
        setChallenge(null);
        setSubmitError("图形验证码初始化失败");
      });
  }, []);

  const redirectTo =
    searchParams.get("redirect") && searchParams.get("redirect") !== APP_ROUTES.webLogin
      ? searchParams.get("redirect")
      : APP_ROUTES.webProfile;

  return (
    <main className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex flex-col justify-between rounded-[1.25rem] bg-card px-6 py-7 ring-1 ring-border/80 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>登录</Badge>
            <Badge variant="outline">手机号验证码</Badge>
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground">
            恢复你的飞加身份
          </h1>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            登录后可以发帖、评论、关注作者，以及查看你的通知和个人入口。
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {[
            "当前环境会返回开发态 mock 短信验证码。",
            "登录成功后会写入 HttpOnly Cookie。",
            "刷新页面后会通过 /auth/me 恢复身份。"
          ].map((text) => (
            <div className="text-sm leading-7 text-muted-foreground" key={text}>
              {text}
            </div>
          ))}
        </div>
      </section>

      <Card className="rounded-[1.25rem] border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">手机号验证码登录</CardTitle>
          <CardDescription>输入手机号、图形验证码和短信验证码。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="login-phone">
              手机号
            </label>
            <Input
              id="login-phone"
              inputMode="numeric"
              onChange={(event) => {
                setPhone(event.target.value);
              }}
              placeholder="请输入手机号"
              value={phone}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_132px]">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="login-captcha">
                图形验证码
              </label>
              <Input
                id="login-captcha"
                onChange={(event) => {
                  setCaptchaCode(event.target.value.toUpperCase());
                }}
                placeholder="输入图形验证码"
                value={captchaCode}
              />
            </div>

            <div className="flex flex-col justify-end gap-2">
              <div className="flex h-10 items-center justify-center rounded-xl border border-dashed border-border bg-secondary/45 font-mono text-lg tracking-[0.3em] text-foreground">
                {challenge?.imageOrText ?? "----"}
              </div>
              <Button
                disabled={isSubmitting || isSendingSms}
                onClick={() => {
                  setSubmitError(null);
                  void apiClient
                    .requestCaptchaChallenge()
                    .then(setChallenge)
                    .catch((error: unknown) => {
                      setSubmitError(error instanceof Error ? error.message : "刷新验证码失败");
                    });
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <RefreshCcwIcon data-icon="inline-start" />
                刷新
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_156px]">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="login-sms">
                短信验证码
              </label>
              <Input
                id="login-sms"
                onChange={(event) => {
                  setSmsCode(event.target.value);
                }}
                placeholder="输入 6 位短信验证码"
                value={smsCode}
              />
            </div>

            <div className="flex flex-col justify-end">
              <Button
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
                variant="outline"
              >
                <SmartphoneIcon data-icon="inline-start" />
                {isSendingSms ? "发送中" : "获取短信码"}
              </Button>
            </div>
          </div>

          {requestHint ? (
            <Alert>
              <AlertTitle>验证码已生成</AlertTitle>
              <AlertDescription>{requestHint}</AlertDescription>
            </Alert>
          ) : null}

          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>登录失败</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <Separator />

          <Button
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
            size="lg"
            type="button"
          >
            <KeyRoundIcon data-icon="inline-start" />
            {isSubmitting ? "登录中..." : "登录 / 注册"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
