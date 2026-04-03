import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Empty,
  Form,
  Image,
  Input,
  Select,
  Segmented,
  Space,
  Tag
} from "antd";
import { ImagePlusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { APP_ROUTES } from "@feijia/shared";
import { useNavigate, useParams } from "react-router-dom";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import {
  buildRankingPayload,
  createEmptyRankingDraftItem,
  toRankingDraftItems,
  type RankingDraftItem
} from "./rankings-admin-helpers";

type RankingFormValues = {
  title: string;
  description: string;
  coverImageUrl?: string | null;
  itemAddPolicy: "public" | "owner";
};

export function RankingEditorPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const editId = params.id ?? "";
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const itemImageInputRef = useRef<HTMLInputElement | null>(null);
  const [activeImageItemId, setActiveImageItemId] = useState<string | null>(null);
  const [form] = Form.useForm<RankingFormValues>();
  const [draftItems, setDraftItems] = useState<RankingDraftItem[]>([]);
  const [selectedModelSlug, setSelectedModelSlug] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
      coverImageUrl: ranking.coverImageUrl ?? "",
      itemAddPolicy: ranking.itemAddPolicy ?? "owner"
    });
    setDraftItems(toRankingDraftItems(ranking.items));
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
  const watchedTitle = Form.useWatch("title", form);
  const watchedDescription = Form.useWatch("description", form);
  const watchedCoverImageUrl = Form.useWatch("coverImageUrl", form);
  const watchedItemAddPolicy = Form.useWatch("itemAddPolicy", form) ?? "owner";

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
        summary: model.summary ?? "",
        imageUrl: "",
        brandName: model.brand.name,
        linkedModelSlug: model.slug,
        linkedModelName: model.name
      }
    ]);
    setSelectedModelSlug(null);
  }

  function updateItem(id: string, patch: Partial<RankingDraftItem>) {
    setDraftItems((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function uploadImage(file: File | null, target: "cover" | "item") {
    if (!file) {
      return;
    }

    setIsUploading(true);
    setSubmitError(null);
    try {
      const response = await apiClient.uploadImage(file);
      if (target === "cover") {
        form.setFieldValue("coverImageUrl", response.item.url);
      } else if (activeImageItemId) {
        updateItem(activeImageItemId, { imageUrl: response.item.url });
      }
    } catch (reason: unknown) {
      setSubmitError(reason instanceof Error ? reason.message : "图片上传失败");
    } finally {
      setIsUploading(false);
      if (target === "cover" && coverInputRef.current) {
        coverInputRef.current.value = "";
      }
      if (target === "item" && itemImageInputRef.current) {
        itemImageInputRef.current.value = "";
      }
      setActiveImageItemId(null);
    }
  }

  const isFormValid =
    draftItems.length > 0 &&
    draftItems.every((item) => item.title.trim().length > 0) &&
    (watchedTitle?.trim()?.length ?? 0) > 1 &&
    (watchedDescription?.trim()?.length ?? 0) > 0;

  return (
    <AdminPage
      actions={<Button href={APP_ROUTES.adminRankings}>返回榜单列表</Button>}
      description={editId ? "编辑官方榜单、封面、权限与条目。" : "创建新的官方榜单。"}
      title={editId ? "编辑官方榜单" : "新建官方榜单"}
    >
      {submitError ? <div className="admin-login__error">{submitError}</div> : null}

      <div className="admin-ranking-editor">
        <div className="admin-field-stack">
          <AdminPanel title="基本信息">
            <Form
              form={form}
              initialValues={{
                title: "",
                description: "",
                coverImageUrl: "",
                itemAddPolicy: "owner"
              }}
              layout="vertical"
              variant="filled"
            >
              <Form.Item
                label="榜单标题"
                name="title"
                rules={[{ required: true, message: "请输入榜单标题" }]}
              >
                <Input placeholder="例如：2026 官方耐久榜" />
              </Form.Item>
              <Form.Item
                label="榜单简介"
                name="description"
                rules={[{ required: true, message: "请输入榜单简介" }]}
              >
                <Input.TextArea autoSize={{ minRows: 3, maxRows: 5 }} placeholder="说明榜单的排序逻辑、适用场景和评估标准。" />
              </Form.Item>
              <Form.Item label="条目权限" name="itemAddPolicy">
                <Segmented
                  options={[
                    { label: "仅创建者添加", value: "owner" },
                    { label: "开放访客添加", value: "public" }
                  ]}
                />
              </Form.Item>
            </Form>

            <div className="admin-ranking-cover">
              <div className="admin-row-actions">
                <div>
                  <div className="admin-panel__title">榜单封面</div>
                  <div className="admin-panel__description">改为上传图片，不再直接输入 URL。</div>
                </div>
                <Space wrap>
                  <Button
                    icon={<ImagePlusIcon className="size-4" />}
                    loading={isUploading}
                    onClick={() => coverInputRef.current?.click()}
                    type="default"
                  >
                    上传封面
                  </Button>
                  {watchedCoverImageUrl ? (
                    <Button
                      onClick={() => form.setFieldValue("coverImageUrl", "")}
                      size="small"
                      type="link"
                    >
                      清除封面
                    </Button>
                  ) : null}
                </Space>
              </div>

              {watchedCoverImageUrl ? (
                <div className="admin-ranking-cover__preview">
                  <Image alt={watchedTitle || "榜单封面"} preview={false} src={watchedCoverImageUrl} />
                </div>
              ) : (
                <div className="admin-ranking-cover__empty">尚未设置榜单封面</div>
              )}

              <input
                accept="image/*"
                hidden
                onChange={(event) => {
                  void uploadImage(event.target.files?.[0] ?? null, "cover");
                }}
                ref={coverInputRef}
                type="file"
              />
            </div>
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
                <Button
                  icon={<PlusIcon className="size-4" />}
                  onClick={() => setDraftItems((items) => [...items, createEmptyRankingDraftItem()])}
                >
                  自定义条目
                </Button>
              </Space>
            }
            title="榜单条目"
          >
            <div className="admin-ranking-item-grid">
              {draftItems.map((item, index) => (
                <section className="admin-ranking-item-card" key={item.id}>
                  <div className="admin-row-actions">
                    <Space size="small" wrap>
                      <Tag color="cyan">#{index + 1}</Tag>
                      {item.linkedModelName ? <Tag>{item.linkedModelName}</Tag> : <Tag>自定义条目</Tag>}
                    </Space>
                    <Space size="small" wrap>
                      <Button
                        onClick={() => {
                          setActiveImageItemId(item.id);
                          itemImageInputRef.current?.click();
                        }}
                        size="small"
                      >
                        上传条目图
                      </Button>
                      <Button
                        danger
                        icon={<Trash2Icon className="size-4" />}
                        onClick={() =>
                          setDraftItems((items) => items.filter((entry) => entry.id !== item.id))
                        }
                        size="small"
                      >
                        删除
                      </Button>
                    </Space>
                  </div>

                  <div className="admin-ranking-item-card__body">
                    <div className="admin-ranking-item-card__media">
                      {item.imageUrl ? (
                        <Image alt={item.title || "榜单条目"} preview={false} src={item.imageUrl} />
                      ) : (
                        <div className="admin-ranking-item-card__empty">未上传图片</div>
                      )}
                    </div>
                    <div className="admin-ranking-item-card__fields">
                      <Input
                        onChange={(event) => updateItem(item.id, { title: event.target.value })}
                        placeholder="条目标题"
                        value={item.title}
                      />
                      <Input
                        onChange={(event) => updateItem(item.id, { brandName: event.target.value })}
                        placeholder="品牌"
                        value={item.brandName}
                      />
                      <Input.TextArea
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        onChange={(event) => updateItem(item.id, { summary: event.target.value })}
                        placeholder="条目摘要"
                        value={item.summary}
                      />
                    </div>
                  </div>
                </section>
              ))}
            </div>

            {draftItems.length === 0 ? (
              <Empty description="请至少添加一个条目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : null}

            <input
              accept="image/*"
              hidden
              onChange={(event) => {
                void uploadImage(event.target.files?.[0] ?? null, "item");
              }}
              ref={itemImageInputRef}
              type="file"
            />
          </AdminPanel>
        </div>

        <div className="admin-ranking-editor__sidebar">
          <AdminPanel title="预览与保存">
            <div className="admin-ranking-sidebar">
              <div className="admin-ranking-sidebar__cover">
                {watchedCoverImageUrl ? (
                  <Image alt={watchedTitle || "榜单封面"} preview={false} src={watchedCoverImageUrl} />
                ) : (
                  <div className="admin-ranking-cover__empty">未设置封面</div>
                )}
              </div>

              <div className="admin-preview-item">
                <div className="admin-row-actions">
                  <div className="admin-table-title">{watchedTitle || "榜单标题"}</div>
                  <Tag color="blue">{watchedItemAddPolicy === "public" ? "开放访客添加" : "仅创建者添加"}</Tag>
                </div>
                <div className="admin-table-subtitle">{watchedDescription || "榜单简介会显示在这里。"}</div>
              </div>

              <div className="admin-preview-list">
                {draftItems.map((item, index) => (
                  <div className="admin-preview-item admin-preview-item--ranking" key={item.id}>
                    <div className="admin-preview-item__media">
                      {item.imageUrl ? (
                        <Image alt={item.title || "条目图片"} preview={false} src={item.imageUrl} />
                      ) : (
                        <div className="admin-ranking-item-card__empty">无图</div>
                      )}
                    </div>
                    <div className="admin-preview-item__copy">
                      <div className="admin-table-title">
                        #{index + 1} {item.title || "未命名条目"}
                      </div>
                      <div className="admin-table-subtitle">
                        {(item.brandName || "待补充品牌") +
                          (item.summary.trim() ? ` · ${item.summary.trim()}` : "")}
                      </div>
                    </div>
                  </div>
                ))}
                {draftItems.length === 0 ? <div className="admin-empty">暂无条目预览</div> : null}
              </div>

              <div className="admin-form-actions">
                <Button
                  block
                  disabled={isSubmitting || isUploading || !isFormValid}
                  loading={isSubmitting}
                  onClick={() => {
                    setSubmitError(null);
                    setIsSubmitting(true);
                    void form
                      .validateFields()
                      .then((values) => {
                        const payload = buildRankingPayload(values, draftItems);
                        return (editId
                          ? apiClient.updateRanking(editId, payload)
                          : apiClient.createRanking(payload)
                        ).then((response) => {
                          void navigate(`${APP_ROUTES.adminRankings}/${response.item.id}`, { replace: true });
                        });
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
            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminPage>
  );
}
