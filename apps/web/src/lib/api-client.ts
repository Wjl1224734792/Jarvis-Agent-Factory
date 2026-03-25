import { createApiClient } from "@feijia/http-client";
import { APP_PORTS } from "@feijia/shared";

const fallbackBaseUrl = `http://localhost:${APP_PORTS.server}`;

const resolvedBaseUrl =
  import.meta.env.VITE_WEB_API_BASE_URL?.trim() || fallbackBaseUrl;

export const apiClient = createApiClient({
  baseUrl: resolvedBaseUrl
});
