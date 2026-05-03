import { describe, expect, it } from "vitest";
import { settingsNotificationOptions } from "../src/features/auth/settings-notification-options";

describe("settings notification options", () => {
  it("covers every persisted notification preference exposed by the profile state", () => {
    expect(settingsNotificationOptions.map((item) => item.field)).toEqual([
      "notifyComments",
      "notifyMentions",
      "sessionAlerts",
      "emailDigest"
    ]);
  });
});
