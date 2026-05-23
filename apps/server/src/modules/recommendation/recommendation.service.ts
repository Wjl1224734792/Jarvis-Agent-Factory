import { recommendationRepo } from "./recommendation.repo";
import { refreshRecommendationConfig } from "./recommendation-config";

export const recommendationService = {
  getSettings: () => recommendationRepo.getSettings(),
  async updateSettings(input: Parameters<typeof recommendationRepo.updateSettings>[0]) {
    const result = await recommendationRepo.updateSettings(input);
    await refreshRecommendationConfig();
    return result;
  },
};
