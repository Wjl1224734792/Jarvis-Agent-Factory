import type { UserSummary } from "@feijia/schemas";
import { authRepo } from "../auth/auth.repo";

export const usersService = {
  async getCurrentUser(sessionId: string): Promise<UserSummary | null> {
    return authRepo.getUserSummaryBySession(sessionId);
  }
};
