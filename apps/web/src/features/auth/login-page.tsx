import { APP_ROUTES } from "@feijia/shared";
import {
  ImagePlusIcon,
  InfoIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  UserRoundIcon,
  XIcon
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "../../lib/api-client";
import { getAvatarImage } from "../../lib/aviation-media";
import { useAuthStore } from "./auth-store";

type CaptchaChallenge = {
  challengeId: string;
  imageOrText: string;
  expiresInSeconds: number;
};

type LoginStep = "verify" | "profile";

async function readAvatarPreview(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("头像读取失败"));
    reader.readAsDataURL(file);
  });
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [phone, setPhone] = useState("13800138000");
  const [captchaCode, setCaptchaCode] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [requestHint, setRequestHint] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [step, setStep] = useState<LoginStep>("verify");
  const [registrationToken, setRegistrationToken] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);

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
      <SitePanel className="w-full max-w-[700px]" variant="floating">
        <SitePanelBody className="space-y-8">
          <div className="flex items-start justify-between gap-4">
            <SitePageHead className="gap-3 px-0">
              <SitePageEyebrow>FEIJIA HORIZON</SitePageEyebrow>
              <SitePageTitle className="text-5xl">
                {step === "verify" ? "登录 / 注册" : "完善资料"}
              </SitePageTitle>
              <SitePageDescription className="text-base">
                {step === "verify"
                  ? "手机号验证通过后，老用户直接登录，新用户会在弹窗内完成用户名和头像设置。"
                  : "这是你的首次登录。确认用户名和头像后，再进入站内继续发帖、点评和关注。"}
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

          {step === "verify" ? (
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

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_168px] sm:items-end">
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

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_168px] sm:items-end">
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
                  <div className="text-sm font-medium text-transparent">操作</div>
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
                  老用户直接登录，新手机号会继续补全资料
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheckIcon className="size-4 text-cert-gold" />
                  手机号不能重复，昵称也会做唯一校验
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
                        if (response.kind === "authenticated") {
                          setAuthenticated(response.user);
                          navigate(redirectTo ?? APP_ROUTES.feedHome, { replace: true });
                          return;
                        }

                        setRegistrationToken(response.registrationToken);
                        setDisplayName(response.suggestedDisplayName);
                        setAvatarPreview(null);
                        setStep("profile");
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
                  {isSubmitting ? "处理中..." : "登录 / 注册"}
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
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 rounded-[var(--radius-control)] border border-border/70 bg-surface-1/72 p-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
                <Avatar className="size-20" size="lg">
                  <AvatarImage alt={displayName || phone} src={avatarPreview ?? getAvatarImage(phone)} />
                  <AvatarFallback>{(displayName || phone).slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">当前手机号</div>
                      <div className="text-xs text-muted-foreground">{phone}</div>
                    </div>
                    <Button
                      onClick={() => avatarInputRef.current?.click()}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <ImagePlusIcon data-icon="inline-start" />
                      设置头像
                    </Button>
                  </div>
                  <div className="text-xs leading-5 text-muted-foreground">
                    不上传头像时会使用默认头像占位，之后也可以在设置里更换。
                  </div>
                </div>
                <input
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    void readAvatarPreview(file)
                      .then(setAvatarPreview)
                      .catch((error: unknown) => {
                        setSubmitError(error instanceof Error ? error.message : "头像读取失败");
                      });
                  }}
                  ref={avatarInputRef}
                  type="file"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="register-display-name">
                  用户名
                </label>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <Input
                    className="h-12"
                    id="register-display-name"
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="请输入用户名"
                    value={displayName}
                  />
                  <div className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border/70 bg-background px-3 py-3 text-xs text-muted-foreground">
                    <UserRoundIcon className="size-4" />
                    可继续修改系统生成的用户名
                  </div>
                </div>
              </div>

              {submitError ? (
                <Alert variant="destructive">
                  <AlertTitle>资料保存失败</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              ) : null}

              <Separator />

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  onClick={() => {
                    setStep("verify");
                    setSubmitError(null);
                  }}
                  size="lg"
                  type="button"
                  variant="ghost"
                >
                  返回上一步
                </Button>
                <Button
                  disabled={!registrationToken || !displayName.trim() || isCompletingProfile}
                  onClick={() => {
                    if (!registrationToken) {
                      return;
                    }

                    setIsCompletingProfile(true);
                    setSubmitError(null);
                    void apiClient
                      .completeWebRegistration({
                        registrationToken,
                        displayName: displayName.trim(),
                        avatarUrl: avatarPreview ?? null
                      })
                      .then((response) => {
                        setAuthenticated(response.user);
                        navigate(redirectTo ?? APP_ROUTES.feedHome, { replace: true });
                      })
                      .catch((error: unknown) => {
                        setSubmitError(error instanceof Error ? error.message : "资料保存失败");
                      })
                      .finally(() => {
                        setIsCompletingProfile(false);
                      });
                  }}
                  size="xl"
                  type="button"
                  variant="hero"
                >
                  {isCompletingProfile ? "完成中..." : "完成注册并进入"}
                </Button>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            登录即代表您同意
            <span className="mx-1 text-primary">服务协议</span>
            与
            <span className="ml-1 text-primary">隐私政策</span>
          </p>
        </SitePanelBody>
      </SitePanel>
    </div>
  );
}
