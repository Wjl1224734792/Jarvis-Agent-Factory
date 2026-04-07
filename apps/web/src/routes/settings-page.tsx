import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { BellIcon, CameraIcon, LogOutIcon, ShieldCheckIcon, SmartphoneIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SitePage } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "../features/auth/auth-store";
import {
  buildUpdateCurrentUserProfileInput,
  createSettingsDraft,
  markSettingsSaved,
  profileVisibilityDescription,
  profileVisibilityLabel,
  setProfileVisibility,
  syncSettingsDraft,
  toggleSettingsFlag,
  updateSettingsTextField,
  type ProfileVisibility,
  type SettingsDraft,
  type UserSettingsSnapshot
} from "../features/auth/profile-settings-state";
import {
  canConfirmPhoneRebind,
  canRequestPhoneRebind,
  resolveMaskedPhone
} from "../features/auth/phone-rebind-state";
import { useSmsVerificationFlow } from "../features/auth/use-sms-verification-flow";
import { apiClient } from "../lib/api-client";

const visibilityOptions: ProfileVisibility[] = ["community", "followers", "private"];

function SettingsPageSkeleton() {
  return (
    <SitePage>
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-[1rem]" />
        <Skeleton className="h-[30rem] rounded-[1rem]" />
      </div>
    </SitePage>
  );
}

