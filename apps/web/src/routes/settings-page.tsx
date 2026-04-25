import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isChinaMainlandMobilePhone } from "@feijia/schemas";
import { APP_ROUTES } from "@feijia/shared";
import {
  CameraIcon,
  LogOutIcon,
  PencilLineIcon,
  ShieldCheckIcon,
  SmartphoneIcon
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  SitePage,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { resolveUserAvatarSrc } from "@/lib/avatar-url";
import { cn } from "@/lib/utils";
import { useAuthStore } from "../features/auth/auth-store";
import {
  buildUpdateCurrentUserProfileInput,
  createSettingsDraft,
  mergeSettingsSnapshotIntoUserSummary,
  markSettingsSaved,
  profileVisibilityDescription,
  profileVisibilityLabel,
  restoreSettingsBooleanField,
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
  normalizeChinaMobilePhoneInput,
  resolveMaskedPhone
} from "../features/auth/phone-rebind-state";
import { SendSmsCaptchaDialog } from "../features/auth/send-sms-captcha-dialog";
import { useSmsVerificationFlow } from "../features/auth/use-sms-verification-flow";
import { settingsNotificationOptions } from "../features/auth/settings-notification-options";

const visibilityOptions: ProfileVisibility[] = ["community", "followers", "private"];
const MAX_BIO_LENGTH = 50;

type EditableProfileField = "displayName" | "bio" | "profileVisibility" | null;

function SettingsPageSkeleton() {
  return (
    <SitePage className="mx-auto w-full max-w-[48rem] gap-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32 rounded-md" />
        <Skeleton className="h-4 w-64 max-w-full rounded-md" />
      </div>
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[var(--radius-panel)] border border-border/60 bg-surface-2/80">
          <div className="flex items-center gap-4 px-4 py-4">
            <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-[var(--radius-panel)] border border-border/60 bg-surface-2/80">
          <Skeleton className="h-11 w-full rounded-none" />
          <div className="divide-y divide-border/60 p-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div className="flex items-start justify-between gap-4 px-4 py-4" key={i}>
                <div className="min-w-0 flex-1 space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-8 w-16 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SitePage>
  );
}

function SettingsPanel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <SitePanel
      className={cn("overflow-hidden border border-border/60 shadow-[var(--shadow-soft)]", className)}
      variant="muted"
    >
      {children}
    </SitePanel>
  );
}

function SettingsPanelHeader({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-border/60 bg-muted/25 px-4 py-3">
      <h2 className="text-sm font-semibold text-foreground">{children}</h2>
    </div>
  );
}

