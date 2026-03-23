import { dbPool, resetDatabaseState, runMigrations, seedDatabase } from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authRepo } from "../src/modules/auth/auth.repo";
import { app } from "../src/app";

function extractCookie(setCookie: string | null): string {
  if (!setCookie) {
    throw new Error("missing set-cookie header");
  }

  return setCookie.split(";")[0];
}

async function loginWebUser(phone: string) {
  const captchaResponse = await app.request(API_ROUTES.auth.captchaChallenge, {
    method: "POST"
  });
  const captchaPayload = (await captchaResponse.json()) as {
    challengeId: string;
    imageOrText: string;
  };

  const smsResponse = await app.request(API_ROUTES.auth.smsRequest, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phone,
      captchaChallengeId: captchaPayload.challengeId,
      captchaCode: captchaPayload.imageOrText
    })
  });
  const smsPayload = (await smsResponse.json()) as { mockCode?: string };

  const authResponse = await app.request(API_ROUTES.auth.webLogin, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phone,
      captchaChallengeId: captchaPayload.challengeId,
      captchaCode: captchaPayload.imageOrText,
      smsCode: smsPayload.mockCode
    })
  });

  return extractCookie(authResponse.headers.get("set-cookie"));
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

  return extractCookie(response.headers.get("set-cookie"));
}

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  authRepo.resetEphemeralState();
  await resetDatabaseState();
  await seedDatabase();
});

afterAll(async () => {
  await dbPool.end();
});

