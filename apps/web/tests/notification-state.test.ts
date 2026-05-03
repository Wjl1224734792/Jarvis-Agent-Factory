import { describe, expect, it } from "vitest";
import {
  getNotificationNavTone,
  getNotificationsQueryKey,
  hasUnreadNotifications,
  shouldFetchNotifications
} from "../src/features/auth/notification-state";

describe("notification-state", () => {
  it("treats only positive unread counts as unread state", () => {
    expect(hasUnreadNotifications(undefined)).toBe(false);
    expect(hasUnreadNotifications(0)).toBe(false);
    expect(hasUnreadNotifications(2)).toBe(true);
  });

  it("returns the correct tone for message navigation", () => {
    expect(getNotificationNavTone(0)).toBe("default");
    expect(getNotificationNavTone(1)).toBe("unread");
  });

  it("waits for auth bootstrap before enabling notifications", () => {
    expect(shouldFetchNotifications("authenticated", false)).toBe(false);
    expect(shouldFetchNotifications("loading", true)).toBe(false);
    expect(shouldFetchNotifications("anonymous", true)).toBe(false);
    expect(shouldFetchNotifications("authenticated", true)).toBe(true);
  });

  it("isolates notification caches by current auth scope", () => {
    expect(getNotificationsQueryKey()).toEqual(["notifications", "anonymous"]);
    expect(getNotificationsQueryKey("user_1")).toEqual(["notifications", "user_1"]);
  });
});
