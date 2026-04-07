import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  BellIcon,
  CameraIcon,
  LogOutIcon,
  PencilLineIcon,
  ShieldCheckIcon,
  SmartphoneIcon
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthCaptchaChallenge } from "@/components/auth-captcha-challenge";
import { SitePage, SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { getAvatarImage } from "@/lib/aviation-media";
import { cn } from "@/lib/utils";
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

const visibilityOptions: ProfileVisibility[] = ["community", "followers", "private"];
const MAX_BIO_LENGTH = 50;

type EditableProfileField = "displayName" | "bio" | "profileVisibility" | null;

function trimUrl(value: string | null | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

function SettingsPageSkeleton() {
  return (
    <SitePage>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        <Skeleton className="h-[44rem] rounded-[1rem]" />
        <div className="space-y-6">
          <Skeleton className="h-[14rem] rounded-[1rem]" />
          <Skeleton className="h-[18rem] rounded-[1rem]" />
        </div>
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
    <div className="flex flex-col gap-3 py-2 md:flex-row md:items-center md:justify-between">
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

function SettingCard({
  title,
  children,
  action
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="mt-3 min-w-0">{children}</div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
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
      coverImageFileId: null,
      coverImageUrl: null,
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
  const [editingField, setEditingField] = useState<EditableProfileField>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [isPhoneDialogOpen, setIsPhoneDialogOpen] = useState(false);
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

  const profileItem = profileQuery.data?.item as UserSettingsSnapshot | undefined;

  const resolvedAvatarSrc = useMemo(() => {
    if (!user) {
      return undefined;
    }

    return (
      trimUrl(draft.avatarUrl) ??
      trimUrl(profileItem?.avatarUrl) ??
      trimUrl(user.avatarUrl ?? undefined) ??
      getAvatarImage(user.id)
    );
  }, [draft.avatarUrl, profileItem?.avatarUrl, user]);

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
    if (!isPhoneDialogOpen || phoneSmsFlow.challenge) {
      return;
    }

    void phoneSmsFlow.refreshCaptcha({
      onError: setPhoneActionError,
      errorFallback: "图形验证码初始化失败"
    });
  }, [isPhoneDialogOpen, phoneSmsFlow]);

  if (!user) {
    return <SettingsPageSkeleton />;
  }

  const displayName = draft.displayName || user.displayName;
  const profileLoading = profileQuery.isLoading && !profileQuery.data;

  function beginEdit(field: Exclude<EditableProfileField, null>) {
    setStatusMessage(null);
    setEditingField(field);
  }

  function cancelEdit(field: Exclude<EditableProfileField, null>) {
    if (profileItem) {
      const snapshotDraft = createSettingsDraft(profileItem);
      setDraft((current) => {
        if (field === "displayName") {
          return { ...current, displayName: snapshotDraft.displayName, hasPendingChanges: false };
        }

        if (field === "bio") {
          return { ...current, bio: snapshotDraft.bio, hasPendingChanges: false };
        }

        return {
          ...current,
          profileVisibility: snapshotDraft.profileVisibility,
          hasPendingChanges: false
        };
      });
    }

    setEditingField(null);
  }

  async function persistDraft(fieldKey: string, successMessage: string) {
    setSavingField(fieldKey);
    try {
      const payload = await apiClient.updateCurrentUserProfile(buildUpdateCurrentUserProfileInput(draft));
      const refreshedUser = await apiClient.getCurrentUser();
      if (refreshedUser) {
        setAuthenticated(refreshedUser);
      }

      setDraft(markSettingsSaved(createSettingsDraft(payload.item as UserSettingsSnapshot)));
      setStatusMessage(successMessage);
      setEditingField(null);
      void profileQuery.refetch();
    } catch (reason: unknown) {
      setStatusMessage(reason instanceof Error ? reason.message : "保存失败");
    } finally {
      setSavingField(null);
    }
  }

  async function saveProfileField(field: Exclude<EditableProfileField, null>) {
    if (field === "displayName" && !draft.displayName.trim()) {
      setStatusMessage("昵称不能为空");
      return;
    }

    await persistDraft(field, "资料已更新");
  }

  async function toggleNotificationField(
    field: "notifyComments" | "notifyMentions",
    successMessage: string
  ) {
    const nextDraft = toggleSettingsFlag(draft, field);
    setDraft(nextDraft);
    setSavingField(field);
    try {
      const payload = await apiClient.updateCurrentUserProfile(buildUpdateCurrentUserProfileInput(nextDraft));
      setDraft(markSettingsSaved(createSettingsDraft(payload.item as UserSettingsSnapshot)));
      setStatusMessage(successMessage);
      void profileQuery.refetch();
    } catch (reason: unknown) {
      setDraft(draft);
      setStatusMessage(reason instanceof Error ? reason.message : "设置保存失败");
    } finally {
      setSavingField(null);
    }
  }

  async function uploadAvatar(file: File) {
    setSavingField("avatar");
    try {
      const uploaded = await apiClient.uploadAvatarImage(file);
      const nextDraft = {
        ...draft,
        avatarUrl: uploaded.item.url,
        avatarFileId: uploaded.item.id,
        hasPendingChanges: true
      };
      setDraft(nextDraft);

      const payload = await apiClient.updateCurrentUserProfile(buildUpdateCurrentUserProfileInput(nextDraft));
      const refreshedUser = await apiClient.getCurrentUser();
      if (refreshedUser) {
        setAuthenticated(refreshedUser);
      }

      setDraft(markSettingsSaved(createSettingsDraft(payload.item as UserSettingsSnapshot)));
      setStatusMessage("头像已更新");
      void profileQuery.refetch();
    } catch (reason: unknown) {
      setStatusMessage(reason instanceof Error ? reason.message : "头像上传失败");
    } finally {
      setSavingField(null);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  }

  function closePhoneDialog() {
    setIsPhoneDialogOpen(false);
    setPhoneActionError(null);
    setNextPhone("");
    setPhoneRequestId(null);
    setIsConfirmingPhone(false);
    phoneSmsFlow.reset();
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
      successHint: (response) =>
        response.mockCode ? "验证码已生成，请在开发工具网络面板查看。" : "验证码已发送到新手机号",
      onError: setPhoneActionError,
      errorFallback: "获取短信验证码失败",
      onSuccess: (response) => {
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
        phoneMasked: resolveMaskedPhone(snapshot.phone, snapshot.phoneMasked),
        hasPendingChanges: false
      }));
      setStatusMessage("手机号已完成换绑");
      closePhoneDialog();
      void profileQuery.refetch();
    } catch (reason: unknown) {
      setPhoneActionError(reason instanceof Error ? reason.message : "手机号换绑失败");
    } finally {
      setIsConfirmingPhone(false);
    }
  }

  return (
    <SitePage className="mx-auto w-full max-w-[72rem] gap-6">
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

      <div className="mx-auto grid w-full max-w-[76rem] gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] xl:items-start">
        <section className="space-y-4">
          <div className="text-lg font-semibold text-foreground">公开资料</div>

          <SettingCard
            action={
              <Button
                disabled={savingField === "avatar" || profileQuery.isFetching}
                onClick={() => avatarInputRef.current?.click()}
                size="sm"
                type="button"
                variant="outline"
              >
                <CameraIcon data-icon="inline-start" />
                {savingField === "avatar" ? "保存中..." : "编辑"}
              </Button>
            }
            title="头像"
          >
            <div className="flex flex-wrap items-center gap-5">
              {profileLoading ? (
                <Skeleton className="h-28 w-28 rounded-full md:h-32 md:w-32" />
              ) : (
                <UserAvatar
                  className="!h-28 !w-28 md:!h-32 md:!w-32"
                  displayName={displayName}
                  size="lg"
                  src={resolvedAvatarSrc}
                />
              )}
              <div className="text-sm leading-6 text-muted-foreground">
                建议使用清晰的方形头像。选择图片后会自动保存到账号资料。
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
            </div>
          </SettingCard>

          <SettingCard
            action={
              editingField === "displayName" ? (
                <div className="flex gap-2">
                  <Button onClick={() => cancelEdit("displayName")} size="sm" type="button" variant="ghost">
                    取消
                  </Button>
                  <Button
                    disabled={savingField === "displayName"}
                    onClick={() => {
                      void saveProfileField("displayName");
                    }}
                    size="sm"
                    type="button"
                    variant="hero"
                  >
                    {savingField === "displayName" ? "保存中..." : "保存"}
                  </Button>
                </div>
              ) : (
                <Button onClick={() => beginEdit("displayName")} size="sm" type="button" variant="outline">
                  <PencilLineIcon data-icon="inline-start" />
                  编辑
                </Button>
              )
            }
            title="昵称"
          >
            {editingField === "displayName" ? (
              <Input
                id="settings-display-name"
                maxLength={24}
                onChange={(event) => {
                  setDraft((current) => updateSettingsTextField(current, "displayName", event.target.value));
                }}
                value={draft.displayName}
              />
            ) : (
              <div className="text-base font-semibold text-foreground">{displayName}</div>
            )}
          </SettingCard>

          <SettingCard
            action={
              editingField === "bio" ? (
                <div className="flex gap-2">
                  <Button onClick={() => cancelEdit("bio")} size="sm" type="button" variant="ghost">
                    取消
                  </Button>
                  <Button
                    disabled={savingField === "bio"}
                    onClick={() => {
                      void saveProfileField("bio");
                    }}
                    size="sm"
                    type="button"
                    variant="hero"
                  >
                    {savingField === "bio" ? "保存中..." : "保存"}
                  </Button>
                </div>
              ) : (
                <Button onClick={() => beginEdit("bio")} size="sm" type="button" variant="outline">
                  <PencilLineIcon data-icon="inline-start" />
                  编辑
                </Button>
              )
            }
            title="个人简介"
          >
            {editingField === "bio" ? (
              <div className="relative">
                <Textarea
                  className="min-h-28 resize-none pb-8"
                  id="settings-bio"
                  maxLength={MAX_BIO_LENGTH}
                  onChange={(event) => {
                    setDraft((current) =>
                      updateSettingsTextField(current, "bio", event.target.value.slice(0, MAX_BIO_LENGTH))
                    );
                  }}
                  value={draft.bio}
                />
                <div className="pointer-events-none absolute bottom-3 right-3 text-xs text-muted-foreground">
                  {draft.bio.length}/{MAX_BIO_LENGTH}
                </div>
              </div>
            ) : (
              <div className="text-sm leading-6 text-muted-foreground">
                {draft.bio.trim() || "还没有填写个人简介。"}
              </div>
            )}
          </SettingCard>

          <SettingCard
            action={
              editingField === "profileVisibility" ? (
                <div className="flex gap-2">
                  <Button onClick={() => cancelEdit("profileVisibility")} size="sm" type="button" variant="ghost">
                    取消
                  </Button>
                  <Button
                    disabled={savingField === "profileVisibility"}
                    onClick={() => {
                      void saveProfileField("profileVisibility");
                    }}
                    size="sm"
                    type="button"
                    variant="hero"
                  >
                    {savingField === "profileVisibility" ? "保存中..." : "保存"}
                  </Button>
                </div>
              ) : (
                <Button onClick={() => beginEdit("profileVisibility")} size="sm" type="button" variant="outline">
                  <PencilLineIcon data-icon="inline-start" />
                  编辑
                </Button>
              )
            }
            title="可见范围"
          >
            {editingField === "profileVisibility" ? (
              <div className="grid gap-3 md:grid-cols-3">
                {visibilityOptions.map((option) => {
                  const selected = draft.profileVisibility === option;
                  return (
                    <button
                      className={cn(
                        "rounded-xl px-4 py-4 text-left transition",
                        selected ? "bg-primary/8 ring-2 ring-primary/35" : "bg-muted/25 hover:bg-muted/40"
                      )}
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
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">
                  {profileVisibilityLabel(draft.profileVisibility)}
                </div>
                <div className="text-sm leading-6 text-muted-foreground">
                  {profileVisibilityDescription(draft.profileVisibility)}
                </div>
              </div>
            )}
          </SettingCard>
        </section>

        <div className="space-y-8 xl:pt-[0.2rem]">
          <section className="space-y-4">
            <div className="text-lg font-semibold text-foreground">账号与安全</div>

            <SettingCard
              action={
                <Button
                  onClick={() => {
                    setPhoneActionError(null);
                    setIsPhoneDialogOpen(true);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ShieldCheckIcon data-icon="inline-start" />
                  编辑
                </Button>
              }
              title="绑定手机"
            >
              <div className="space-y-1">
                <div className="text-base font-semibold text-foreground">
                  {resolveMaskedPhone(draft.phone || null, draft.phoneMasked)}
                </div>
                <div className="text-sm leading-6 text-muted-foreground">
                  仅展示脱敏手机号，修改时会通过短信验证码完成校验。
                </div>
              </div>
            </SettingCard>
          </section>

          <section className="space-y-4">
            <div className="text-lg font-semibold text-foreground">通知</div>
            <div className="space-y-6">
              <SettingCard
                action={
                  <Button
                    disabled={savingField === "notifyComments"}
                    onClick={() => {
                      void toggleNotificationField("notifyComments", "评论与回复提醒已更新");
                    }}
                    size="sm"
                    type="button"
                    variant={draft.notifyComments ? "panel" : "outline"}
                  >
                    {savingField === "notifyComments" ? "保存中..." : draft.notifyComments ? "开启" : "关闭"}
                  </Button>
                }
                title="评论与回复提醒"
              >
                <div className="text-sm leading-6 text-muted-foreground">
                  当有人评论或回复你时，消息中心优先显示。
                </div>
              </SettingCard>

              <SettingCard
                action={
                  <Button
                    disabled={savingField === "notifyMentions"}
                    onClick={() => {
                      void toggleNotificationField("notifyMentions", "提及提醒已更新");
                    }}
                    size="sm"
                    type="button"
                    variant={draft.notifyMentions ? "panel" : "outline"}
                  >
                    {savingField === "notifyMentions" ? "保存中..." : draft.notifyMentions ? "开启" : "关闭"}
                  </Button>
                }
                title="提及提醒"
              >
                <div className="text-sm leading-6 text-muted-foreground">
                  当有人在帖子、榜单或评论中提及你时提醒。
                </div>
              </SettingCard>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button asChild size="sm" type="button" variant="outline">
              <Link to={APP_ROUTES.webProfile}>查看个人主页</Link>
            </Button>
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
      </div>

      {isPhoneDialogOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/38 px-4 py-8 backdrop-blur-sm">
          <SitePanel className="w-full max-w-[560px]" variant="floating">
            <SitePanelBody className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-foreground">更换绑定手机</div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    输入新手机号并完成验证码校验后，绑定会立即更新。
                  </div>
                </div>
                <Button onClick={closePhoneDialog} size="sm" type="button" variant="ghost">
                  关闭
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-start">
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
                  <AuthCaptchaChallenge
                    code={phoneSmsFlow.challenge?.imageOrText ?? "----"}
                    hintClassName="text-left"
                    onRefresh={() => {
                      void refreshPhoneChallenge();
                    }}
                  />
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
                      ? `${phoneSmsFlow.cooldownSeconds} 秒后重发`
                      : phoneSmsFlow.requestHint
                        ? "重新发送验证码"
                        : "获取验证码"}
                </Button>
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
                  {isConfirmingPhone ? "保存中..." : "保存"}
                </Button>
              </div>

              {phoneSmsFlow.requestHint ? (
                <Alert>
                  <AlertTitle>验证码已发送</AlertTitle>
                  <AlertDescription>{phoneSmsFlow.requestHint}</AlertDescription>
                </Alert>
              ) : null}

              {phoneActionError ? (
                <Alert variant="destructive">
                  <AlertTitle>手机号换绑失败</AlertTitle>
                  <AlertDescription>{phoneActionError}</AlertDescription>
                </Alert>
              ) : null}
            </SitePanelBody>
          </SitePanel>
        </div>
      ) : null}
    </SitePage>
  );
}
