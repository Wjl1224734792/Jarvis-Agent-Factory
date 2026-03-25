export const WEB_ROUTE_PATHS = {
  publishArticle: "/publish/article",
  publishMoment: "/publish/moment",
  publishAircraft: "/publish/aircraft",
  rankingDetail: "/rankings/:id",
  rankingItemDetail: "/ranking-items/:id"
} as const;

export function buildRankingDetailPath(id: string) {
  return WEB_ROUTE_PATHS.rankingDetail.replace(":id", id);
}

export function buildRankingItemDetailPath(id: string) {
  return WEB_ROUTE_PATHS.rankingItemDetail.replace(":id", id);
}
