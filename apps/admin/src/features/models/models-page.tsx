import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, Modal, Select, Table } from "antd";
import { useMemo, useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

type ModelRecord = Awaited<ReturnType<typeof apiClient.listModels>>["items"][number];

const powerOptions = [
  { label: "电动", value: "electric" },
  { label: "燃油", value: "fuel" },
  { label: "混动", value: "hybrid" },
  { label: "其他", value: "other" }
];

type ModelFormValues = {
  name: string;
  slug: string;
  categoryId: string;
  brandId: string;
  powerType: "electric" | "fuel" | "hybrid" | "other";
  summary: string;
  description: string;
};

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
        value: item.id,
        brandName: item.name
      })),
    [brandsQuery.data]
  );

  const [createForm] = Form.useForm<ModelFormValues>();
  const [editForm] = Form.useForm<ModelFormValues>();
  const [editing, setEditing] = useState<ModelRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  async function createModel(values: ModelFormValues) {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.createModel({
        slug: values.slug,
        name: values.name,
        categoryId: values.categoryId,
        brandId: values.brandId,
        powerType: values.powerType,
        summary: values.summary.trim() ? values.summary.trim() : null,
        description: values.description.trim() ? values.description.trim() : null,
        maxFlightTimeMinutes: null,
        maxRangeKilometers: null,
        maxSpeedKph: null,
        takeoffWeightGrams: null,
        isPublished: true
      });
      createForm.resetFields();
      await modelsQuery.refetch();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "创建机型失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateModel(values: ModelFormValues) {
    if (!editing) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.updateModel(editing.id, {
        slug: values.slug,
        name: values.name,
        categoryId: values.categoryId,
        brandId: values.brandId,
        powerType: values.powerType,
        summary: values.summary.trim() ? values.summary.trim() : null,
        description: values.description.trim() ? values.description.trim() : null,
        maxFlightTimeMinutes: null,
        maxRangeKilometers: null,
        maxSpeedKph: null,
        takeoffWeightGrams: null,
        isPublished: true
      });
      setEditing(null);
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
          style={{ width: 260 }}
          value={searchText}
        />
      }
      description="机型发布时只选择已有品牌并支持搜索，品牌和分类在心智上彻底分离。"
      title="机型库"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}

      <div className="admin-split">
        <AdminPanel description="机型建档时单独选择分类和已有品牌，品牌不再跟分类联动。" title="新增机型">
          <Form
            form={createForm}
            layout="vertical"
            onFinish={(values) => {
              void createModel(values);
            }}
            variant="filled"
          >
            <Form.Item label="机型名称" name="name" rules={[{ required: true, message: "请输入机型名称" }]}>
              <Input placeholder="例如：DJI Mini 4 Pro" />
            </Form.Item>
            <Form.Item label="Slug" name="slug" rules={[{ required: true, message: "请输入 slug" }]}>
              <Input placeholder="例如：mini-4-pro" />
            </Form.Item>
            <Form.Item label="机型分类" name="categoryId" rules={[{ required: true, message: "请选择机型分类" }]}>
              <Select options={categoryOptions} placeholder="选择机型分类" />
            </Form.Item>
            <Form.Item label="品牌" name="brandId" rules={[{ required: true, message: "请选择已有品牌" }]}>
              <Select
                filterOption={(input, option) =>
                  String(option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={brandOptions}
                placeholder="搜索并选择已有品牌"
                showSearch
              />
            </Form.Item>
            <Form.Item label="动力类型" name="powerType" rules={[{ required: true, message: "请选择动力类型" }]}>
              <Select options={powerOptions} placeholder="选择动力类型" />
            </Form.Item>
            <Form.Item label="摘要" name="summary">
              <Input placeholder="简短摘要" />
            </Form.Item>
            <Form.Item label="详情描述" name="description">
              <Input placeholder="详情描述" />
            </Form.Item>
            <div className="admin-form-actions">
              <Button htmlType="submit" loading={isSubmitting} type="primary">
                新增机型
              </Button>
            </div>
          </Form>
        </AdminPanel>

        <AdminPanel description="机型列表保留分类字段，但品牌选择入口改成搜索已有品牌。" title="机型列表">
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
                dataIndex: "powerType",
                key: "powerType",
                title: "动力",
                width: 100
              },
              {
                key: "action",
                render: (_, record: ModelRecord) => (
                  <Button
                    onClick={() => {
                      setEditing(record);
                      editForm.setFieldsValue({
                        name: record.name,
                        slug: record.slug,
                        categoryId: record.category.id,
                        brandId: record.brand.id,
                        powerType: record.powerType,
                        summary: record.summary ?? "",
                        description: ""
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
      </div>

      <Modal
        centered
        confirmLoading={isSubmitting}
        onCancel={() => setEditing(null)}
        onOk={() => {
          void editForm.validateFields().then(updateModel);
        }}
        open={Boolean(editing)}
        title="编辑机型"
      >
        <Form form={editForm} layout="vertical" variant="filled">
          <Form.Item label="机型名称" name="name" rules={[{ required: true, message: "请输入机型名称" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Slug" name="slug" rules={[{ required: true, message: "请输入 slug" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="机型分类" name="categoryId" rules={[{ required: true, message: "请选择机型分类" }]}>
            <Select options={categoryOptions} />
          </Form.Item>
          <Form.Item label="品牌" name="brandId" rules={[{ required: true, message: "请选择已有品牌" }]}>
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
            <Select options={powerOptions} />
          </Form.Item>
          <Form.Item label="摘要" name="summary">
            <Input />
          </Form.Item>
          <Form.Item label="详情描述" name="description">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </AdminPage>
  );
}