function SettingsRow({
  label,
  description,
  children,
  action,
  alignTop
}: {
  label: string;
  description?: string;
  children?: ReactNode;
  action?: ReactNode;
  alignTop?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-4 py-3.5",
        alignTop ? "items-start" : "items-center"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description ? (
          <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>
        ) : null}
        {children ? <div className="mt-2">{children}</div> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const setError = useAuthStore((state) => state.setError);
  const queryClient = useQueryClient();
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
  const [isPhoneSmsCaptchaOpen, setIsPhoneSmsCaptchaOpen] = useState(false);
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
      resolveUserAvatarSrc(draft.avatarUrl) ??
      resolveUserAvatarSrc(profileItem?.avatarUrl) ??
      resolveUserAvatarSrc(user.avatarUrl)
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

  if (!user) {
    return <SettingsPageSkeleton />;
  }

  const currentUser = user;
  const displayName = draft.displayName || user.displayName;
  const profileLoading = profileQuery.isLoading && !profileQuery.data;

  const nextPhoneDigits = normalizeChinaMobilePhoneInput(nextPhone);
  const showNextPhoneInvalid =
    nextPhoneDigits.length === 11 && !isChinaMainlandMobilePhone(nextPhoneDigits);

  function beginEdit(field: Exclude<EditableProfileField, null>) {
    setStatusMessage(null);
    setEditingField(field);
  }

  function applyProfileSnapshot(snapshot: UserSettingsSnapshot) {
    setDraft(markSettingsSaved(createSettingsDraft(snapshot)));
    setAuthenticated(mergeSettingsSnapshotIntoUserSummary(currentUser, snapshot));
    queryClient.setQueryData(["current-user-profile", currentUser.id], {
      item: snapshot
    });
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
      applyProfileSnapshot(payload.item as UserSettingsSnapshot);
      setStatusMessage(successMessage);
      setEditingField(null);
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
    field: (typeof settingsNotificationOptions)[number]["field"],
    successMessage: string
  ) {
    const previousValue = draft[field];
    const nextDraft = toggleSettingsFlag(draft, field);
    setDraft(nextDraft);
    setSavingField(field);
    try {
      const payload = await apiClient.updateCurrentUserProfile(buildUpdateCurrentUserProfileInput(nextDraft));
      applyProfileSnapshot(payload.item as UserSettingsSnapshot);
      setStatusMessage(successMessage);
    } catch (reason: unknown) {
      setDraft((current) => restoreSettingsBooleanField(current, field, previousValue));
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
      applyProfileSnapshot(payload.item as UserSettingsSnapshot);
      setStatusMessage("头像已更新");
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
    setIsPhoneSmsCaptchaOpen(false);
    setPhoneActionError(null);
    setNextPhone("");
    setPhoneRequestId(null);
    setIsConfirmingPhone(false);
    phoneSmsFlow.reset();
  }

  async function requestPhoneCode() {
    if (!canRequestPhoneRebind({ nextPhone }) || !phoneSmsFlow.challenge) {
      return;
    }

    setPhoneActionError(null);
    await phoneSmsFlow.sendSmsCode({
      request: ({ challengeId, captchaCode }) =>
        apiClient.requestPhoneChange({
          phone: nextPhoneDigits,
          captchaChallengeId: challengeId,
          captchaCode
        }),
      successHint: () => " ",
      onError: setPhoneActionError,
      errorFallback: "获取短信验证码失败",
      onSuccess: (response) => {
        setPhoneRequestId(response.requestId);
        setIsPhoneSmsCaptchaOpen(false);
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
        phone: nextPhoneDigits,
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
      queryClient.setQueryData(["current-user-profile", currentUser.id], {
        item: snapshot
      });
      setStatusMessage("手机号已完成换绑");
      closePhoneDialog();
    } catch (reason: unknown) {
      setPhoneActionError(reason instanceof Error ? reason.message : "手机号换绑失败");
    } finally {
      setIsConfirmingPhone(false);
    }
  }

  return (
    <SitePage className="mx-auto w-full max-w-[48rem] gap-6">
      <SitePageHead>
        <SitePageTitle>设置</SitePageTitle>
        <SitePageDescription>管理公开资料、账号安全与通知偏好。</SitePageDescription>
      </SitePageHead>

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

      {/* Profile Summary Card */}
      <SitePanel className="overflow-hidden border border-border/60" variant="floating">
        <div className="flex items-center gap-4 px-5 py-4">
          {profileLoading ? (
            <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
          ) : (
            <UserAvatar
              className="!h-16 !w-16 shrink-0"
              displayName={displayName}
              size="lg"
              src={resolvedAvatarSrc}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-foreground">{displayName}</div>
            <div className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {draft.bio.trim() || "还没有填写个人简介。"}
            </div>
          </div>
          <Button asChild className="shrink-0" size="sm" variant="ghost">
            <Link to={APP_ROUTES.webProfile}>查看主页</Link>
          </Button>
        </div>
      </SitePanel>

      <div className="space-y-4">
        <SettingsPanel>
          <SettingsPanelHeader>公开资料</SettingsPanelHeader>
          <div className="divide-y divide-border/60">
            {/* Avatar */}
            <SettingsRow
              action={
                <Button
                  className="rounded-full"
                  disabled={savingField === "avatar" || profileQuery.isFetching}
                  onClick={() => avatarInputRef.current?.click()}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <CameraIcon data-icon="inline-start" />
                  {savingField === "avatar" ? "保存中..." : "编辑"}
                </Button>
              }
              label="头像"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {profileLoading ? (
                  <Skeleton className="h-28 w-28 shrink-0 rounded-full md:h-32 md:w-32" />
                ) : (
                  <UserAvatar
                    className="!h-28 !w-28 shrink-0 md:!h-32 md:!w-32"
                    displayName={displayName}
                    size="lg"
                    src={resolvedAvatarSrc}
                  />
                )}
                <div className="min-w-0 text-sm leading-6 text-muted-foreground">
                  建议使用清晰的方形头像。选择图片后会自动保存到账号资料。
                </div>
                <input
                  accept="image/*"
                  aria-label="上传头像图片"
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
            </SettingsRow>

            <SettingsRow
              action={
                editingField === "displayName" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => cancelEdit("displayName")} size="sm" type="button" variant="ghost">
                      取消
                    </Button>
                    <Button
                      className="rounded-full"
                      disabled={savingField === "displayName"}
                      onClick={() => {
                        void saveProfileField("displayName");
                      }}
                      size="sm"
                      type="button"
                      variant="default"
                    >
                      {savingField === "displayName" ? "保存中..." : "保存"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="rounded-full"
                    onClick={() => beginEdit("displayName")}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <PencilLineIcon data-icon="inline-start" />
                    编辑
                  </Button>
                )
              }
              label="昵称"
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
            </SettingsRow>

            <SettingsRow
              action={
                editingField === "bio" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => cancelEdit("bio")} size="sm" type="button" variant="ghost">
                      取消
                    </Button>
                    <Button
                      className="rounded-full"
                      disabled={savingField === "bio"}
                      onClick={() => {
                        void saveProfileField("bio");
                      }}
                      size="sm"
                      type="button"
                      variant="default"
                    >
                      {savingField === "bio" ? "保存中..." : "保存"}
                    </Button>
                  </div>
                ) : (
                  <Button className="rounded-full" onClick={() => beginEdit("bio")} size="sm" type="button" variant="ghost">
                    <PencilLineIcon data-icon="inline-start" />
                    编辑
                  </Button>
                )
              }
              alignTop
              label="个人简介"
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
                <div className="text-muted-foreground">
                  {draft.bio.trim() || "还没有填写个人简介。"}
                </div>
              )}
            </SettingsRow>

            <SettingsRow
              action={
                editingField === "profileVisibility" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => cancelEdit("profileVisibility")} size="sm" type="button" variant="ghost">
                      取消
                    </Button>
                    <Button
                      className="rounded-full"
                      disabled={savingField === "profileVisibility"}
                      onClick={() => {
                        void saveProfileField("profileVisibility");
                      }}
                      size="sm"
                      type="button"
                      variant="default"
                    >
                      {savingField === "profileVisibility" ? "保存中..." : "保存"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="rounded-full"
                    onClick={() => beginEdit("profileVisibility")}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <PencilLineIcon data-icon="inline-start" />
                    编辑
                  </Button>
                )
              }
              alignTop={editingField === "profileVisibility"}
              label="可见范围"
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
                  <div className="font-medium text-foreground">{profileVisibilityLabel(draft.profileVisibility)}</div>
                  <div className="text-muted-foreground">{profileVisibilityDescription(draft.profileVisibility)}</div>
                </div>
              )}
            </SettingsRow>
          </div>
        </SettingsPanel>

        <SettingsPanel>
          <SettingsPanelHeader>账号与安全</SettingsPanelHeader>
          <div className="divide-y divide-border/60">
            <SettingsRow
              action={
                <Button
                  className="rounded-full"
                  onClick={() => {
                    setPhoneActionError(null);
                    setIsPhoneDialogOpen(true);
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <ShieldCheckIcon data-icon="inline-start" />
                  编辑
                </Button>
              }
              label="绑定手机"
            >
              <div className="space-y-1">
                <div className="text-base font-semibold text-foreground">
                  {resolveMaskedPhone(draft.phone || null, draft.phoneMasked)}
                </div>
                <div className="text-muted-foreground">
                  仅展示脱敏手机号，修改时会通过短信验证码完成校验。
                </div>
              </div>
            </SettingsRow>
          </div>
        </SettingsPanel>

        <SettingsPanel>
          <SettingsPanelHeader>通知偏好</SettingsPanelHeader>
          <div className="divide-y divide-border/60">
            {settingsNotificationOptions.map((option) => (
              <SettingsRow
                action={
                  <Switch
                    checked={draft[option.field]}
                    disabled={savingField === option.field}
                    onCheckedChange={() => {
                      void toggleNotificationField(option.field, option.successMessage);
                    }}
                  />
                }
                description={option.description}
                key={option.field}
                label={option.label}
              />
            ))}
          </div>
        </SettingsPanel>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          className="rounded-full"
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
          variant="destructive"
        >
          <LogOutIcon data-icon="inline-start" />
          退出登录
        </Button>
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-next-phone">
                  新手机号
                </label>
                <Input
                  id="settings-next-phone"
                  inputMode="numeric"
                  maxLength={11}
                  onChange={(event) => setNextPhone(normalizeChinaMobilePhoneInput(event.target.value))}
                  placeholder="请输入新的手机号"
                  type="tel"
                  value={nextPhone}
                />
                {showNextPhoneInvalid ? (
                  <p className="text-xs text-destructive">请输入有效的手机号</p>
                ) : null}
              </div>

              <Button
                className="h-12 w-full"
                disabled={
                  phoneSmsFlow.isSendingSms ||
                  phoneSmsFlow.cooldownSeconds > 0 ||
                  !canRequestPhoneRebind({ nextPhone })
                }
                onClick={() => {
                  setPhoneActionError(null);
                  setIsPhoneSmsCaptchaOpen(true);
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
                  <AlertDescription>请查收新手机号短信并填写验证码。</AlertDescription>
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

      {isPhoneDialogOpen ? (
        <SendSmsCaptchaDialog
          description="验证通过后将向新手机号发送短信验证码。"
          flow={phoneSmsFlow}
          onConfirmSend={requestPhoneCode}
          onOpenChange={setIsPhoneSmsCaptchaOpen}
          onRefreshError={setPhoneActionError}
          open={isPhoneSmsCaptchaOpen}
          overlayClassName="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm"
          refreshErrorFallback="图形验证码加载失败"
          title="安全验证"
        />
      ) : null}
    </SitePage>
  );
}
