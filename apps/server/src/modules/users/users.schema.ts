import type { AuthRole } from "@feijia/schemas";

export type UserRecord = {
  id: string;
  role: AuthRole;
  displayName: string;
  phone: string | null;
  account: string | null;
  password: string | null;
};
