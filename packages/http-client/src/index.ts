import {
  adminBrandResponseSchema,
  adminBrandInputSchema,
  adminCategoryResponseSchema,
  adminCategoryInputSchema,
  adminModelInputSchema,
  adminModelResponseSchema,
  adminReviewResponseSchema,
  adminReviewsResponseSchema,
  adminLoginRequestSchema,
  authErrorResponseSchema,
  authSuccessResponseSchema,
  captchaChallengeResponseSchema,
  currentUserResponseSchema,
  errorResponseSchema,
  healthResponseSchema,
  healthRoute,
  modelDetailResponseSchema,
  modelListQuerySchema,
  modelListResponseSchema,
  modelReviewsResponseSchema,
  smsCodeRequestSchema,
  smsCodeResponseSchema,
  submitModelReviewInputSchema,
  submitModelReviewResponseSchema,
  updateReviewStatusInputSchema,
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
type SubmitReviewInput = Parameters<typeof submitModelReviewInputSchema.parse>[0];
type UpdateReviewStatusInput = Parameters<typeof updateReviewStatusInputSchema.parse>[0];

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

async function readJson<T>(
  response: Response,
  parser: { parse: (input: unknown) => T }
): Promise<T> {
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
    async listModels(input: ModelsQueryInput = {}) {
      const response = await fetch(
        `${baseUrl}${API_ROUTES.models.list}${buildQueryString(input)}`,
        {
          method: "GET",
          credentials: "include"
        }
      );

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
