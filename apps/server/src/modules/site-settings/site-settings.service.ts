import { siteSettingsRepo } from "./site-settings.repo";

const defaultSiteSettings = {
  postModerationEnabled: true
} as const;

export const siteSettingsService = {
  async getResolvedSettings() {
    const current = await siteSettingsRepo.get();
    if (!current) {
      return defaultSiteSettings;
    }

    return {
      postModerationEnabled: current.postModerationEnabled
    };
  },
  async update(input: { postModerationEnabled: boolean }) {
    const updated = await siteSettingsRepo.upsert(input);
    if (!updated) {
      return null;
    }

    return {
      postModerationEnabled: updated.postModerationEnabled
    };
  }
};

