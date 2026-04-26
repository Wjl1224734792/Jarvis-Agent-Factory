import type { SettingsBooleanField } from "./profile-settings-state";

export type SettingsNotificationOption = {
  field: SettingsBooleanField;
  label: string;
  description: string;
  successMessage: string;
};

/**
 * Keep notification UI labels aligned with the persisted user-settings contract
 * so the settings page does not silently omit supported toggles.
 */
export const settingsNotificationOptions: SettingsNotificationOption[] = [
  {
    field: "notifyComments",
    label: "评论与回复提醒",
    description: "当有人评论或回复你时，消息中心优先显示。",
    successMessage: "评论与回复提醒已更新"
  },
  {
    field: "notifyMentions",
    label: "提及提醒",
    description: "当有人在帖子、榜单或评论中提及你时提醒。",
    successMessage: "提及提醒已更新"
  },
  {
    field: "sessionAlerts",
    label: "账号安全提醒",
    description: "当账号出现新的登录会话或异常安全事件时提醒。",
    successMessage: "账号安全提醒已更新"
  },
  {
    field: "emailDigest",
    label: "邮件摘要",
    description: "定期接收账号动态与内容互动的邮件摘要。",
    successMessage: "邮件摘要设置已更新"
  }
];
