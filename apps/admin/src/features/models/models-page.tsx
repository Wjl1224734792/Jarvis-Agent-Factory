import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, InputNumber, Modal, Select, Table } from "antd";
import { useMemo, useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";
import { apiClient } from "../../lib/api-client";
import {
  buildModelEditorInitialState,
  modelLifecycleStatusOptions,
  modelPowerOptions,
  type ModelLifecycleStatus,
  type ModelPowerType,
  type UploadedModelMedia
} from "./model-editor-helpers";

type ModelRecord = Awaited<ReturnType<typeof apiClient.listModels>>["items"][number];

type ModelEditFormValues = {
  name: string;
  slug: string;
  categoryId: string;
  brandId: string;
  powerType: ModelPowerType;
  lifecycleStatus: ModelLifecycleStatus;
  summary: string;
  description: string;
  priceMin: number | null;
  priceMax: number | null;
  maxFlightTimeMinutes: number | null;
  maxRangeKilometers: number | null;
  maxSpeedKph: number | null;
  takeoffWeightGrams: number | null;
  isPublished: boolean;
};

function formatPriceRange(priceMin: number | null, priceMax: number | null) {
  if (priceMin === null || priceMax === null) {
    return "未公开";
  }

  if (priceMin === priceMax) {
    return `¥${priceMin.toLocaleString("zh-CN")}`;
  }

  return `¥${priceMin.toLocaleString("zh-CN")} - ¥${priceMax.toLocaleString("zh-CN")}`;
}

export function ModelsPage() {
  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiClient.listCategories()
  });
  const brandsQuery = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => apiClient.listBrands()
  });
  const modelsQuery = useQuery({
    queryKey: ["admin-models"],
    queryFn: () => apiClient.listModels()
  });

  const categoryOptions = useMemo(
    () => (categoriesQuery.data ?? []).map((item) => ({ label: item.name, value: item.id })),
    [categoriesQuery.data]
  );
  const brandOptions = useMemo(
    () =>
      (brandsQuery.data ?? []).map((item) => ({
        label: `${item.name} · ${item.slug}`,
        value: item.id
      })),
    [brandsQuery.data]
  );

  const [editForm] = Form.useForm<ModelEditFormValues>();
  const [editing, setEditing] = useState<ModelRecord | null>(null);
  const [editingMedia, setEditingMedia] = useState<UploadedModelMedia>({
    coverImageFileId: null,
    galleryImageFileIds: [],
    videoFileId: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEditDetail, setIsLoadingEditDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const filteredModels = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const items = modelsQuery.data?.items ?? [];
    if (!keyword) {
      return items;
    }

    return items.filter((item) =>
      [item.name, item.slug, item.brand.name, item.category.name]
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [modelsQuery.data?.items, searchText]);

  async function updateModel(values: ModelEditFormValues) {
    if (!editing) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.updateModel(editing.id, {
        slug: values.slug.trim(),
        name: values.name.trim(),
        categoryId: values.categoryId,
        brandId: values.brandId,
        powerType: values.powerType,
        lifecycleStatus: values.lifecycleStatus,
        summary: values.summary.trim() ? values.summary.trim() : null,
        description: values.description.trim() ? values.description.trim() : null,
        priceMin: values.priceMin ?? null,
        priceMax: values.priceMax ?? null,
        maxFlightTimeMinutes: values.maxFlightTimeMinutes ?? null,
        maxRangeKilometers: values.maxRangeKilometers ?? null,
        maxSpeedKph: values.maxSpeedKph ?? null,
        takeoffWeightGrams: values.takeoffWeightGrams ?? null,
        coverImageFileId: editingMedia.coverImageFileId,
        galleryImageFileIds: editingMedia.galleryImageFileIds,
        videoFileId: editingMedia.videoFileId,
        isPublished: values.isPublished
      });
      setEditing(null);
      setEditingMedia({
        coverImageFileId: null,
        galleryImageFileIds: [],
        videoFileId: null
      });
      await modelsQuery.refetch();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "更新机型失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminPage
      actions={
        <Input.Search
          allowClear
          onChange={(event) => {
            setSearchText(event.target.value);
          }}
          placeholder="搜索机型、品牌、分类或 slug"
          style={{ width: 280 }}
          value={searchText}
        />
      }
      description="管理机型列表与基础资料，创建入口已迁移到运营区。"
      title="机型库"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}

      <AdminPanel
        actions={
          <Button href={ADMIN_ROUTE_PATHS.operationsAircraft} type="primary">
            创建飞行器
          </Button>
        }
        description="机型维护与编辑，运营创建入口与列表维护彻底分离。"
        title="机型列表"
      >
        <Table
          bordered
          columns={[
            {
              key: "name",
              render: (_, record: ModelRecord) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.name}</div>
                  <div className="admin-table-subtitle">{record.slug}</div>
                </div>
              ),
              title: "机型"
            },
            {
              key: "brand",
              render: (_, record: ModelRecord) => record.brand.name,
              title: "品牌",
              width: 160
            },
            {
              key: "category",
              render: (_, record: ModelRecord) => record.category.name,
              title: "分类",
              width: 140
            },
            {
              key: "powerType",
              render: (_, record: ModelRecord) => {
                return modelPowerOptions.find((item) => item.value === record.powerType)?.label ?? record.powerType;
              },
              title: "动力",
              width: 100
            },
            {
              key: "lifecycleStatus",
              render: (_, record: ModelRecord) => {
                return (
                  modelLifecycleStatusOptions.find((item) => item.value === record.lifecycleStatus)?.label ??
                  record.lifecycleStatus
                );
              },
              title: "状态",
              width: 120
            },
            {
              key: "price",
              render: (_, record: ModelRecord) =>
                formatPriceRange(record.priceMin ?? null, record.priceMax ?? null),
              title: "价格",
              width: 180
            },
            {
              key: "action",
              render: (_, record: ModelRecord) => (
                <Button
                  onClick={() => {
                    setError(null);
                    setEditing(record);
                    setIsLoadingEditDetail(true);
                    void apiClient
                      .getAdminModel(record.id)
                      .then((response) => {
                        const initialState = buildModelEditorInitialState(response.item);
                        editForm.setFieldsValue(initialState.values);
                        setEditingMedia(initialState.media);
                      })
                      .catch((reason: unknown) => {
                        setEditing(null);
                        setError(reason instanceof Error ? reason.message : "加载机型详情失败");
                      })
                      .finally(() => {
                        setIsLoadingEditDetail(false);
                      });
                  }}
                  size="small"
                  type="link"
                >
                  编辑
                </Button>
              ),
              title: "操作",
              width: 100
            }
          ]}
          dataSource={filteredModels}
          loading={modelsQuery.isLoading || categoriesQuery.isLoading || brandsQuery.isLoading}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>

      <Modal
        centered
        confirmLoading={isSubmitting || isLoadingEditDetail}
        onCancel={() => {
          setEditing(null);
          setEditingMedia({
            coverImageFileId: null,
            galleryImageFileIds: [],
            videoFileId: null
          });
          setIsLoadingEditDetail(false);
        }}
        onOk={() => {
          void editForm.validateFields().then(updateModel);
        }}
        open={Boolean(editing)}
        title="编辑机型"
      >
        <Form disabled={isLoadingEditDetail} form={editForm} layout="vertical" variant="filled">
          <Form.Item label="机型名称" name="name" rules={[{ required: true, message: "请输入机型名称" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Slug" name="slug" rules={[{ required: true, message: "请输入 slug" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="机型分类" name="categoryId" rules={[{ required: true, message: "请选择机型分类" }]}>
            <Select options={categoryOptions} />
          </Form.Item>
          <Form.Item label="品牌" name="brandId" rules={[{ required: true, message: "请选择品牌" }]}>
            <Select
              filterOption={(input, option) =>
                String(option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={brandOptions}
              showSearch
            />
          </Form.Item>
          <Form.Item label="动力类型" name="powerType">
            <Select options={modelPowerOptions} />
          </Form.Item>
          <Form.Item label="生命周期状态" name="lifecycleStatus">
            <Select options={modelLifecycleStatusOptions} />
          </Form.Item>
          <Form.Item label="摘要" name="summary">
            <Input />
          </Form.Item>
          <Form.Item label="详情描述" name="description">
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
          </Form.Item>
          <Form.Item label="最低价（元）" name="priceMin">
            <InputNumber className="w-full" min={0} precision={0} />
          </Form.Item>
          <Form.Item label="最高价（元）" name="priceMax">
            <InputNumber className="w-full" min={0} precision={0} />
          </Form.Item>
          <Form.Item label="最大续航（分钟）" name="maxFlightTimeMinutes">
            <InputNumber className="w-full" min={0} precision={0} />
          </Form.Item>
          <Form.Item label="最大航程（公里）" name="maxRangeKilometers">
            <InputNumber className="w-full" min={0} precision={0} />
          </Form.Item>
          <Form.Item label="最大速度（km/h）" name="maxSpeedKph">
            <InputNumber className="w-full" min={0} precision={0} />
          </Form.Item>
          <Form.Item label="起飞重量（g）" name="takeoffWeightGrams">
            <InputNumber className="w-full" min={0} precision={0} />
          </Form.Item>
          <Form.Item label="发布状态" name="isPublished">
            <Select
              options={[
                { label: "发布", value: true },
                { label: "草稿", value: false }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </AdminPage>
  );
}
