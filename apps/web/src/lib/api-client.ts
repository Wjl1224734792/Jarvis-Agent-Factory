import { createApiClient } from "@feijia/http-client";
import { APP_PORTS } from "@feijia/shared";

const fallbackBaseUrl = `http://localhost:${APP_PORTS.server}`;

export const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? fallbackBaseUrl
});
