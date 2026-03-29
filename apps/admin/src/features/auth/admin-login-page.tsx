import { APP_ROUTES } from "@feijia/shared";
import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Flex, Form, Input, Space } from "antd";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { useAdminAuthStore } from "./auth-store";

type AdminLoginResult = Awaited<ReturnType<typeof apiClient.loginAdmin>>;

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuthenticated = useAdminAuthStore((state) => state.setAuthenticated);
  const [account, setAccount] = useState("admin");
  const [password, setPassword] = useState("Admin#123");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectTo = searchParams.get("redirect") || APP_ROUTES.adminHome;

  return (
    <main className="admin-login">
      <div className="admin-login__grid">
        <section className="admin-login__hero">
          <Space direction="vertical" size="large">
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
              setIsSubmitting(true);
              setError(null);

              void apiClient
                .loginAdmin({
                  account,
                  password
                })
                .then((response: AdminLoginResult) => {
                  setAuthenticated(response.user);
                  navigate(redirectTo, { replace: true });
                })
                .catch((reason: unknown) => {
                  setError(reason instanceof Error ? reason.message : "管理员登录失败");
                })
                .finally(() => {
                  setIsSubmitting(false);
                });
            }}
            variant="filled"
          >
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

            {error ? <div className="admin-login__error">{error}</div> : null}

            <Flex justify="space-between" gap={12} wrap>
              <div className="admin-muted">默认演示账号：admin / Admin#123</div>
              <Button htmlType="submit" loading={isSubmitting} type="primary">
                登录后台
              </Button>
            </Flex>
          </Form>
        </section>
      </div>
    </main>
  );
}
