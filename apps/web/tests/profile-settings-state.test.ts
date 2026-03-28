import { describe, expect, it } from "vitest";
import {
  buildUpdateCurrentUserProfileInput,
  createSettingsDraft,
  markSettingsSaved,
  profileVisibilityDescription,
  profileVisibilityLabel,
  setProfileVisibility,
  syncSettingsDraft,
  toggleSettingsFlag,
  updateSettingsTextField,
  type UserSettingsSnapshot
} from "../src/features/auth/profile-settings-state";

const sampleSnapshot: UserSettingsSnapshot = {
  displayName: "SkyCaptain",
  bio: "Airport transfer and runway notes.",
  avatarUrl: "https://cdn.example.com/avatar.png",
  phone: "13800138000",
  phoneMasked: "****8000",
  profileVisibility: "community",
  notifyComments: true,
  notifyMentions: true,
  sessionAlerts: true,
  emailDigest: false
};

describe("profile settings state helpers", () => {
  it("creates a draft from the current backend snapshot", () => {
    const draft = createSettingsDraft(sampleSnapshot);

    expect(draft.displayName).toBe("SkyCaptain");
    expect(draft.bio).toBe("Airport transfer and runway notes.");
    expect(draft.avatarUrl).toBe("https://cdn.example.com/avatar.png");
    expect(draft.phone).toBe("13800138000");
    expect(draft.phoneMasked).toBe("****8000");
    expect(draft.profileVisibility).toBe("community");
    expect(draft.hasPendingChanges).toBe(false);
  });

  it("keeps user edits when syncing a fresh snapshot", () => {
    const draft = updateSettingsTextField(createSettingsDraft(sampleSnapshot), "bio", "Dirty bio");
    const synced = syncSettingsDraft(draft, {
      ...sampleSnapshot,
      bio: "Server bio"
    });

    expect(synced.bio).toBe("Dirty bio");
    expect(synced.hasPendingChanges).toBe(true);
  });

  it("updates text fields and toggles booleans as pending changes", () => {
    const updated = updateSettingsTextField(
      createSettingsDraft(sampleSnapshot),
      "displayName",
      "Shanghai Captain"
    );
    const toggled = toggleSettingsFlag(updated, "emailDigest");

    expect(updated.displayName).toBe("Shanghai Captain");
    expect(toggled.emailDigest).toBe(true);
    expect(toggled.hasPendingChanges).toBe(true);
  });

  it("updates the visibility field and exposes display labels", () => {
    const draft = setProfileVisibility(createSettingsDraft(sampleSnapshot), "private");

    expect(draft.profileVisibility).toBe("private");
    expect(profileVisibilityLabel("followers")).toContain("关");
    expect(profileVisibilityDescription("private")).toContain("只有");
  });

  it("marks saved drafts as clean", () => {
    const saved = markSettingsSaved(
      updateSettingsTextField(createSettingsDraft(sampleSnapshot), "bio", "Saved bio")
    );

    expect(saved.hasPendingChanges).toBe(false);
  });

  it("builds the update payload expected by the profile mutation", () => {
    const input = buildUpdateCurrentUserProfileInput(
      setProfileVisibility(
        toggleSettingsFlag(
          updateSettingsTextField(createSettingsDraft(sampleSnapshot), "bio", "Updated bio"),
          "emailDigest"
        ),
        "followers"
      )
    );

    expect(input.bio).toBe("Updated bio");
    expect(input.emailDigest).toBe(true);
    expect(input.profileVisibility).toBe("followers");
  });
});
