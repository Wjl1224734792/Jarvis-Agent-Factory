import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AiSettings } from "@feijia/schemas";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  message,
  Select,
  Space,
  Switch,
  Typography
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { AdminPage } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

const PROVIDER_OPTIONS = [
  { label: "DashScope（阿里云）", value: "dashscope" },
  { label: "OpenAI 兼容", value: "openai" },
  { label: "自定义", value: "custom" }
];

const DEFAULT_VALUES: AiSettings = {
  provider: "dashscope",
  apiKey: "",
  baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  formatModel: "qwen-plus",
  features: { format: true }
};

const AI_SETTINGS_QUERY_KEY = ["admin", "ai-settings"] as const;

/**
 * 管理后台 AI 设置页面 — 配置 AI 服务参数和功能开关。
 */
export function AiSettingsPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<AiSettings>();
  const [messageApi, contextHolder] = message.useMessage();
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const settingsQuery = useQuery({
    queryKey: AI_SETTINGS_QUERY_KEY,
    queryFn: () => apiClient.getAiSettings()
  });

  const saveMutation = useMutation({
    mutationFn: (input: AiSettings) => apiClient.updateAiSettings(input),
    onSuccess: () => {
      void messageApi.success("AI 配置已保存");
      void queryClient.invalidateQueries({ queryKey: AI_SETTINGS_QUERY_KEY });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "保存失败";
      void messageApi.error(msg);
    }
  });

  const testMutation = useMutation({
    mutationFn: () => apiClient.testAiConnection(),
    onSuccess: (result) => {
      setTestResult(result);
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "测试失败";
      setTestResult({ success: false, message: msg });
    }
  });

  /** 将查询结果回填到表单 */
  useEffect(() => {
    const item = settingsQuery.data?.item;
    if (!item) {
      return;
    }

    form.setFieldsValue({
      provider: item.provider,
      apiKey: "", // 不回填真实 key，用户输入新 key 才覆盖
      baseUrl: item.baseUrl,
      formatModel: item.formatModel,
      features: item.features
    });
  }, [settingsQuery.data, form]);

  const handleSave = useCallback(
    (values: AiSettings) => {
      // 如果 apiKey 为空且已有保存的配置，保留原值
      const currentItem = settingsQuery.data?.item;
      const input: AiSettings = {
        ...values,
        apiKey: values.apiKey || currentItem?.apiKey || ""
      };

      // apiKey 显示的是脱敏值，如果用户没修改则需要从原始配置取
      // 这里约定：空 apiKey = 不更新 apiKey
      if (!values.apiKey && currentItem?.apiKey) {
        // 需要从后端获取原始 key，但脱敏后无法还原
        // 所以保存时如果 apiKey 为空，使用一个标记让后端保留原值
        // 简化处理：提示用户必须输入 API Key
        void messageApi.warning("请输入 API Key 后再保存");
        return;
      }

      saveMutation.mutate(input);
    },
    [saveMutation, settingsQuery.data, messageApi]
  );

  const handleTest = useCallback(() => {
    setTestResult(null);
    testMutation.mutate();
  }, [testMutation]);

  const isLoading = settingsQuery.isLoading;
  const isSaving = saveMutation.isPending;
  const isTesting = testMutation.isPending;

  return (
    <>
      {contextHolder}
      <AdminPage
        title="AI 设置"
        description="配置 AI 服务参数、模型选择和功能开关。保存后即时生效，无需重启服务。"
      >
        <Card loading={isLoading}>
          <Form
            form={form}
            layout="vertical"
            initialValues={DEFAULT_VALUES}
            onFinish={handleSave}
            style={{ maxWidth: 640 }}
          >
            <Form.Item
              label="AI 服务商"
              name="provider"
              rules={[{ required: true, message: "请选择 AI 服务商" }]}
            >
              <Select options={PROVIDER_OPTIONS} />
            </Form.Item>

            <Form.Item
              label="API Key"
              name="apiKey"
              rules={[{ required: true, message: "请输入 API Key" }]}
              extra="保存后显示脱敏值。如需更新，请重新输入完整 Key。"
            >
              <Input.Password placeholder="sk-..." />
            </Form.Item>

            <Form.Item
              label="Base URL"
              name="baseUrl"
              rules={[
                { required: true, message: "请输入 Base URL" },
                { type: "url", message: "请输入有效的 URL" }
              ]}
              extra="OpenAI 兼容格式的 API 端点"
            >
              <Input placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1" />
            </Form.Item>

            <Form.Item
              label="排版模型"
              name="formatModel"
              rules={[{ required: true, message: "请输入排版模型名称" }]}
            >
              <Input placeholder="qwen-plus" />
            </Form.Item>

            <Form.Item
              label="排版功能开关"
              name={["features", "format"]}
              valuePropName="checked"
            >
              <Switch checkedChildren="开" unCheckedChildren="关" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={isSaving}>
                  保存配置
                </Button>
                <Button onClick={handleTest} loading={isTesting}>
                  测试连接
                </Button>
              </Space>
            </Form.Item>
          </Form>

          {testResult ? (
            <Alert
              type={testResult.success ? "success" : "error"}
              message={testResult.success ? "连接成功" : "连接失败"}
              description={testResult.message}
              showIcon
              style={{ marginTop: 16 }}
            />
          ) : null}

          {settingsQuery.data?.item?.apiKey ? (
            <Typography.Paragraph
              type="secondary"
              style={{ marginTop: 16, fontSize: 12 }}
            >
              当前已保存的 API Key: {settingsQuery.data.item.apiKey}
            </Typography.Paragraph>
          ) : null}
        </Card>
      </AdminPage>
    </>
  );
}
