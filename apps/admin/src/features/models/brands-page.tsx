import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, Modal, Select, Table } from "antd";
import { useMemo, useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

type BrandRecord = Awaited<ReturnType<typeof apiClient.listBrands>>[number];

export function BrandsPage() {
  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiClient.listCategories()
  });
  const brandsQuery = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => apiClient.listBrands()
  });

  const categoryOptions = useMemo(
    () => [
      { label: "未关联分类", value: null },
      ...((categoriesQuery.data ?? []).map((item) => ({ label: item.name, value: item.id })) as Array<{
        label: string;
        value: string | null;
      }>)
    ],
    [categoriesQuery.data]
  );

  const [createForm] = Form.useForm<{
    slug: string;
    name: string;
    categoryId: string | null;
    sortOrder: number;
    isEnabled: boolean;
  }>();
  const [editForm] = Form.useForm<{
    slug: string;
    name: string;
    categoryId: string | null;
    sortOrder: number;
    isEnabled: boolean;
  }>();
  const [editing, setEditing] = useState<BrandRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(values: {
    slug: string;
    name: string;
    categoryId: string | null;
    sortOrder: number;
    isEnabled: boolean;
  }) {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.createBrand({
        ...values,
        sortOrder: Number(values.sortOrder ?? 0)
      });
      createForm.resetFields();
      await brandsQuery.refetch();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "创建品牌失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(values: {
    slug: string;
    name: string;
    categoryId: string | null;
    sortOrder: number;
    isEnabled: boolean;
  }) {
    if (!editing) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.updateBrand(editing.id, {
        ...values,
        sortOrder: Number(values.sortOrder ?? 0)
      });
      setEditing(null);
      await brandsQuery.refetch();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "更新品牌失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminPage description="维护品牌与所属分类的关系。" title="品牌管理">
      {error ? <div className="admin-login__error">{error}</div> : null}

      <div className="admin-split">
        <AdminPanel description="新增品牌后即可在机型管理中引用。" title="新增品牌">
          <Form
            form={createForm}
            initialValues={{ sortOrder: 0, isEnabled: true, categoryId: null }}
            layout="vertical"
            onFinish={(values) => {
              void handleCreate(values);
            }}
            variant="filled"
          >
            <Form.Item label="品牌名称" name="name" rules={[{ required: true, message: "请输入品牌名称" }]}>
              <Input placeholder="例如：DJI" />
            </Form.Item>
            <Form.Item label="Slug" name="slug" rules={[{ required: true, message: "请输入 slug" }]}>
              <Input placeholder="例如：dji" />
            </Form.Item>
            <Form.Item label="所属分类" name="categoryId">
              <Select allowClear options={categoryOptions} placeholder="选择分类" />
            </Form.Item>
            <Form.Item label="排序" name="sortOrder">
              <Input placeholder="0" type="number" />
            </Form.Item>
            <Form.Item label="状态" name="isEnabled">
              <Select
                options={[
                  { label: "启用", value: true },
                  { label: "停用", value: false }
                ]}
              />
            </Form.Item>
            <div className="admin-form-actions">
              <Button htmlType="submit" loading={isSubmitting} type="primary">
                新增品牌
              </Button>
            </div>
          </Form>
        </AdminPanel>

        <AdminPanel description="快速查看品牌及其所属分类。" title="品牌列表">
          <Table
            bordered
            columns={[
              { dataIndex: "name", key: "name", title: "品牌" },
              { dataIndex: "slug", key: "slug", title: "Slug" },
              {
                key: "category",
                render: (_, record: BrandRecord) =>
                  categoriesQuery.data?.find((item) => item.id === record.categoryId)?.name ?? "未关联",
                title: "分类",
                width: 140
              },
              {
                dataIndex: "sortOrder",
                key: "sortOrder",
                title: "排序",
                width: 100
              },
              {
                key: "status",
                render: (_, record: BrandRecord) => (record.isEnabled ? "启用" : "停用"),
                title: "状态",
                width: 100
              },
              {
                key: "action",
                render: (_, record: BrandRecord) => (
                  <Button
                    onClick={() => {
                      setEditing(record);
                      editForm.setFieldsValue({
                        slug: record.slug,
                        name: record.name,
                        categoryId: record.categoryId,
                        sortOrder: record.sortOrder,
                        isEnabled: record.isEnabled
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
            dataSource={brandsQuery.data ?? []}
            loading={brandsQuery.isLoading || categoriesQuery.isLoading}
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
          void editForm.validateFields().then(handleUpdate);
        }}
        open={Boolean(editing)}
        title="编辑品牌"
      >
        <Form form={editForm} layout="vertical" variant="filled">
          <Form.Item label="品牌名称" name="name" rules={[{ required: true, message: "请输入品牌名称" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Slug" name="slug" rules={[{ required: true, message: "请输入 slug" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="所属分类" name="categoryId">
            <Select allowClear options={categoryOptions} />
          </Form.Item>
          <Form.Item label="排序" name="sortOrder">
            <Input type="number" />
          </Form.Item>
          <Form.Item label="状态" name="isEnabled">
            <Select
              options={[
                { label: "启用", value: true },
                { label: "停用", value: false }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </AdminPage>
  );
}
