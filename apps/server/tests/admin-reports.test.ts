import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { app } from "../src/app";
import { uploadsRepo } from "../src/modules/uploads/upload.repo";
import { readCaptchaAnswerForTests } from "./captcha-test-helpers";
import { resetIntegrationState } from "./test-state";

function extractCookies(response: Response): string {
  const setCookies = response.headers.getSetCookie();
  if (setCookies.length === 0) {
    throw new Error("missing set-cookie headers");
  }
  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

function expectDefined<T>(value: T | null | undefined): T {
  expect(value).toBeTruthy();
  if (value === null || value === undefined) {
    throw new Error("Expected value to be defined");
  }
  return value;
}

async function completeRegistrationIfNeeded(response: Response) {
  const payload = (await response.json()) as
    | { kind: "authenticated" }
    | { kind: "registration_required"; registrationToken: string; suggestedDisplayName: string };

  if (payload.kind === "authenticated") {
    return extractCookies(response);
  }

  const completeResponse = await app.request(API_ROUTES.auth.webRegisterComplete, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      registrationToken: payload.registrationToken,
      displayName: payload.suggestedDisplayName,
      avatarFileId: null
    })
  });

  return extractCookies(completeResponse);
}

async function loginUser(phone: string) {
  const captchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
    method: "POST"
  });
  const captchaPayload = (await captchaResponse.json()) as {
    challengeId: string;
    imageOrText: string;
  };

  const captchaAnswer = await readCaptchaAnswerForTests(captchaPayload.challengeId);

  const smsResponse = await app.request(API_ROUTES.auth.smsRequest, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phone,
      captchaChallengeId: captchaPayload.challengeId,
      captchaCode: captchaAnswer
    })
  });
  const smsPayload = (await smsResponse.json()) as { mockCode?: string };

  const loginResponse = await app.request(API_ROUTES.auth.webLogin, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phone,
      smsCode: smsPayload.mockCode
    })
  });

  return completeRegistrationIfNeeded(loginResponse);
}

async function loginAdmin() {
  const response = await app.request(API_ROUTES.auth.adminLogin, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      account: "admin",
      password: "Admin#123"
    })
  });

  expect(response.status).toBe(200);
  return extractCookies(response);
}

async function readFirstContentCategoryId() {
  const response = await app.request(API_ROUTES.content.categories, {
    method: "GET"
  });
  expect(response.status).toBe(200);
  const payload = (await response.json()) as { items: Array<{ id: string }> };
  return expectDefined(payload.items[0]?.id);
}

async function createArticle(
  cookie: string,
  input: { title: string; content: string; contentCategoryId: string }
) {
  const response = await app.request(API_ROUTES.posts.create, {
    method: "POST",
    headers: {
      cookie,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      type: "article",
      title: input.title,
      content: input.content,
      contentCategoryId: input.contentCategoryId,
      imageIds: [],
      videoIds: []
    })
  });
  expect(response.status).toBe(200);
  return (await response.json()) as { item: { id: string } };
}

async function publishPost(adminCookie: string, postId: string) {
  const response = await app.request(API_ROUTES.posts.adminDetail(postId), {
    method: "PUT",
    headers: {
      cookie: adminCookie,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      status: "published"
    })
  });

  expect(response.status).toBe(200);
}

async function uploadReportImage(cookie: string, name = "report-evidence.png") {
  const meResponse = await app.request(API_ROUTES.auth.currentUser, {
    method: "GET",
    headers: { cookie }
  });
  expect(meResponse.status).toBe(200);
  const mePayload = (await meResponse.json()) as { user: { id: string } | null };
  const ownerId = mePayload.user?.id;
  expect(ownerId).toBeTruthy();

  const pending = await uploadsRepo.createPendingFile({
    ownerId: expectDefined(ownerId),
    bizType: "report-image",
    mediaKind: "image",
    provider: "minio",
    bucket: "feijia-media",
    region: "us-east-1",
    objectKey: `report-image/${ownerId}/${name}`,
    fileName: name,
    mimeType: "image/png",
    byteSize: 256,
    visibility: "public"
  });
  expect(pending?.id).toBeTruthy();

  const uploaded = await uploadsRepo.markFileUploaded({
    fileId: pending.id,
    etag: "report-evidence"
  });

  return uploaded.id;
}

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  await resetIntegrationState("demo");
});

afterAll(async () => {
  // The server suite shares one cached dbPool across files; ending it here
  // breaks later integration files running in the same Vitest process.
});

describe("admin reports route", () => {
  it("returns aggregated reported items for admins", async () => {
    const adminCookie = await loginAdmin();
    const authorCookie = await loginUser("13800138201");
    const reporterCookie = await loginUser("13800138202");
    const contentCategoryId = await readFirstContentCategoryId();

    const article = await createArticle(authorCookie, {
      title: "Reported summary article",
      content: "Reported content body",
      contentCategoryId
    });
    await publishPost(adminCookie, article.item.id);
    const reportImageId = await uploadReportImage(reporterCookie);

    const reportResponse = await app.request(API_ROUTES.posts.report(article.item.id), {
      method: "POST",
      headers: {
        cookie: reporterCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        reason: "Reported summary reason",
        imageIds: [reportImageId]
      })
    });
    expect(reportResponse.status).toBe(200);

    const summaryResponse = await app.request(API_ROUTES.admin.reports, {
      method: "GET",
      headers: { cookie: adminCookie }
    });
    expect(summaryResponse.status).toBe(200);

    const payload = (await summaryResponse.json()) as {
      items: Array<{
        kind: string;
        id: string;
        title: string;
        reportCount: number;
        status: string | null;
      }>;
    };

    expect(
      payload.items.some(
        (item) =>
          item.kind === "post" &&
          item.id === article.item.id &&
          item.title === "Reported summary article" &&
          item.reportCount >= 1 &&
          item.status === "published"
      )
    ).toBe(true);
  });
});
