import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, Select, Space, Table } from "antd";
import { useEffect, useMemo, useState } from "react";
import { APP_ROUTES } from "@feijia/shared";
import { useNavigate, useParams } from "react-router-dom";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

type DraftItem = {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  brandName: string;
  linkedModelSlug: string | null;
};

function emptyDraftItem(): DraftItem {
  return {
    id: crypto.randomUUID(),
    title: "",
    summary: "",
    imageUrl: "",
    brandName: "",
    linkedModelSlug: null
  };
}

export function RankingEditorPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const editId = params.id ?? "";
  const [form] = Form.useForm<{ title: string; description: string; coverImageUrl: string }>();
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [selectedModelSlug, setSelectedModelSlug] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["admin-ranking-detail", editId],
    queryFn: () => apiClient.getRankingDetail(editId),
    enabled: Boolean(editId)
  });
  const modelsQuery = useQuery({
    queryKey: ["admin-ranking-models"],
    queryFn: () => apiClient.listModels()
  });

  useEffect(() => {
    if (!detailQuery.data?.item) {
      return;
    }

    const ranking = detailQuery.data.item;
    form.setFieldsValue({
      title: ranking.title,
      description: ranking.description,
      coverImageUrl: ranking.coverImageUrl ?? ""
    });
    setDraftItems(
      ranking.items.map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary ?? "",
        imageUrl: item.imageUrl ?? "",
        brandName: item.brandName ?? item.linkedModel?.brand.name ?? "",
        linkedModelSlug: item.linkedModel?.slug ?? null
      }))
    );
  }, [detailQuery.data?.item, form]);

  const selectedModelSlugs = useMemo(
    () => new Set(draftItems.map((item) => item.linkedModelSlug).filter(Boolean)),
    [draftItems]
  );
  const modelOptions = useMemo(
    () =>
      (modelsQuery.data?.items ?? [])
        .filter((model) => !selectedModelSlugs.has(model.slug))
        .map((model) => ({
          label: `${model.name} · ${model.brand.name}`,
          value: model.slug
        })),
    [modelsQuery.data?.items, selectedModelSlugs]
  );

  function appendModel(slug: string) {
    const model = modelsQuery.data?.items.find((item) => item.slug === slug);
    if (!model) {
      return;
    }

    setDraftItems((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        title: model.name,
        summary: "",
        imageUrl: "",
        brandName: model.brand.name,
        linkedModelSlug: model.slug
      }
    ]);
    setSelectedModelSlug(null);
  }

  function updateItem(id: string, patch: Partial<DraftItem>) {
    setDraftItems((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  const isFormValid = draftItems.length > 0 && draftItems.every((item) => item.title.trim().length > 0);

  return (
    <AdminPage
      actions={<Button href={APP_ROUTES.adminRankings}>返回榜单列表</Button>}
      description={editId ? "编辑现有官方榜单与条目。" : "创建新的官方榜单。"}
      title={editId ? "编辑官方榜单" : "新建官方榜单"}
    >
      {submitError ? <div className="admin-login__error">{submitError}</div> : null}

      <div className="admin-split">
        <div className="admin-field-stack">
          <AdminPanel title="基本信息">
            <Form form={form} layout="vertical" variant="filled">
              <Form.Item label="榜单标题" name="title" rules={[{ required: true, message: "请输入榜单标题" }]}>
                <Input placeholder="例如：官方续航榜" />
              </Form.Item>
              <Form.Item label="榜单简介" name="description" rules={[{ required: true, message: "请输入榜单简介" }]}>
                <Input placeholder="一句话说明榜单的排序逻辑" />
              </Form.Item>
              <Form.Item label="封面 URL" name="coverImageUrl">
                <Input placeholder="可选" />
              </Form.Item>
            </Form>
          </AdminPanel>

          <AdminPanel
            actions={
              <Space wrap>
                <Select
                  allowClear
                  onChange={(value) => setSelectedModelSlug(value)}
                  options={modelOptions}
                  placeholder="从机型库添加"
                  showSearch
                  style={{ width: 280 }}
                  value={selectedModelSlug}
                />
                <Button
                  disabled={!selectedModelSlug}
                  onClick={() => {
                    if (selectedModelSlug) {
                      appendModel(selectedModelSlug);
                    }
                  }}
                  type="primary"
                >
                  添加机型
                </Button>
                <Button onClick={() => setDraftItems((items) => [...items, emptyDraftItem()])}>自定义条目</Button>
              </Space>
            }
            title="榜单条目"
          >
            <Table
              bordered
              columns={[
                {
                  key: "rank",
                  render: (_, __, index) => index + 1,
                  title: "排序",
                  width: 72
                },
                {
                  key: "title",
                  render: (_, record: DraftItem) => (
                    <Input onChange={(event) => updateItem(record.id, { title: event.target.value })} value={record.title} />
                  ),
                  title: "标题"
                },
                {
                  key: "brandName",
                  render: (_, record: DraftItem) => (
                    <Input onChange={(event) => updateItem(record.id, { brandName: event.target.value })} value={record.brandName} />
                  ),
                  title: "品牌",
                  width: 160
                },
                {
                  key: "summary",
                  render: (_, record: DraftItem) => (
                    <Input onChange={(event) => updateItem(record.id, { summary: event.target.value })} value={record.summary} />
                  ),
                  title: "摘要"
                },
                {
                  key: "action",
                  render: (_, record: DraftItem) => (
                    <Button
                      danger
                      onClick={() => setDraftItems((items) => items.filter((entry) => entry.id !== record.id))}
                      size="small"
                    >
                      删除
                    </Button>
                  ),
                  title: "操作",
                  width: 100
                }
              ]}
              dataSource={draftItems}
              pagination={false}
              rowKey={(record) => record.id}
              size="middle"
            />
          </AdminPanel>
        </div>

        <AdminPanel title="预览与保存">
          <div className="admin-preview-list">
            {draftItems.map((item, index) => (
              <div className="admin-preview-item" key={item.id}>
                <div className="admin-table-title">
                  #{index + 1} {item.title || "未命名条目"}
                </div>
                <div className="admin-table-subtitle">
                  {item.brandName || "待补充品牌"} {item.summary ? `· ${item.summary}` : ""}
                </div>
              </div>
            ))}
            {draftItems.length === 0 ? <div className="admin-empty">请至少添加一个条目。</div> : null}
          </div>

          <div className="admin-form-actions" style={{ marginTop: 16 }}>
            <Button
              disabled={isSubmitting || !isFormValid}
              loading={isSubmitting}
              onClick={() => {
                setSubmitError(null);
                setIsSubmitting(true);
                void form
                  .validateFields()
                  .then((values) => {
                    const payload = {
                      type: "official" as const,
                      title: values.title,
                      description: values.description,
                      coverImageUrl: values.coverImageUrl?.trim() ? values.coverImageUrl.trim() : null,
                      itemAddPolicy: "owner" as const,
                      items: draftItems.map((item) => ({
                        title: item.title.trim(),
                        summary: item.summary.trim() ? item.summary.trim() : null,
                        imageUrl: item.imageUrl.trim() ? item.imageUrl.trim() : null,
                        brandName: item.brandName.trim() ? item.brandName.trim() : null,
                        linkedModelSlug: item.linkedModelSlug
                      }))
                    };

                    return (editId ? apiClient.updateRanking(editId, payload) : apiClient.createRanking(payload)).then(
                      (response) => {
                        navigate(`${APP_ROUTES.adminRankings}/${response.item.id}`, { replace: true });
                      }
                    );
                  })
                  .catch((reason: unknown) => {
                    if (reason instanceof Error) {
                      setSubmitError(reason.message);
                    }
                  })
                  .finally(() => {
                    setIsSubmitting(false);
                  });
              }}
              type="primary"
            >
              保存官方榜单
            </Button>
          </div>
        </AdminPanel>
      </div>
    </AdminPage>
  );
}
