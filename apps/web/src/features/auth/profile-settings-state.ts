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
  callsign: string;
  headline: string;
  bio: string;
  homeBase: string;
  memberLabel: string;
  availability: string;
  metrics: ProfileMetric[];
  focusCards: ProfileActionCard[];
  activityNotes: string[];
  draftNotes: string[];
};

export type SettingsDraft = {
  displayName: string;
  bio: string;
  homeBase: string;
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
    | "bio"
    | "homeBase"
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
    bio: draft.bio,
    homeBase: draft.homeBase,
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

export function buildSettingsStorageKey(user: UserSummary | null): string {
  return `${SETTINGS_STORAGE_KEY}:${user?.id ?? "anonymous"}`;
}

export function createProfileViewModel(
  user: UserSummary | null,
  draft?: Pick<SettingsDraft, "bio" | "homeBase"> | null
): ProfileViewModel {
  const displayName = user?.displayName ?? "飞加飞友";
  const seed = hashSeed(displayName);
  const callsign = `FJ-${initialsFromName(displayName)}-${200 + (seed % 700)}`;
  const followerCount = 320 + (seed % 880);
  const followingCount = 96 + (seed % 260);
  const favoriteCount = 24 + (seed % 120);

  return {
    displayName,
    callsign,
    headline: user?.role === "admin" ? "管理后台值守中" : "把每次起飞与落地都记录下来",
    bio:
      draft?.bio ??
      "把飞行日志、机型笔记和社区动态收在一个更紧凑的个人页里。目前这里仍以会话信息和本地设置为主，后续再接真实资料接口。",
    homeBase: draft?.homeBase ?? (seed % 2 === 0 ? "ZSPD / 上海浦东" : "ZBAA / 北京首都"),
    memberLabel: user?.role === "admin" ? "管理员身份" : "飞友身份",
    availability: seed % 3 === 0 ? "适合整理长文" : "适合发动态",
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
        summary:
          "把航线、天气和机舱细节先收在一个紧凑卡片里，稍后可以继续补完再发布，不需要先接服务端草稿接口。",
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
        summary:
          "把关注、评论和提及先收成一个短摘要，让个人中心在没有专属资料接口前也能保持可用。",
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
        eyebrow: "草稿工作台",
        title: "待补完的机型评测草稿",
        summary:
          "未完成内容先保存在前端侧，先让页面好用起来，不冒充已经存在的服务端草稿同步能力。",
        imageSeed: `${displayName}-drafts`,
        ctaLabel: "整理设置",
        href: APP_ROUTES.webSettings,
        metrics: [
          { label: "段落", value: `${3 + (seed % 4)}` },
          { label: "完成度", value: `${70 + (seed % 20)}%` }
        ]
      }
    ],
    activityNotes: [
      "评论回复会继续从消息中心进入，并和当前登录会话保持一致。",
      "发布能力仍然走现有发布入口，不会在这里额外引入新的内容流程。",
      "当前页展示的身份信息主要依赖登录会话和本地设置。"
    ],
    draftNotes: [
      "资料编辑继续保持本地优先，等后端资料接口落地后再补保存链路。",
      "这一轮设置改动只覆盖前端行为和页面提示，不扩到共享契约。",
      "管理后台能力仍然留到下一轮，不会混进个人中心里。"
    ]
  };
}

export function createSettingsDraft(user: UserSummary | null): SettingsDraft {
  const profile = createProfileViewModel(user);
  const seed = hashSeed(profile.displayName);

  return {
    displayName: profile.displayName,
    bio: profile.bio,
    homeBase: profile.homeBase,
    phone: formatPhone(seed),
    notifyComments: true,
    notifyMentions: true,
    emailDigest: seed % 2 === 0,
    showFlightHours: true,
    visibility: "community",
    twoFactorEnabled: seed % 2 === 0,
    sessionAlerts: true,
    hasPendingChanges: false,
    lastSavedLabel: "当前浏览器尚未保存",
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
      bio: readString(parsed.bio, fallback.bio),
      homeBase: readString(parsed.homeBase, fallback.homeBase),
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
  field: "bio" | "homeBase" | "phone",
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
  return `已在本地保存 ${hours}:${minutes}`;
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
    return "请先确认删除意图。本轮不会向后端发起真正的注销请求。";
  }

  return "注销请求已在当前浏览器暂存，真正的账号注销仍需要后端接口支持。";
}
