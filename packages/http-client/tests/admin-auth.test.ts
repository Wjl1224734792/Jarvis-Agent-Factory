import { afterEach, describe, expect, it, vi } from "vitest";
import { API_ROUTES } from "@feijia/shared";
import { createApiClient } from "../src";

describe("admin auth api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs in admin users with captcha fields", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: "admin_1",
            displayName: "Admin",
            avatarUrl: null,
            role: "admin"
          }
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    );

    const client = createApiClient({ baseUrl: "http://localhost:17382" });
    await client.loginAdmin({
      account: "admin",
      password: "Admin#123",
      captchaChallengeId: "captcha_1",
      captchaCode: "ABCD"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:17382${API_ROUTES.auth.adminLogin}`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          account: "admin",
          password: "Admin#123",
          captchaChallengeId: "captcha_1",
          captchaCode: "ABCD"
        })
      })
    );
  });

  it("requests admin password changes with credentials", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      })
    );

    const client = createApiClient({ baseUrl: "http://localhost:17382" });
    const payload = await client.changeAdminPassword({
      currentPassword: "Admin#123",
      newPassword: "Admin#456"
    });

    expect(payload.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:17382${API_ROUTES.auth.adminChangePassword}`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          currentPassword: "Admin#123",
          newPassword: "Admin#456"
        })
      })
    );
  });

  it("requests web password setup without current credentials", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      })
    );

    const client = createApiClient({ baseUrl: "http://localhost:17382" });
    const payload = await client.changeWebPassword({
      newPassword: "Flight#456",
      smsRequestId: "sms_1",
      smsCode: "123456"
    });

    expect(payload.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:17382${API_ROUTES.auth.webChangePassword}`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          newPassword: "Flight#456",
          smsRequestId: "sms_1",
          smsCode: "123456"
        })
      })
    );
  });

  it("maps password-required phone rebind errors to an actionable message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "PASSWORD_REQUIRED",
          message: "请先设置登录密码"
        }),
        {
          status: 403,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    );

    const client = createApiClient({ baseUrl: "http://localhost:17382" });

    await expect(
      client.requestPhoneChange({
        phone: "13800138000",
        captchaChallengeId: "captcha_1",
        captchaCode: "ABCD"
      })
    ).rejects.toMatchObject({
      code: "PASSWORD_REQUIRED",
      message: "请先设置登录密码"
    });
  });
});
