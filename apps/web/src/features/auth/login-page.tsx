import { APP_ROUTES } from "@feijia/shared";
import { ApiClientError } from "@feijia/http-client";
import { resolveSafeRedirectPath } from "@feijia/shared";
import { ImagePlusIcon, SmartphoneIcon, UserRoundIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SendSmsCaptchaDialog } from "./send-sms-captcha-dialog";
import {
  SitePageDescription,
  SitePageEyebrow,
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
  const [isSmsCaptchaOpen, setIsSmsCaptchaOpen] = useState(false);

  /** 登录接口仍要求图形验证码字段，但服务端登录流程不校验；短信已单独完成图形验证 */
  const webLoginCaptchaPlaceholder = {
    captchaChallengeId: "web-login",
    captchaCode: "0000"
  } as const;

  const redirectTo = resolveSafeRedirectPath({
    candidate: searchParams.get("redirect"),
    fallbackPath: APP_ROUTES.feedHome,
    blockedPaths: [APP_ROUTES.webLogin]
  });

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
                  ? "手机号验证通过后，老用户直接登录，新用户会在弹窗内继续完善用户名和头像。"
                  : "这是你的首次登录。确认用户名和头像后，再进入站内继续发帖、点评和关注。"}
              </SitePageDescription>
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
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="login-phone">
                  手机号
                </label>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
                  <div className="flex items-center rounded-[var(--radius-control)] bg-surface-2 px-4 text-lg font-semibold text-foreground">
                    +86
                  </div>
                  <Input
                    className="h-12"
                    id="login-phone"
                    inputMode="numeric"
                    onChange={event => {
                      setPhone(event.target.value);
                    }}
                    placeholder="请输入手机号"
                    value={phone}
                  />
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
                    onChange={event => {
                      smsFlow.setSmsCode(event.target.value);
                    }}
                    placeholder="请输入 6 位验证码"
                    value={smsFlow.smsCode}
                  />
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium text-transparent">操作</div>
                  <Button
                    className="h-12 w-full"
                    disabled={smsFlow.isSendingSms || smsFlow.cooldownSeconds > 0}
                    onClick={() => {
                      setSubmitError(null);
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

              {submitError ? (
                <Alert variant="destructive">
                  <AlertTitle>登录失败</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-col gap-3">
                <Button
                  className="w-full"
                  disabled={isSubmitting}
                  onClick={() => {
                    setIsSubmitting(true);
                    setSubmitError(null);

                    void apiClient
                      .loginWeb({
                        phone,
                        captchaChallengeId: webLoginCaptchaPlaceholder.captchaChallengeId,
                        captchaCode: webLoginCaptchaPlaceholder.captchaCode,
                        smsCode: smsFlow.smsCode
                      })
                      .then(response => {
                        if (response.kind === "authenticated") {
                          setAuthenticated(response.user);
                          void navigate(redirectTo ?? APP_ROUTES.feedHome, {
                            replace: true
                          });
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
                    void navigate(APP_ROUTES.feedHome);
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
                  disabled={!registrationToken || !displayName.trim() || isCompletingProfile}
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
                        if (selectedAvatarFile) {
                          const uploaded = await apiClient.uploadAvatarImage(selectedAvatarFile);
                          await apiClient.updateCurrentUserProfile({
                            avatarFileId: uploaded.item.id
                          });
                          const refreshedUser = await apiClient.getCurrentUser();
                          setAuthenticated(refreshedUser ?? response.user);
                        } else {
                          setAuthenticated(response.user);
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

