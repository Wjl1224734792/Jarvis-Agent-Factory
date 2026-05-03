import type { UserSummary } from "@feijia/schemas";
import { resolveMaskedPhone } from "./phone-rebind-state";

export type ProfileVisibility = "community" | "followers" | "private";

export interface UserSettingsSnapshot {
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
}

export interface SettingsDraft {
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
}

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
  | "sessionAlerts";

function trimToNullable(value: string): string | null {
  const next = value.trim();
  return next || null;
}

/**
 * 基于后端快照创建可编辑设置草稿。
 * @param snapshot 用户资料与设置快照。
 * @returns 已补齐表单默认值的草稿对象。
 * @throws 本函数不主动抛出异常；缺失字段会按既定默认值归一化。
 */
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

/**
 * 在草稿未被本地修改时，用最新快照同步草稿。
 * @param current 当前草稿。
 * @param snapshot 最新用户设置快照。
 * @returns 有本地未保存改动时返回原草稿，否则返回按快照重建的新草稿。
 * @throws 本函数不主动抛出异常；冲突场景下保留调用方现有草稿。
 */
export function syncSettingsDraft(
  current: SettingsDraft,
  snapshot: UserSettingsSnapshot
): SettingsDraft {
  if (current.hasPendingChanges) {
    return current;
  }

  return createSettingsDraft(snapshot);
}

/**
 * 更新文本型设置字段，并标记草稿存在待保存改动。
 * @param draft 当前设置草稿。
 * @param field 需要更新的文本字段名。
 * @param value 字段新值。
 * @returns 已写入新值且标记为待保存的草稿。
 * @throws 本函数不主动抛出异常；字段选择受 `SettingsTextField` 约束。
 */
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

/**
 * 切换布尔型设置字段，并标记草稿存在待保存改动。
 * @param draft 当前设置草稿。
 * @param field 需要切换的布尔字段名。
 * @returns 已翻转目标字段值的草稿。
 * @throws 本函数不主动抛出异常；字段选择受 `SettingsBooleanField` 约束。
 */
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

/**
 * 在接口保存失败后恢复某个布尔字段到指定值。
 * @param draft 当前设置草稿。
 * @param field 需要恢复的布尔字段名。
 * @param value 要恢复到的布尔值。
 * @returns 已恢复目标字段值的草稿。
 * @throws 本函数不主动抛出异常；字段选择受 `SettingsBooleanField` 约束。
 */
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

/**
 * 更新资料可见性并标记草稿存在待保存改动。
 * @param draft 当前设置草稿。
 * @param profileVisibility 新的资料可见性。
 * @returns 已写入可见性且标记为待保存的草稿。
 * @throws 本函数不主动抛出异常；可见性取值受 `ProfileVisibility` 约束。
 */
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

/**
 * 在保存成功后清除草稿的待保存标记。
 * @param draft 当前设置草稿。
 * @returns 已清除待保存标记的草稿。
 * @throws 本函数不主动抛出异常。
 */
export function markSettingsSaved(draft: SettingsDraft): SettingsDraft {
  return {
    ...draft,
    hasPendingChanges: false
  };
}

/**
 * 将最新设置快照合并回当前登录用户摘要。
 * @param user 当前登录用户摘要。
 * @param snapshot 需要同步回用户摘要的字段快照。
 * @returns 已合并显示名与头像地址的新用户摘要。
 * @throws 本函数不主动抛出异常；未包含的字段保持原值。
 */
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

/**
 * 构建提交到更新当前用户资料接口的输入对象。
 * @param draft 当前设置草稿。
 * @returns 已完成 trim 与空值归一化的接口输入对象。
 * @throws 本函数不主动抛出异常；空字符串字段会被归一化为 `null`。
 */
export function buildUpdateCurrentUserProfileInput(draft: SettingsDraft) {
  return {
    displayName: draft.displayName.trim(),
    bio: trimToNullable(draft.bio),
    avatarFileId: trimToNullable(draft.avatarFileId),
    coverImageFileId: trimToNullable(draft.coverImageFileId),
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
