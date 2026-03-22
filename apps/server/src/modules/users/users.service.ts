import type { UserSummary } from "@feijia/schemas";
import { authRepo } from "../auth/auth.repo";

export const usersService = {
  getCurrentUser(sessionId: string): UserSummary | null {
    return authRepo.getUserSummaryBySession(sessionId);
  }
};