describe("posts flows", () => {
  it("requires login to create posts and keeps pending posts out of feed", async () => {
    const unauthenticatedResponse = await app.request(API_ROUTES.posts.create, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "今日飞行记录",
        content: "风不大，适合练习绕桩。"
      })
    });

    expect(unauthenticatedResponse.status).toBe(401);

    const userCookie = await loginWebUser("13800138002");
    const createResponse = await app.request(API_ROUTES.posts.create, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: userCookie
      },
      body: JSON.stringify({
        title: "今日飞行记录",
        content: "风不大，适合练习绕桩。"
      })
    });

    expect(createResponse.status).toBe(200);
    const createPayload = (await createResponse.json()) as {
      item: { id: string; status: string };
    };
    expect(createPayload.item.status).toBe("pending");

    const feedResponse = await app.request(`${API_ROUTES.feed}?tab=latest`, {
      method: "GET"
    });
    expect(feedResponse.status).toBe(200);

    const feedPayload = (await feedResponse.json()) as {
      items: Array<{ id: string }>;
    };
    expect(feedPayload.items.some((item) => item.id === createPayload.item.id)).toBe(false);
  });

  it("lets admin publish pending posts into feed and detail", async () => {
    const userCookie = await loginWebUser("13800138003");
    const createResponse = await app.request(API_ROUTES.posts.create, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: userCookie
      },
      body: JSON.stringify({
        title: "夜航练习",
        content: "今晚光线一般，但返航识别很稳定。"
      })
    });
    const createPayload = (await createResponse.json()) as {
      item: { id: string };
    };

    const adminCookie = await loginAdmin();
    const adminListResponse = await app.request(`${API_ROUTES.posts.adminList}?status=pending`, {
      method: "GET",
      headers: {
        cookie: adminCookie
      }
    });

    expect(adminListResponse.status).toBe(200);
    const adminListPayload = (await adminListResponse.json()) as {
      items: Array<{ id: string; status: string }>;
    };
    expect(adminListPayload.items.some((item) => item.id === createPayload.item.id)).toBe(true);

    const publishResponse = await app.request(API_ROUTES.posts.adminDetail(createPayload.item.id), {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        cookie: adminCookie
      },
      body: JSON.stringify({
        status: "published"
      })
    });

    expect(publishResponse.status).toBe(200);

    const feedResponse = await app.request(`${API_ROUTES.feed}?tab=recommended`, {
      method: "GET"
    });
    const feedPayload = (await feedResponse.json()) as {
      items: Array<{ id: string; status: string }>;
    };
    expect(feedPayload.items.some((item) => item.id === createPayload.item.id)).toBe(true);

    const detailResponse = await app.request(API_ROUTES.posts.detail(createPayload.item.id), {
      method: "GET"
    });
    expect(detailResponse.status).toBe(200);
    const detailPayload = (await detailResponse.json()) as {
      item: { id: string; status: string };
    };
    expect(detailPayload.item.id).toBe(createPayload.item.id);
    expect(detailPayload.item.status).toBe("published");
  });

  it("supports comments, single-level replies and deleting own comments", async () => {
    const authorCookie = await loginWebUser("13800138004");
    const createResponse = await app.request(API_ROUTES.posts.create, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authorCookie
      },
      body: JSON.stringify({
        title: "山地练习记录",
        content: "今天在坡地试了低空绕树，姿态模式更稳。"
      })
    });
    const createPayload = (await createResponse.json()) as {
      item: { id: string };
    };

    const adminCookie = await loginAdmin();
    await app.request(API_ROUTES.posts.adminDetail(createPayload.item.id), {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        cookie: adminCookie
      },
      body: JSON.stringify({
        status: "published"
      })
    });

    const commenterCookie = await loginWebUser("13800138005");
    const commentResponse = await app.request(API_ROUTES.posts.comments(createPayload.item.id), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: commenterCookie
      },
      body: JSON.stringify({
        content: "坡地飞行确实更考验姿态控制。"
      })
    });

    expect(commentResponse.status).toBe(200);
    const commentPayload = (await commentResponse.json()) as {
      item: { id: string; parentCommentId: string | null };
    };
    expect(commentPayload.item.parentCommentId).toBeNull();

    const replyResponse = await app.request(API_ROUTES.posts.comments(createPayload.item.id), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authorCookie
      },
      body: JSON.stringify({
        content: "是的，逆风时更明显。",
        parentCommentId: commentPayload.item.id
      })
    });

    expect(replyResponse.status).toBe(200);
    const replyPayload = (await replyResponse.json()) as {
      item: { id: string; parentCommentId: string };
    };

    const invalidReplyResponse = await app.request(
      API_ROUTES.posts.comments(createPayload.item.id),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: commenterCookie
        },
        body: JSON.stringify({
          content: "继续追问回复。",
          parentCommentId: replyPayload.item.id
        })
      }
    );

    expect(invalidReplyResponse.status).toBe(400);

    const detailBeforeDelete = await app.request(API_ROUTES.posts.detail(createPayload.item.id), {
      method: "GET"
    });
    const detailBeforePayload = (await detailBeforeDelete.json()) as {
      item: {
        commentCount: number;
        comments: Array<{ id: string; replies: Array<{ id: string }> }>;
      };
    };

    expect(detailBeforePayload.item.commentCount).toBe(2);
    expect(detailBeforePayload.item.comments).toHaveLength(1);
    expect(detailBeforePayload.item.comments[0]?.replies).toHaveLength(1);

    const deleteResponse = await app.request(
      API_ROUTES.posts.commentDetail(createPayload.item.id, commentPayload.item.id),
      {
        method: "DELETE",
        headers: {
          cookie: commenterCookie
        }
      }
    );

    expect(deleteResponse.status).toBe(200);

    const detailAfterDelete = await app.request(API_ROUTES.posts.detail(createPayload.item.id), {
      method: "GET"
    });
    const detailAfterPayload = (await detailAfterDelete.json()) as {
      item: { commentCount: number; comments: Array<unknown> };
    };

    expect(detailAfterPayload.item.commentCount).toBe(0);
    expect(detailAfterPayload.item.comments).toHaveLength(0);
  });

  it("supports reporting posts, deleting own posts and admin comment moderation", async () => {
    const authorCookie = await loginWebUser("13800138006");
    const createResponse = await app.request(API_ROUTES.posts.create, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authorCookie
      },
      body: JSON.stringify({
        title: "城市楼宇间测距",
        content: "高楼之间 GPS 漂移更明显，建议提前校准。"
      })
    });
    const createPayload = (await createResponse.json()) as {
      item: { id: string };
    };

    const adminCookie = await loginAdmin();
    await app.request(API_ROUTES.posts.adminDetail(createPayload.item.id), {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        cookie: adminCookie
      },
      body: JSON.stringify({
        status: "published"
      })
    });

    const reporterCookie = await loginWebUser("13800138007");
    const reportResponse = await app.request(API_ROUTES.posts.report(createPayload.item.id), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: reporterCookie
      },
      body: JSON.stringify({
        reason: "疑似广告内容"
      })
    });

    expect(reportResponse.status).toBe(200);

    const commentResponse = await app.request(API_ROUTES.posts.comments(createPayload.item.id), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: reporterCookie
      },
      body: JSON.stringify({
        content: "这类楼宇场景我一般会先做指南针校准。"
      })
    });
    const commentPayload = (await commentResponse.json()) as {
      item: { id: string };
    };

    const adminCommentsResponse = await app.request(
      `${API_ROUTES.posts.adminComments}?status=visible`,
      {
        method: "GET",
        headers: {
          cookie: adminCookie
        }
      }
    );

    expect(adminCommentsResponse.status).toBe(200);
    const adminCommentsPayload = (await adminCommentsResponse.json()) as {
      items: Array<{ id: string }>;
    };
    expect(adminCommentsPayload.items.some((item) => item.id === commentPayload.item.id)).toBe(
      true
    );

    const hideCommentResponse = await app.request(
      API_ROUTES.posts.adminCommentDetail(commentPayload.item.id),
      {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie
        },
        body: JSON.stringify({
          status: "hidden"
        })
      }
    );

    expect(hideCommentResponse.status).toBe(200);

    const detailAfterHide = await app.request(API_ROUTES.posts.detail(createPayload.item.id), {
      method: "GET"
    });
    const detailAfterHidePayload = (await detailAfterHide.json()) as {
      item: { reportCount: number; commentCount: number; comments: Array<unknown> };
    };

    expect(detailAfterHidePayload.item.reportCount).toBe(1);
    expect(detailAfterHidePayload.item.commentCount).toBe(0);
    expect(detailAfterHidePayload.item.comments).toHaveLength(0);

    const feedAfterHide = await app.request(`${API_ROUTES.feed}?tab=recommended`, {
      method: "GET"
    });
    const feedAfterHidePayload = (await feedAfterHide.json()) as {
      items: Array<{ id: string; commentCount: number }>;
    };
    const hiddenPost = feedAfterHidePayload.items.find((item) => item.id === createPayload.item.id);
    expect(hiddenPost?.commentCount).toBe(0);

    const deletePostResponse = await app.request(API_ROUTES.posts.detail(createPayload.item.id), {
      method: "DELETE",
      headers: {
        cookie: authorCookie
      }
    });

    expect(deletePostResponse.status).toBe(200);

    const detailAfterDelete = await app.request(API_ROUTES.posts.detail(createPayload.item.id), {
      method: "GET"
    });
    expect(detailAfterDelete.status).toBe(404);
  });
});
