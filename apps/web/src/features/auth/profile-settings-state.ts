import type { UserSummary } from "@feijia/schemas";
import { APP_ROUTES } from "@feijia/shared";

export const SETTINGS_STORAGE_KEY = "feijia.web.settings.v1";

export type ProfileFocusTab = "overview" | "activity" | "favorites" | "drafts";
export type ProfileVisibility = "community" | "followers" | "private";

export type ProfileMetric = {
  label: string;
  value: string;
};

export type ProfileActionCard = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  imageSeed: string;
  ctaLabel: string;
  href: string;
  metrics: ProfileMetric[];
};

export type ProfileViewModel = {
  displayName: string;
  avatarUrl: string | null;
  callsign: string;
  headline: string;
  bio: string;
  memberLabel: string;
  availability: string;
  metrics: ProfileMetric[];
  focusCards: ProfileActionCard[];
  activityNotes: string[];
  draftNotes: string[];
};

export type SettingsDraft = {
  avatarUrl: string;
  displayName: string;
  bio: string;
  phone: string;
  notifyComments: boolean;
  notifyMentions: boolean;
  emailDigest: boolean;
  showFlightHours: boolean;
  visibility: ProfileVisibility;
  twoFactorEnabled: boolean;
  sessionAlerts: boolean;
  hasPendingChanges: boolean;
  lastSavedLabel: string;
  deletionArmed: boolean;
};

type StoredSettingsDraft = Partial<
  Pick<
    SettingsDraft,
    | "avatarUrl"
    | "displayName"
    | "bio"
    | "phone"
    | "notifyComments"
    | "notifyMentions"
    | "emailDigest"
    | "showFlightHours"
    | "visibility"
    | "twoFactorEnabled"
    | "sessionAlerts"
    | "lastSavedLabel"
    | "deletionArmed"
  >
>;

const visibilityValues: ProfileVisibility[] = ["community", "followers", "private"];

function hashSeed(seed: string): number {
  return Array.from(seed).reduce((total, char) => total + char.charCodeAt(0), 0);
}

function initialsFromName(displayName: string): string {
  const letters = displayName.replace(/[^A-Za-z0-9]/g, "").slice(0, 2);
  return (letters || "fj").toUpperCase();
}

