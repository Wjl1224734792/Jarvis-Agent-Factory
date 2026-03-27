export const WEB_ROUTE_PATHS = {
  publishArticle: "/publish/article",
  publishMoment: "/publish/moment",
  publishAircraft: "/publish/aircraft",
  publishStatus: "/publish/status/:kind/:id",
  rankingDetail: "/rankings/:id",
  rankingItemDetail: "/ranking-items/:id"
} as const;

export type PublishStatusKind = "article" | "moment" | "aircraft" | "ranking";

export function buildRankingDetailPath(id: string) {
  return WEB_ROUTE_PATHS.rankingDetail.replace(":id", id);
}

export function buildRankingItemDetailPath(id: string) {
  return WEB_ROUTE_PATHS.rankingItemDetail.replace(":id", id);
}

export function buildPublishStatusPath(kind: PublishStatusKind, id: string) {
  return WEB_ROUTE_PATHS.publishStatus.replace(":kind", kind).replace(":id", id);
}
