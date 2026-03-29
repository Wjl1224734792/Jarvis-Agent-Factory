import {
  actionSuccessResponseSchema,
  adminRankingsResponseSchema,
  adminRecentSessionsResponseSchema,
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
  adminOfficialArticleUpdateInputSchema,
  adminPostStatusUpdateInputSchema,
  adminReviewResponseSchema,
  adminReviewsResponseSchema,
  adminLoginRequestSchema,
  aircraftSubmissionResponseSchema,
  aircraftSubmissionsResponseSchema,
  appAuthSessionResponseSchema,
  appLoginRequestSchema,
  appLoginResponseSchema,
  appRefreshRequestSchema,
  completeAppRegistrationRequestSchema,
  completeWebRegistrationRequestSchema,
  authErrorResponseSchema,
  authSuccessResponseSchema,
  captchaChallengeResponseSchema,
  circleFeedResponseSchema,
  completeUploadInputSchema,
  completeUploadResponseSchema,
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
  currentUserProfileResponseSchema,
  adminAnalyticsOverviewResponseSchema,
  currentUserResponseSchema,
  errorResponseSchema,
  feedTabSchema,
  healthResponseSchema,
  healthRoute,
  homeFeedResponseSchema,
  initUploadInputSchema,
  initUploadResponseSchema,
  modelInteractionResponseSchema,
  modelInteractionTypeSchema,
  modelDetailResponseSchema,
  modelListQuerySchema,
  modelListResponseSchema,
  createReviewCommentInputSchema,
  createReviewCommentResponseSchema,
  modelReviewsResponseSchema,
  notificationsResponseSchema,
  phoneChangeConfirmInputSchema,
  phoneChangeRequestInputSchema,
  phoneChangeRequestResponseSchema,
  postDetailResponseSchema,
  postInteractionTypeSchema,
  rankingItemDetailResponseSchema,
  rankingResponseSchema,
  rankingsResponseSchema,
  registrationDisplayNameSuggestRequestSchema,
  registrationDisplayNameSuggestResponseSchema,
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
  updateRankingStatusInputSchema,
  userContentResponseSchema,
  userProfileResponseSchema,
  updateAircraftSubmissionStatusInputSchema,
  updateCurrentUserProfileInputSchema,
  updateSiteSettingsInputSchema,
  updateReviewStatusInputSchema,
  fileUrlResponseSchema,
  uploadPostImageResponseSchema,
  uploadPostVideoResponseSchema,
  webLoginRequestSchema,
  webLoginResponseSchema,
  siteSettingsResponseSchema,
  type HealthResponse,
  type UserSummary
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";

type ApiClientOptions = {
  baseUrl: string;
};

type WebLoginInput = Parameters<typeof webLoginRequestSchema.parse>[0];
type AppLoginInput = Parameters<typeof appLoginRequestSchema.parse>[0];
type CompleteWebRegistrationInput = Parameters<typeof completeWebRegistrationRequestSchema.parse>[0];
type CompleteAppRegistrationInput = Parameters<typeof completeAppRegistrationRequestSchema.parse>[0];
type RegistrationDisplayNameSuggestInput =
  Parameters<typeof registrationDisplayNameSuggestRequestSchema.parse>[0];
type AppRefreshInput = Parameters<typeof appRefreshRequestSchema.parse>[0];
type SmsCodeInput = Parameters<typeof smsCodeRequestSchema.parse>[0];
type AdminLoginInput = Parameters<typeof adminLoginRequestSchema.parse>[0];
type ModelsQueryInput = Parameters<typeof modelListQuerySchema.parse>[0];
type ModelInteractionTypeInput = Parameters<typeof modelInteractionTypeSchema.parse>[0];
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
type UpdateAdminOfficialArticleInput =
  Parameters<typeof adminOfficialArticleUpdateInputSchema.parse>[0];
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
type UpdateRankingStatusInput = Parameters<typeof updateRankingStatusInputSchema.parse>[0];
type CreateAircraftSubmissionInput = Parameters<typeof createAircraftSubmissionInputSchema.parse>[0];
type UpdateAircraftSubmissionStatusInput =
  Parameters<typeof updateAircraftSubmissionStatusInputSchema.parse>[0];
type UpdateCurrentUserProfileInput =
  Parameters<typeof updateCurrentUserProfileInputSchema.parse>[0];
type PhoneChangeRequestInput = Parameters<typeof phoneChangeRequestInputSchema.parse>[0];
type PhoneChangeConfirmInput = Parameters<typeof phoneChangeConfirmInputSchema.parse>[0];
type UpdateSiteSettingsInput = Parameters<typeof updateSiteSettingsInputSchema.parse>[0];
type InitUploadInput = Parameters<typeof initUploadInputSchema.parse>[0];

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function mapApiErrorMessage(response: Response, payload: unknown): string {
  const authError = authErrorResponseSchema.safeParse(payload);

  if (authError.success) {
    switch (authError.data.code) {
      case "UNAUTHORIZED":
      case "SESSION_EXPIRED":
        return "请先登录后再试。";
      case "FORBIDDEN":
        return "当前没有权限执行此操作。";
      case "INVALID_CAPTCHA":
        return "图形验证码错误，请重试。";
      case "INVALID_SMS_CODE":
        return "短信验证码错误，请重试。";
      case "INVALID_CREDENTIALS":
        return "账号或密码错误，请重试。";
      case "DISPLAY_NAME_TAKEN":
        return "用户名已被占用，请更换后重试。";
      case "PHONE_ALREADY_REGISTERED":
        return "该手机号已注册，请直接登录。";
      case "INVALID_REGISTRATION_TOKEN":
      case "INVALID_REFRESH_TOKEN":
        return "登录状态已失效，请重新开始。";
      case "REGISTRATION_REQUIRED":
        return "请先完成注册。";
      case "SMS_PROVIDER_UNAVAILABLE":
        return "短信服务暂时不可用，请稍后重试。";
      default:
        return "操作失败，请稍后重试。";
    }
  }

  const genericError = errorResponseSchema.safeParse(payload);

  if (genericError.success) {
    switch (genericError.data.code) {
      case "UNAUTHORIZED":
        return "请先登录后再试。";
      case "FORBIDDEN":
        return "当前没有权限执行此操作。";
      case "NOT_FOUND":
        return "内容不存在或已被删除。";
      case "BAD_REQUEST":
        return "提交的信息有误，请检查后重试。";
      case "INTERNAL_ERROR":
        return "服务暂时不可用，请稍后重试。";
      default:
        return response.status >= 500 ? "服务暂时不可用，请稍后重试。" : "操作失败，请稍后重试。";
    }
  }

  if (response.status === 401) {
    return "请先登录后再试。";
  }
  if (response.status === 403) {
    return "当前没有权限执行此操作。";
  }
  if (response.status === 404) {
    return "内容不存在或已被删除。";
  }
  if (response.status >= 500) {
    return "服务暂时不可用，请稍后重试。";
  }

  return "操作失败，请稍后重试。";
}

export async function parseApiError(response: Response): Promise<Error> {
  const payload = await response.json().catch(() => null);
  return new Error(mapApiErrorMessage(response, payload));
}

async function readJson<T>(response: Response, parser: { parse: (input: unknown) => T }): Promise<T> {
  if (!response.ok) {
    throw await parseApiError(response);
  }

  return parser.parse(await response.json());
}

function buildQueryString(input: ModelsQueryInput): string {
  const query = modelListQuerySchema.parse(input ?? {});
  const search = new URLSearchParams();

  if (query.categorySlugs?.length) {
    for (const categorySlug of query.categorySlugs) {
      search.append("categorySlug", categorySlug);
    }
  }

  if (query.brandSlugs?.length) {
    for (const brandSlug of query.brandSlugs) {
      search.append("brandSlug", brandSlug);
    }
  }

  if (query.powerTypes?.length) {
    for (const powerType of query.powerTypes) {
      search.append("powerType", powerType);
    }
  }

  if (query.keyword) {
    search.set("keyword", query.keyword);
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

  async function initUpload(input: InitUploadInput) {
    return postJson(
      API_ROUTES.uploads.init,
      initUploadResponseSchema,
      initUploadInputSchema.parse(input)
    );
  }

  async function completeUpload(fileId: string) {
    return postJson(
      API_ROUTES.uploads.complete,
      completeUploadResponseSchema,
      completeUploadInputSchema.parse({ fileId })
    );
  }

  async function performDirectUpload(
    file: File,
    bizType:
      | "avatar-image"
      | "post-image"
      | "post-video"
      | "aircraft-cover-image"
      | "aircraft-video"
      | "ranking-cover-image"
      | "ranking-item-image"
  ) {
    const initPayload = await initUpload({
      bizType,
      filename: file.name,
      contentType: file.type,
      size: file.size
    });

    if (initPayload.upload.mode !== "presigned-put") {
      throw new Error("Unsupported upload mode.");
    }

    const uploadResponse = await fetch(initPayload.upload.url, {
      method: "PUT",
      headers: initPayload.upload.headers,
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error("File upload failed.");
    }

    return completeUpload(initPayload.fileId);
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
        webLoginResponseSchema,
        webLoginRequestSchema.parse(input)
      );
    },
    async loginApp(input: AppLoginInput) {
      return postJson(
        API_ROUTES.auth.appLogin,
        appLoginResponseSchema,
        appLoginRequestSchema.parse(input)
      );
    },
    async completeWebRegistration(input: CompleteWebRegistrationInput) {
      return postJson(
        API_ROUTES.auth.webRegisterComplete,
        authSuccessResponseSchema,
        completeWebRegistrationRequestSchema.parse(input)
      );
    },
    async suggestRegistrationDisplayName(input: RegistrationDisplayNameSuggestInput) {
      return postJson(
        API_ROUTES.auth.registrationDisplayNameSuggest,
        registrationDisplayNameSuggestResponseSchema,
        registrationDisplayNameSuggestRequestSchema.parse(input)
      );
    },
    async completeAppRegistration(input: CompleteAppRegistrationInput) {
      return postJson(
        API_ROUTES.auth.appRegisterComplete,
        appAuthSessionResponseSchema,
        completeAppRegistrationRequestSchema.parse(input)
      );
    },
    async refreshAppSession(input: AppRefreshInput) {
      return postJson(
        API_ROUTES.auth.appRefresh,
        appAuthSessionResponseSchema,
        appRefreshRequestSchema.parse(input)
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
    async getCurrentAppUser(accessToken: string): Promise<UserSummary | null> {
      const response = await fetch(`${baseUrl}${API_ROUTES.auth.appCurrentUser}`, {
        method: "GET",
        headers: {
          authorization: `Bearer ${accessToken}`
        }
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
    async logoutApp(accessToken: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.auth.appLogout}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      });

      return readJson(response, currentUserResponseSchema);
    },
    async listAdminAuthSessions() {
      const response = await fetch(`${baseUrl}${API_ROUTES.auth.adminSessions}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminRecentSessionsResponseSchema);
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
    async initUpload(input: InitUploadInput) {
      return initUpload(input);
    },
    async completeUpload(fileId: string) {
      return completeUpload(fileId);
    },
    async getFileUrl(fileId: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.files.url(fileId)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, fileUrlResponseSchema);
    },
    async uploadPostImage(file: File) {
      const payload = await performDirectUpload(file, "post-image");
      return uploadPostImageResponseSchema.parse(payload);
    },
    async uploadPostVideo(file: File) {
      const payload = await performDirectUpload(file, "post-video");
      return uploadPostVideoResponseSchema.parse(payload);
    },
    async uploadAvatarImage(file: File) {
      const payload = await performDirectUpload(file, "avatar-image");
      return uploadPostImageResponseSchema.parse(payload);
    },
    async uploadAircraftCoverImage(file: File) {
      const payload = await performDirectUpload(file, "aircraft-cover-image");
      return uploadPostImageResponseSchema.parse(payload);
    },
    async uploadAircraftVideo(file: File) {
      const payload = await performDirectUpload(file, "aircraft-video");
      return uploadPostVideoResponseSchema.parse(payload);
    },
    async uploadRankingCoverImage(file: File) {
      const payload = await performDirectUpload(file, "ranking-cover-image");
      return uploadPostImageResponseSchema.parse(payload);
    },
    async uploadRankingItemImage(file: File) {
      const payload = await performDirectUpload(file, "ranking-item-image");
      return uploadPostImageResponseSchema.parse(payload);
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
    async markNotificationRead(id: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.social.notificationRead(id)}`, {
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
    async getCurrentUserProfile() {
      const response = await fetch(`${baseUrl}${API_ROUTES.users.meProfile}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, currentUserProfileResponseSchema);
    },
    async updateCurrentUserProfile(input: UpdateCurrentUserProfileInput) {
      return putJson(
        API_ROUTES.users.meProfile,
        currentUserProfileResponseSchema,
        updateCurrentUserProfileInputSchema.parse(input)
      );
    },
    async requestPhoneChange(input: PhoneChangeRequestInput) {
      return postJson(
        API_ROUTES.users.mePhoneChangeRequest,
        phoneChangeRequestResponseSchema,
        phoneChangeRequestInputSchema.parse(input)
      );
    },
    async confirmPhoneChange(input: PhoneChangeConfirmInput) {
      return postJson(
        API_ROUTES.users.mePhoneChangeConfirm,
        currentUserProfileResponseSchema,
        phoneChangeConfirmInputSchema.parse(input)
      );
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
    async listAdminRankings() {
      const response = await fetch(`${baseUrl}${API_ROUTES.rankings.adminList}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminRankingsResponseSchema);
    },
    async updateAdminRankingStatus(id: string, input: UpdateRankingStatusInput) {
      return putJson(
        API_ROUTES.rankings.adminStatus(id),
        rankingResponseSchema,
        updateRankingStatusInputSchema.parse(input)
      );
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
    async getAdminOfficialArticle(id: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.posts.adminOfficialDetail(id)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, postDetailResponseSchema);
    },
    async updateAdminOfficialArticle(id: string, input: UpdateAdminOfficialArticleInput) {
      return putJson(
        API_ROUTES.posts.adminOfficialDetail(id),
        postDetailResponseSchema,
        adminOfficialArticleUpdateInputSchema.parse(input)
      );
    },
    async deleteAdminOfficialArticle(id: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.posts.adminOfficialDetail(id)}`, {
        method: "DELETE",
        credentials: "include"
      });

      return readJson(response, actionSuccessResponseSchema);
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
    async getAdminSiteSettings() {
      const response = await fetch(`${baseUrl}${API_ROUTES.admin.siteSettings}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, siteSettingsResponseSchema);
    },
    async updateAdminSiteSettings(input: UpdateSiteSettingsInput) {
      return putJson(
        API_ROUTES.admin.siteSettings,
        siteSettingsResponseSchema,
        updateSiteSettingsInputSchema.parse(input)
      );
    },
    async getAdminAnalyticsOverview() {
      const response = await fetch(`${baseUrl}${API_ROUTES.admin.analyticsOverview}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminAnalyticsOverviewResponseSchema);
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
    async interactModel(slug: string, type: ModelInteractionTypeInput) {
      const parsedType = modelInteractionTypeSchema.parse(type);
      const response = await fetch(`${baseUrl}${API_ROUTES.models.interactions(slug, parsedType)}`, {
        method: "POST",
        credentials: "include"
      });

      return readJson(response, modelInteractionResponseSchema);
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
