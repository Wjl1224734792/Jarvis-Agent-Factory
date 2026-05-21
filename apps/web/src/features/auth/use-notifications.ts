import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import { getNotificationsQueryKey } from "./notification-state";

export function useNotifications(userId?: string | null, enabled = true) {
  return useQuery({
    queryKey: getNotificationsQueryKey(userId),
    queryFn: () => apiClient.listNotifications(),
    enabled,
    refetchInterval: 30_000
  });
}

export async function refreshNotifications(queryClient: QueryClient, userId?: string | null) {
  await queryClient.invalidateQueries({ queryKey: getNotificationsQueryKey(userId) });
}

export function useRefreshNotifications(userId?: string | null) {
  const queryClient = useQueryClient();

  return async function invalidate() {
    await refreshNotifications(queryClient, userId);
  };
}
