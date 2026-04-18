import { expect, type APIRequestContext, type Page } from "playwright/test";

const serverBaseUrl = process.env.E2E_SERVER_BASE_URL ?? "http://localhost:17382";
const webBaseUrl = process.env.E2E_BASE_URL ?? "http://localhost:17380";
const adminBaseUrl = process.env.E2E_ADMIN_BASE_URL ?? "http://localhost:17381";

export const seededUserStorageStatePath = "tmp/playwright/storage-states/user.json";
export const seededAdminStorageStatePath = "tmp/playwright/storage-states/admin.json";

type WebLoginResponse =
  | { kind: "authenticated"; user: { id: string; displayName: string } }
  | { kind: "registration_required"; registrationToken: string; suggestedDisplayName: string };

function extractAuthCookies(headers: Array<{ name: string; value: string }>) {
  return headers
    .filter((header) => header.name.toLowerCase() === "set-cookie")
    .map((header) => {
      const [pair] = header.value.split(";");
      const [name, ...valueParts] = pair.split("=");
      return {
        name,
        value: valueParts.join("="),
        url: webBaseUrl,
        httpOnly: header.value.toLowerCase().includes("httponly"),
        sameSite: "Lax" as const
      };
    });
}

async function fetchJson<T>(request: APIRequestContext, path: string) {
  const response = await request.get(`${serverBaseUrl}${path}`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as T;
}

export async function loginAsSeededUser(page: Page) {
  const request = page.context().request;

  /** 与前台登录一致：服务端登录不校验图形码字段，仅占位 */
  const loginResponse = await request.post(`${serverBaseUrl}/auth/web/login`, {
    data: {
      phone: "13800138000",
      smsCode: "888888"
    }
  });
  expect(loginResponse.ok()).toBeTruthy();
  const loginPayload = (await loginResponse.json()) as WebLoginResponse;

  let authHeaders = loginResponse.headersArray();
  if (loginPayload.kind === "registration_required") {
    const completeResponse = await request.post(`${serverBaseUrl}/auth/web/register/complete`, {
      data: {
        registrationToken: loginPayload.registrationToken,
        displayName: `e2e-user-${Date.now().toString().slice(-6)}`,
        avatarFileId: null
      }
    });
    expect(completeResponse.ok()).toBeTruthy();
    authHeaders = completeResponse.headersArray();
  }

  const cookies = extractAuthCookies(authHeaders);
  expect(cookies.length).toBeGreaterThanOrEqual(2);
  await page.context().addCookies(cookies);
}

export async function loginAsSeededAdmin(page: Page) {
  const request = page.context().request;
  const response = await request.post(`${serverBaseUrl}/auth/admin/login`, {
    data: {
      account: "admin",
      password: "Admin#123"
    }
  });
  expect(response.ok()).toBeTruthy();

  const cookies = extractAuthCookies(response.headersArray()).map((cookie) => ({
    ...cookie,
    url: adminBaseUrl
  }));
  expect(cookies.length).toBeGreaterThanOrEqual(2);
  await page.context().addCookies(cookies);
}

export async function readFirstPostPath(page: Page) {
  const payload = await fetchJson<{ items: Array<{ id: string }> }>(page.context().request, "/home/feed");
  expect(payload.items.length).toBeGreaterThan(0);
  return `/posts/${payload.items[0]?.id ?? ""}`;
}

export async function readAnotherUserProfilePath(page: Page) {
  const mePayload = await fetchJson<{ user: { id: string } | null }>(
    page.context().request,
    "/auth/me"
  );
  const payload = await fetchJson<{ items: Array<{ author?: { id: string } }> }>(
    page.context().request,
    "/home/feed"
  );
  const currentUserId = mePayload.user?.id ?? null;
  const authorId =
    payload.items.map((item) => item.author?.id).find((id) => id && id !== currentUserId) ??
    payload.items[0]?.author?.id;

  expect(authorId).toBeTruthy();
  return `/users/${authorId ?? ""}`;
}

export async function readFirstModelPath(page: Page) {
  const payload = await fetchJson<{ items: Array<{ slug: string }> }>(page.context().request, "/models?limit=1");
  expect(payload.items.length).toBeGreaterThan(0);
  return `/models/${payload.items[0]?.slug ?? ""}`;
}

export async function readFirstRankingPath(page: Page) {
  const payload = await fetchJson<{
    official: Array<{ id: string }>;
    community: Array<{ id: string }>;
  }>(page.context().request, "/rankings");
  const rankingId = payload.official[0]?.id ?? payload.community[0]?.id;
  expect(rankingId).toBeTruthy();
  return `/rankings/${rankingId ?? ""}`;
}

export async function readFirstRatingTargetPath(page: Page) {
  const rankingPath = await readFirstRankingPath(page);
  const rankingId = rankingPath.replace("/rankings/", "");
  const payload = await fetchJson<{ item: { items: Array<{ id: string }> } }>(
    page.context().request,
    `/rankings/${rankingId}`
  );
  expect(payload.item.items.length).toBeGreaterThan(0);
  return `/rating-targets/${payload.item.items[0]?.id ?? ""}?ranking=${rankingId}`;
}

export async function expectLegacyImmersiveShell(page: Page) {
  await expect(page.locator("header").getByRole("button", { name: "发布" })).toHaveCount(0);
  await expect(page.getByText("飞友与飞行器社区")).toHaveCount(0);
}
export async function expectImmersiveShell(page: Page) {
  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("header input")).toBeVisible();
}

export async function expectPublishShellTopNav(page: Page) {
  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("header input")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "打开发布菜单" })).toBeVisible();
}
