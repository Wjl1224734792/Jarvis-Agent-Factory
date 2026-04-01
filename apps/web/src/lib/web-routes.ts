// Web 侧把"由页面自己维护的派生路径"集中在这里，避免和共享 APP_ROUTES 混在一起。
export const WEB_ROUTE_PATHS = {
  publishArticle: "/publish/article",
  publishMoment: "/publish/moment",
  publishAircraft: "/publish/aircraft",
  publishStatus: "/publish/status/:kind/:id",
  rankingDetail: "/rankings/:id",
  ratingTargetDetail: "/rating-targets/:id"
} as const;

export type PublishStatusKind = "article" | "moment" | "aircraft" | "ranking";

function replacePathParam(path: string, key: string, value: string) {
  return path.replace(`:${key}`, value);
}

export function buildRankingDetailPath(id: string) {
  return replacePathParam(WEB_ROUTE_PATHS.rankingDetail, "id", id);
}

export function buildRatingTargetDetailPath(id: string) {
  return replacePathParam(WEB_ROUTE_PATHS.ratingTargetDetail, "id", id);
}

export function buildPublishStatusPath(kind: PublishStatusKind, id: string) {
  return replacePathParam(
    replacePathParam(WEB_ROUTE_PATHS.publishStatus, "kind", kind),
    "id",
    id
  );
}
