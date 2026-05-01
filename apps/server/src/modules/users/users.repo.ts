import { dbPool } from "@feijia/db";
import type { AdminBanUserInput, AdminUserListQuery } from "@feijia/schemas";

type UserStatus = "active" | "banned";
type UserRole = "user" | "admin";
type SessionScope = "web" | "admin" | "app";

export type AdminUserRow = {
  id: string;
  role: UserRole;
  status: UserStatus;
  display_name: string;
  avatar_file_id: string | null;
  phone: string | null;
  created_at: Date;
  updated_at: Date;
  banned_at: Date | null;
  banned_until: Date | null;
  ban_reason: string | null;
  banned_by: string | null;
  banned_by_display_name: string | null;
  last_seen_at: Date | null;
  active_session_count: number;
  posts_count: number;
  comments_count: number;
  reviews_count: number;
  rankings_count: number;
  aircraft_submissions_count: number;
  brand_applications_count: number;
};

export type AdminUserSessionRow = {
  id: string;
  scope: SessionScope;
  client_ip: string | null;
  user_agent: string | null;
  device_label: string | null;
  created_at: Date;
  last_seen_at: Date | null;
  revoked_at: Date | null;
  expires_at: Date;
};

function buildAdminUserWhere(query: AdminUserListQuery) {
  const clauses: string[] = [];
  const values: Array<string | number> = [];

  if (query.keyword) {
    values.push(`%${query.keyword}%`);
    const placeholder = `$${values.length}`;
    clauses.push(
      `(u.id ilike ${placeholder} or u.display_name ilike ${placeholder} or u.phone ilike ${placeholder})`
    );
  }

  if (query.status !== "all") {
    values.push(query.status);
    clauses.push(`u.status = $${values.length}`);
  }

  if (query.role !== "all") {
    values.push(query.role);
    clauses.push(`u.role = $${values.length}`);
  }

  return {
    where: clauses.length > 0 ? `where ${clauses.join(" and ")}` : "",
    values
  };
}

const adminUserSelection = `
  u.id,
  u.role,
  u.status,
  u.display_name,
  u.avatar_file_id,
  u.phone,
  u.created_at,
  u.updated_at,
  u.banned_at,
  u.banned_until,
  u.ban_reason,
  u.banned_by,
  bu.display_name as banned_by_display_name,
  (
    select max(s.last_seen_at)
    from sessions s
    where s.user_id = u.id
  ) as last_seen_at,
  cast((
    select count(*)
    from sessions s
    where s.user_id = u.id
      and s.revoked_at is null
      and s.expires_at > now()
  ) as int) as active_session_count,
  cast((select count(*) from posts p where p.author_id = u.id) as int) as posts_count,
  cast((
    (select count(*) from post_comments c where c.author_id = u.id)
    + (select count(*) from review_comments c where c.author_id = u.id)
    + (select count(*) from aircraft_model_comments c where c.author_id = u.id)
    + (select count(*) from ranking_comments c where c.author_id = u.id)
    + (select count(*) from rating_target_comments c where c.author_id = u.id)
  ) as int) as comments_count,
  cast((select count(*) from aircraft_reviews r where r.user_id = u.id) as int) as reviews_count,
  cast((select count(*) from rankings r where r.author_id = u.id) as int) as rankings_count,
  cast((select count(*) from aircraft_submissions s where s.author_id = u.id) as int) as aircraft_submissions_count,
  cast((select count(*) from brand_applications b where b.applicant_id = u.id) as int) as brand_applications_count
`;

export const usersRepo = {
  async listAdminUsers(query: AdminUserListQuery) {
    const { where, values } = buildAdminUserWhere(query);
    const countResult = await dbPool.query<{ total: string }>(
      `select cast(count(*) as int) as total from users u ${where}`,
      values
    );
    const total = Number(countResult.rows[0]?.total ?? 0);
    const limit = query.pageSize;
    const offset = (query.page - 1) * query.pageSize;
    const rowsResult = await dbPool.query<AdminUserRow>(
      `
        select ${adminUserSelection}
        from users u
        left join users bu on bu.id = u.banned_by
        ${where}
        order by u.created_at desc, u.id desc
        limit $${values.length + 1}
        offset $${values.length + 2}
      `,
      [...values, limit, offset]
    );

    return {
      rows: rowsResult.rows,
      total
    };
  },

  async getAdminUserById(userId: string) {
    const result = await dbPool.query<AdminUserRow>(
      `
        select ${adminUserSelection}
        from users u
        left join users bu on bu.id = u.banned_by
        where u.id = $1
        limit 1
      `,
      [userId]
    );

    return result.rows[0] ?? null;
  },

  async listRecentSessions(userId: string, limit = 5) {
    const result = await dbPool.query<AdminUserSessionRow>(
      `
        select id, scope, client_ip, user_agent, device_label, created_at, last_seen_at, revoked_at, expires_at
        from sessions
        where user_id = $1
        order by created_at desc
        limit $2
      `,
      [userId, limit]
    );

    return result.rows;
  },

  async banUser(userId: string, adminId: string, input: AdminBanUserInput) {
    const result = await dbPool.query(
      `
        update users
        set status = 'banned',
          banned_at = now(),
          banned_until = $2,
          ban_reason = $3,
          banned_by = $4,
          updated_at = now()
        where id = $1
      `,
      [userId, input.bannedUntil ? new Date(input.bannedUntil) : null, input.reason, adminId]
    );

    return (result.rowCount ?? 0) > 0;
  },

  async unbanUser(userId: string) {
    const result = await dbPool.query(
      `
        update users
        set status = 'active',
          banned_at = null,
          banned_until = null,
          ban_reason = null,
          banned_by = null,
          updated_at = now()
        where id = $1
      `,
      [userId]
    );

    return (result.rowCount ?? 0) > 0;
  }
};
