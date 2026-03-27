import { APP_ROUTES } from "@feijia/shared";
import { InfoIcon, ShieldCheckIcon, SmartphoneIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  SitePageDescription,
  SitePageEyebrow,
  SitePageHead,
  SitePageTitle,
  SitePanel,
  SitePanelBody
} from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
      : APP_ROUTES.feedHome;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/48 px-4 py-8 backdrop-blur-md">
      <SitePanel className="w-full max-w-[620px]" variant="floating">
        <SitePanelBody className="space-y-8">
          <div className="flex items-start justify-between gap-4">
            <SitePageHead className="gap-3 px-0">
              <SitePageEyebrow>FEIJIA HORIZON</SitePageEyebrow>
              <SitePageTitle className="text-5xl">登录 / 注册</SitePageTitle>
              <SitePageDescription className="text-base">
                欢迎使用飞驾航空签派系统。登录后可继续发帖、点评、关注与管理个人内容。
              </SitePageDescription>
            </SitePageHead>

            <Button
              onClick={() => {
                navigate(APP_ROUTES.feedHome);
              }}
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <XIcon />
              <span className="sr-only">关闭</span>
            </Button>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="login-phone">
                手机号码
              </label>
              <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
                <div className="flex items-center rounded-[var(--radius-control)] bg-surface-2 px-4 text-lg font-semibold text-foreground">
                  +86
                </div>
                <Input
                  className="h-12"
                  id="login-phone"
                  inputMode="numeric"
                  onChange={(event) => {
                    setPhone(event.target.value);
                  }}
                  placeholder="请输入您的手机号"
                  value={phone}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_152px]">
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="login-captcha">
                  图形验证码
                </label>
                <Input
                  className="h-12"
                  id="login-captcha"
                  onChange={(event) => {
                    setCaptchaCode(event.target.value.toUpperCase());
                  }}
                  placeholder="请输入图形验证码"
                  value={captchaCode}
                />
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">验证码</div>
                <Button
                  className="h-12 w-full rounded-[var(--radius-control)] bg-slate-900 font-mono text-lg tracking-[0.3em] text-white hover:bg-slate-900/92"
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
                  {challenge?.imageOrText ?? "----"}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_168px]">
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="login-sms">
                  短信验证码
                </label>
                <Input
                  className="h-12"
                  id="login-sms"
                  onChange={(event) => {
                    setSmsCode(event.target.value);
                  }}
                  placeholder="请输入 6 位验证码"
                  value={smsCode}
                />
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-transparent">占位</div>
                <Button
                  className="h-12 w-full"
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
                  variant="panel"
                >
                  <SmartphoneIcon data-icon="inline-start" />
                  获取验证码
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

            <div className="grid gap-3 rounded-[var(--radius-control)] bg-surface-2 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <InfoIcon className="size-4 text-primary" />
                首次登录将自动注册
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="size-4 text-cert-gold" />
                密码设置可稍后在安全中心完成
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-3">
              <Button
                className="w-full"
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
                      navigate(redirectTo ?? APP_ROUTES.feedHome, { replace: true });
                    })
                    .catch((error: unknown) => {
                      setSubmitError(error instanceof Error ? error.message : "登录失败");
                    })
                    .finally(() => {
                      setIsSubmitting(false);
                    });
                }}
                size="xl"
                type="button"
                variant="hero"
              >
                {isSubmitting ? "登录中..." : "登录 / 注册"}
              </Button>

              <Button
                className="w-full"
                onClick={() => {
                  navigate(APP_ROUTES.feedHome);
                }}
                size="lg"
                type="button"
                variant="ghost"
              >
                取消
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              登录即代表您同意
              <span className="mx-1 text-primary">服务协议</span>
              与
              <span className="ml-1 text-primary">隐私政策</span>
            </p>
          </div>
        </SitePanelBody>
      </SitePanel>
    </div>
  );
}
