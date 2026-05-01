import { APP_ROUTES } from "@feijia/shared";
import type { NotificationTargetType } from "./notification-types";

type SystemNotificationTarget = {
  type: NotificationTargetType;
  id: string;
  title: string;
  status?: string | null;
  href?: string | null;
};

function replaceRouteParam(path: string, key: string, value: string) {
  return path.replace(`:${key}`, value);
}

function normalizeHref(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Converts stored notification targets into Web routes that actually exist.
 *
 * Historical notifications may carry API-like hrefs such as
 * `/rankings/items/:id`; this helper keeps those rows readable without a data
 * migration and also gives new system messages a single route policy.
 */
export function resolveSystemNotificationHref(input: { target: SystemNotificationTarget }) {
  const explicitHref = normalizeHref(input.target.href);
  const targetId = input.target.id.trim();

  if (!targetId) {
    return explicitHref;
  }

  switch (input.target.type) {
    case "rating_target":
      return replaceRouteParam(APP_ROUTES.ratingTargetDetail, "id", targetId);
    case "aircraft_submission":
      return `${APP_ROUTES.publishAircraft}?edit=${encodeURIComponent(targetId)}`;
    case "brand_application":
      return `${APP_ROUTES.publishBrand}?submitted=${encodeURIComponent(targetId)}`;
    case "user":
      return explicitHref ?? replaceRouteParam(APP_ROUTES.webUserProfile, "id", targetId);
    case "post":
    case "comment":
      return explicitHref ?? replaceRouteParam(APP_ROUTES.postDetail, "id", targetId);
    case "ranking":
      return explicitHref ?? replaceRouteParam(APP_ROUTES.rankingDetail, "id", targetId);
    case "status":
    default:
      return explicitHref;
  }
}
