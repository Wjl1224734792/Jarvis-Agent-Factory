import type { AuthRole } from "@feijia/schemas";

export type UserRecord = {
  id: string;
  role: AuthRole;
  status: "active" | "banned";
  displayName: string;
  phone: string | null;
  wechatOpenId: string | null;
  wechatUnionId: string | null;
  account: string | null;
  password: string | null;
  bannedAt: Date | null;
  bannedUntil: Date | null;
  banReason: string | null;
  bannedBy: string | null;
};
