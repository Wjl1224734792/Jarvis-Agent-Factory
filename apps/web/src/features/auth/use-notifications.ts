import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import { NOTIFICATIONS_QUERY_KEY } from "./notification-state";

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => apiClient.listNotifications(),
    enabled
  });
}

export async function refreshNotifications(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
}

export function useRefreshNotifications() {
  const queryClient = useQueryClient();

  return async function invalidate() {
    await refreshNotifications(queryClient);
  };
}