function formatPhone(seed: number): string {
  const suffix = String(1000 + (seed % 9000));
  return `+86 138 00${suffix.slice(0, 2)} ${suffix.slice(2)}`;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readVisibility(value: unknown, fallback: ProfileVisibility): ProfileVisibility {
  return typeof value === "string" && visibilityValues.includes(value as ProfileVisibility)
    ? (value as ProfileVisibility)
    : fallback;
}

function toStoredSettingsDraft(draft: SettingsDraft): StoredSettingsDraft {
  return {
    avatarUrl: draft.avatarUrl,
    displayName: draft.displayName,
    bio: draft.bio,
    phone: draft.phone,
    notifyComments: draft.notifyComments,
    notifyMentions: draft.notifyMentions,
    emailDigest: draft.emailDigest,
    showFlightHours: draft.showFlightHours,
    visibility: draft.visibility,
    twoFactorEnabled: draft.twoFactorEnabled,
    sessionAlerts: draft.sessionAlerts,
    lastSavedLabel: draft.lastSavedLabel,
    deletionArmed: draft.deletionArmed
  };
}

function pickRuntimeProfile(user: UserSummary | null) {
  const candidate = user as (UserSummary & { avatarUrl?: string | null; bio?: string | null }) | null;
  return {
    avatarUrl: candidate?.avatarUrl ?? null,
    bio: candidate?.bio ?? null
  };
}

export function buildSettingsStorageKey(user: UserSummary | null): string {
  return `${SETTINGS_STORAGE_KEY}:${user?.id ?? "anonymous"}`;
}

export function createProfileViewModel(
  user: UserSummary | null,
  draft?: Pick<SettingsDraft, "avatarUrl" | "displayName" | "bio"> | null
): ProfileViewModel {
  const runtimeProfile = pickRuntimeProfile(user);
  const displayName = draft?.displayName?.trim() || user?.displayName || "飞加飞友";
  const seed = hashSeed(displayName);
  const callsign = `FJ-${initialsFromName(displayName)}-${200 + (seed % 700)}`;
  const followerCount = 320 + (seed % 880);
  const followingCount = 96 + (seed % 260);
  const favoriteCount = 24 + (seed % 120);

  return {
    displayName,
    avatarUrl: draft?.avatarUrl?.trim() || runtimeProfile.avatarUrl || null,
    callsign,
    headline: user?.role === "admin" ? "管理后台值守中" : "记录每一次起飞、落地和改装灵感",
    bio: draft?.bio ?? runtimeProfile.bio ?? "在这里集中展示头像、昵称、个人简介和近期公开内容。",
    memberLabel: user?.role === "admin" ? "管理员身份" : "飞友身份",
    availability: seed % 3 === 0 ? "适合整理长文" : "适合发布动态",
    metrics: [
      { label: "关注者", value: `${followerCount}` },
      { label: "关注中", value: `${followingCount}` },
      { label: "收藏", value: `${favoriteCount}` }
    ],
    focusCards: [
      {
        id: "focus-overview",
        eyebrow: "飞行日志",
        title: "清晨转场记录，留给下一次整理发布",
        summary: "把航线、天气和设备细节先收在紧凑卡片里，稍后继续补完并发布。",
        imageSeed: `${displayName}-overview`,
        ctaLabel: "继续编辑",
        href: APP_ROUTES.compose,
        metrics: [
          { label: "浏览", value: `${1100 + (seed % 900)}` },
          { label: "收藏", value: `${80 + (seed % 120)}` }
        ]
      },
      {
        id: "focus-activity",
        eyebrow: "社区动态",
        title: "本周互动提醒与评论动向",
        summary: "把关注、评论和提及先收成短摘要，方便快速回到最近的互动现场。",
        imageSeed: `${displayName}-activity`,
        ctaLabel: "查看消息",
        href: APP_ROUTES.notifications,
        metrics: [
          { label: "回复", value: `${18 + (seed % 32)}` },
          { label: "提及", value: `${6 + (seed % 10)}` }
        ]
      },
      {
        id: "focus-drafts",
        eyebrow: "资料维护",
        title: "统一整理昵称、头像和个人简介",
        summary: "从设置页直接维护对外展示的核心资料，公开页和个人中心保持一致。",
        imageSeed: `${displayName}-drafts`,
        ctaLabel: "整理资料",
        href: APP_ROUTES.webSettings,
        metrics: [
          { label: "字段", value: "3" },
          { label: "完成度", value: `${70 + (seed % 20)}%` }
        ]
      }
    ],
    activityNotes: [
      "评论回复会继续从消息中心进入，并和当前登录会话保持一致。",
      "发布入口保持现有文章、动态、飞行器和榜单链路。",
      "个人资料优先展示昵称、头像和简介。"
    ],
    draftNotes: [
      "资料入口保持精简，只集中维护头像、昵称与简介。",
      "常用设置与内容入口已经收敛到同一套页面结构里。",
      "管理端能力保持独立，不混入个人中心。"
    ]
  };
}

export function createSettingsDraft(user: UserSummary | null): SettingsDraft {
  const profile = createProfileViewModel(user);
  const seed = hashSeed(profile.displayName);

  return {
    avatarUrl: profile.avatarUrl ?? "",
    displayName: profile.displayName,
    bio: profile.bio,
    phone: formatPhone(seed),
    notifyComments: true,
    notifyMentions: true,
    emailDigest: seed % 2 === 0,
    showFlightHours: true,
    visibility: "community",
    twoFactorEnabled: seed % 2 === 0,
    sessionAlerts: true,
    hasPendingChanges: false,
    lastSavedLabel: "当前资料尚未保存",
    deletionArmed: false
  };
}

export function parseStoredSettingsDraft(
  raw: string | null,
  user: UserSummary | null
): SettingsDraft {
  const fallback = createSettingsDraft(user);

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as StoredSettingsDraft;

    return {
      ...fallback,
      avatarUrl: readString(parsed.avatarUrl, fallback.avatarUrl),
      displayName: readString(parsed.displayName, fallback.displayName),
      bio: readString(parsed.bio, fallback.bio),
      phone: readString(parsed.phone, fallback.phone),
      notifyComments: readBoolean(parsed.notifyComments, fallback.notifyComments),
      notifyMentions: readBoolean(parsed.notifyMentions, fallback.notifyMentions),
      emailDigest: readBoolean(parsed.emailDigest, fallback.emailDigest),
      showFlightHours: readBoolean(parsed.showFlightHours, fallback.showFlightHours),
      visibility: readVisibility(parsed.visibility, fallback.visibility),
      twoFactorEnabled: readBoolean(parsed.twoFactorEnabled, fallback.twoFactorEnabled),
      sessionAlerts: readBoolean(parsed.sessionAlerts, fallback.sessionAlerts),
      lastSavedLabel: readString(parsed.lastSavedLabel, fallback.lastSavedLabel),
      deletionArmed: readBoolean(parsed.deletionArmed, fallback.deletionArmed)
    };
  } catch {
    return fallback;
  }
}

