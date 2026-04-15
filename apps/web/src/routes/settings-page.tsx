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
import { SendSmsCaptchaDialog } from "../features/auth/send-sms-captcha-dialog";
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
    <SitePage className="mx-auto w-full max-w-[76rem] gap-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32 rounded-md" />
        <Skeleton className="h-4 w-64 max-w-full rounded-md" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.85fr)] xl:items-start">
        <div className="overflow-hidden rounded-[var(--radius-panel)] border border-border/60 bg-surface-2/80">
          <Skeleton className="h-11 w-full rounded-none" />
          <div className="divide-y divide-border/60 p-0">
            <div className="px-4 py-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-3 h-28 w-28 rounded-full" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div className="flex gap-4 px-4 py-4" key={i}>
                <Skeleton className="h-4 w-20 shrink-0" />
                <Skeleton className="h-4 flex-1 rounded-md" />
                <Skeleton className="h-8 w-16 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-[var(--radius-panel)] border border-border/60 bg-surface-2/80">
          <Skeleton className="h-11 w-full rounded-none" />
          <div className="divide-y divide-border/60">
            <div className="flex gap-4 px-4 py-4">
              <Skeleton className="h-4 w-24 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-8 w-16 shrink-0 rounded-full" />
            </div>
            <div className="px-4 py-2">
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="flex gap-4 px-4 py-4">
              <Skeleton className="h-4 w-28 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-8 w-14 shrink-0 rounded-full" />
            </div>
            <div className="flex gap-4 px-4 py-4">
              <Skeleton className="h-4 w-20 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-8 w-14 shrink-0 rounded-full" />
            </div>
            <Skeleton className="h-14 w-full rounded-none" />
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

function SettingsSubsectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="border-y border-border/60 bg-muted/15 px-4 py-2.5">
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function SettingsRow({
  label,
  children,
  action,
  alignTop
}: {
  label: string;
  children: ReactNode;
  action?: ReactNode;
  alignTop?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-2 px-4 py-3.5 sm:grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_auto] sm:gap-x-4",
        alignTop ? "sm:items-start" : "sm:items-center"
      )}
    >
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div className="min-w-0 text-sm leading-relaxed sm:col-span-1">{children}</div>
      {action ? <div className="flex shrink-0 items-center gap-2 sm:justify-end">{action}</div> : null}
    </div>
  );
}

function SettingsAvatarSection({
  title,
  action,
  children
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-foreground">{title}</div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
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
          phone: nextPhone.trim(),
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
    <SitePage className="mx-auto w-full max-w-[76rem] gap-6">
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

      <div className="grid w-full gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.85fr)] xl:items-start">
        <SettingsPanel>
          <SettingsPanelHeader>公开资料</SettingsPanelHeader>
          <div className="divide-y divide-border/60">
            <SettingsAvatarSection
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
              title="头像"
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
            </SettingsAvatarSection>

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
                      variant="hero"
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
                      variant="hero"
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
                      variant="hero"
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

        <SettingsPanel className="xl:pt-[0.15rem]">
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

          <SettingsSubsectionTitle>通知</SettingsSubsectionTitle>
          <div className="divide-y divide-border/60">
            <SettingsRow
              action={
                <Button
                  className="rounded-full"
                  disabled={savingField === "notifyComments"}
                  onClick={() => {
                    void toggleNotificationField("notifyComments", "评论与回复提醒已更新");
                  }}
                  size="sm"
                  type="button"
                  variant={draft.notifyComments ? "default" : "outline"}
                >
                  {savingField === "notifyComments" ? "保存中..." : draft.notifyComments ? "开启" : "关闭"}
                </Button>
              }
              label="评论与回复提醒"
            >
              <div className="text-muted-foreground">当有人评论或回复你时，消息中心优先显示。</div>
            </SettingsRow>

            <SettingsRow
              action={
                <Button
                  className="rounded-full"
                  disabled={savingField === "notifyMentions"}
                  onClick={() => {
                    void toggleNotificationField("notifyMentions", "提及提醒已更新");
                  }}
                  size="sm"
                  type="button"
                  variant={draft.notifyMentions ? "default" : "outline"}
                >
                  {savingField === "notifyMentions" ? "保存中..." : draft.notifyMentions ? "开启" : "关闭"}
                </Button>
              }
              label="提及提醒"
            >
              <div className="text-muted-foreground">当有人在帖子、榜单或评论中提及你时提醒。</div>
            </SettingsRow>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border/60 bg-muted/10 px-4 py-3">
            <Button asChild size="sm" type="button" variant="ghost">
              <Link to={APP_ROUTES.webProfile}>查看个人主页</Link>
            </Button>
            <Button asChild size="sm" type="button" variant="ghost">
              <Link to={APP_ROUTES.notifications}>
                <BellIcon data-icon="inline-start" />
                查看消息
              </Link>
            </Button>
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
        </SettingsPanel>
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
                  onChange={(event) => setNextPhone(event.target.value)}
                  placeholder="请输入新的手机号"
                  type="tel"
                  value={nextPhone}
                />
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
