import type { UserSummary } from "@feijia/schemas";
import { APP_ROUTES } from "@feijia/shared";

export const SETTINGS_STORAGE_KEY = "feijia.web.settings.v1";

export type ProfileFocusTab = "overview" | "activity" | "drafts";
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
  const displayName = user?.displayName ?? "Feijia Pilot";
  const seed = hashSeed(displayName);
  const callsign = `FJ-${initialsFromName(displayName)}-${200 + (seed % 700)}`;
  const followerCount = 320 + (seed % 880);
  const sortieCount = 28 + (seed % 54);
  const highlightCount = 12 + (seed % 18);

  return {
    displayName,
    callsign,
    headline: user?.role === "admin" ? "Control deck captain" : "Crosswind storyteller",
    bio:
      draft?.bio ??
      "Tracking memorable flights, editorial notes, and model findings in one calm cockpit. This page stays lightweight until profile APIs arrive.",
    homeBase: draft?.homeBase ?? (seed % 2 === 0 ? "ZSPD / Shanghai Pudong" : "ZBAA / Beijing Capital"),
    memberLabel: user?.role === "admin" ? "Admin flight deck" : "Flight member",
    availability: seed % 3 === 0 ? "Ready for long-form writing" : "Open for short updates",
    metrics: [
      { label: "Followers", value: `${followerCount}` },
      { label: "Sorties Logged", value: `${sortieCount}` },
      { label: "Highlights", value: `${highlightCount}` }
    ],
    focusCards: [
      {
        id: "focus-overview",
        eyebrow: "Flight Journal",
        title: "Dawn circuit notes from a glass-smooth departure",
        summary:
          "A long-form post draft with route notes, cockpit details, and the exact lighting conditions worth keeping for a publish pass.",
        imageSeed: `${displayName}-overview`,
        ctaLabel: "Open composer",
        href: APP_ROUTES.compose,
        metrics: [
          { label: "Views", value: `${1100 + (seed % 900)}` },
          { label: "Saves", value: `${80 + (seed % 120)}` }
        ]
      },
      {
        id: "focus-activity",
        eyebrow: "Community",
        title: "Recent interactions from comments, follows, and list mentions",
        summary:
          "A compact briefing for what moved this week so the profile feels alive even before dedicated profile APIs are available.",
        imageSeed: `${displayName}-activity`,
        ctaLabel: "Open alerts",
        href: APP_ROUTES.notifications,
        metrics: [
          { label: "Replies", value: `${18 + (seed % 32)}` },
          { label: "Mentions", value: `${6 + (seed % 10)}` }
        ]
      },
      {
        id: "focus-drafts",
        eyebrow: "Workbench",
        title: "Aircraft review outline waiting for a final systems pass",
        summary:
          "Local-only planning card for unfinished content. It exists to make the profile useful today without pretending server-side draft sync already exists.",
        imageSeed: `${displayName}-drafts`,
        ctaLabel: "Review settings",
        href: APP_ROUTES.webSettings,
        metrics: [
          { label: "Sections", value: `${3 + (seed % 4)}` },
          { label: "Checklist", value: `${70 + (seed % 20)}%` }
        ]
      }
    ],
    activityNotes: [
      "Comment replies are available from the alerts center and stay in sync with the active session.",
      "Publishing still routes through the existing compose entry so no new content workflow is introduced here.",
      "Identity data on this page is backed by the current session only."
    ],
    draftNotes: [
      "Profile editing remains local-first until profile save APIs are introduced.",
      "Settings changes in this round are intentionally scoped to front-end behavior and messaging.",
      "Admin tooling is out of scope for this page and stays isolated."
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
    lastSavedLabel: "Not saved in this browser yet",
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
  return `Saved locally at ${hours}:${minutes}`;
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
    return "Arm the deletion request first. No backend request will be sent in this round.";
  }

  return "Deletion request staged locally. Server-side account closure still needs backend support.";
}
