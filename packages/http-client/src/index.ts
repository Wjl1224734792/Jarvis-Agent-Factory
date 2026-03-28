import {
  actionSuccessResponseSchema,
  adminBrandInputSchema,
  adminBrandResponseSchema,
  adminCategoryInputSchema,
  adminCategoryResponseSchema,
  adminContentCategoryInputSchema,
  adminContentCategoryResponseSchema,
  adminModelInputSchema,
  adminModelResponseSchema,
  adminPostCommentResponseSchema,
  adminPostCommentsResponseSchema,
  adminPostCommentStatusUpdateInputSchema,
  adminPostResponseSchema,
  adminPostsResponseSchema,
  adminPostStatusUpdateInputSchema,
  adminReviewResponseSchema,
  adminReviewsResponseSchema,
  adminLoginRequestSchema,
  aircraftSubmissionResponseSchema,
  aircraftSubmissionsResponseSchema,
  authErrorResponseSchema,
  authSuccessResponseSchema,
  captchaChallengeResponseSchema,
  circleFeedResponseSchema,
  contentCategoriesResponseSchema,
  createAircraftSubmissionInputSchema,
  createPostCommentInputSchema,
  createPostCommentResponseSchema,
  createPostInputSchema,
  createPostResponseSchema,
  createRankingCommentInputSchema,
  createRankingCommentResponseSchema,
  createRankingInputSchema,
  addRankingItemInputSchema,
  rankingItemResponseSchema,
  updateRankingInputSchema,
  createRankingItemCommentInputSchema,
  createRankingItemCommentResponseSchema,
  currentUserResponseSchema,
  errorResponseSchema,
  feedTabSchema,
  healthResponseSchema,
  healthRoute,
  homeFeedResponseSchema,
  modelDetailResponseSchema,
  modelListQuerySchema,
  modelListResponseSchema,
  createReviewCommentInputSchema,
  createReviewCommentResponseSchema,
  modelReviewsResponseSchema,
  notificationsResponseSchema,
  postDetailResponseSchema,
  postInteractionTypeSchema,
  rankingItemDetailResponseSchema,
  rankingResponseSchema,
  rankingsResponseSchema,
  reviewCommentsResponseSchema,
  reportPostInputSchema,
  smsCodeRequestSchema,
  smsCodeResponseSchema,
  submitModelReviewInputSchema,
  submitModelReviewResponseSchema,
  submitRankingItemRatingInputSchema,
  submitRankingItemRatingResponseSchema,
  submitRankingItemReviewInputSchema,
  submitRankingItemReviewResponseSchema,
  userContentResponseSchema,
  userProfileResponseSchema,
  updateAircraftSubmissionStatusInputSchema,
  updateReviewStatusInputSchema,
  uploadPostImageResponseSchema,
  uploadPostVideoResponseSchema,
  webLoginRequestSchema,
  type HealthResponse,
  type UserSummary
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";

type ApiClientOptions = {
  baseUrl: string;
};

type WebLoginInput = Parameters<typeof webLoginRequestSchema.parse>[0];
type SmsCodeInput = Parameters<typeof smsCodeRequestSchema.parse>[0];
type AdminLoginInput = Parameters<typeof adminLoginRequestSchema.parse>[0];
type ModelsQueryInput = Parameters<typeof modelListQuerySchema.parse>[0];
type AdminCategoryInput = Parameters<typeof adminCategoryInputSchema.parse>[0];
type AdminBrandInput = Parameters<typeof adminBrandInputSchema.parse>[0];
type AdminModelInput = Parameters<typeof adminModelInputSchema.parse>[0];
type AdminContentCategoryInput = Parameters<typeof adminContentCategoryInputSchema.parse>[0];
type FeedTabInput = "recommended" | "latest" | "following";
type CreatePostInput = Parameters<typeof createPostInputSchema.parse>[0];
type CreatePostCommentInput = Parameters<typeof createPostCommentInputSchema.parse>[0];
type PostInteractionTypeInput = Parameters<typeof postInteractionTypeSchema.parse>[0];
type ReportPostInput = Parameters<typeof reportPostInputSchema.parse>[0];
type UpdateAdminPostStatusInput = Parameters<typeof adminPostStatusUpdateInputSchema.parse>[0];
type UpdateAdminPostCommentStatusInput =
  Parameters<typeof adminPostCommentStatusUpdateInputSchema.parse>[0];
type SubmitReviewInput = Parameters<typeof submitModelReviewInputSchema.parse>[0];
type CreateReviewCommentInput = Parameters<typeof createReviewCommentInputSchema.parse>[0];
type UpdateReviewStatusInput = Parameters<typeof updateReviewStatusInputSchema.parse>[0];
type HomeFeedInput = { tab: FeedTabInput; categorySlug?: string } | FeedTabInput;
type CreateRankingInput = Parameters<typeof createRankingInputSchema.parse>[0];
type UpdateRankingInput = Parameters<typeof updateRankingInputSchema.parse>[0];
type AddRankingItemInput = Parameters<typeof addRankingItemInputSchema.parse>[0];
type CreateRankingCommentInput = Parameters<typeof createRankingCommentInputSchema.parse>[0];
type CreateRankingItemCommentInput = Parameters<typeof createRankingItemCommentInputSchema.parse>[0];
type SubmitRankingItemRatingInput = Parameters<typeof submitRankingItemRatingInputSchema.parse>[0];
type SubmitRankingItemReviewInput = Parameters<typeof submitRankingItemReviewInputSchema.parse>[0];
type CreateAircraftSubmissionInput = Parameters<typeof createAircraftSubmissionInputSchema.parse>[0];
type UpdateAircraftSubmissionStatusInput =
  Parameters<typeof updateAircraftSubmissionStatusInputSchema.parse>[0];

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

async function parseError(response: Response): Promise<Error> {
  const payload = await response.json().catch(() => null);
  const authError = authErrorResponseSchema.safeParse(payload);

  if (authError.success) {
    return new Error(authError.data.message);
  }

  const genericError = errorResponseSchema.safeParse(payload);

  if (genericError.success) {
    return new Error(genericError.data.message);
  }

  return new Error(`Request failed with status ${response.status}`);
}

async function readJson<T>(response: Response, parser: { parse: (input: unknown) => T }): Promise<T> {
  if (!response.ok) {
    throw await parseError(response);
  }

  return parser.parse(await response.json());
}

function buildQueryString(input: ModelsQueryInput): string {
  const query = modelListQuerySchema.parse(input ?? {});
  const search = new URLSearchParams();

  if (query.categorySlug) {
    search.set("categorySlug", query.categorySlug);
  }

  if (query.brandSlug) {
    search.set("brandSlug", query.brandSlug);
  }

  if (query.powerTypes?.length) {
    for (const powerType of query.powerTypes) {
      search.append("powerType", powerType);
    }
  }

  const queryString = search.toString();
  return queryString ? `?${queryString}` : "";
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  async function postJson<TInput, TOutput>(
    path: string,
    parser: { parse: (input: unknown) => TOutput },
    body: TInput
  ): Promise<TOutput> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    return readJson(response, parser);
  }

  async function putJson<TInput, TOutput>(
    path: string,
    parser: { parse: (input: unknown) => TOutput },
    body: TInput
  ): Promise<TOutput> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    return readJson(response, parser);
  }

  return {
    async getHealth(): Promise<HealthResponse> {
      const response = await fetch(`${baseUrl}${healthRoute.path}`, {
        method: healthRoute.method,
        credentials: "include"
      });

      return readJson(response, healthResponseSchema);
    },
    async requestCaptchaChallenge() {
      const response = await fetch(`${baseUrl}${API_ROUTES.auth.captchaChallenge}`, {
        method: "POST",
        credentials: "include"
      });

      return readJson(response, captchaChallengeResponseSchema);
    },
    async requestSmsCode(input: SmsCodeInput) {
      return postJson(
        API_ROUTES.auth.smsRequest,
        smsCodeResponseSchema,
        smsCodeRequestSchema.parse(input)
      );
    },
    async loginWeb(input: WebLoginInput) {
      return postJson(
        API_ROUTES.auth.webLogin,
        authSuccessResponseSchema,
        webLoginRequestSchema.parse(input)
      );
    },
    async loginAdmin(input: AdminLoginInput) {
      return postJson(
        API_ROUTES.auth.adminLogin,
        authSuccessResponseSchema,
        adminLoginRequestSchema.parse(input)
      );
    },
    async getCurrentUser(): Promise<UserSummary | null> {
      const response = await fetch(`${baseUrl}${API_ROUTES.auth.currentUser}`, {
        method: "GET",
        credentials: "include"
      });

      const payload = await readJson(response, currentUserResponseSchema);
      return payload.user;
    },
    async getCurrentAdmin(): Promise<UserSummary | null> {
      const response = await fetch(`${baseUrl}${API_ROUTES.auth.adminCurrentUser}`, {
        method: "GET",
        credentials: "include"
      });

      const payload = await readJson(response, currentUserResponseSchema);
      return payload.user;
    },
    async logout() {
      const response = await fetch(`${baseUrl}${API_ROUTES.auth.logout}`, {
        method: "POST",
        credentials: "include"
      });

      return readJson(response, currentUserResponseSchema);
    },
    async logoutAdmin() {
      const response = await fetch(`${baseUrl}${API_ROUTES.auth.adminLogout}`, {
        method: "POST",
        credentials: "include"
      });

      return readJson(response, currentUserResponseSchema);
    },
    async listHomeFeed(input: HomeFeedInput) {
      const normalized =
        typeof input === "string"
          ? { tab: input, categorySlug: undefined }
          : { tab: input.tab, categorySlug: input.categorySlug };
      const parsedTab = feedTabSchema.parse(normalized.tab);
      const search = new URLSearchParams({ tab: parsedTab });
      if (normalized.categorySlug) {
        search.set("categorySlug", normalized.categorySlug);
      }

      const response = await fetch(`${baseUrl}${API_ROUTES.feed}?${search.toString()}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, homeFeedResponseSchema);
    },
    async listCircleFeed(tab: FeedTabInput) {
      const parsedTab = feedTabSchema.parse(tab);
      const response = await fetch(`${baseUrl}${API_ROUTES.circleFeed}?tab=${parsedTab}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, circleFeedResponseSchema);
    },
    async createPost(input: CreatePostInput) {
      return postJson(API_ROUTES.posts.create, createPostResponseSchema, createPostInputSchema.parse(input));
    },
    async uploadPostImage(file: File) {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${baseUrl}${API_ROUTES.uploads.images}`, {
        method: "POST",
        credentials: "include",
        body: formData
      });

      return readJson(response, uploadPostImageResponseSchema);
    },
    async uploadPostVideo(file: File) {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${baseUrl}${API_ROUTES.uploads.videos}`, {
        method: "POST",
        credentials: "include",
        body: formData
      });

      return readJson(response, uploadPostVideoResponseSchema);
    },
    async getPostDetail(id: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.posts.detail(id)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, postDetailResponseSchema);
    },
    async createPostComment(postId: string, input: CreatePostCommentInput) {
      return postJson(
        API_ROUTES.posts.comments(postId),
        createPostCommentResponseSchema,
        createPostCommentInputSchema.parse(input)
      );
    },
    async deletePost(id: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.posts.detail(id)}`, {
        method: "DELETE",
        credentials: "include"
      });

      return readJson(response, actionSuccessResponseSchema);
    },
    async deletePostComment(postId: string, commentId: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.posts.commentDetail(postId, commentId)}`, {
        method: "DELETE",
        credentials: "include"
      });

      return readJson(response, actionSuccessResponseSchema);
    },
    async reportPost(id: string, input: ReportPostInput) {
      return postJson(
        API_ROUTES.posts.report(id),
        actionSuccessResponseSchema,
        reportPostInputSchema.parse(input)
      );
    },
    async togglePostInteraction(id: string, type: PostInteractionTypeInput) {
      const parsedType = postInteractionTypeSchema.parse(type);
      const response = await fetch(`${baseUrl}${API_ROUTES.posts.interaction(id, parsedType)}`, {
        method: "POST",
        credentials: "include"
      });

      return readJson(response, actionSuccessResponseSchema);
    },
    async toggleFollow(userId: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.social.follow(userId)}`, {
        method: "POST",
        credentials: "include"
      });

      return readJson(response, actionSuccessResponseSchema);
    },
    async listNotifications() {
      const response = await fetch(`${baseUrl}${API_ROUTES.social.notifications}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, notificationsResponseSchema);
    },
    async markAllNotificationsRead() {
      const response = await fetch(`${baseUrl}${API_ROUTES.social.notificationsReadAll}`, {
        method: "POST",
        credentials: "include"
      });

      return readJson(response, actionSuccessResponseSchema);
    },
    async getUserProfile(userId: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.users.profile(userId)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, userProfileResponseSchema);
    },
    async listUserContent(userId: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.users.content(userId)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, userContentResponseSchema);
    },
    async listContentCategories() {
      const response = await fetch(`${baseUrl}${API_ROUTES.content.categories}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, contentCategoriesResponseSchema);
    },
    async listAdminContentCategories() {
      const response = await fetch(`${baseUrl}${API_ROUTES.content.adminCategories}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, contentCategoriesResponseSchema);
    },
    async createContentCategory(input: AdminContentCategoryInput) {
      return postJson(
        API_ROUTES.content.adminCategories,
        adminContentCategoryResponseSchema,
        adminContentCategoryInputSchema.parse(input)
      );
    },
    async updateContentCategory(id: string, input: AdminContentCategoryInput) {
      return putJson(
        API_ROUTES.content.adminCategoryDetail(id),
        adminContentCategoryResponseSchema,
        adminContentCategoryInputSchema.parse(input)
      );
    },
    async createAircraftSubmission(input: CreateAircraftSubmissionInput) {
      return postJson(
        API_ROUTES.submissions.create,
        aircraftSubmissionResponseSchema,
        createAircraftSubmissionInputSchema.parse(input)
      );
    },
    async getAircraftSubmission(id: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.submissions.detail(id)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, aircraftSubmissionResponseSchema);
    },
    async listAdminAircraftSubmissions() {
      const response = await fetch(`${baseUrl}${API_ROUTES.submissions.adminList}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, aircraftSubmissionsResponseSchema);
    },
    async updateAircraftSubmissionStatus(id: string, input: UpdateAircraftSubmissionStatusInput) {
      return putJson(
        API_ROUTES.submissions.adminDetail(id),
        aircraftSubmissionResponseSchema,
        updateAircraftSubmissionStatusInputSchema.parse(input)
      );
    },
    async listRankings() {
      const response = await fetch(`${baseUrl}${API_ROUTES.rankings.overview}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, rankingsResponseSchema);
    },
    async createRanking(input: CreateRankingInput) {
      return postJson(
        API_ROUTES.rankings.create,
        rankingResponseSchema,
        createRankingInputSchema.parse(input)
      );
    },
    async updateRanking(id: string, input: UpdateRankingInput) {
      return putJson(
        API_ROUTES.rankings.update(id),
        rankingResponseSchema,
        updateRankingInputSchema.parse(input)
      );
    },
    async addRankingItem(id: string, input: AddRankingItemInput) {
      return postJson(
        API_ROUTES.rankings.items(id),
        rankingItemResponseSchema,
        addRankingItemInputSchema.parse(input)
      );
    },
    async getRankingDetail(id: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.rankings.detail(id)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, rankingResponseSchema);
    },
    async createRankingComment(id: string, input: CreateRankingCommentInput) {
      return postJson(
        API_ROUTES.rankings.comments(id),
        createRankingCommentResponseSchema,
        createRankingCommentInputSchema.parse(input)
      );
    },
    async getRankingItemDetail(id: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.rankings.itemDetail(id)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, rankingItemDetailResponseSchema);
    },
    async submitRankingItemRating(id: string, input: SubmitRankingItemRatingInput) {
      return postJson(
        API_ROUTES.rankings.itemRatings(id),
        submitRankingItemRatingResponseSchema,
        submitRankingItemRatingInputSchema.parse(input)
      );
    },
    async submitRankingItemReview(id: string, input: SubmitRankingItemReviewInput) {
      return postJson(
        API_ROUTES.rankings.itemReview(id),
        submitRankingItemReviewResponseSchema,
        submitRankingItemReviewInputSchema.parse(input)
      );
    },
    async createRankingItemComment(id: string, input: CreateRankingItemCommentInput) {
      return postJson(
        API_ROUTES.rankings.itemComments(id),
        createRankingItemCommentResponseSchema,
        createRankingItemCommentInputSchema.parse(input)
      );
    },
    async listAdminPosts(status?: "pending" | "published" | "rejected" | "hidden") {
      const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
      const response = await fetch(`${baseUrl}${API_ROUTES.posts.adminList}${suffix}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminPostsResponseSchema);
    },
    async updateAdminPostStatus(id: string, input: UpdateAdminPostStatusInput) {
      return putJson(
        API_ROUTES.posts.adminDetail(id),
        adminPostResponseSchema,
        adminPostStatusUpdateInputSchema.parse(input)
      );
    },
    async listAdminPostComments(status?: "visible" | "hidden") {
      const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
      const response = await fetch(`${baseUrl}${API_ROUTES.posts.adminComments}${suffix}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminPostCommentsResponseSchema);
    },
    async updateAdminPostCommentStatus(id: string, input: UpdateAdminPostCommentStatusInput) {
      return putJson(
        API_ROUTES.posts.adminCommentDetail(id),
        adminPostCommentResponseSchema,
        adminPostCommentStatusUpdateInputSchema.parse(input)
      );
    },
    async listModels(input: ModelsQueryInput = {}) {
      const response = await fetch(`${baseUrl}${API_ROUTES.models.list}${buildQueryString(input)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, modelListResponseSchema);
    },
    async getModelDetail(slug: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.models.detail(slug)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, modelDetailResponseSchema);
    },
    async listModelReviews(slug: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.models.reviews(slug)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, modelReviewsResponseSchema);
    },
    async listReviewComments(reviewId: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.models.reviewComments(reviewId)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, reviewCommentsResponseSchema);
    },
    async createReviewComment(reviewId: string, input: CreateReviewCommentInput) {
      return postJson(
        API_ROUTES.models.reviewComments(reviewId),
        createReviewCommentResponseSchema,
        createReviewCommentInputSchema.parse(input)
      );
    },
    async deleteReviewComment(reviewId: string, commentId: string) {
      const response = await fetch(
        `${baseUrl}${API_ROUTES.models.reviewCommentDetail(reviewId, commentId)}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      );

      return readJson(response, actionSuccessResponseSchema);
    },
    async submitModelReview(slug: string, input: SubmitReviewInput) {
      return postJson(
        API_ROUTES.models.reviews(slug),
        submitModelReviewResponseSchema,
        submitModelReviewInputSchema.parse(input)
      );
    },
    async createCategory(input: AdminCategoryInput) {
      return postJson(
        API_ROUTES.models.categories,
        adminCategoryResponseSchema,
        adminCategoryInputSchema.parse(input)
      );
    },
    async createBrand(input: AdminBrandInput) {
      return postJson(
        API_ROUTES.models.brands,
        adminBrandResponseSchema,
        adminBrandInputSchema.parse(input)
      );
    },
    async createModel(input: AdminModelInput) {
      return postJson(
        API_ROUTES.models.adminList,
        adminModelResponseSchema,
        adminModelInputSchema.parse(input)
      );
    },
    async updateModel(id: string, input: AdminModelInput) {
      return putJson(
        API_ROUTES.models.adminDetail(id),
        adminModelResponseSchema,
        adminModelInputSchema.parse(input)
      );
    },
    async listAdminReviews() {
      const response = await fetch(`${baseUrl}${API_ROUTES.models.adminReviews}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminReviewsResponseSchema);
    },
    async updateReviewStatus(id: string, input: UpdateReviewStatusInput) {
      return putJson(
        API_ROUTES.models.adminReviewDetail(id),
        adminReviewResponseSchema,
        updateReviewStatusInputSchema.parse(input)
      );
    }
  };
}
