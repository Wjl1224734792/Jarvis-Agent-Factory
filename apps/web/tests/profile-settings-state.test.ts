import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildSettingsStorageKey,
  createDeletionMessage,
  createLocalSaveLabel,
  createProfileViewModel,
  createSettingsDraft,
  markSettingsSaved,
  parseStoredSettingsDraft,
  persistSettingsDraft,
  readStoredSettingsDraft,
  SETTINGS_STORAGE_KEY,
  setProfileVisibility,
  toggleSettingsFlag,
  updateSettingsField
} from "../src/features/auth/profile-settings-state";

const sampleUser = {
  id: "user_1",
  displayName: "SkyCaptain",
  avatarUrl: null,
  role: "user" as const
};

function createWindowStub() {
  const storage = new Map<string, string>();

  return {
    localStorage: {
      getItem(key: string) {
        return storage.has(key) ? storage.get(key)! : null;
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
      removeItem(key: string) {
        storage.delete(key);
      }
    }
  };
}

describe("profile settings state helpers", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: createWindowStub(),
      configurable: true,
      writable: true
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("builds a deterministic profile view model from the session user", () => {
    const profile = createProfileViewModel(sampleUser);

    expect(profile.displayName).toBe("SkyCaptain");
    expect(profile.callsign).toMatch(/^FJ-/);
    expect(profile.metrics).toHaveLength(3);
    expect(profile.focusCards).toHaveLength(3);
  });

  it("namespaces local settings by user id", () => {
    expect(buildSettingsStorageKey(sampleUser)).toBe("feijia.web.settings.v1:user_1");
    expect(buildSettingsStorageKey({ ...sampleUser, id: "user_2" })).toBe(
      "feijia.web.settings.v1:user_2"
    );
  });

  it("persists and reads scoped local settings per user", () => {
    const draft = markSettingsSaved(
      updateSettingsField(createSettingsDraft(sampleUser), "bio", "Saved browser bio"),
      "Saved 10:12"
    );

    persistSettingsDraft(sampleUser, draft);

    expect(window.localStorage.getItem(buildSettingsStorageKey(sampleUser))).toContain(
      "Saved browser bio"
    );
    expect(readStoredSettingsDraft(sampleUser).bio).toBe("Saved browser bio");
  });

  it("migrates the legacy global key into the scoped key", () => {
    const legacyPayload = JSON.stringify({
      bio: "Legacy local bio",
      displayName: "Legacy Captain"
    });

    window.localStorage.setItem(SETTINGS_STORAGE_KEY, legacyPayload);

    const migrated = readStoredSettingsDraft(sampleUser);

    expect(migrated.bio).toBe("Legacy local bio");
    expect(migrated.displayName).toBe("Legacy Captain");
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(buildSettingsStorageKey(sampleUser))).toBe(legacyPayload);
  });

  it("marks text edits as pending local changes", () => {
    const draft = createSettingsDraft(sampleUser);
    const updated = updateSettingsField(draft, "displayName", "Shanghai Captain");

    expect(updated.displayName).toBe("Shanghai Captain");
    expect(updated.hasPendingChanges).toBe(true);
  });

  it("hydrates stored settings over defaults", () => {
    const draft = parseStoredSettingsDraft(
      JSON.stringify({
        avatarUrl: "https://cdn.example.com/avatar.png",
        bio: "Local profile bio",
        displayName: "Updated Captain",
        visibility: "followers",
        notifyComments: false
      }),
      sampleUser
    );

    expect(draft.avatarUrl).toBe("https://cdn.example.com/avatar.png");
    expect(draft.bio).toBe("Local profile bio");
    expect(draft.displayName).toBe("Updated Captain");
    expect(draft.visibility).toBe("followers");
    expect(draft.notifyComments).toBe(false);
  });

  it("toggles flags and saves the local draft", () => {
    const draft = createSettingsDraft(sampleUser);
    const toggled = toggleSettingsFlag(draft, "emailDigest");
    const saved = markSettingsSaved(
      toggled,
      createLocalSaveLabel(new Date(2026, 2, 27, 9, 5))
    );

    expect(toggled.emailDigest).toBe(!draft.emailDigest);
    expect(saved.hasPendingChanges).toBe(false);
    expect(saved.lastSavedLabel).toBe("已保存 09:05");
  });

  it("updates visibility and keeps deletion messaging explicit", () => {
    const draft = setProfileVisibility(createSettingsDraft(sampleUser), "private");
    const armed = toggleSettingsFlag(draft, "deletionArmed");

    expect(draft.visibility).toBe("private");
    expect(armed.hasPendingChanges).toBe(true);
    expect(createDeletionMessage(draft)).toContain("注销意图");
    expect(createDeletionMessage(armed)).toContain("继续完成");
  });

  it("maps saved profile copy into the profile view model", () => {
    const draft = parseStoredSettingsDraft(
      JSON.stringify({
        bio: "Saved browser bio",
        displayName: "Saved Captain",
        avatarUrl: "https://cdn.example.com/saved.png"
      }),
      sampleUser
    );

    const profile = createProfileViewModel(sampleUser, draft);

    expect(profile.bio).toBe("Saved browser bio");
    expect(profile.displayName).toBe("Saved Captain");
    expect(profile.avatarUrl).toBe("https://cdn.example.com/saved.png");
  });
});