function SettingToggleRow({
  title,
  description,
  enabled,
  onToggle
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/70 py-4 last:border-b-0 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-sm leading-6 text-muted-foreground">{description}</div>
      </div>
      <Button onClick={onToggle} size="sm" type="button" variant={enabled ? "panel" : "outline"}>
        {enabled ? "开启" : "关闭"}
      </Button>
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const setError = useAuthStore((state) => state.setError);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<SettingsDraft>(() =>
    createSettingsDraft({
      displayName: "",
      bio: null,
      avatarFileId: null,
      avatarUrl: null,
      phone: null,
      phoneMasked: null,
      profileVisibility: "community",
      notifyComments: true,
      notifyMentions: true,
      sessionAlerts: true,
      emailDigest: false
    })
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isPhonePanelOpen, setIsPhonePanelOpen] = useState(false);
  const [nextPhone, setNextPhone] = useState("");
  const [phoneRequestId, setPhoneRequestId] = useState<string | null>(null);
  const [phoneActionError, setPhoneActionError] = useState<string | null>(null);
  const [isConfirmingPhone, setIsConfirmingPhone] = useState(false);
  const phoneSmsFlow = useSmsVerificationFlow();

  const profileQuery = useQuery({
    queryKey: ["current-user-profile", user?.id],
    queryFn: () => apiClient.getCurrentUserProfile(),
    enabled: Boolean(user)
  });

  useEffect(() => {
    const snapshot = profileQuery.data?.item as UserSettingsSnapshot | undefined;
    if (!snapshot) {
      return;
    }

    setDraft((current) => syncSettingsDraft(current, snapshot));
  }, [profileQuery.data?.item]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timer = window.setTimeout(() => setStatusMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    if (!isPhonePanelOpen || phoneSmsFlow.challenge) {
      return;
    }

    void phoneSmsFlow.refreshCaptcha({
      onError: setPhoneActionError,
      errorFallback: "图形验证码初始化失败"
    });
  }, [isPhonePanelOpen, phoneSmsFlow]);

  if (!user) {
    return <SettingsPageSkeleton />;
  }

  async function uploadAvatar(file: File) {
    setIsUploadingAvatar(true);
    try {
      const uploaded = await apiClient.uploadAvatarImage(file);
      setDraft((current) => ({
        ...updateSettingsTextField(current, "avatarUrl", uploaded.item.url),
        avatarFileId: uploaded.item.id
      }));
      setStatusMessage("头像已上传，保存后会更新到个人资料。");
    } catch (reason: unknown) {
      setStatusMessage(reason instanceof Error ? reason.message : "头像上传失败");
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  }

  async function saveSettings() {
    setIsSaving(true);
    try {
      const payload = await apiClient.updateCurrentUserProfile(buildUpdateCurrentUserProfileInput(draft));
      const refreshedUser = await apiClient.getCurrentUser();
      if (refreshedUser) {
        setAuthenticated(refreshedUser);
      }

      setDraft(markSettingsSaved(createSettingsDraft(payload.item as UserSettingsSnapshot)));
      setStatusMessage("资料已保存。");
      void profileQuery.refetch();
    } catch (reason: unknown) {
      setStatusMessage(reason instanceof Error ? reason.message : "资料保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function refreshPhoneChallenge() {
    setPhoneActionError(null);
    await phoneSmsFlow.refreshCaptcha({
      onError: setPhoneActionError,
      errorFallback: "刷新验证码失败"
    });
  }

  async function requestPhoneCode() {
    if (
      !canRequestPhoneRebind({
        nextPhone,
        captchaChallengeId: phoneSmsFlow.challenge?.challengeId ?? null,
        captchaCode: phoneSmsFlow.captchaCode
      }) ||
      !phoneSmsFlow.challenge
    ) {
      return;
    }

    setPhoneActionError(null);
    await phoneSmsFlow.sendSmsCode({
      request: ({ challengeId, captchaCode }) =>
        apiClient.requestPhoneChange({
          phone: nextPhone.trim(),
          captchaChallengeId: challengeId,
          captchaCode
        }),
      successHint: response =>
        response.mockCode ? "验证码已生成，请在开发工具网络面板查看。" : "验证码已发送到新手机号",
      onError: setPhoneActionError,
      errorFallback: "获取短信验证码失败",
      onSuccess: response => {
        setPhoneRequestId(response.requestId);
      }
    });
  }

  async function confirmPhoneChange() {
    if (
      !canConfirmPhoneRebind({
        nextPhone,
        requestId: phoneRequestId,
        smsCode: phoneSmsFlow.smsCode
      }) ||
      !phoneRequestId
    ) {
      return;
    }

    setIsConfirmingPhone(true);
    setPhoneActionError(null);
    try {
      const payload = await apiClient.confirmPhoneChange({
        phone: nextPhone.trim(),
        requestId: phoneRequestId,
        smsCode: phoneSmsFlow.smsCode.trim()
      });
      const snapshot = payload.item as UserSettingsSnapshot;
      setDraft((current) => ({
        ...current,
        phone: snapshot.phone ?? "",
        phoneMasked: resolveMaskedPhone(snapshot.phone, snapshot.phoneMasked)
      }));
      setStatusMessage("手机号已完成换绑。");
      setIsPhonePanelOpen(false);
      phoneSmsFlow.reset();
      setNextPhone("");
      setPhoneRequestId(null);
      void profileQuery.refetch();
    } catch (reason: unknown) {
      setPhoneActionError(reason instanceof Error ? reason.message : "手机号换绑失败");
    } finally {
      setIsConfirmingPhone(false);
    }
  }

  return (
    <SitePage className="mx-auto w-full max-w-[72rem] gap-4">
      <Card variant="muted">
        <CardContent className="grid gap-4 pt-[var(--panel-padding)] xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
          <div className="flex items-center gap-4">
            <UserAvatar
              className="size-18"
              displayName={draft.displayName || user.displayName}
              size="lg"
              src={draft.avatarUrl || user.avatarUrl}
            />
            <div className="space-y-1">
              <div className="text-xl font-semibold text-foreground">
                {draft.displayName || user.displayName}
              </div>
              <div className="text-sm leading-6 text-muted-foreground">
                {draft.bio || "先写一句简介，让飞友更快认识你。"}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border border-border/70 px-4 py-4">
              <div className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                可见范围
              </div>
              <div className="mt-1.5 text-sm font-medium text-foreground">
                {profileVisibilityLabel(draft.profileVisibility)}
              </div>
            </div>
            <div className="border border-border/70 px-4 py-4">
              <div className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                当前手机号
              </div>
              <div className="mt-1.5 text-sm font-medium text-foreground">
                {resolveMaskedPhone(draft.phone || null, draft.phoneMasked)}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              disabled={isSaving || isUploadingAvatar || profileQuery.isFetching}
              onClick={() => {
                void saveSettings();
              }}
              type="button"
              variant="hero"
            >
              {isSaving ? "保存中..." : "保存资料"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {profileQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>设置加载失败</AlertTitle>
          <AlertDescription>{profileQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {statusMessage ? (
        <Alert>
          <AlertTitle>操作提示</AlertTitle>
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">资料设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-display-name">
                昵称
              </label>
              <Input
                id="settings-display-name"
                onChange={(event) => {
                  setDraft((current) => updateSettingsTextField(current, "displayName", event.target.value));
                }}
                value={draft.displayName}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-bio">
                个人简介
              </label>
              <Textarea
                className="min-h-28 resize-y"
                id="settings-bio"
                onChange={(event) => {
                  setDraft((current) => updateSettingsTextField(current, "bio", event.target.value));
                }}
                value={draft.bio}
              />
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">可见范围</div>
              <div className="grid gap-3 md:grid-cols-3">
                {visibilityOptions.map((option) => (
                  <button
                    className={`border px-4 py-4 text-left transition ${
                      draft.profileVisibility === option
                        ? "border-primary/20 bg-primary/8"
                        : "border-border/70 hover:border-primary/18 hover:bg-accent/32"
                    }`}
                    key={option}
                    onClick={() => {
                      setDraft((current) => setProfileVisibility(current, option));
                    }}
                    type="button"
                  >
                    <div className="text-sm font-medium text-foreground">{profileVisibilityLabel(option)}</div>
                    <div className="mt-2 text-sm leading-6 text-muted-foreground">
                      {profileVisibilityDescription(option)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">头像</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <UserAvatar
                  className="size-20"
                  displayName={draft.displayName || user.displayName}
                  size="lg"
                  src={draft.avatarUrl || user.avatarUrl}
                />
                <div className="space-y-2">
                  <Button
                    onClick={() => avatarInputRef.current?.click()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <CameraIcon data-icon="inline-start" />
                    {isUploadingAvatar ? "上传中..." : "上传头像"}
                  </Button>
                  <div className="text-xs leading-5 text-muted-foreground">建议使用清晰的方形头像。</div>
                </div>
              </div>
              <input
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadAvatar(file);
                  }
                }}
                ref={avatarInputRef}
                type="file"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">账号安全</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 border border-border/70 px-4 py-4 md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
                <div className="space-y-1">
                  <div className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                    当前手机号
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    {resolveMaskedPhone(draft.phone || null, draft.phoneMasked)}
                  </div>
                  <div className="text-xs leading-5 text-muted-foreground">页面只展示后四位，换绑后立即更新。</div>
                </div>
                <Button
                  className="h-11 w-full"
                  onClick={() => {
                    setIsPhonePanelOpen((current) => !current);
                    setPhoneActionError(null);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ShieldCheckIcon data-icon="inline-start" />
                  {isPhonePanelOpen ? "收起换绑" : "换绑手机号"}
                </Button>
              </div>

              {isPhonePanelOpen ? (
                <div className="space-y-4 border border-border/70 px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-end">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="settings-next-phone">
                        新手机号
                      </label>
                      <Input
                        id="settings-next-phone"
                        inputMode="numeric"
                        onChange={(event) => setNextPhone(event.target.value)}
                        placeholder="请输入新的手机号"
                        type="tel"
                        value={nextPhone}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">图形验证码</div>
                      <Button
                        className="h-12 w-full rounded-[var(--radius-control)] bg-slate-900 font-mono tracking-[0.28em] text-white hover:bg-slate-900/92"
                        onClick={() => {
                          void refreshPhoneChallenge();
                        }}
                        type="button"
                      >
                        {phoneSmsFlow.challenge?.imageOrText ?? "----"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-end">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="settings-phone-captcha">
                        输入图形验证码
                      </label>
                      <Input
                        id="settings-phone-captcha"
                        onChange={(event) => phoneSmsFlow.setCaptchaCode(event.target.value.toUpperCase())}
                        placeholder="请输入图形验证码"
                        value={phoneSmsFlow.captchaCode}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-transparent">操作</div>
                      <Button
                        className="h-12 w-full"
                        disabled={
                          phoneSmsFlow.isSendingSms ||
                          phoneSmsFlow.cooldownSeconds > 0 ||
                          !canRequestPhoneRebind({
                            nextPhone,
                            captchaChallengeId: phoneSmsFlow.challenge?.challengeId ?? null,
                            captchaCode: phoneSmsFlow.captchaCode
                          })
                        }
                        onClick={() => {
                          void requestPhoneCode();
                        }}
                        type="button"
                        variant="panel"
                      >
                        <SmartphoneIcon data-icon="inline-start" />
                        {phoneSmsFlow.isSendingSms
                          ? "发送中..."
                          : phoneSmsFlow.cooldownSeconds > 0
                            ? `${phoneSmsFlow.cooldownSeconds} 秒后重新发送`
                            : phoneSmsFlow.requestHint
                              ? "重新发送验证码"
                              : "获取验证码"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-end">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="settings-phone-sms">
                        短信验证码
                      </label>
                      <Input
                        id="settings-phone-sms"
                        onChange={(event) => phoneSmsFlow.setSmsCode(event.target.value)}
                        placeholder="请输入 6 位验证码"
                        value={phoneSmsFlow.smsCode}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-transparent">确认</div>
                      <Button
                        className="h-12 w-full"
                        disabled={
                          isConfirmingPhone ||
                          !canConfirmPhoneRebind({
                            nextPhone,
                            requestId: phoneRequestId,
                            smsCode: phoneSmsFlow.smsCode
                          })
                        }
                        onClick={() => {
                          void confirmPhoneChange();
                        }}
                        type="button"
                        variant="hero"
                      >
                        {isConfirmingPhone ? "换绑中..." : "确认换绑"}
                      </Button>
                    </div>
                  </div>

                  {phoneSmsFlow.requestHint ? (
                    <Alert>
                      <AlertTitle>验证码已生成</AlertTitle>
                      <AlertDescription>{phoneSmsFlow.requestHint}</AlertDescription>
                    </Alert>
                  ) : null}

                  {phoneActionError ? (
                    <Alert variant="destructive">
                      <AlertTitle>手机号换绑失败</AlertTitle>
                      <AlertDescription>{phoneActionError}</AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">通知</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingToggleRow
            description="当有人评论或回复你时，消息中心优先显示。"
            enabled={draft.notifyComments}
            onToggle={() => {
              setDraft((current) => toggleSettingsFlag(current, "notifyComments"));
            }}
            title="评论与回复提醒"
          />
          <SettingToggleRow
            description="当有人在帖子、榜单或评论中提及你时提醒。"
            enabled={draft.notifyMentions}
            onToggle={() => {
              setDraft((current) => toggleSettingsFlag(current, "notifyMentions"));
            }}
            title="提及提醒"
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-2">
        <Button asChild size="sm" type="button" variant="outline">
          <Link to={APP_ROUTES.webProfile}>查看个人主页</Link>
        </Button>
        <div className="flex gap-3">
          <Button asChild size="sm" type="button" variant="outline">
            <Link to={APP_ROUTES.notifications}>
              <BellIcon data-icon="inline-start" />
              查看消息
            </Link>
          </Button>
          <Button
            onClick={() => {
              void apiClient
                .logout()
                .then(() => {
                  setAnonymous();
                  void navigate(APP_ROUTES.feedHome);
                })
                .catch((reason: unknown) => {
                  setError(reason instanceof Error ? reason.message : "退出登录失败");
                });
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <LogOutIcon data-icon="inline-start" />
            退出登录
          </Button>
        </div>
      </div>
    </SitePage>
  );
}
