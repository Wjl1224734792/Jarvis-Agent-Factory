import { runMigrations } from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { formatPublicIpLocationLabel } from "../src/lib/ip-location";
import { readCaptchaAnswerForTests, resolveSmsCodeForTests } from "./captcha-test-helpers";
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

async function completeRegistrationIfNeeded(
  response: Response,
  headers?: Record<string, string>
) {
  const payload = (await response.json()) as
    | { kind: "authenticated" }
    | { kind: "registration_required"; registrationToken: string; suggestedDisplayName: string };

  if (payload.kind === "authenticated") {
    return extractCookies(response);
  }

  const completeResponse = await app.request(API_ROUTES.auth.webRegisterComplete, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(headers ?? {})
    },
    body: JSON.stringify({
      registrationToken: payload.registrationToken,
      displayName: payload.suggestedDisplayName,
      avatarFileId: null
    })
  });

  return extractCookies(completeResponse);
}

async function loginWebUser(
  phone: string,
  headers?: Record<string, string>
) {
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
    headers: {
      "content-type": "application/json",
      ...(headers ?? {})
    },
    body: JSON.stringify({
      phone,
      captchaChallengeId: captchaPayload.challengeId,
      captchaCode: captchaAnswer
    })
  });
  expect(smsResponse.status).toBe(200);
  const smsPayload = (await smsResponse.json()) as { mockCode?: string };
  const smsCode = await resolveSmsCodeForTests(phone, smsPayload);

  const loginResponse = await app.request(API_ROUTES.auth.webLogin, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(headers ?? {})
    },
    body: JSON.stringify({
      phone,
      smsCode
    })
  });

  return completeRegistrationIfNeeded(loginResponse, headers);
}

async function loginAdmin() {
  const response = await app.request(API_ROUTES.auth.adminLogin, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      account: "admin",
      password: "Admin#123"
    })
  });

  return extractCookies(response);
}

async function createPost(
  cookie: string,
  input: {
    type?: "article" | "moment";
    title: string;
    content: string;
  }
) {
  const response = await app.request(API_ROUTES.posts.create, {
    method: "POST",
    headers: {
      cookie,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      type: input.type ?? "moment",
      title: input.title,
      content: input.content,
      imageIds: [],
      videoIds: [],
      contentCategoryId: null
    })
  });

  expect(response.status).toBe(200);
  return (await response.json()) as {
    item: {
      id: string;
      author: { id: string };
    };
  };
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

