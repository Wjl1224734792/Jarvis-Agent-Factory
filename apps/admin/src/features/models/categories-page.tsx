import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, Modal, Select, Table } from "antd";
import { useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

type CategoryRecord = Awaited<ReturnType<typeof apiClient.listCategories>>[number];

type CreateCategoryValues = {
  slug: string;
  name: string;
  isEnabled: boolean;
};

type EditCategoryValues = {
  slug: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
};

export function CategoriesPage() {
  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiClient.listCategories()
  });

  const [createForm] = Form.useForm<CreateCategoryValues>();
  const [editForm] = Form.useForm<EditCategoryValues>();
  const [editing, setEditing] = useState<CategoryRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(values: CreateCategoryValues) {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.createCategory({
        ...values,
        sortOrder: 0
      });
      createForm.resetFields();
      await categoriesQuery.refetch();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "创建分类失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(values: EditCategoryValues) {
    if (!editing) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.updateCategory(editing.id, {
        ...values,
        sortOrder: Number(values.sortOrder ?? 0)
      });
      setEditing(null);
      await categoriesQuery.refetch();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "更新分类失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminPage description="维护飞行器分类、排序和启用状态。" title="飞行器分类">
      {error ? <div className="admin-login__error">{error}</div> : null}

      <div className="admin-split">
        <AdminPanel
          description="新增分类后会立即进入后台列表。排序由系统自动递增分配。"
          title="新增分类"
        >
          <Form
            form={createForm}
            initialValues={{ isEnabled: true }}
            layout="vertical"
            onFinish={(values) => {
              void handleCreate(values);
            }}
            variant="filled"
          >
            <Form.Item label="分类名称" name="name" rules={[{ required: true, message: "请输入分类名称" }]}>
              <Input placeholder="例如：无人机" />
            </Form.Item>
            <Form.Item label="Slug" name="slug" rules={[{ required: true, message: "请输入 slug" }]}>
              <Input placeholder="例如：drone" />
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
                新增分类
              </Button>
            </div>
          </Form>
        </AdminPanel>

        <AdminPanel description="支持快速编辑分类名称、排序和状态。" title="分类列表">
          <Table
            bordered
            columns={[
              {
                dataIndex: "name",
                key: "name",
                title: "分类"
              },
              {
                dataIndex: "slug",
                key: "slug",
                title: "Slug"
              },
              {
                dataIndex: "sortOrder",
                key: "sortOrder",
                title: "排序",
                width: 100
              },
              {
                key: "status",
                render: (_, record: CategoryRecord) => (record.isEnabled ? "启用" : "停用"),
                title: "状态",
                width: 100
              },
              {
                key: "action",
                render: (_, record: CategoryRecord) => (
                  <Button
                    onClick={() => {
                      setEditing(record);
                      editForm.setFieldsValue({
                        slug: record.slug,
                        name: record.name,
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
            dataSource={categoriesQuery.data ?? []}
            loading={categoriesQuery.isLoading}
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
          void (async () => {
            const values = await editForm.validateFields();
            await handleUpdate(values);
          })();
        }}
        open={Boolean(editing)}
        title="编辑分类"
      >
        {editing ? (
          <Form form={editForm} layout="vertical" variant="filled">
            <Form.Item label="分类名称" name="name" rules={[{ required: true, message: "请输入分类名称" }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Slug" name="slug" rules={[{ required: true, message: "请输入 slug" }]}>
              <Input />
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
        ) : null}
      </Modal>
    </AdminPage>
  );
}
