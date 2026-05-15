import { APP_ROUTES, resolveSafeRedirectPath } from "@feijia/shared";
import { LockOutlined, ReloadOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Flex, Form, Input, Space } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { useAdminAuthStore } from "./auth-store";

type AdminLoginResult = Awaited<ReturnType<typeof apiClient.loginAdmin>>;
type CaptchaChallenge = Awaited<ReturnType<typeof apiClient.requestCaptchaChallenge>>;

const DEMO_ADMIN_ACCOUNT = "admin";
const DEMO_ADMIN_PASSWORD = "Admin#123";
const shouldPrefillDemoCredentials = import.meta.env.DEV;

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuthenticated = useAdminAuthStore((state) => state.setAuthenticated);
  const [account, setAccount] = useState(() =>
    shouldPrefillDemoCredentials ? DEMO_ADMIN_ACCOUNT : ""
  );
  const [password, setPassword] = useState(() =>
    shouldPrefillDemoCredentials ? DEMO_ADMIN_PASSWORD : ""
  );
  const [captchaChallenge, setCaptchaChallenge] = useState<CaptchaChallenge | null>(null);
  const [captchaCode, setCaptchaCode] = useState("");
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notice = searchParams.get("notice");
  const redirectTo = resolveSafeRedirectPath({
    candidate: searchParams.get("redirect"),
    fallbackPath: APP_ROUTES.adminHome,
    blockedPaths: [APP_ROUTES.adminLogin]
  });

  const refreshLoginCaptcha = useCallback(async (clearCode = true) => {
    setIsCaptchaLoading(true);
    try {
      const challenge = await apiClient.requestCaptchaChallenge();
      setCaptchaChallenge(challenge);
      if (clearCode) {
        setCaptchaCode("");
      }
    } catch (reason: unknown) {
      const msg = reason instanceof TypeError && reason.message === "Failed to fetch"
        ? "网络请求失败，请检查网络连接或服务器状态"
        : reason instanceof Error ? reason.message : "图形验证码加载失败";
      setError(msg);
    } finally {
      setIsCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    void apiClient
      .getCurrentAdmin()
      .then((user) => {
        if (!isActive || !user) {
          return;
        }

        setAuthenticated(user);
        void navigate(redirectTo, { replace: true });
      })
      .catch(() => {
        // 登录页自举失败时保留表单，由用户重新输入账号密码。
      });

    return () => {
      isActive = false;
    };
  }, [navigate, redirectTo, setAuthenticated]);

  useEffect(() => {
    void refreshLoginCaptcha();
  }, [refreshLoginCaptcha]);

  return (
    <main className="admin-login">
      <div className="admin-login__grid">
        <section className="admin-login__hero">
          <Space orientation="vertical" size="large">
            <Button icon={<SafetyCertificateOutlined />} type="primary">
              管理员身份校验
            </Button>
            <div className="admin-login__hero-title">运营管理中心</div>
            <div className="admin-login__hero-copy">
              集中处理内容审核、评论治理、机型目录、榜单与官方文章。当前登录入口使用独立管理员会话，不复用前台手机号验证码流程。
            </div>
          </Space>
        </section>

        <section className="admin-login__form">
          <Form
            layout="vertical"
            onFinish={() => {
              if (!captchaChallenge) {
                setError("请先获取图形验证码");
                return;
              }

              setIsSubmitting(true);
              setError(null);

              void apiClient
                .loginAdmin({
                  account,
                  password,
                  captchaChallengeId: captchaChallenge.challengeId,
                  captchaCode: captchaCode.trim().toUpperCase()
                })
                .then((response: AdminLoginResult) => {
                  setAuthenticated(response.user);
                  void navigate(redirectTo, { replace: true });
                })
                .catch((reason: unknown) => {
                  setError(reason instanceof Error ? reason.message : "管理员登录失败");
                  void refreshLoginCaptcha(false);
                })
                .finally(() => {
                  setIsSubmitting(false);
                });
            }}
            variant="filled"
          >
            {notice === "password-updated" ? (
              <Alert
                description="请使用新密码重新登录后台。"
                message="密码已更新"
                showIcon
                style={{ marginBottom: 16 }}
                type="success"
              />
            ) : null}

            <Form.Item label="管理员账号" required>
              <Input
                onChange={(event) => {
                  setAccount(event.target.value);
                }}
                placeholder="请输入管理员账号"
                prefix={<UserOutlined />}
                value={account}
              />
            </Form.Item>

            <Form.Item label="密码" required>
              <Input
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                placeholder="请输入密码"
                prefix={<LockOutlined />}
                type="password"
                value={password}
              />
            </Form.Item>

            <Form.Item label="图形验证码" required>
              <Flex gap={8} align="center">
                <Input
                  autoComplete="off"
                  maxLength={8}
                  onChange={(event) => {
                    setCaptchaCode(event.target.value.toUpperCase());
                  }}
                  placeholder="请输入图中字符"
                  prefix={<SafetyCertificateOutlined />}
                  value={captchaCode}
                />
                <button
                  aria-label="刷新图形验证码"
                  disabled={isCaptchaLoading}
                  onClick={() => {
                    void refreshLoginCaptcha();
                  }}
                  style={{
                    alignItems: 'center',
                    background: '#fff',
                    border: '1px solid rgba(15, 23, 42, 0.14)',
                    borderRadius: 8,
                    cursor: isCaptchaLoading ? 'wait' : 'pointer',
                    display: 'flex',
                    height: 44,
                    justifyContent: 'center',
                    overflow: 'hidden',
                    padding: 0,
                    width: 150
                  }}
                  title="点击刷新"
                  type="button"
                >
                  {captchaChallenge ? (
                    <span
                      dangerouslySetInnerHTML={{ __html: captchaChallenge.imageOrText }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 0,
                        width: '100%',
                        height: '100%'
                      }}
                    />
                  ) : (
                    <ReloadOutlined spin={isCaptchaLoading} />
                  )}
                </button>
              </Flex>
            </Form.Item>

            {error ? <div className="admin-login__error">{error}</div> : null}

            <Flex justify="space-between" gap={12} wrap>
              <div className="admin-muted">
                {shouldPrefillDemoCredentials
                  ? "仅本地开发环境预填演示账号：admin / Admin#123"
                  : "请输入管理员账号与密码"}
              </div>
              <Button
                disabled={!captchaChallenge || captchaCode.trim().length < 4}
                htmlType="submit"
                loading={isSubmitting}
                type="primary"
              >
                登录后台
              </Button>
            </Flex>
          </Form>
        </section>
      </div>
    </main>
  );
}