describe.sequential("ip location visibility", () => {
  it("formats public ip2region labels to province or country", () => {
    expect(formatPublicIpLocationLabel("中国|广东省|深圳市|电信|CN")).toBe("广东省");
    expect(formatPublicIpLocationLabel("Australia|Queensland|Brisbane|0|AU")).toBe("澳大利亚");
    expect(formatPublicIpLocationLabel("0|0|0|0|0")).toBeNull();
  });

  it("exposes ip location on current and public user profiles", async () => {
    const cookie = await loginWebUser("13800138311", {
      "x-forwarded-for": "113.118.113.77"
    });

    const currentProfileResponse = await app.request(API_ROUTES.users.meProfile, {
      method: "GET",
      headers: { cookie }
    });
    expect(currentProfileResponse.status).toBe(200);
    const currentProfilePayload = (await currentProfileResponse.json()) as {
      item: {
        id: string;
        ipLocationLabel: string | null;
      };
    };
    expect(currentProfilePayload.item.ipLocationLabel).toBe("广东省");

    const publicProfileResponse = await app.request(
      API_ROUTES.users.profile(currentProfilePayload.item.id),
      {
        method: "GET"
      }
    );
    expect(publicProfileResponse.status).toBe(200);
    const publicProfilePayload = (await publicProfileResponse.json()) as {
      item: {
        user: {
          id: string;
          ipLocationLabel: string | null;
        };
      };
    };
    expect(publicProfilePayload.item.user.id).toBe(currentProfilePayload.item.id);
    expect(publicProfilePayload.item.user.ipLocationLabel).toBe("广东省");
  });

  it("exposes ip location on published posts and post comments", async () => {
    const authorCookie = await loginWebUser("13800138321", {
      "x-forwarded-for": "113.118.113.77"
    });
    const createdPost = await createPost(authorCookie, {
      type: "moment",
      title: "IP location source post",
      content: "Used to verify author location on post detail."
    });
    const adminCookie = await loginAdmin();
    await publishPost(adminCookie, createdPost.item.id);

    const commenterCookie = await loginWebUser("13800138322", {
      "x-forwarded-for": "1.2.3.4"
    });
    const commentResponse = await app.request(API_ROUTES.posts.comments(createdPost.item.id), {
      method: "POST",
      headers: {
        cookie: commenterCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "Checking comment ip location."
      })
    });
    expect(commentResponse.status).toBe(200);

    const detailResponse = await app.request(API_ROUTES.posts.detail(createdPost.item.id), {
      method: "GET"
    });
    expect(detailResponse.status).toBe(200);
    const detailPayload = (await detailResponse.json()) as {
      item: {
        author: { ipLocationLabel: string | null };
        comments: Array<{ author: { ipLocationLabel: string | null } }>;
      };
    };

    expect(detailPayload.item.author.ipLocationLabel).toBe("广东省");
    expect(detailPayload.item.comments[0]?.author.ipLocationLabel).toBe("澳大利亚");
  });

  it("exposes ip location on model comments and rating target comments", async () => {
    const modelCommenterCookie = await loginWebUser("13800138331", {
      "x-forwarded-for": "113.118.113.77"
    });
    const modelCommentResponse = await app.request(API_ROUTES.models.comments("joby-s4"), {
      method: "POST",
      headers: {
        cookie: modelCommenterCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "Checking model comment ip location."
      })
    });
    expect(modelCommentResponse.status).toBe(200);

    const modelCommentsResponse = await app.request(API_ROUTES.models.comments("joby-s4"), {
      method: "GET",
      headers: { cookie: modelCommenterCookie }
    });
    expect(modelCommentsResponse.status).toBe(200);
    const modelCommentsPayload = (await modelCommentsResponse.json()) as {
      items: Array<{ author: { ipLocationLabel: string | null } }>;
    };
    expect(modelCommentsPayload.items.some((item) => item.author.ipLocationLabel === "广东省")).toBe(true);

    const rankingOwnerCookie = await loginWebUser("13800138332", {
      "x-forwarded-for": "113.118.113.77"
    });
    const rankingCreateResponse = await app.request(API_ROUTES.rankings.create, {
      method: "POST",
      headers: {
        cookie: rankingOwnerCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        type: "community",
        title: "IP location ranking",
        coverImageFileId: null,
        itemAddPolicy: "public",
        items: [
          {
            title: "Seed item",
            summary: "Ranking item summary",
            imageFileId: null,
            brandName: "DJI",
            linkedModelSlug: "mini-4-pro"
          }
        ]
      })
    });
    expect(rankingCreateResponse.status).toBe(200);
    const rankingCreatePayload = (await rankingCreateResponse.json()) as {
      item: {
        id: string;
        author: { ipLocationLabel: string | null };
        items: Array<{ id: string; author?: { ipLocationLabel: string | null } | null }>;
      };
    };
    expect(rankingCreatePayload.item.author.ipLocationLabel).toBe("广东省");
    expect(rankingCreatePayload.item.items[0]?.author?.ipLocationLabel).toBe("广东省");
    const adminCookie = await loginAdmin();
    const rankingId = rankingCreatePayload.item.id;
    const ratingTargetId = expectDefined(rankingCreatePayload.item.items[0]?.id);

    const publishRankingResponse = await app.request(API_ROUTES.rankings.adminStatus(rankingId), {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        status: "published"
      })
    });
    expect(publishRankingResponse.status).toBe(200);

    const publishItemResponse = await app.request(API_ROUTES.rankings.adminItemStatus(ratingTargetId), {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        status: "published"
      })
    });
    expect(publishItemResponse.status).toBe(200);

    const ratingCommenterCookie = await loginWebUser("13800138333", {
      "x-forwarded-for": "1.2.3.4"
    });
    const ratingCommentResponse = await app.request(API_ROUTES.rankings.itemComments(ratingTargetId), {
      method: "POST",
      headers: {
        cookie: ratingCommenterCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: "Checking rating target comment ip location.",
        rating: 5
      })
    });
    expect(ratingCommentResponse.status).toBe(200);

    const ratingTargetDetailResponse = await app.request(API_ROUTES.rankings.itemDetail(ratingTargetId), {
      method: "GET",
      headers: { cookie: ratingCommenterCookie }
    });
    expect(ratingTargetDetailResponse.status).toBe(200);
    const ratingTargetDetailPayload = (await ratingTargetDetailResponse.json()) as {
      item: {
        author: { ipLocationLabel: string | null } | null;
        comments: Array<{ author: { ipLocationLabel: string | null } }>;
      };
    };
    expect(ratingTargetDetailPayload.item.author?.ipLocationLabel).toBe("广东省");
    expect(ratingTargetDetailPayload.item.comments[0]?.author.ipLocationLabel).toBe("澳大利亚");
  });

  it("keeps brand application applicant ip location hidden", async () => {
    const applicantCookie = await loginWebUser("13800138341", {
      "x-forwarded-for": "113.118.113.77"
    });
    const createResponse = await app.request(API_ROUTES.brandApplications.create, {
      method: "POST",
      headers: {
        cookie: applicantCookie,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        slug: "ip-location-brand",
        name: "IP Location Brand",
        logoUrl: null,
        description: "Brand applications should not expose applicant ip location."
      })
    });
    expect(createResponse.status).toBe(200);
    const payload = (await createResponse.json()) as {
      item: {
        applicant: {
          ipLocationLabel: string | null;
        };
      };
    };
    expect(payload.item.applicant.ipLocationLabel).toBeNull();
  });
});