export function readStoredSettingsDraft(user: UserSummary | null): SettingsDraft {
  if (typeof window === "undefined") {
    return createSettingsDraft(user);
  }

  const storageKey = buildSettingsStorageKey(user);
  const scopedValue = window.localStorage.getItem(storageKey);

  if (scopedValue) {
    return parseStoredSettingsDraft(scopedValue, user);
  }

  const legacyValue = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

  if (legacyValue) {
    window.localStorage.setItem(storageKey, legacyValue);
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    return parseStoredSettingsDraft(legacyValue, user);
  }

  return createSettingsDraft(user);
}

export function persistSettingsDraft(user: UserSummary | null, draft: SettingsDraft): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    buildSettingsStorageKey(user),
    JSON.stringify(toStoredSettingsDraft(draft))
  );
}

export function clearStoredSettingsDraft(user: UserSummary | null): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(buildSettingsStorageKey(user));
  window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
}

export function updateSettingsField(
  draft: SettingsDraft,
  field: "avatarUrl" | "displayName" | "bio" | "phone",
  value: string
): SettingsDraft {
  return {
    ...draft,
    [field]: value,
    hasPendingChanges: true
  };
}

export function toggleSettingsFlag(
  draft: SettingsDraft,
  field:
    | "notifyComments"
    | "notifyMentions"
    | "emailDigest"
    | "showFlightHours"
    | "twoFactorEnabled"
    | "sessionAlerts"
    | "deletionArmed"
): SettingsDraft {
  return {
    ...draft,
    [field]: !draft[field],
    hasPendingChanges: true
  };
}

export function setProfileVisibility(
  draft: SettingsDraft,
  visibility: ProfileVisibility
): SettingsDraft {
  return {
    ...draft,
    visibility,
    hasPendingChanges: true
  };
}

export function createLocalSaveLabel(date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `已保存 ${hours}:${minutes}`;
}

export function markSettingsSaved(
  draft: SettingsDraft,
  lastSavedLabel = createLocalSaveLabel()
): SettingsDraft {
  return {
    ...draft,
    hasPendingChanges: false,
    lastSavedLabel
  };
}

export function createDeletionMessage(draft: SettingsDraft): string {
  if (!draft.deletionArmed) {
    return "请先确认注销意图。";
  }

  return "已记录本次注销确认，请在后端能力上线后继续完成。";
}
