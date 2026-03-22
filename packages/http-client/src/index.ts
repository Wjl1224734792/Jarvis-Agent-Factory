import {
  adminLoginRequestSchema,
  authErrorResponseSchema,
  authSuccessResponseSchema,
  captchaChallengeResponseSchema,
  currentUserResponseSchema,
  errorResponseSchema,
  healthResponseSchema,
  healthRoute,
  smsCodeRequestSchema,
  smsCodeResponseSchema,
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
    }
  };
}
