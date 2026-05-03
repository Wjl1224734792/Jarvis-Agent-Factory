import type {
  AdminBanUserInput,
  AdminUserDetail,
  AdminUserListItem,
  AdminUserListQuery,
  UserSummary
} from "@feijia/schemas";
import { resolveIpLocationLabel } from "../../lib/ip-location";
import { authRepo } from "../auth/auth.repo";
import { resolveUploadedFileUrl } from "../uploads/uploads.helpers";
import type { AdminUserRow, AdminUserSessionRow } from "./users.repo";
import { usersRepo } from "./users.repo";

export class AdminUserManagementError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "INVALID_TARGET",
    message: string
  ) {
    super(message);
  }
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function maskPhone(phone: string | null) {
  if (!phone) {
    return null;
  }

  if (phone.length < 7) {
    return phone;
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function resolveSessionStatus(session: AdminUserSessionRow): "active" | "revoked" | "expired" {
  if (session.revoked_at) {
    return "revoked";
  }
  if (session.expires_at.getTime() < Date.now()) {
    return "expired";
  }
  return "active";
}

async function toAdminUserListItem(row: AdminUserRow): Promise<AdminUserListItem> {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: await resolveUploadedFileUrl(row.avatar_file_id),
    role: row.role,
    status: row.status,
    phone: row.phone,
    phoneMasked: maskPhone(row.phone),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    bannedAt: toIso(row.banned_at),
    bannedUntil: toIso(row.banned_until),
    banReason: row.ban_reason,
    bannedBy:
      row.banned_by && row.banned_by_display_name
        ? {
            id: row.banned_by,
            displayName: row.banned_by_display_name
          }
        : null,
    lastSeenAt: toIso(row.last_seen_at),
    activeSessionCount: row.active_session_count,
    contentCounts: {
      posts: row.posts_count,
      comments: row.comments_count,
      reviews: row.reviews_count,
      rankings: row.rankings_count,
      aircraftSubmissions: row.aircraft_submissions_count,
      brandApplications: row.brand_applications_count
    }
  };
}

async function toAdminUserDetail(row: AdminUserRow): Promise<AdminUserDetail> {
  const [item, sessions] = await Promise.all([
    toAdminUserListItem(row),
    usersRepo.listRecentSessions(row.id)
  ]);

  return {
    ...item,
    recentSessions: sessions.map((session) => ({
      id: session.id,
      scope: session.scope,
      clientIp: session.client_ip,
      userAgent: session.user_agent,
      deviceLabel: session.device_label,
      status: resolveSessionStatus(session),
      createdAt: session.created_at.toISOString(),
      lastSeenAt: toIso(session.last_seen_at),
      revokedAt: toIso(session.revoked_at),
      expiresAt: session.expires_at.toISOString()
    }))
  };
}

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
  },
  async listAdminUsers(query: AdminUserListQuery) {
    const result = await usersRepo.listAdminUsers(query);

    return {
      items: await Promise.all(result.rows.map(toAdminUserListItem)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total: result.total
      }
    };
  },
  async getAdminUser(userId: string) {
    const row = await usersRepo.getAdminUserById(userId);
    if (!row) {
      throw new AdminUserManagementError("NOT_FOUND", "用户不存在");
    }

    return {
      item: await toAdminUserDetail(row)
    };
  },
  async banUser(userId: string, adminId: string, input: AdminBanUserInput) {
    const row = await usersRepo.getAdminUserById(userId);
    if (!row) {
      throw new AdminUserManagementError("NOT_FOUND", "用户不存在");
    }
    if (row.id === adminId || row.role === "admin") {
      throw new AdminUserManagementError("INVALID_TARGET", "不能封禁当前管理员或管理员账号");
    }

    await usersRepo.banUser(userId, adminId, input);
    await authRepo.revokeUserSessions(userId);
    return this.getAdminUser(userId);
  },
  async unbanUser(userId: string) {
    const row = await usersRepo.getAdminUserById(userId);
    if (!row) {
      throw new AdminUserManagementError("NOT_FOUND", "用户不存在");
    }

    await usersRepo.unbanUser(userId);
    return this.getAdminUser(userId);
  },

  /**
   * 构建用户的机型偏好向量（模型 ID 列表，按交互频次降序）。
   * 查询近 30 天用户与机型模型的交互记录（浏览、收藏、评论等），
   * 返回按交互频次降序排列的机型 ID 数组。
   *
   * 此方法适合作为异步更新逻辑（每周一次），结果可缓存，
   * 避免每次 Feed 请求都执行聚合查询。
   */
  async buildUserModelPreferenceVector(userId: string): Promise<string[]> {
    const preferences = await usersRepo.getUserModelPreferences(userId);
    return preferences.map(p => p.modelId);
  }
};
