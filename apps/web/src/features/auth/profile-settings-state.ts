import type { UserSummary } from "@feijia/schemas";
import { resolveMaskedPhone } from "./phone-rebind-state";

export type ProfileVisibility = "community" | "followers" | "private";

export type UserSettingsSnapshot = {
  displayName: string;
  bio: string | null;
  avatarFileId?: string | null;
  avatarUrl: string | null;
  coverImageFileId?: string | null;
  coverImageUrl?: string | null;
  phone: string | null;
  phoneMasked?: string | null;
  hasPassword: boolean;
  profileVisibility: ProfileVisibility;
  notifyComments: boolean;
  notifyMentions: boolean;
  sessionAlerts: boolean;
  emailDigest: boolean;
};

export type SettingsDraft = {
  displayName: string;
  bio: string;
  avatarFileId: string;
  avatarUrl: string;
  coverImageFileId: string;
  coverImageUrl: string;
  phone: string;
  phoneMasked: string;
  hasPassword: boolean;
  profileVisibility: ProfileVisibility;
  notifyComments: boolean;
  notifyMentions: boolean;
  sessionAlerts: boolean;
  emailDigest: boolean;
  hasPendingChanges: boolean;
};

export type SettingsTextField =
  | "displayName"
  | "bio"
  | "avatarFileId"
  | "avatarUrl"
  | "coverImageFileId"
  | "coverImageUrl";
export type SettingsBooleanField =
  | "notifyComments"
  | "notifyMentions"
  | "sessionAlerts"
  | "emailDigest";

export function createSettingsDraft(snapshot: UserSettingsSnapshot): SettingsDraft {
  return {
    displayName: snapshot.displayName,
    bio: snapshot.bio ?? "",
    avatarFileId: snapshot.avatarFileId ?? "",
    avatarUrl: snapshot.avatarUrl ?? "",
    coverImageFileId: snapshot.coverImageFileId ?? "",
    coverImageUrl: snapshot.coverImageUrl ?? "",
    phone: snapshot.phone ?? "",
    phoneMasked: resolveMaskedPhone(snapshot.phone, snapshot.phoneMasked),
    hasPassword: snapshot.hasPassword,
    profileVisibility: snapshot.profileVisibility,
    notifyComments: snapshot.notifyComments,
    notifyMentions: snapshot.notifyMentions,
    sessionAlerts: snapshot.sessionAlerts,
    emailDigest: snapshot.emailDigest,
    hasPendingChanges: false
  };
}

export function syncSettingsDraft(
  current: SettingsDraft,
  snapshot: UserSettingsSnapshot
): SettingsDraft {
  if (current.hasPendingChanges) {
    return current;
  }

  return createSettingsDraft(snapshot);
}

export function updateSettingsTextField(
  draft: SettingsDraft,
  field: SettingsTextField,
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
  field: SettingsBooleanField
): SettingsDraft {
  return {
    ...draft,
    [field]: !draft[field],
    hasPendingChanges: true
  };
}

export function restoreSettingsBooleanField(
  draft: SettingsDraft,
  field: SettingsBooleanField,
  value: boolean
): SettingsDraft {
  return {
    ...draft,
    [field]: value
  };
}

export function setProfileVisibility(
  draft: SettingsDraft,
  profileVisibility: ProfileVisibility
): SettingsDraft {
  return {
    ...draft,
    profileVisibility,
    hasPendingChanges: true
  };
}

export function markSettingsSaved(draft: SettingsDraft): SettingsDraft {
  return {
    ...draft,
    hasPendingChanges: false
  };
}

export function mergeSettingsSnapshotIntoUserSummary(
  user: UserSummary,
  snapshot: Pick<UserSettingsSnapshot, "displayName" | "avatarUrl">
): UserSummary {
  return {
    ...user,
    displayName: snapshot.displayName,
    avatarUrl: snapshot.avatarUrl
  };
}

export function buildUpdateCurrentUserProfileInput(draft: SettingsDraft) {
  return {
    displayName: draft.displayName.trim(),
    bio: draft.bio.trim() || null,
    avatarFileId: draft.avatarFileId.trim() || null,
    coverImageFileId: draft.coverImageFileId.trim() || null,
    profileVisibility: draft.profileVisibility,
    notifyComments: draft.notifyComments,
    notifyMentions: draft.notifyMentions,
    sessionAlerts: draft.sessionAlerts,
    emailDigest: draft.emailDigest
  };
}

export function profileVisibilityLabel(visibility: ProfileVisibility) {
  switch (visibility) {
    case "followers":
      return "仅关注关系可见";
    case "private":
      return "仅自己可见";
    default:
      return "站内公开";
  }
}

export function profileVisibilityDescription(visibility: ProfileVisibility) {
  switch (visibility) {
    case "followers":
      return "资料和公开内容只向你关注关系中的用户开放。";
    case "private":
      return "只有你自己可以查看公开资料与内容。";
    default:
      return "任何站内用户都可以查看你的公开资料与内容。";
  }
}
