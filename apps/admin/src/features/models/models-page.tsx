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
    () => (brandsQuery.data ?? []).map((item) => ({ label: item.name, value: item.id })),
    [brandsQuery.data]
  );

  const [createForm] = Form.useForm<ModelFormValues>();
  const [editForm] = Form.useForm<ModelFormValues>();
  const [editing, setEditing] = useState<ModelRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <AdminPage description="维护机型基础资料、品牌归属与动力类型。" title="机型管理">
      {error ? <div className="admin-login__error">{error}</div> : null}

      <div className="admin-split">
        <AdminPanel description="先录入基础信息，参数可以后续补全。" title="新增机型">
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
            <Form.Item label="分类" name="categoryId" rules={[{ required: true, message: "请选择分类" }]}>
              <Select options={categoryOptions} placeholder="选择分类" />
            </Form.Item>
            <Form.Item label="品牌" name="brandId" rules={[{ required: true, message: "请选择品牌" }]}>
              <Select options={brandOptions} placeholder="选择品牌" />
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

        <AdminPanel description="按品牌、分类与动力类型查看当前机型。" title="机型列表">
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
                width: 120
              },
              {
                key: "category",
                render: (_, record: ModelRecord) => record.category.name,
                title: "分类",
                width: 120
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
            dataSource={modelsQuery.data?.items ?? []}
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
          <Form.Item label="分类" name="categoryId" rules={[{ required: true, message: "请选择分类" }]}>
            <Select options={categoryOptions} />
          </Form.Item>
          <Form.Item label="品牌" name="brandId" rules={[{ required: true, message: "请选择品牌" }]}>
            <Select options={brandOptions} />
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
