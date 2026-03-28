import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { BellIcon, CameraIcon, LogOutIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SitePage } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { apiClient } from "../lib/api-client";
import { getAvatarImage } from "../lib/aviation-media";

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

function currentStatusLabel(draft: SettingsDraft) {
  return draft.hasPendingChanges ? "有未保存修改" : "已与后端同步";
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
      avatarUrl: null,
      phone: null,
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

  if (!user) {
    return <SettingsPageSkeleton />;
  }

  async function uploadAvatar(file: File) {
    setIsUploadingAvatar(true);
    try {
      const uploaded = await apiClient.uploadPostImage(file);
      setDraft((current) => updateSettingsTextField(current, "avatarUrl", uploaded.item.url));
      setStatusMessage("头像已上传，保存后会同步到资料页。");
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
      setStatusMessage("设置已保存。");
      void profileQuery.refetch();
    } catch (reason: unknown) {
      setStatusMessage(reason instanceof Error ? reason.message : "设置保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SitePage className="mx-auto w-full max-w-[72rem] gap-4">
      <Card variant="muted">
        <CardContent className="grid gap-4 pt-[var(--panel-padding)] md:grid-cols-[auto_minmax(0,1fr)_12rem] md:items-center">
          <div className="flex items-center gap-4">
            <Avatar className="size-18" size="lg">
              <AvatarImage
                alt={draft.displayName || user.displayName}
                src={draft.avatarUrl || user.avatarUrl || getAvatarImage(user.id)}
              />
              <AvatarFallback>{(draft.displayName || user.displayName).slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="text-xl font-semibold text-foreground">
                {draft.displayName || user.displayName}
              </div>
              <div className="text-sm text-muted-foreground">
                {draft.bio || "还没有填写个人简介。"}
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
                同步状态
              </div>
              <div className="mt-1.5 text-sm font-medium text-foreground">{currentStatusLabel(draft)}</div>
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
              {isSaving ? "保存中..." : "保存设置"}
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
          <AlertTitle>状态更新</AlertTitle>
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">基本资料</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="space-y-4">
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
                  className="min-h-36 resize-y"
                  id="settings-bio"
                  onChange={(event) => {
                    setDraft((current) => updateSettingsTextField(current, "bio", event.target.value));
                  }}
                  value={draft.bio}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="settings-phone">
                  手机号
                </label>
                <Input
                  id="settings-phone"
                  onChange={(event) => {
                    setDraft((current) => updateSettingsTextField(current, "phone", event.target.value));
                  }}
                  type="tel"
                  value={draft.phone}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="border border-border/70 p-4">
                <div className="text-sm font-medium text-foreground">头像</div>
                <div className="mt-4 flex items-center gap-4">
                  <Avatar className="size-20" size="lg">
                    <AvatarImage
                      alt={draft.displayName || user.displayName}
                      src={draft.avatarUrl || user.avatarUrl || getAvatarImage(user.id)}
                    />
                    <AvatarFallback>{(draft.displayName || user.displayName).slice(0, 1)}</AvatarFallback>
                  </Avatar>
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
              </div>
            </div>
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
                  navigate(APP_ROUTES.feedHome);
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
