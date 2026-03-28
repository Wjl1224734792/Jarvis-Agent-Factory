import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  CameraIcon,
  BellIcon,
  ChevronRightIcon,
  CompassIcon,
  Link2Icon,
  LockKeyholeIcon,
  LogOutIcon,
  MapPinIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  UserRoundIcon
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  SiteGrid,
  SitePage,
  SitePageDescription,
  SitePageEyebrow,
  SitePageHead,
  SitePageTitle,
  SitePanel,
  SitePanelBody,
  SiteRail
} from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "../features/auth/auth-store";
import {
  clearStoredSettingsDraft,
  createDeletionMessage,
  createProfileViewModel,
  createSettingsDraft,
  markSettingsSaved,
  persistSettingsDraft,
  readStoredSettingsDraft,
  setProfileVisibility,
  toggleSettingsFlag,
  updateSettingsField,
  type ProfileVisibility,
  type SettingsDraft
} from "../features/auth/profile-settings-state";
import { apiClient } from "../lib/api-client";
import { getAvatarImage } from "../lib/aviation-media";

const settingsSections = [
  { id: "profile", label: "资料展示", icon: UserRoundIcon },
  { id: "alerts", label: "通知偏好", icon: BellIcon },
  { id: "security", label: "账号安全", icon: ShieldCheckIcon },
  { id: "danger", label: "注销与退出", icon: TriangleAlertIcon }
] as const;

const visibilityOptions: Array<{ value: ProfileVisibility; label: string; summary: string }> = [
  {
    value: "community",
    label: "公开给站内用户",
    summary: "站内用户都能看到你的头像、昵称和简介。"
  },
  {
    value: "followers",
    label: "仅关注关系可见",
    summary: "只向已建立关注关系的用户展示资料摘要。"
  },
  {
    value: "private",
    label: "仅自己预览",
    summary: "仅自己查看资料展示，其它用户无法看到资料摘要。"
  }
];

type SettingsSectionId = (typeof settingsSections)[number]["id"];

function SettingsPageSkeleton() {
  return (
    <SitePage>
      <SitePageHead>
        <SitePageEyebrow>设置</SitePageEyebrow>
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-4 w-72" />
      </SitePageHead>

      <SiteGrid variant="detail">
        <SiteRail>
          <Card variant="muted">
            <CardContent className="space-y-3 pt-[var(--panel-padding)]">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton className="h-14 rounded-[calc(var(--radius-panel)-0.18rem)]" key={index} />
              ))}
            </CardContent>
          </Card>
        </SiteRail>

        <div className="space-y-4">
          <Card>
            <CardContent className="grid gap-4 pt-[var(--panel-padding)] md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton className="h-20 rounded-[calc(var(--radius-panel)-0.18rem)]" key={index} />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 pt-[var(--panel-padding)]">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-24 rounded-[calc(var(--radius-panel)-0.18rem)]" />
              <Skeleton className="h-12 rounded-[calc(var(--radius-panel)-0.18rem)]" />
            </CardContent>
          </Card>
        </div>
      </SiteGrid>
    </SitePage>
  );
}

function SectionButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: typeof UserRoundIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex w-full items-center justify-between rounded-[calc(var(--radius-control)+0.02rem)] border px-4 py-3.5 text-left transition ${
        active
          ? "border-primary/18 bg-primary/8 text-primary shadow-[var(--shadow-soft)]"
          : "border-border/80 bg-background/76 text-foreground hover:border-primary/16 hover:bg-accent/56"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-[calc(var(--radius-control)-0.08rem)] bg-surface-2/82">
          <Icon className="size-4" />
        </span>
        <span className="text-sm font-medium">{label}</span>
      </span>
      <ChevronRightIcon className="size-4" />
    </button>
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
    <div className="flex flex-col gap-3 rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/75 bg-background/72 px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground md:text-base">{title}</div>
        <div className="text-sm leading-6 text-muted-foreground">{description}</div>
      </div>
      <Button onClick={onToggle} size="sm" type="button" variant={enabled ? "panel" : "outline"}>
        {enabled ? "已开启" : "已关闭"}
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
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("profile");
  const [draft, setDraft] = useState<SettingsDraft>(() => readStoredSettingsDraft(user));
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState({
    current: "",
    next: "",
    confirm: ""
  });
  const profileQuery = useQuery({
    queryKey: ["current-user-profile", user?.id],
    queryFn: () => apiClient.getCurrentUserProfile(),
    enabled: Boolean(user)
  });

  useEffect(() => {
    setDraft(readStoredSettingsDraft(user));
  }, [user]);

  useEffect(() => {
    const profile = profileQuery.data?.item;
    if (!profile) {
      return;
    }

    setDraft((current) =>
      current.hasPendingChanges
        ? current
        : {
            ...current,
            avatarUrl: profile.avatarUrl ?? "",
            displayName: profile.displayName,
            bio: profile.bio ?? ""
          }
    );
  }, [profileQuery.data?.item]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setStatusMessage(null);
    }, 3200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [statusMessage]);

  if (!user) {
    return <SettingsPageSkeleton />;
  }

  const currentUser = user;
  const profilePreview = createProfileViewModel(user, draft);

  function saveDraftLocally(message: string) {
    const nextDraft = markSettingsSaved(draft);
    persistSettingsDraft(user, nextDraft);
    setDraft(nextDraft);
    setStatusMessage(message);
  }

  function resetDraftLocally() {
    const nextDraft = {
      ...createSettingsDraft(user),
      avatarUrl: profileQuery.data?.item.avatarUrl ?? "",
      displayName: profileQuery.data?.item.displayName ?? currentUser.displayName,
      bio: profileQuery.data?.item.bio ?? ""
    };
    clearStoredSettingsDraft(user);
    setDraft(nextDraft);
    setPasswordDraft({
      current: "",
      next: "",
      confirm: ""
    });
    setStatusMessage("已恢复为当前浏览器中的默认设置。");
  }

  function stagePasswordChange() {
    if (!passwordDraft.current || !passwordDraft.next || !passwordDraft.confirm) {
      setStatusMessage("请先填写完整的密码字段。");
      return;
    }

    if (passwordDraft.next !== passwordDraft.confirm) {
      setStatusMessage("新密码与确认密码不一致，请重新检查。");
      return;
    }

    setPasswordDraft({
      current: "",
      next: "",
      confirm: ""
    });
    saveDraftLocally("密码修改草稿已保存。");
  }

  async function uploadAvatar(file: File) {
    setIsUploadingAvatar(true);
    try {
      const uploaded = await apiClient.uploadPostImage(file);
      setDraft((current) => updateSettingsField(current, "avatarUrl", uploaded.item.url));
      setStatusMessage("头像已更新，保存后会同步到个人资料。");
    } catch (reason: unknown) {
      setStatusMessage(reason instanceof Error ? reason.message : "头像上传失败");
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  }

  async function saveProfile() {
    setIsSavingProfile(true);
    try {
      const payload = await apiClient.updateCurrentUserProfile({
        displayName: draft.displayName.trim() || currentUser.displayName,
        bio: draft.bio.trim() || null,
        avatarUrl: draft.avatarUrl.trim() || null
      });
      const refreshedUser = await apiClient.getCurrentUser();
      if (refreshedUser) {
        setAuthenticated(refreshedUser);
      }
      const nextDraft = markSettingsSaved({
        ...draft,
        avatarUrl: payload.item.avatarUrl ?? "",
        displayName: payload.item.displayName,
        bio: payload.item.bio ?? ""
      });
      persistSettingsDraft(user, nextDraft);
      setDraft(nextDraft);
      setStatusMessage("资料已保存。");
      void profileQuery.refetch();
    } catch (reason: unknown) {
      setStatusMessage(reason instanceof Error ? reason.message : "资料保存失败");
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <SitePage>
      <SitePageHead>
        <SitePageEyebrow>设置</SitePageEyebrow>
        <SitePageTitle>账号与偏好设置</SitePageTitle>
        <SitePageDescription>
          在这里统一维护头像、昵称、简介、通知偏好和账号安全设置。
        </SitePageDescription>
      </SitePageHead>

      <SiteGrid variant="detail">
        <SiteRail>
          <SitePanel variant="muted">
            <SitePanelBody className="space-y-3">
              {settingsSections.map((section) => (
                <SectionButton
                  active={section.id === activeSection}
                  icon={section.icon}
                  key={section.id}
                  label={section.label}
                  onClick={() => {
                    setActiveSection(section.id);
                  }}
                />
              ))}
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="highlight">
            <SitePanelBody className="space-y-4">
              <SitePageEyebrow className="text-sky-100/78">当前状态</SitePageEyebrow>
              <div className="text-[1.45rem] font-semibold leading-tight">账号概览</div>
              <p className="text-sm leading-7 text-panel-highlight-foreground/84">
                资料、通知和安全项都会在这里集中维护，方便快速回看与调整。
              </p>
              <div className="grid gap-2">
                {[
                  { label: "呼号", value: profilePreview.callsign },
                  { label: "可见范围", value: draft.visibility === "community" ? "公开" : draft.visibility === "followers" ? "关注可见" : "仅自己" },
                  { label: "最近保存", value: draft.lastSavedLabel }
                ].map((item) => (
                  <div className="rounded-[calc(var(--radius-panel)-0.2rem)] bg-white/10 px-4 py-3" key={item.label}>
                    <div className="text-[0.68rem] uppercase tracking-[0.18em] text-sky-100/82">
                      {item.label}
                    </div>
                    <div className="mt-1 text-sm font-medium">{item.value}</div>
                  </div>
                ))}
              </div>
            </SitePanelBody>
          </SitePanel>
        </SiteRail>

        <div className="flex min-w-0 flex-col gap-4">
          <Card variant="muted">
            <CardHeader className="gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="eyebrow">账号资料</Badge>
                <Badge variant="outline">{profilePreview.memberLabel}</Badge>
                {draft.hasPendingChanges ? <Badge>有未保存改动</Badge> : <Badge variant="tone">已保存</Badge>}
              </div>
              <CardTitle className="text-[1.8rem]">{profilePreview.displayName}</CardTitle>
              <CardDescription>资料、通知与安全项集中维护，公开展示会随资料保存同步更新。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {[
                { label: "公开昵称", value: draft.displayName || profilePreview.displayName, icon: MapPinIcon },
                { label: "当前分组", value: settingsSections.find((item) => item.id === activeSection)?.label ?? "", icon: CompassIcon },
                { label: "通知状态", value: draft.notifyComments ? "评论提醒开启" : "评论提醒关闭", icon: BellIcon }
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    className="rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/75 bg-card/86 px-4 py-4"
                    key={item.label}
                  >
                    <div className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                      <Icon className="size-4 text-primary" />
                      {item.label}
                    </div>
                    <div className="mt-2 text-sm font-medium text-foreground md:text-base">{item.value}</div>
                  </div>
                );
              })}
            </CardContent>
            <CardFooter className="flex flex-wrap justify-between gap-3">
              <Button onClick={resetDraftLocally} size="sm" type="button" variant="ghost">
                <RefreshCcwIcon data-icon="inline-start" />
                恢复默认
              </Button>
              <Button
                onClick={() => {
                  saveDraftLocally("设置已保存到当前浏览器。");
                }}
                size="sm"
                type="button"
                variant="hero"
              >
                保存当前设置
              </Button>
            </CardFooter>
          </Card>

          {statusMessage ? (
            <Alert>
              <ShieldCheckIcon className="size-4" />
              <AlertTitle>更新已记录</AlertTitle>
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          ) : null}

          {activeSection === "profile" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">资料展示</CardTitle>
                <CardDescription>头像、昵称和简介会同步到个人中心、顶部菜单和公开资料页。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,17rem)]">
                  <div className="space-y-3">
                    <label
                      className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                      htmlFor="settings-display-name"
                    >
                      昵称
                    </label>
                    <Input
                      id="settings-display-name"
                      onChange={(event) => {
                        setDraft((current) => updateSettingsField(current, "displayName", event.target.value));
                      }}
                      value={draft.displayName}
                    />
                    <label
                      className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                      htmlFor="settings-profile-bio"
                    >
                      个人简介
                    </label>
                    <Textarea
                      className="min-h-36 resize-y"
                      id="settings-profile-bio"
                      onChange={(event) => {
                        setDraft((current) => updateSettingsField(current, "bio", event.target.value));
                      }}
                      value={draft.bio}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-3 rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/75 bg-background/72 p-4">
                      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        头像
                      </div>
                      <div className="flex items-center gap-4">
                        <Avatar className="size-20" size="lg">
                          <AvatarImage
                            alt={draft.displayName || profilePreview.displayName}
                            src={draft.avatarUrl || profilePreview.avatarUrl || getAvatarImage(user.id)}
                          />
                          <AvatarFallback>{(draft.displayName || profilePreview.displayName).slice(0, 1)}</AvatarFallback>
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
                          <div className="text-xs leading-5 text-muted-foreground">建议使用方形清晰图片。</div>
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
                          void uploadAvatar(file);
                        }}
                        ref={avatarInputRef}
                        type="file"
                      />
                    </div>

                    <label
                      className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                      htmlFor="settings-recovery-phone"
                    >
                      预留手机号
                    </label>
                    <Input
                      id="settings-recovery-phone"
                      onChange={(event) => {
                        setDraft((current) => updateSettingsField(current, "phone", event.target.value));
                      }}
                      type="tel"
                      value={draft.phone}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    资料可见范围
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {visibilityOptions.map((option) => (
                      <button
                        className={`rounded-[calc(var(--radius-panel)-0.2rem)] border px-4 py-4 text-left transition ${
                          draft.visibility === option.value
                            ? "border-primary/18 bg-primary/8 shadow-[var(--shadow-soft)]"
                            : "border-border/75 bg-background/76 hover:border-primary/16 hover:bg-accent/56"
                        }`}
                        key={option.value}
                        onClick={() => {
                          setDraft((current) => setProfileVisibility(current, option.value));
                        }}
                        type="button"
                      >
                        <div className="text-sm font-medium text-foreground">{option.label}</div>
                        <div className="mt-2 text-sm leading-6 text-muted-foreground">
                          {option.summary}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button
                  disabled={isSavingProfile || isUploadingAvatar || profileQuery.isFetching}
                  onClick={() => {
                    void saveProfile();
                  }}
                  size="sm"
                  type="button"
                  variant="hero"
                >
                  {isSavingProfile ? "保存中..." : "保存资料"}
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {activeSection === "alerts" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">通知偏好</CardTitle>
                <CardDescription>
                  控制你在站内消息中最优先看到什么。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <SettingToggleRow
                  description="有人回复你的评论或继续讨论时，优先显示在消息中心。"
                  enabled={draft.notifyComments}
                  onToggle={() => {
                    setDraft((current) => toggleSettingsFlag(current, "notifyComments"));
                  }}
                  title="评论与回复提醒"
                />
                <SettingToggleRow
                  description="当别人提及你或在榜单、帖子中点名时，保留提醒。"
                  enabled={draft.notifyMentions}
                  onToggle={() => {
                    setDraft((current) => toggleSettingsFlag(current, "notifyMentions"));
                  }}
                  title="提及与点名提醒"
                />
                <SettingToggleRow
                  description="把优先级较低的更新收成摘要，而不是全部打散提醒。"
                  enabled={draft.emailDigest}
                  onToggle={() => {
                    setDraft((current) => toggleSettingsFlag(current, "emailDigest"));
                  }}
                  title="低频摘要提醒"
                />
                <SettingToggleRow
                  description="在个人中心中显示飞行时长或活动亮点等统计信息。"
                  enabled={draft.showFlightHours}
                  onToggle={() => {
                    setDraft((current) => toggleSettingsFlag(current, "showFlightHours"));
                  }}
                  title="展示飞行亮点"
                />
              </CardContent>
              <CardFooter className="flex flex-wrap justify-between gap-3">
                <Button asChild size="sm" type="button" variant="outline">
                  <Link to={APP_ROUTES.notifications}>进入消息中心</Link>
                </Button>
                <Button
                  onClick={() => {
                    saveDraftLocally("通知偏好已更新到当前浏览器。");
                  }}
                  size="sm"
                  type="button"
                  variant="hero"
                >
                  保存通知偏好
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {activeSection === "security" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">账号安全</CardTitle>
                <CardDescription>
                  在这里统一维护安全相关设置和密码修改表单。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <SettingToggleRow
                  description="控制是否启用双重验证提醒。"
                  enabled={draft.twoFactorEnabled}
                  onToggle={() => {
                    setDraft((current) => toggleSettingsFlag(current, "twoFactorEnabled"));
                  }}
                  title="双重验证"
                />
                <SettingToggleRow
                  description="如果未来检测到新设备或新会话，这里将作为提醒入口。"
                  enabled={draft.sessionAlerts}
                  onToggle={() => {
                    setDraft((current) => toggleSettingsFlag(current, "sessionAlerts"));
                  }}
                  title="会话变更提醒"
                />

                <div className="rounded-[calc(var(--radius-panel)-0.2rem)] border border-border/75 bg-background/72 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <LockKeyholeIcon className="size-4.5 text-primary" />
                    密码修改
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <Input
                      autoComplete="current-password"
                      id="settings-current-password"
                      onChange={(event) => {
                        setPasswordDraft((current) => ({
                          ...current,
                          current: event.target.value
                        }));
                      }}
                      placeholder="当前密码"
                      type="password"
                      value={passwordDraft.current}
                    />
                    <Input
                      autoComplete="new-password"
                      id="settings-next-password"
                      onChange={(event) => {
                        setPasswordDraft((current) => ({
                          ...current,
                          next: event.target.value
                        }));
                      }}
                      placeholder="新密码"
                      type="password"
                      value={passwordDraft.next}
                    />
                    <Input
                      autoComplete="new-password"
                      id="settings-confirm-password"
                      onChange={(event) => {
                        setPasswordDraft((current) => ({
                          ...current,
                          confirm: event.target.value
                        }));
                      }}
                      placeholder="确认新密码"
                      type="password"
                      value={passwordDraft.confirm}
                    />
                  </div>
                  <div className="mt-3 text-sm leading-6 text-muted-foreground">
                    在这里维护密码修改表单并检查输入完整性。
                  </div>
                  <div className="sr-only">
                    <label htmlFor="settings-current-password">当前密码</label>
                    <label htmlFor="settings-next-password">新密码</label>
                    <label htmlFor="settings-confirm-password">确认新密码</label>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button onClick={stagePasswordChange} size="sm" type="button" variant="hero">
                  保存密码草稿
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {activeSection === "danger" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">注销与退出</CardTitle>
                <CardDescription>
                  真正生效的是退出登录；账号注销仍停留在前端确认流程，不会误发真实请求。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Alert variant="destructive">
                  <TriangleAlertIcon className="size-4" />
                  <AlertTitle>注销仍然只是前端确认</AlertTitle>
                  <AlertDescription>
                    退出登录会立即生效，注销操作会在确认后继续执行流程。
                  </AlertDescription>
                </Alert>

                <SettingToggleRow
                  description="先确认注销意图，避免误触。"
                  enabled={draft.deletionArmed}
                  onToggle={() => {
                    setDraft((current) => toggleSettingsFlag(current, "deletionArmed"));
                  }}
                  title="确认注销意图"
                />

                <div className="rounded-[calc(var(--radius-panel)-0.2rem)] border border-red-200 bg-red-50/80 px-4 py-4 text-sm leading-6 text-red-700">
                  {createDeletionMessage(draft)}
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap justify-between gap-3">
                <Button
                  onClick={() => {
                    setStatusMessage(createDeletionMessage(draft));
                  }}
                  size="sm"
                  type="button"
                  variant="destructive"
                >
                  <TriangleAlertIcon data-icon="inline-start" />
                  查看注销提示
                </Button>

                <Button
                  onClick={() => {
                    void apiClient
                      .logout()
                      .then(() => {
                        setAnonymous();
                        navigate(APP_ROUTES.feedHome);
                      })
                      .catch((error: unknown) => {
                        setError(error instanceof Error ? error.message : "退出登录失败");
                      });
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <LogOutIcon data-icon="inline-start" />
                  退出登录
                </Button>
              </CardFooter>
            </Card>
          ) : null}
        </div>
      </SiteGrid>
    </SitePage>
  );
}
