import { LockOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Form, Input } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { APP_ROUTES } from "@feijia/shared";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { useAdminAuthStore } from "./auth-store";

type PasswordDraft = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function AdminPasswordPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setAnonymous = useAdminAuthStore((state) => state.setAnonymous);
  const setError = useAdminAuthStore((state) => state.setError);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(values: PasswordDraft) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await apiClient.changeAdminPassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      queryClient.clear();
      setAnonymous();
      void navigate(`${APP_ROUTES.adminLogin}?notice=password-updated`, {
        replace: true
      });
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : "修改密码失败";
      setSubmitError(message);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminPage
      description="修改后台密码后，当前登录会话会失效，需要使用新密码重新登录。"
      title="安全设置"
    >
      <AdminPanel
        description="建议使用 8 位以上、包含大小写字母和符号的密码。"
        title="修改管理员密码"
      >
        <Form<PasswordDraft> layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="当前密码"
            name="currentPassword"
            rules={[{ required: true, message: "请输入当前密码" }]}
          >
            <Input.Password placeholder="请输入当前密码" prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 8, message: "新密码至少 8 位" }
            ]}
          >
            <Input.Password placeholder="请输入新密码" prefix={<SafetyCertificateOutlined />} />
          </Form.Item>

          <Form.Item
            dependencies={["newPassword"]}
            label="确认新密码"
            name="confirmPassword"
            rules={[
              { required: true, message: "请再次输入新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error("两次输入的新密码不一致"));
                }
              })
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" prefix={<SafetyCertificateOutlined />} />
          </Form.Item>

          {submitError ? (
            <Alert
              message="修改失败"
              showIcon
              style={{ marginBottom: 16 }}
              type="error"
              description={submitError}
            />
          ) : null}

          <Button htmlType="submit" loading={isSubmitting} type="primary">
            保存并重新登录
          </Button>
        </Form>
      </AdminPanel>
    </AdminPage>
  );
}
