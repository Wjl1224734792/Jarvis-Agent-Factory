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
      updateSettingsField(createSettingsDraft(sampleUser), "bio", "按浏览器保存的简介"),
      "已在本地保存 10:12"
    );

    persistSettingsDraft(sampleUser, draft);

    expect(window.localStorage.getItem(buildSettingsStorageKey(sampleUser))).toContain(
      "按浏览器保存的简介"
    );
    expect(readStoredSettingsDraft(sampleUser).bio).toBe("按浏览器保存的简介");
  });

  it("migrates the legacy global key into the scoped key", () => {
    const legacyPayload = JSON.stringify({
      bio: "旧版本地简介",
      homeBase: "ZUUU / 成都"
    });

    window.localStorage.setItem(SETTINGS_STORAGE_KEY, legacyPayload);

    const migrated = readStoredSettingsDraft(sampleUser);

    expect(migrated.bio).toBe("旧版本地简介");
    expect(migrated.homeBase).toBe("ZUUU / 成都");
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(buildSettingsStorageKey(sampleUser))).toBe(legacyPayload);
  });

  it("marks text edits as pending local changes", () => {
    const draft = createSettingsDraft(sampleUser);
    const updated = updateSettingsField(draft, "homeBase", "ZSSS / Shanghai Hongqiao");

    expect(updated.homeBase).toBe("ZSSS / Shanghai Hongqiao");
    expect(updated.hasPendingChanges).toBe(true);
  });

  it("hydrates stored settings over defaults", () => {
    const draft = parseStoredSettingsDraft(
      JSON.stringify({
        bio: "本地飞行简介",
        homeBase: "ZSSS / Shanghai Hongqiao",
        visibility: "followers",
        notifyComments: false
      }),
      sampleUser
    );

    expect(draft.bio).toBe("本地飞行简介");
    expect(draft.homeBase).toBe("ZSSS / Shanghai Hongqiao");
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
    expect(saved.lastSavedLabel).toBe("已在本地保存 09:05");
  });

  it("updates visibility and keeps deletion messaging explicit", () => {
    const draft = setProfileVisibility(createSettingsDraft(sampleUser), "private");
    const armed = toggleSettingsFlag(draft, "deletionArmed");

    expect(draft.visibility).toBe("private");
    expect(armed.hasPendingChanges).toBe(true);
    expect(createDeletionMessage(draft)).toContain("不会向后端发起真正的注销请求");
    expect(createDeletionMessage(armed)).toContain("后端接口支持");
  });

  it("maps saved profile copy into the profile view model", () => {
    const draft = parseStoredSettingsDraft(
      JSON.stringify({
        bio: "浏览器中保存的简介",
        homeBase: "ZGSZ / Shenzhen Bao'an"
      }),
      sampleUser
    );

    const profile = createProfileViewModel(sampleUser, draft);

    expect(profile.bio).toBe("浏览器中保存的简介");
    expect(profile.homeBase).toBe("ZGSZ / Shenzhen Bao'an");
  });
});
