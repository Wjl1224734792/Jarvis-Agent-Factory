import {
  actionSuccessResponseSchema,
  adminAuditManualDecisionInputSchema,
  adminAuditRecordResponseSchema,
  adminAuditRecordListQuerySchema,
  adminAuditRecordListResponseSchema,
  adminRankingsResponseSchema,
  adminRecentSessionsResponseSchema,
  brandApplicationResponseSchema,
  brandApplicationsResponseSchema,
  updateBrandApplicationInputSchema,
  adminBrandInputSchema,
  adminBrandResponseSchema,
  adminCategoryInputSchema,
  adminCategoryResponseSchema,
  adminContentCategoryInputSchema,
  adminContentCategoryResponseSchema,
  adminModelInputSchema,
  adminModelCommentResponseSchema,
  adminModelCommentsResponseSchema,
  adminModelResponseSchema,
  adminReportSummaryResponseSchema,
  adminPostCommentResponseSchema,
  adminPostCommentsResponseSchema,
  adminPostCommentStatusUpdateInputSchema,
  adminPostResponseSchema,
  adminPostsResponseSchema,
  adminReportRecordsResponseSchema,
  adminOfficialArticleUpdateInputSchema,
  adminPostStatusUpdateInputSchema,
  adminRankingCommentResponseSchema,
  adminRankingCommentsResponseSchema,
  adminRatingTargetCommentResponseSchema,
  adminRatingTargetCommentsResponseSchema,
  adminRatingTargetsModerationResponseSchema,
  adminReviewResponseSchema,
  adminReviewCommentResponseSchema,
  adminReviewCommentsResponseSchema,
  adminReviewsResponseSchema,
  adminSearchResponseSchema,
  adminLoginRequestSchema,
  adminPasswordChangeRequestSchema,
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
  createBrandApplicationInputSchema,
  createAircraftSubmissionInputSchema,
  createPostCommentInputSchema,
  createPostCommentResponseSchema,
  createPostInputSchema,
  createPostResponseSchema,
  createRankingCommentInputSchema,
  createRankingCommentResponseSchema,
  createRankingInputSchema,
  addRatingTargetInputSchema,
  ratingTargetResponseSchema,
  updateRankingInputSchema,
  createRatingTargetCommentInputSchema,
  createRatingTargetCommentResponseSchema,
  currentUserProfileResponseSchema,
  adminAnalyticsOverviewResponseSchema,
  adminMessageListQuerySchema,
  adminMessageListResponseSchema,
  adminModerationTodosResponseSchema,
  adminLogEntriesQuerySchema,
  adminLogEntriesResponseSchema,
  adminLogFilesQuerySchema,
  adminLogFilesResponseSchema,
  adminLogsOverviewResponseSchema,
  currentUserResponseSchema,
  errorResponseSchema,
  feedTabSchema,
  healthResponseSchema,
  healthRoute,
  homeFeedResponseSchema,
  initUploadInputSchema,
  uploadInitErrorResponseSchema,
  initUploadResponseSchema,
  modelInteractionResponseSchema,
  modelInteractionTypeSchema,
  modelDetailResponseSchema,
  modelListQuerySchema,
  modelListResponseSchema,
  createReviewCommentInputSchema,
  createReviewCommentResponseSchema,
  createModelCommentInputSchema,
  createModelCommentResponseSchema,
  modelReviewsResponseSchema,
  modelCommentsResponseSchema,
  notificationsResponseSchema,
  phoneChangeConfirmInputSchema,
  phoneChangeRequestInputSchema,
  phoneChangeRequestResponseSchema,
  postDetailResponseSchema,
  postInteractionTypeSchema,
  ratingTargetDetailResponseSchema,
  rankingResponseSchema,
  rankingsResponseSchema,
  registrationDisplayNameSuggestRequestSchema,
  registrationDisplayNameSuggestResponseSchema,
  reviewCommentsResponseSchema,
  updateBrandApplicationStatusInputSchema,
  reportPostInputSchema,
  smsCodeRequestSchema,
  smsCodeResponseSchema,
  submitModelReviewInputSchema,
  submitModelReviewResponseSchema,
  submitRatingTargetRatingInputSchema,
  submitRatingTargetRatingResponseSchema,
  submitRatingTargetReviewInputSchema,
  submitRatingTargetReviewResponseSchema,
  updateRankingCommentStatusInputSchema,
  updateRatingTargetCommentInputSchema,
  updateRatingTargetCommentStatusInputSchema,
  updateRatingTargetStatusInputSchema,
  updatePostCommentInputSchema,
  updatePostInputSchema,
  updateRankingStatusInputSchema,
  userContentResponseSchema,
  userProfileResponseSchema,
  updateAircraftSubmissionStatusInputSchema,
  updateCurrentUserProfileInputSchema,
  updateReviewCommentInputSchema,
  updateModelCommentInputSchema,
  updateModelCommentStatusInputSchema,
  updateReviewCommentStatusInputSchema,
  updateSiteSettingsInputSchema,
  updateReviewStatusInputSchema,
  fileUrlResponseSchema,
  uploadPostImageResponseSchema,
  uploadPostVideoResponseSchema,
  webLoginRequestSchema,
  webLoginResponseSchema,
  siteSettingsResponseSchema,
  siteSearchResponseSchema,
  searchQuerySchema,
  type HealthResponse,
  type UserSummary
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";

type ApiClientOptions = {
  baseUrl: string;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type WebLoginInput = Parameters<typeof webLoginRequestSchema.parse>[0];
type AppLoginInput = Parameters<typeof appLoginRequestSchema.parse>[0];
type CompleteWebRegistrationInput = Parameters<typeof completeWebRegistrationRequestSchema.parse>[0];
type CompleteAppRegistrationInput = Parameters<typeof completeAppRegistrationRequestSchema.parse>[0];
type RegistrationDisplayNameSuggestInput =
  Parameters<typeof registrationDisplayNameSuggestRequestSchema.parse>[0];
type AppRefreshInput = Parameters<typeof appRefreshRequestSchema.parse>[0];
type SmsCodeInput = Parameters<typeof smsCodeRequestSchema.parse>[0];
type AdminLoginInput = Parameters<typeof adminLoginRequestSchema.parse>[0];
type AdminPasswordChangeInput =
  Parameters<typeof adminPasswordChangeRequestSchema.parse>[0];
type ModelsQueryInput = Parameters<typeof modelListQuerySchema.parse>[0];
type ModelInteractionTypeInput = Parameters<typeof modelInteractionTypeSchema.parse>[0];
type AdminCategoryInput = Parameters<typeof adminCategoryInputSchema.parse>[0];
type AdminBrandInput = Parameters<typeof adminBrandInputSchema.parse>[0];
type AdminModelInput = Parameters<typeof adminModelInputSchema.parse>[0];
type AdminContentCategoryInput = Parameters<typeof adminContentCategoryInputSchema.parse>[0];
type CreateBrandApplicationInput = Parameters<typeof createBrandApplicationInputSchema.parse>[0];
type UpdateBrandApplicationInput = Parameters<typeof updateBrandApplicationInputSchema.parse>[0];
type FeedTabInput = "recommended" | "latest" | "following";
type FeedPaginationInput = {
  page?: number;
  limit?: number;
};
type FeedCursorPaginationInput = {
  cursor?: string;
  limit?: number;
};
type CircleFeedInput = FeedCursorPaginationInput;
type CreatePostInput = Parameters<typeof createPostInputSchema.parse>[0];
type UpdatePostInput = Parameters<typeof updatePostInputSchema.parse>[0];
type CreatePostCommentInput = Parameters<typeof createPostCommentInputSchema.parse>[0];
type UpdatePostCommentInput = Parameters<typeof updatePostCommentInputSchema.parse>[0];
type PostInteractionTypeInput = Parameters<typeof postInteractionTypeSchema.parse>[0];
type ReportPostInput = Parameters<typeof reportPostInputSchema.parse>[0];
type UpdateAdminPostStatusInput = Parameters<typeof adminPostStatusUpdateInputSchema.parse>[0];
type UpdateAdminOfficialArticleInput =
  Parameters<typeof adminOfficialArticleUpdateInputSchema.parse>[0];
type UpdateAdminPostCommentStatusInput =
  Parameters<typeof adminPostCommentStatusUpdateInputSchema.parse>[0];
type SubmitReviewInput = Parameters<typeof submitModelReviewInputSchema.parse>[0];
type CreateModelCommentInput = Parameters<typeof createModelCommentInputSchema.parse>[0];
type UpdateModelCommentInput = Parameters<typeof updateModelCommentInputSchema.parse>[0];
type CreateReviewCommentInput = Parameters<typeof createReviewCommentInputSchema.parse>[0];
type UpdateReviewCommentInput = Parameters<typeof updateReviewCommentInputSchema.parse>[0];
type UpdateModelCommentStatusInput =
  Parameters<typeof updateModelCommentStatusInputSchema.parse>[0];
type UpdateReviewCommentStatusInput =
  Parameters<typeof updateReviewCommentStatusInputSchema.parse>[0];
type UpdateReviewStatusInput = Parameters<typeof updateReviewStatusInputSchema.parse>[0];
type HomeFeedInput =
  | {
      tab: FeedTabInput;
      categorySlug?: string;
      cursor?: string;
      limit?: number;
    }
  | FeedTabInput;
type CreateRankingInput = Parameters<typeof createRankingInputSchema.parse>[0];
type UpdateRankingInput = Parameters<typeof updateRankingInputSchema.parse>[0];
type AddRatingTargetInput = Parameters<typeof addRatingTargetInputSchema.parse>[0];
type CreateRankingCommentInput = Parameters<typeof createRankingCommentInputSchema.parse>[0];
type CreateRatingTargetCommentInput = Parameters<typeof createRatingTargetCommentInputSchema.parse>[0];
type SubmitRatingTargetRatingInput = Parameters<typeof submitRatingTargetRatingInputSchema.parse>[0];
type SubmitRatingTargetReviewInput = Parameters<typeof submitRatingTargetReviewInputSchema.parse>[0];
type UpdateRankingCommentStatusInput =
  Parameters<typeof updateRankingCommentStatusInputSchema.parse>[0];
type UpdateRatingTargetStatusInput =
  Parameters<typeof updateRatingTargetStatusInputSchema.parse>[0];
type UpdateRatingTargetCommentStatusInput =
  Parameters<typeof updateRatingTargetCommentStatusInputSchema.parse>[0];
type UpdateRankingStatusInput = Parameters<typeof updateRankingStatusInputSchema.parse>[0];
type CreateAircraftSubmissionInput = Parameters<typeof createAircraftSubmissionInputSchema.parse>[0];
type UpdateAircraftSubmissionStatusInput =
  Parameters<typeof updateAircraftSubmissionStatusInputSchema.parse>[0];
type UpdateBrandApplicationStatusInput =
  Parameters<typeof updateBrandApplicationStatusInputSchema.parse>[0];
type UpdateCurrentUserProfileInput =
  Parameters<typeof updateCurrentUserProfileInputSchema.parse>[0];
type PhoneChangeRequestInput = Parameters<typeof phoneChangeRequestInputSchema.parse>[0];
type PhoneChangeConfirmInput = Parameters<typeof phoneChangeConfirmInputSchema.parse>[0];
type UpdateSiteSettingsInput = Parameters<typeof updateSiteSettingsInputSchema.parse>[0];
type InitUploadInput = Parameters<typeof initUploadInputSchema.parse>[0];
type SearchQueryInput = Parameters<typeof searchQuerySchema.parse>[0];
type AdminLogFilesQueryInput = Parameters<typeof adminLogFilesQuerySchema.parse>[0];
type AdminLogEntriesQueryInput = Parameters<typeof adminLogEntriesQuerySchema.parse>[0];
type AdminMessageListQueryInput = Parameters<typeof adminMessageListQuerySchema.parse>[0];
type AdminAuditRecordListQueryInput = Parameters<typeof adminAuditRecordListQuerySchema.parse>[0];
type AdminAuditManualDecisionInput =
  Parameters<typeof adminAuditManualDecisionInputSchema.parse>[0];

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function mapApiErrorMessage(response: Response, payload: unknown): string {
  const uploadInitError = uploadInitErrorResponseSchema.safeParse(payload);
  if (uploadInitError.success) {
    const details = uploadInitError.data.details;
    if (details.reason === "file_too_large" && details.limit) {
      return `当前最大允许 ${details.limit.mb} MB`;
    }
    if (details.reason === "invalid_mime") {
      return details.mediaKind === "image"
        ? "当前文件类型不支持，请上传图片文件"
        : "当前文件类型不支持，请上传视频文件";
    }
    if (details.reason === "invalid_size") {
      return "文件大小无效，请重新选择文件";
    }
  }

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
      case "TOKEN_EXPIRED":
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
  const payload = await response
    .json()
    .then((value): unknown => value)
    .catch((): unknown => null);

  const authError = authErrorResponseSchema.safeParse(payload);
  if (authError.success) {
    return new ApiClientError(
      mapApiErrorMessage(response, payload),
      authError.data.code
    );
  }

  const genericError = errorResponseSchema.safeParse(payload);
  if (genericError.success) {
    return new ApiClientError(
      mapApiErrorMessage(response, payload),
      genericError.data.code
    );
  }

  return new ApiClientError(mapApiErrorMessage(response, payload));
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

  if (query.sort) {
    search.set("sort", query.sort);
  }

  if (typeof query.limit === "number") {
    search.set("limit", String(query.limit));
  }

  const queryString = search.toString();
  return queryString ? `?${queryString}` : "";
}

function buildSearchQueryString(input: SearchQueryInput): string {
  const query = searchQuerySchema.parse(input);
  const search = new URLSearchParams();
  search.set("q", query.q);
  search.set("limit", String(query.limit));
  return `?${search.toString()}`;
}

function buildAdminLogFilesQueryString(input: AdminLogFilesQueryInput): string {
  const query = adminLogFilesQuerySchema.parse(input);
  const search = new URLSearchParams();
  search.set("source", query.source);
  search.set("category", query.category);
  search.set("limit", String(query.limit));
  return `?${search.toString()}`;
}

function buildAdminLogEntriesQueryString(input: AdminLogEntriesQueryInput): string {
  const query = adminLogEntriesQuerySchema.parse(input);
  const search = new URLSearchParams();
  search.set("source", query.source);
  search.set("category", query.category);
  search.set("fileName", query.fileName);
  search.set("limit", String(query.limit));
  if (query.level) {
    search.set("level", query.level);
  }
  if (query.search) {
    search.set("search", query.search);
  }
  return `?${search.toString()}`;
}

function buildAdminMessageListQueryString(input: AdminMessageListQueryInput = {}): string {
  const query = adminMessageListQuerySchema.parse(input);
  const search = new URLSearchParams();
  if (query.domain) {
    search.set("domain", query.domain);
  }
  if (query.type) {
    search.set("type", query.type);
  }
  if (query.readStatus !== "all") {
    search.set("readStatus", query.readStatus);
  }
  search.set("limit", String(query.limit));
  const queryString = search.toString();
  return queryString.length > 0 ? `?${queryString}` : "";
}

function buildAdminAuditRecordListQueryString(input: AdminAuditRecordListQueryInput = {}): string {
  const query = adminAuditRecordListQuerySchema.parse(input);
  const search = new URLSearchParams();
  if (query.domain) {
    search.set("domain", query.domain);
  }
  if (query.entityId) {
    search.set("entityId", query.entityId);
  }
  search.set("limit", String(query.limit));
  return `?${search.toString()}`;
}

// 这里是前后端共享契约的主入口：路径常量、schema 校验和 fetch 细节都在这一层收敛。
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

  function buildFileContentUrl(fileId: string) {
    return `${baseUrl}${API_ROUTES.files.content(fileId)}`;
  }

  function withStableFileContentUrl<TPayload extends { item: { id: string; url: string } }>(
    payload: TPayload
  ): TPayload {
    return {
      ...payload,
      item: {
        ...payload.item,
        url: buildFileContentUrl(payload.item.id)
      }
    };
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
      | "report-image"
  ) {
    // 上传走“初始化签名 -> 直传对象存储 -> 回写完成”的三段式，前端只暴露一个高层 API。
    const initPayload = await initUpload({
      bizType,
      filename: file.name,
      contentType: file.type,
      size: file.size
    });

    if (initPayload.upload.mode === "presigned-put") {
      const uploadResponse = await fetch(initPayload.upload.url, {
        method: "PUT",
        headers: initPayload.upload.headers,
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error("File upload failed.");
      }
    } else if (initPayload.upload.mode === "qiniu-form") {
      const formData = new FormData();
      for (const [key, value] of Object.entries(initPayload.upload.fields)) {
        formData.set(key, value);
      }
      formData.set(initPayload.upload.fileFieldName, file);

      const uploadResponse = await fetch(initPayload.upload.uploadUrl, {
        method: "POST",
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error("File upload failed.");
      }
    } else {
      throw new Error("Unsupported upload mode.");
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
    async refreshWebSession() {
      const response = await fetch(`${baseUrl}${API_ROUTES.auth.webRefresh}`, {
        method: "POST",
        credentials: "include"
      });

      return readJson(response, authSuccessResponseSchema);
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
    async changeAdminPassword(input: AdminPasswordChangeInput) {
      return postJson(
        API_ROUTES.auth.adminChangePassword,
        actionSuccessResponseSchema,
        adminPasswordChangeRequestSchema.parse(input)
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
    async listHomeFeed(input: HomeFeedInput, options?: { signal?: AbortSignal }) {
      const normalized =
        typeof input === "string"
          ? { tab: input, categorySlug: undefined, limit: undefined, cursor: undefined }
          : {
              tab: input.tab,
              categorySlug: input.categorySlug,
              limit: input.limit,
              cursor: input.cursor
            };
      const parsedTab = feedTabSchema.parse(normalized.tab);
      const search = new URLSearchParams({ tab: parsedTab });
      if (normalized.categorySlug) {
        search.set("categorySlug", normalized.categorySlug);
      }
      if (normalized.limit) {
        search.set("limit", String(normalized.limit));
      }
      if (normalized.cursor) {
        search.set("cursor", normalized.cursor);
      }

      const response = await fetch(`${baseUrl}${API_ROUTES.feed}?${search.toString()}`, {
        method: "GET",
        credentials: "include",
        signal: options?.signal
      });

      return readJson(response, homeFeedResponseSchema);
    },
    async listCircleFeed(tab: FeedTabInput, pagination?: CircleFeedInput) {
      const parsedTab = feedTabSchema.parse(tab);
      const search = new URLSearchParams({ tab: parsedTab });
      if (pagination?.limit) {
        search.set("limit", String(pagination.limit));
      }
      if (pagination?.cursor) {
        search.set("cursor", pagination.cursor);
      }
      const response = await fetch(`${baseUrl}${API_ROUTES.circleFeed}?${search.toString()}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, circleFeedResponseSchema);
    },
    async createPost(input: CreatePostInput) {
      return postJson(API_ROUTES.posts.create, createPostResponseSchema, createPostInputSchema.parse(input));
    },
    async updatePost(id: string, input: UpdatePostInput) {
      return putJson(
        API_ROUTES.posts.detail(id),
        postDetailResponseSchema,
        updatePostInputSchema.parse(input)
      );
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
      return withStableFileContentUrl(uploadPostImageResponseSchema.parse(payload));
    },
    async uploadPostVideo(file: File) {
      const payload = await performDirectUpload(file, "post-video");
      return withStableFileContentUrl(uploadPostVideoResponseSchema.parse(payload));
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
    async uploadReportImage(file: File) {
      const payload = await performDirectUpload(file, "report-image");
      return uploadPostImageResponseSchema.parse(payload);
    },
    async getPostDetail(id: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.posts.detail(id)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, postDetailResponseSchema);
    },
    async recordPostView(id: string, input?: { sessionId?: string }) {
      const response = await fetch(`${baseUrl}${API_ROUTES.posts.view(id)}`, {
        method: "POST",
        credentials: "include",
        headers: input?.sessionId
          ? {
              "x-feijia-view-session": input.sessionId
            }
          : undefined
      });

      return readJson(response, actionSuccessResponseSchema);
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
    async updatePostComment(postId: string, commentId: string, input: UpdatePostCommentInput) {
      return putJson(
        API_ROUTES.posts.commentDetail(postId, commentId),
        createPostCommentResponseSchema,
        updatePostCommentInputSchema.parse(input)
      );
    },
    async likePostComment(postId: string, commentId: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.posts.commentLike(postId, commentId)}`, {
        method: "POST",
        credentials: "include"
      });

      return readJson(response, actionSuccessResponseSchema);
    },
    async reportPostComment(postId: string, commentId: string, input: ReportPostInput) {
      return postJson(
        API_ROUTES.posts.commentReport(postId, commentId),
        actionSuccessResponseSchema,
        reportPostInputSchema.parse(input)
      );
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
    async listAdminMessages(input: AdminMessageListQueryInput = {}) {
      const response = await fetch(
        `${baseUrl}${API_ROUTES.admin.messages}${buildAdminMessageListQueryString(input)}`,
        {
          method: "GET",
          credentials: "include"
        }
      );

      return readJson(response, adminMessageListResponseSchema);
    },
    async listAdminModerationTodos() {
      const response = await fetch(`${baseUrl}${API_ROUTES.admin.messageTodos}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminModerationTodosResponseSchema);
    },
    async markAdminMessageRead(id: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.admin.messageRead(id)}`, {
        method: "POST",
        credentials: "include"
      });

      return readJson(response, actionSuccessResponseSchema);
    },
    async markAllAdminMessagesRead() {
      const response = await fetch(`${baseUrl}${API_ROUTES.admin.messagesReadAll}`, {
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
    async updateAircraftSubmission(id: string, input: CreateAircraftSubmissionInput) {
      return putJson(
        API_ROUTES.submissions.detail(id),
        aircraftSubmissionResponseSchema,
        createAircraftSubmissionInputSchema.parse(input)
      );
    },
    async deleteAircraftSubmission(id: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.submissions.detail(id)}`, {
        method: "DELETE",
        credentials: "include"
      });

      return readJson(response, actionSuccessResponseSchema);
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
    async createBrandApplication(input: CreateBrandApplicationInput) {
      return postJson(
        API_ROUTES.brandApplications.create,
        brandApplicationResponseSchema,
        createBrandApplicationInputSchema.parse(input)
      );
    },
    async getBrandApplication(id: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.brandApplications.detail(id)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, brandApplicationResponseSchema);
    },
    async updateBrandApplication(id: string, input: UpdateBrandApplicationInput) {
      return putJson(
        API_ROUTES.brandApplications.update(id),
        brandApplicationResponseSchema,
        updateBrandApplicationInputSchema.parse(input)
      );
    },
    async listAdminBrandApplications() {
      const response = await fetch(`${baseUrl}${API_ROUTES.brandApplications.adminList}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, brandApplicationsResponseSchema);
    },
    async updateBrandApplicationStatus(id: string, input: UpdateBrandApplicationStatusInput) {
      return putJson(
        API_ROUTES.brandApplications.adminDetail(id),
        brandApplicationResponseSchema,
        updateBrandApplicationStatusInputSchema.parse(input)
      );
    },
    async listRankings(input?: FeedPaginationInput) {
      const search = new URLSearchParams();
      if (input?.page) {
        search.set("page", String(input.page));
      }
      if (input?.limit) {
        search.set("limit", String(input.limit));
      }
      const query = search.size > 0 ? `?${search.toString()}` : "";
      const response = await fetch(`${baseUrl}${API_ROUTES.rankings.overview}${query}`, {
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
    async addRatingTarget(id: string, input: AddRatingTargetInput) {
      return postJson(
        API_ROUTES.rankings.items(id),
        ratingTargetResponseSchema,
        addRatingTargetInputSchema.parse(input)
      );
    },
    async updateRatingTarget(id: string, input: AddRatingTargetInput) {
      return putJson(
        API_ROUTES.rankings.itemDetail(id),
        ratingTargetDetailResponseSchema,
        addRatingTargetInputSchema.parse(input)
      );
    },
    async deleteRatingTarget(id: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.rankings.itemDetail(id)}`, {
        method: "DELETE",
        credentials: "include"
      });

      return readJson(response, actionSuccessResponseSchema);
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
    async updateAdminRatingTargetStatus(id: string, input: UpdateRatingTargetStatusInput) {
      return putJson(
        API_ROUTES.rankings.adminItemStatus(id),
        ratingTargetDetailResponseSchema,
        updateRatingTargetStatusInputSchema.parse(input)
      );
    },
    async listAdminRankingComments(status?: "pending" | "visible" | "hidden") {
      const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
      const response = await fetch(`${baseUrl}${API_ROUTES.rankings.adminRankingComments}${suffix}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminRankingCommentsResponseSchema);
    },
    async updateAdminRankingCommentStatus(id: string, input: UpdateRankingCommentStatusInput) {
      return putJson(
        API_ROUTES.rankings.adminRankingCommentDetail(id),
        adminRankingCommentResponseSchema,
        updateRankingCommentStatusInputSchema.parse(input)
      );
    },
    async listAdminRatingTargetComments(status?: "pending" | "visible" | "hidden") {
      const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
      const response = await fetch(`${baseUrl}${API_ROUTES.rankings.adminRatingTargetComments}${suffix}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminRatingTargetCommentsResponseSchema);
    },
    async listAdminRatingTargets(status?: "pending" | "published" | "rejected" | "hidden") {
      const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
      const response = await fetch(`${baseUrl}${API_ROUTES.rankings.adminItems}${suffix}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminRatingTargetsModerationResponseSchema);
    },
    async updateAdminRatingTargetCommentStatus(id: string, input: UpdateRatingTargetCommentStatusInput) {
      return putJson(
        API_ROUTES.rankings.adminRatingTargetCommentDetail(id),
        adminRatingTargetCommentResponseSchema,
        updateRatingTargetCommentStatusInputSchema.parse(input)
      );
    },
    async createRankingComment(id: string, input: CreateRankingCommentInput) {
      return postJson(
        API_ROUTES.rankings.comments(id),
        createRankingCommentResponseSchema,
        createRankingCommentInputSchema.parse(input)
      );
    },
    async reportRanking(id: string, input: ReportPostInput) {
      return postJson(
        API_ROUTES.rankings.report(id),
        actionSuccessResponseSchema,
        reportPostInputSchema.parse(input)
      );
    },
    async getRatingTargetDetail(id: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.rankings.itemDetail(id)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, ratingTargetDetailResponseSchema);
    },
    async submitRatingTargetRating(id: string, input: SubmitRatingTargetRatingInput) {
      return postJson(
        API_ROUTES.rankings.itemRatings(id),
        submitRatingTargetRatingResponseSchema,
        submitRatingTargetRatingInputSchema.parse(input)
      );
    },
    async submitRatingTargetReview(id: string, input: SubmitRatingTargetReviewInput) {
      return postJson(
        API_ROUTES.rankings.itemReview(id),
        submitRatingTargetReviewResponseSchema,
        submitRatingTargetReviewInputSchema.parse(input)
      );
    },
    async createRatingTargetComment(id: string, input: CreateRatingTargetCommentInput) {
      return postJson(
        API_ROUTES.rankings.itemComments(id),
        createRatingTargetCommentResponseSchema,
        createRatingTargetCommentInputSchema.parse(input)
      );
    },
    async updateRatingTargetComment(
      itemId: string,
      commentId: string,
      input: { content: string }
    ) {
      return putJson(
        API_ROUTES.rankings.itemCommentDetail(itemId, commentId),
        createRatingTargetCommentResponseSchema,
        updateRatingTargetCommentInputSchema.parse(input)
      );
    },
    async deleteRatingTargetComment(itemId: string, commentId: string) {
      const response = await fetch(
        `${baseUrl}${API_ROUTES.rankings.itemCommentDetail(itemId, commentId)}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      );

      return readJson(response, actionSuccessResponseSchema);
    },
    async likeRatingTargetComment(itemId: string, commentId: string) {
      const response = await fetch(
        `${baseUrl}${API_ROUTES.rankings.itemCommentLike(itemId, commentId)}`,
        {
          method: "POST",
          credentials: "include"
        }
      );

      return readJson(response, actionSuccessResponseSchema);
    },
    async reportRatingTargetComment(itemId: string, commentId: string, input: ReportPostInput) {
      return postJson(
        API_ROUTES.rankings.itemCommentReport(itemId, commentId),
        actionSuccessResponseSchema,
        reportPostInputSchema.parse(input)
      );
    },
    async reportRatingTarget(id: string, input: ReportPostInput) {
      return postJson(
        API_ROUTES.rankings.itemReport(id),
        actionSuccessResponseSchema,
        reportPostInputSchema.parse(input)
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
    async listAdminAuditRecords(input: AdminAuditRecordListQueryInput = {}) {
      const response = await fetch(
        `${baseUrl}${API_ROUTES.admin.audits}${buildAdminAuditRecordListQueryString(input)}`,
        {
          method: "GET",
          credentials: "include"
        }
      );

      return readJson(response, adminAuditRecordListResponseSchema);
    },
    async updateAdminAuditManualReview(id: string, input: AdminAuditManualDecisionInput) {
      return putJson(
        API_ROUTES.admin.auditManualReview(id),
        adminAuditRecordResponseSchema,
        adminAuditManualDecisionInputSchema.parse(input)
      );
    },
    async getAdminLogsOverview(input?: { source?: string }) {
      const search = new URLSearchParams();
      if (input?.source) {
        search.set("source", input.source);
      }
      const suffix = search.size > 0 ? `?${search.toString()}` : "";
      const response = await fetch(`${baseUrl}${API_ROUTES.admin.logsOverview}${suffix}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminLogsOverviewResponseSchema);
    },
    async listAdminLogFiles(input: AdminLogFilesQueryInput) {
      const response = await fetch(
        `${baseUrl}${API_ROUTES.admin.logsFiles}${buildAdminLogFilesQueryString(input)}`,
        {
          method: "GET",
          credentials: "include"
        }
      );

      return readJson(response, adminLogFilesResponseSchema);
    },
    async getAdminLogEntries(input: AdminLogEntriesQueryInput) {
      const response = await fetch(
        `${baseUrl}${API_ROUTES.admin.logsEntries}${buildAdminLogEntriesQueryString(input)}`,
        {
          method: "GET",
          credentials: "include"
        }
      );

      return readJson(response, adminLogEntriesResponseSchema);
    },
    async searchSite(input: SearchQueryInput) {
      const response = await fetch(`${baseUrl}${API_ROUTES.search.site}${buildSearchQueryString(input)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, siteSearchResponseSchema);
    },
    async searchAdmin(input: SearchQueryInput) {
      const response = await fetch(`${baseUrl}${API_ROUTES.search.admin}${buildSearchQueryString(input)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminSearchResponseSchema);
    },
    async getAdminReportDetails(kind: string, id: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.admin.reportDetail(kind, id)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminReportRecordsResponseSchema);
    },
    async listAdminReportsSummary() {
      const response = await fetch(`${baseUrl}${API_ROUTES.admin.reports}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminReportSummaryResponseSchema);
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
    async recordModelView(slug: string, input?: { sessionId?: string }) {
      const response = await fetch(`${baseUrl}${API_ROUTES.models.view(slug)}`, {
        method: "POST",
        credentials: "include",
        headers: input?.sessionId
          ? {
              "x-feijia-view-session": input.sessionId
            }
          : undefined
      });

      return readJson(response, actionSuccessResponseSchema);
    },
    async listModelComments(slug: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.models.comments(slug)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, modelCommentsResponseSchema);
    },
    async createModelComment(slug: string, input: CreateModelCommentInput) {
      return postJson(
        API_ROUTES.models.comments(slug),
        createModelCommentResponseSchema,
        createModelCommentInputSchema.parse(input)
      );
    },
    async updateModelComment(slug: string, commentId: string, input: UpdateModelCommentInput) {
      return putJson(
        API_ROUTES.models.commentDetail(slug, commentId),
        createModelCommentResponseSchema,
        updateModelCommentInputSchema.parse(input)
      );
    },
    async deleteModelComment(slug: string, commentId: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.models.commentDetail(slug, commentId)}`, {
        method: "DELETE",
        credentials: "include"
      });

      return readJson(response, actionSuccessResponseSchema);
    },
    async likeModelComment(slug: string, commentId: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.models.commentLike(slug, commentId)}`, {
        method: "POST",
        credentials: "include"
      });

      return readJson(response, actionSuccessResponseSchema);
    },
    async reportModelComment(slug: string, commentId: string, input: ReportPostInput) {
      return postJson(
        API_ROUTES.models.commentReport(slug, commentId),
        actionSuccessResponseSchema,
        reportPostInputSchema.parse(input)
      );
    },
    async interactModel(slug: string, type: ModelInteractionTypeInput) {
      const parsedType = modelInteractionTypeSchema.parse(type);
      const response = await fetch(`${baseUrl}${API_ROUTES.models.interactions(slug, parsedType)}`, {
        method: "POST",
        credentials: "include"
      });

      return readJson(response, modelInteractionResponseSchema);
    },
    async listModelReviews(slug: string, input?: FeedPaginationInput) {
      const search = new URLSearchParams();
      if (input?.page) {
        search.set("page", String(input.page));
      }
      if (input?.limit) {
        search.set("limit", String(input.limit));
      }
      const query = search.size > 0 ? `?${search.toString()}` : "";
      const response = await fetch(`${baseUrl}${API_ROUTES.models.reviews(slug)}${query}`, {
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
    async likeModelReview(reviewId: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.models.reviewLike(reviewId)}`, {
        method: "POST",
        credentials: "include"
      });

      return readJson(response, actionSuccessResponseSchema);
    },
    async reportModelReview(reviewId: string, input: ReportPostInput) {
      return postJson(
        API_ROUTES.models.reviewReport(reviewId),
        actionSuccessResponseSchema,
        reportPostInputSchema.parse(input)
      );
    },
    async createReviewComment(reviewId: string, input: CreateReviewCommentInput) {
      return postJson(
        API_ROUTES.models.reviewComments(reviewId),
        createReviewCommentResponseSchema,
        createReviewCommentInputSchema.parse(input)
      );
    },
    async updateReviewComment(
      reviewId: string,
      commentId: string,
      input: UpdateReviewCommentInput
    ) {
      return putJson(
        API_ROUTES.models.reviewCommentDetail(reviewId, commentId),
        createReviewCommentResponseSchema,
        updateReviewCommentInputSchema.parse(input)
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
    async likeReviewComment(reviewId: string, commentId: string) {
      const response = await fetch(
        `${baseUrl}${API_ROUTES.models.reviewCommentLike(reviewId, commentId)}`,
        {
          method: "POST",
          credentials: "include"
        }
      );

      return readJson(response, actionSuccessResponseSchema);
    },
    async reportReviewComment(reviewId: string, commentId: string, input: ReportPostInput) {
      return postJson(
        API_ROUTES.models.reviewCommentReport(reviewId, commentId),
        actionSuccessResponseSchema,
        reportPostInputSchema.parse(input)
      );
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
    async getAdminModel(id: string) {
      const response = await fetch(`${baseUrl}${API_ROUTES.models.adminDetail(id)}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminModelResponseSchema);
    },
    async listAdminReviews() {
      const response = await fetch(`${baseUrl}${API_ROUTES.models.adminReviews}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminReviewsResponseSchema);
    },
    async listAdminModelComments(status?: "pending" | "visible" | "hidden") {
      const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
      const response = await fetch(`${baseUrl}${API_ROUTES.models.adminComments}${suffix}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminModelCommentsResponseSchema);
    },
    async updateAdminModelCommentStatus(id: string, input: UpdateModelCommentStatusInput) {
      return putJson(
        API_ROUTES.models.adminCommentDetail(id),
        adminModelCommentResponseSchema,
        updateModelCommentStatusInputSchema.parse(input)
      );
    },
    async updateReviewStatus(id: string, input: UpdateReviewStatusInput) {
      return putJson(
        API_ROUTES.models.adminReviewDetail(id),
        adminReviewResponseSchema,
        updateReviewStatusInputSchema.parse(input)
      );
    },
    async listAdminReviewComments(status?: "pending" | "visible" | "hidden") {
      const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
      const response = await fetch(`${baseUrl}${API_ROUTES.models.adminReviewComments}${suffix}`, {
        method: "GET",
        credentials: "include"
      });

      return readJson(response, adminReviewCommentsResponseSchema);
    },
    async updateAdminReviewCommentStatus(id: string, input: UpdateReviewCommentStatusInput) {
      return putJson(
        API_ROUTES.models.adminReviewCommentDetail(id),
        adminReviewCommentResponseSchema,
        updateReviewCommentStatusInputSchema.parse(input)
      );
    }
  };
}
