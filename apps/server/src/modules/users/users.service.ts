import type { UserSummary } from "@feijia/schemas";
import { resolveIpLocationLabel } from "../../lib/ip-location";
import { authRepo } from "../auth/auth.repo";

export const usersService = {
  async getCurrentUser(sessionId: string): Promise<UserSummary | null> {
    return authRepo.getUserSummaryBySession(sessionId);
  },
  async resolvePublicIpLocationLabelMap(userIds: string[]) {
    const latestClientIps = await authRepo.listLatestClientIpsByUserIds(userIds);
    const entries = await Promise.all(
      latestClientIps.map(async (item) => [
        item.userId,
        await resolveIpLocationLabel(item.clientIp)
      ] as const)
    );

    return new Map(entries);
  }
};
