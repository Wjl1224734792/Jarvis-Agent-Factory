// TODO: stub - implement ranking persistence

type AnyRecord = Record<string, unknown>;

export const rankingsRepo = {
  async listRankings() {
    return [] as AnyRecord[];
  },
  async listRatingTargets(_id: string) {
    return [] as AnyRecord[];
  },
  async listRatingTargetsByRankingIds(_ids: string[]) {
    return [] as AnyRecord[];
  },
  async listRatingTargetRatingAggregates(_ids: string[]) {
    return [] as AnyRecord[];
  },
  async listUserRatingTargetRatings(_userId: string, _ids: string[]) {
    return [] as AnyRecord[];
  },
  async listViewerRatingTargetReports(_ids: string[], _userId: string) {
    return [] as AnyRecord[];
  },
  async listPublishedModels() {
    return [] as AnyRecord[];
  },
  async createRanking(_data: AnyRecord) {
    return {} as AnyRecord;
  },
  async createRatingTargets(_data: unknown) {
    return [] as AnyRecord[];
  },
  async getRankingById(_id: string) {
    return null as AnyRecord | null;
  },
  async updateRanking(_id: string, _data: AnyRecord) {
    return {} as AnyRecord;
  },
  async deleteRatingTargets(_rankingId: string) {},
  async addRatingTarget(_data: unknown) {
    return {} as AnyRecord;
  },
  async getRatingTargetById(_id: string) {
    return null as AnyRecord | null;
  },
  async updateRatingTarget(_id: string, _data: AnyRecord) {
    return {} as AnyRecord;
  },
  async deleteRatingTarget(_id: string) {},
  async listRankingComments(_id: string) {
    return [] as AnyRecord[];
  },
  async listRatingTargetComments(_id: string) {
    return [] as AnyRecord[];
  },
  async listViewerRatingTargetCommentLikes(_ids: string[], _userId: string) {
    return new Set<string>();
  },
  async listViewerRatingTargetCommentReports(_ids: string[], _userId: string) {
    return new Set<string>();
  },
  async listUsersByIds(_ids: string[]) {
    return [] as AnyRecord[];
  },
  async upsertRatingTargetRating(_data: unknown) {
    return {} as AnyRecord;
  },
  async getRatingTargetCommentById(_id: string) {
    return null as AnyRecord | null;
  },
  async createRankingComment(_data: unknown) {
    return {} as AnyRecord;
  },
  async upsertRatingTargetReview(_data: unknown) {
    return {} as AnyRecord;
  },
  async createRatingTargetComment(_data: unknown) {
    return {} as AnyRecord;
  },
  async updateRatingTargetComment(_id: string, _data: unknown) {
    return {} as AnyRecord;
  },
  async updateRankingStatus(
    _id: string,
    _status: string,
    _rejectionReason: string | null,
  ) {
    return {} as AnyRecord;
  },
  async updateRatingTargetStatus(_id: string, _data: AnyRecord) {
    return {} as AnyRecord;
  },
  async updateRankingCommentStatus(_id: string, _status: string) {
    return {} as AnyRecord;
  },
  async updateRatingTargetCommentStatus(_id: string, _status: string) {
    return {} as AnyRecord;
  },
  async createRankingReport(_data: unknown) {
    return {} as AnyRecord;
  },
  async createRatingTargetReport(_data: unknown) {
    return {} as AnyRecord;
  },
  async deleteRatingTargetCommentThread(
    _itemId: string,
    _commentId: string,
  ) {},
  async toggleRatingTargetCommentLike(
    _commentId: string,
    _userId: string,
  ) {
    return { liked: false } as AnyRecord;
  },
  async createRatingTargetCommentReport(_data: unknown) {
    return {} as AnyRecord;
  },
  async listAdminRankingComments(_status: string) {
    return [] as AnyRecord[];
  },
  async listAdminRatingTargetComments(_status: string) {
    return [] as AnyRecord[];
  },
  async listRatingTargetRatingBreakdown(_id: string) {
    return [] as AnyRecord[];
  },
} as const;
