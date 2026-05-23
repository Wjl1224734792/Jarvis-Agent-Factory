import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RecommendationSettings } from "@feijia/schemas";
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  InputNumber,
  message,
  Row,
  Slider,
  Space,
  Switch,
  Typography,
} from "antd";
import { useCallback, useEffect } from "react";
import { AdminPage } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

const RECOMMENDATION_QUERY_KEY = ["admin", "recommendation-settings"] as const;

const DEFAULT_VALUES: RecommendationSettings = {
  enabledContentTypes: { article: true, circlePost: true, model: true, ranking: true },
  contentTypeWeights: { article: 1.0, circlePost: 1.1, model: 0.9, ranking: 0.8 },
  params: {
    articleHalfLifeHours: 36,
    momentHalfLifeHours: 18,
    interactionWeight: 0.58,
    preferenceBoostWeight: 5,
    modelViewWeight: 0.5,
    modelSearchWeight: 2.0,
    modelRankingRefWeight: 8.0,
    discoveryHours: 6,
    discoveryBoost: 1.2,
  },
};

export function RecommendationSettingsPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<RecommendationSettings>();
  const [messageApi, contextHolder] = message.useMessage();

  const settingsQuery = useQuery({
    queryKey: RECOMMENDATION_QUERY_KEY,
    queryFn: () => apiClient.getRecommendationSettings(),
  });

  const saveMutation = useMutation({
    mutationFn: (input: RecommendationSettings) =>
      apiClient.updateRecommendationSettings(input),
    onSuccess: () => {
      void messageApi.success("推荐配置已保存，即时生效");
      void queryClient.invalidateQueries({ queryKey: RECOMMENDATION_QUERY_KEY });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "保存失败";
      void messageApi.error(msg);
    },
  });

  useEffect(() => {
    const item = settingsQuery.data?.item;
    if (!item) return;
    form.setFieldsValue(item);
  }, [settingsQuery.data, form]);

  const handleSave = useCallback(
    (values: RecommendationSettings) => {
      saveMutation.mutate(values);
    },
    [saveMutation],
  );

  const isLoading = settingsQuery.isLoading;
  const isSaving = saveMutation.isPending;

  return (
    <>
      {contextHolder}
      <AdminPage
        title="推荐设置"
        description="配置首页聚合推荐的算法参数、内容类型开关和权重。保存后即时生效，无需重启服务。"
      >
        <Card loading={isLoading}>
          <Form
            form={form}
            layout="vertical"
            initialValues={DEFAULT_VALUES}
            onFinish={handleSave}
            style={{ maxWidth: 720 }}
          >
            <Typography.Title level={5}>内容类型开关</Typography.Title>
            <Typography.Paragraph type="secondary">
              控制首页推荐流中显示哪些内容类型。
            </Typography.Paragraph>
            <Row gutter={[24, 8]}>
              <Col span={6}>
                <Form.Item
                  label="文章推荐"
                  name={["enabledContentTypes", "article"]}
                  valuePropName="checked"
                >
                  <Switch checkedChildren="开" unCheckedChildren="关" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="飞友圈推荐"
                  name={["enabledContentTypes", "circlePost"]}
                  valuePropName="checked"
                >
                  <Switch checkedChildren="开" unCheckedChildren="关" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="机型推荐"
                  name={["enabledContentTypes", "model"]}
                  valuePropName="checked"
                >
                  <Switch checkedChildren="开" unCheckedChildren="关" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="榜单推荐"
                  name={["enabledContentTypes", "ranking"]}
                  valuePropName="checked"
                >
                  <Switch checkedChildren="开" unCheckedChildren="关" />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Typography.Title level={5}>内容类型权重</Typography.Title>
            <Typography.Paragraph type="secondary">
              调整各内容类型在聚合推荐中的展示权重，数值越高曝光越多。
            </Typography.Paragraph>
            <Row gutter={[24, 8]}>
              <Col span={6}>
                <Form.Item label="文章权重" name={["contentTypeWeights", "article"]}>
                  <InputNumber min={0} max={5} step={0.1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="飞友圈权重" name={["contentTypeWeights", "circlePost"]}>
                  <InputNumber min={0} max={5} step={0.1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="机型权重" name={["contentTypeWeights", "model"]}>
                  <InputNumber min={0} max={5} step={0.1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="榜单权重" name={["contentTypeWeights", "ranking"]}>
                  <InputNumber min={0} max={5} step={0.1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Typography.Title level={5}>热度算法参数</Typography.Title>
            <Typography.Paragraph type="secondary">
              调整首页推荐流的热度排序算法参数。
            </Typography.Paragraph>

            <Form.Item label="文章半衰期（小时）" name={["params", "articleHalfLifeHours"]}>
              <Slider min={1} max={168} marks={{ 1: "1h", 36: "36h", 72: "3d", 168: "7d" }} />
            </Form.Item>

            <Form.Item label="动态半衰期（小时）" name={["params", "momentHalfLifeHours"]}>
              <Slider min={1} max={168} marks={{ 1: "1h", 18: "18h", 72: "3d", 168: "7d" }} />
            </Form.Item>

            <Form.Item
              label="互动权重"
              name={["params", "interactionWeight"]}
              extra="互动信号（点赞/评论/分享）在热度计算中的占比。值越大，热门内容越容易被推荐。"
            >
              <Slider min={0} max={1} step={0.01} marks={{ 0: "0", 0.3: "0.3", 0.58: "默认", 1: "1" }} />
            </Form.Item>

            <Form.Item
              label="偏好加成权重"
              name={["params", "preferenceBoostWeight"]}
              extra="用户偏好的机型内容在推荐中的加成幅度。"
            >
              <Slider min={0} max={50} marks={{ 0: "0", 5: "默认", 25: "25", 50: "50" }} />
            </Form.Item>

            <Divider />

            <Typography.Title level={5}>机型热度参数</Typography.Title>

            <Form.Item label="机型浏览权重" name={["params", "modelViewWeight"]}>
              <Slider min={0} max={10} step={0.5} marks={{ 0: "0", 0.5: "默认", 5: "5", 10: "10" }} />
            </Form.Item>

            <Form.Item label="机型搜索权重" name={["params", "modelSearchWeight"]}>
              <Slider min={0} max={10} step={0.5} marks={{ 0: "0", 2: "默认", 5: "5", 10: "10" }} />
            </Form.Item>

            <Form.Item label="机型榜单引用权重" name={["params", "modelRankingRefWeight"]}>
              <Slider min={0} max={20} marks={{ 0: "0", 8: "默认", 10: "10", 20: "20" }} />
            </Form.Item>

            <Divider />

            <Typography.Title level={5}>新内容发现</Typography.Title>

            <Form.Item
              label="发现窗口（小时）"
              name={["params", "discoveryHours"]}
              extra="新发布内容在此时间窗口内获得额外曝光加成。"
            >
              <Slider min={0} max={48} marks={{ 0: "关闭", 6: "默认", 24: "24h", 48: "48h" }} />
            </Form.Item>

            <Form.Item
              label="发现加成倍数"
              name={["params", "discoveryBoost"]}
              extra="新内容在发现窗口内的额外曝光倍率。例如 1.2 表示加成 20%。"
            >
              <Slider min={0} max={3} step={0.1} marks={{ 0: "0", 1: "1x", 1.2: "默认", 2: "2x", 3: "3x" }} />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={isSaving}>
                  保存配置
                </Button>
                <Button onClick={() => form.resetFields()}>重置</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </AdminPage>
    </>
  );
}
