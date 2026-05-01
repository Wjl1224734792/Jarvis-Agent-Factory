import { isChinaMainlandMobilePhone, type UserSummary } from "@feijia/schemas";
import { APP_ROUTES, resolveSafeRedirectPath } from "@feijia/shared";
import { ApiClientError } from "@feijia/http-client";
import { ImagePlusIcon, SmartphoneIcon, UserRoundIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SendSmsCaptchaDialog } from "./send-sms-captcha-dialog";
import { AuthCaptchaSvg } from "@/components/auth-captcha-challenge";
import {
  SitePageDescription,
  SitePageHead,
  SitePageTitle,
  SitePanel,
  SitePanelBody
} from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "./auth-store";
import { useSmsVerificationFlow } from "./use-sms-verification-flow";

type LoginStep = "verify" | "profile";
type LoginMode = "sms" | "password";

async function readAvatarPreview(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("头像预览生成失败"));
    };
    reader.onerror = () => reject(new Error("头像读取失败"));
    reader.readAsDataURL(file);
  });
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuthenticated = useAuthStore(state => state.setAuthenticated);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [phone, setPhone] = useState("");
  const [loginMode, setLoginMode] = useState<LoginMode>("sms");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<LoginStep>("verify");
  const [registrationToken, setRegistrationToken] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);
  const smsFlow = useSmsVerificationFlow();
  const passwordCaptchaFlow = useSmsVerificationFlow();
  const [isSmsCaptchaOpen, setIsSmsCaptchaOpen] = useState(false);

  const redirectTo = resolveSafeRedirectPath({
    candidate: searchParams.get("redirect"),
    fallbackPath: APP_ROUTES.feedHome,
    blockedPaths: [APP_ROUTES.webLogin]
  });

  async function syncAuthenticatedUser(fallbackUser: UserSummary) {
    const refreshedUser = await apiClient.getCurrentUser();
    if (!refreshedUser) {
      throw new Error("登录状态同步失败，请稍后重试。");
    }

    setAuthenticated(refreshedUser ?? fallbackUser);
  }

  async function requestLoginSmsCode() {
    setSubmitError(null);
    setDisplayNameError(null);
    await smsFlow.sendSmsCode({
      request: ({ challengeId, captchaCode }) =>
        apiClient.requestSmsCode({
          phone,
          captchaChallengeId: challengeId,
          captchaCode
        }),
      // 仅用于内部标记「已请求过短信」，不在 UI 展示文案（避免 mock 环境下出现开发者提示）
      successHint: () => " ",
      onError: setSubmitError,
      errorFallback: "短信验证码发送失败",
      onSuccess: () => {
        setIsSmsCaptchaOpen(false);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/48 px-4 py-8 backdrop-blur-md">
      <SitePanel className="w-full max-w-[420px]" variant="floating">
        <SitePanelBody className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <SitePageHead className="min-w-0 gap-1.5 px-0">
              <SitePageTitle className="text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
                {step === "verify" ? "登录 / 注册" : "完善资料"}
              </SitePageTitle>
              {step === "profile" ? (
                <SitePageDescription className="text-sm leading-relaxed">
                  这是你的首次登录。确认用户名和头像后，再进入站内继续发帖、点评和关注。
                </SitePageDescription>
              ) : null}
            </SitePageHead>

            <Button
              onClick={() => {
                void navigate(APP_ROUTES.feedHome);
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
            <div className="space-y-4">
              <div className="grid grid-cols-2 rounded-[var(--radius-control)] bg-surface-2 p-1 text-sm font-medium">
                {(["sms", "password"] as const).map((mode) => (
                  <button
                    className={
                      loginMode === mode
                        ? "rounded-[calc(var(--radius-control)-0.25rem)] bg-background px-3 py-2 text-foreground shadow-sm"
                        : "rounded-[calc(var(--radius-control)-0.25rem)] px-3 py-2 text-muted-foreground transition hover:text-foreground"
                    }
                    key={mode}
                    onClick={() => {
                      setLoginMode(mode);
                      setSubmitError(null);
                      if (mode === "password" && !passwordCaptchaFlow.challenge) {
                        void passwordCaptchaFlow.refreshCaptcha({
                          onError: setSubmitError,
                          errorFallback: "图形验证码加载失败"
                        });
                      }
                    }}
                    type="button"
                  >
                    {mode === "sms" ? "短信登录" : "密码登录"}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="login-phone">
                  手机号
                </label>
                <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-2 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-2.5">
                  <div className="flex h-12 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-surface-2 px-2 text-sm font-semibold tabular-nums text-foreground sm:px-2.5 sm:text-base">
                    +86
                  </div>
                  <Input
                    className="h-12 min-w-0 md:h-12"
                    id="login-phone"
                    inputMode="numeric"
                    maxLength={11}
                    onChange={event => {
                      setPhone(event.target.value.replace(/\D/g, "").slice(0, 11));
                    }}
                    placeholder="请输入手机号"
                    value={phone}
                  />
                </div>
              </div>

              {loginMode === "sms" ? (
                <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground" htmlFor="login-sms">
                      短信验证码
                    </label>
                    <Input
                      className="h-12"
                      id="login-sms"
                      onChange={event => {
                        smsFlow.setSmsCode(event.target.value);
                      }}
                      placeholder="请输入 6 位验证码"
                      value={smsFlow.smsCode}
                    />
                  </div>

                  <div className="space-y-2 sm:min-w-[7.25rem]">
                    <div className="hidden text-sm font-medium sm:block sm:text-transparent">操作</div>
                    <Button
                      className="h-12 w-full whitespace-nowrap sm:w-auto sm:min-w-[7.25rem]"
                      disabled={smsFlow.isSendingSms || smsFlow.cooldownSeconds > 0}
                      onClick={() => {
                        setSubmitError(null);
                        if (!isChinaMainlandMobilePhone(phone)) {
                          setSubmitError("请输入有效的手机号");
                          return;
                        }
                        setIsSmsCaptchaOpen(true);
                      }}
                      type="button"
                      variant="panel"
                    >
                      <SmartphoneIcon data-icon="inline-start" />
                      {smsFlow.isSendingSms
                        ? "发送中..."
                        : smsFlow.cooldownSeconds > 0
                          ? `${smsFlow.cooldownSeconds}s`
                          : smsFlow.requestHint
                            ? "重新获取验证码"
                            : "获取验证码"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground" htmlFor="login-password">
                      密码
                    </label>
                    <Input
                      className="h-12"
                      id="login-password"
                      onChange={event => {
                        setPassword(event.target.value);
                      }}
                      placeholder="请输入密码"
                      type="password"
                      value={password}
                    />
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_132px] sm:items-start">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground" htmlFor="login-password-captcha">
                        图形验证码
                      </label>
                      <Input
                        autoComplete="off"
                        className="h-12"
                        id="login-password-captcha"
                        onChange={event => passwordCaptchaFlow.setCaptchaCode(event.target.value.toUpperCase())}
                        placeholder="请输入图中字符"
                        value={passwordCaptchaFlow.captchaCode}
                      />
                    </div>
                    <div className="pt-7">
                      <AuthCaptchaSvg
                        isLoading={passwordCaptchaFlow.isCaptchaLoading}
                        onRefresh={() => {
                          void passwordCaptchaFlow.refreshCaptcha({
                            onError: setSubmitError,
                            errorFallback: "图形验证码加载失败"
                          });
                        }}
                        showHint={false}
                        svgMarkup={passwordCaptchaFlow.challenge?.imageOrText ?? ""}
                      />
                    </div>
                  </div>
                  {passwordCaptchaFlow.isCaptchaExpired ? (
                    <div className="text-xs text-destructive">图形验证码已过期，请点击刷新。</div>
                  ) : null}
                </div>
              )}

              {submitError ? (
                <Alert variant="destructive">
                  <AlertTitle>登录失败</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-col gap-2.5 pt-0.5">
                <Button
                  className="w-full"
                  disabled={isSubmitting}
                  onClick={() => {
                    setSubmitError(null);
                    if (!isChinaMainlandMobilePhone(phone)) {
                      setSubmitError("请输入有效的手机号");
                      return;
                    }

                    if (loginMode === "password") {
                      if (!password) {
                        setSubmitError("请输入密码");
                        return;
                      }
                      if (
                        !passwordCaptchaFlow.challenge ||
                        passwordCaptchaFlow.isCaptchaExpired ||
                        !passwordCaptchaFlow.captchaCode.trim()
                      ) {
                        setSubmitError("请先完成图形验证码。");
                        return;
                      }
                    }

                    setIsSubmitting(true);

                    void apiClient
                      .loginWeb(
                        loginMode === "sms"
                          ? {
                              method: "sms",
                              phone,
                              smsCode: smsFlow.smsCode
                            }
                          : {
                              method: "password",
                              phone,
                              password,
                              captchaChallengeId: passwordCaptchaFlow.challenge?.challengeId ?? "",
                              captchaCode: passwordCaptchaFlow.captchaCode
                            }
                      )
                      .then(async response => {
                        if (response.kind === "authenticated") {
                          await syncAuthenticatedUser(response.user);
                          void navigate(redirectTo ?? APP_ROUTES.feedHome, {
                            replace: true
                          });
                          return;
                        }

                        if (loginMode === "password") {
                          setSubmitError("该手机号还未完成注册，请先使用短信登录。");
                          return;
                        }

                        setRegistrationToken(response.registrationToken);
                        setDisplayName(response.suggestedDisplayName);
                        setDisplayNameError(null);
                        setAvatarPreview(null);
                        setSelectedAvatarFile(null);
                        setStep("profile");
                      })
                      .catch((error: unknown) => {
                        setSubmitError(error instanceof Error ? error.message : "登录失败");
                        if (loginMode === "password") {
                          void passwordCaptchaFlow.refreshCaptcha({
                            onError: setSubmitError,
                            errorFallback: "图形验证码加载失败"
                          });
                        }
                      })
                      .finally(() => {
                        setIsSubmitting(false);
                      });
                  }}
                  size="lg"
                  type="button"
                  variant="hero"
                >
                  {isSubmitting ? "处理中..." : loginMode === "sms" ? "登录 / 注册" : "密码登录"}
                </Button>

                <Button
                  className="w-full"
                  onClick={() => {
                    void navigate(APP_ROUTES.feedHome);
                  }}
                  size="default"
                  type="button"
                  variant="ghost"
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-[var(--radius-control)] border border-border/70 bg-surface-1/72 p-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:p-4">
                <UserAvatar
                  className="size-20"
                  displayName={displayName || phone}
                  size="lg"
                  src={avatarPreview ?? undefined}
                />
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
                    不上传头像时显示用户图标，之后可在设置里更换。
                  </div>
                </div>
                <input
                  accept="image/*"
                  className="hidden"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    setSubmitError(null);
                    setSelectedAvatarFile(file);
                    void readAvatarPreview(file)
                      .then(preview => {
                        setAvatarPreview(preview);
                      })
                      .catch((error: unknown) => {
                        setSubmitError(error instanceof Error ? error.message : "头像上传失败");
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
                    aria-invalid={displayNameError ? "true" : undefined}
                    className="h-12"
                    id="register-display-name"
                    onChange={event => {
                      setDisplayName(event.target.value);
                      if (displayNameError) {
                        setDisplayNameError(null);
                      }
                    }}
                    placeholder="请输入用户名"
                    value={displayName}
                  />
                  <div className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border/70 bg-background px-3 py-3 text-xs text-muted-foreground">
                    <UserRoundIcon className="size-4" />
                    可继续修改系统生成的用户名
                  </div>
                </div>
              </div>

              {displayNameError ? (
                <div className="text-sm text-destructive">{displayNameError}</div>
              ) : null}

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
                    setDisplayNameError(null);
                  }}
                  size="lg"
                  type="button"
                  variant="ghost"
                >
                  返回上一步
                </Button>
                <Button
                  disabled={
                    !registrationToken ||
                    !displayName.trim() ||
                    isCompletingProfile
                  }
                  onClick={() => {
                    if (!registrationToken) {
                      return;
                    }

                    setIsCompletingProfile(true);
                    setSubmitError(null);
                    setDisplayNameError(null);

                    void apiClient
                      .completeWebRegistration({
                        registrationToken,
                        displayName: displayName.trim(),
                        avatarFileId: null
                      })
                      .then(async response => {
                        await syncAuthenticatedUser(response.user);

                        if (selectedAvatarFile) {
                          try {
                            const uploaded = await apiClient.uploadAvatarImage(selectedAvatarFile);
                            await apiClient.updateCurrentUserProfile({
                              avatarFileId: uploaded.item.id
                            });
                            await syncAuthenticatedUser(response.user);
                          } catch (avatarError) {
                            setSubmitError(
                              avatarError instanceof Error
                                ? `${avatarError.message}，你已完成注册，可稍后在设置中补充头像。`
                                : "你已完成注册，可稍后在设置中补充头像。"
                            );
                          }
                        }

                        void navigate(redirectTo ?? APP_ROUTES.feedHome, {
                          replace: true
                        });
                      })
                      .catch((error: unknown) => {
                        if (error instanceof ApiClientError && error.code === "DISPLAY_NAME_TAKEN") {
                          setDisplayNameError(error.message);
                          return;
                        }

                        setSubmitError(error instanceof Error ? error.message : "资料保存失败");
                      })
                      .finally(() => {
                        setIsCompletingProfile(false);
                      });
                  }}
                  size="lg"
                  type="button"
                  variant="hero"
                >
                  {isCompletingProfile ? "完成中..." : "完成注册并进入"}
                </Button>
              </div>
            </div>
          )}

          <p className="text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
            登录即代表您同意
            <span className="mx-1 text-primary">服务协议</span>
            与
            <span className="ml-1 text-primary">隐私政策</span>
          </p>
        </SitePanelBody>
      </SitePanel>

      <SendSmsCaptchaDialog
        flow={smsFlow}
        onConfirmSend={requestLoginSmsCode}
        onOpenChange={setIsSmsCaptchaOpen}
        onRefreshError={setSubmitError}
        open={isSmsCaptchaOpen}
        refreshErrorFallback="图形验证码加载失败"
        title="安全验证"
      />
    </div>
  );
}

