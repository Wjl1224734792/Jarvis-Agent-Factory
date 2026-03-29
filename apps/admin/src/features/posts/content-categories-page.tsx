import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, Modal, Select, Table } from "antd";
import { useMemo, useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

type ContentCategoryRecord = Awaited<ReturnType<typeof apiClient.listAdminContentCategories>>["items"][number];

type ContentCategoryFormValues = {
  slug: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
};

export function ContentCategoriesPage() {
  const categoriesQuery = useQuery({
    queryKey: ["admin-content-categories"],
    queryFn: () => apiClient.listAdminContentCategories()
  });
  const [createForm] = Form.useForm<ContentCategoryFormValues>();
  const [editForm] = Form.useForm<ContentCategoryFormValues>();
  const [editing, setEditing] = useState<ContentCategoryRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const filteredCategories = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const items = categoriesQuery.data?.items ?? [];
    if (!keyword) {
      return items;
    }

    return items.filter((item) =>
      [item.name, item.slug].some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [categoriesQuery.data?.items, searchText]);

  async function handleCreate(values: ContentCategoryFormValues) {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.createContentCategory({
        ...values,
        sortOrder: Number(values.sortOrder ?? 0)
      });
      createForm.resetFields();
      await categoriesQuery.refetch();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "创建内容分类失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(values: ContentCategoryFormValues) {
    if (!editing) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.updateContentCategory(editing.id, {
        ...values,
        sortOrder: Number(values.sortOrder ?? 0)
      });
      setEditing(null);
      await categoriesQuery.refetch();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "更新内容分类失败");
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
          placeholder="搜索分类名或 slug"
          style={{ width: 220 }}
          value={searchText}
        />
      }
      description="维护首页文章与官方文章发布使用的内容分类。"
      title="内容分类"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}

      <div className="admin-split">
        <AdminPanel description="新增分类后会立即出现在首页分类、发布文章和官方文章编辑器中。" title="新增内容分类">
          <Form
            form={createForm}
            initialValues={{ sortOrder: 0, isEnabled: true }}
            layout="vertical"
            onFinish={(values) => {
              void handleCreate(values);
            }}
            variant="filled"
          >
            <Form.Item label="分类名称" name="name" rules={[{ required: true, message: "请输入分类名称" }]}>
              <Input placeholder="例如：资讯" />
            </Form.Item>
            <Form.Item label="Slug" name="slug" rules={[{ required: true, message: "请输入 slug" }]}>
              <Input placeholder="例如：news" />
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
                新增内容分类
              </Button>
            </div>
          </Form>
        </AdminPanel>

        <AdminPanel description="在这里维护内容分类名称、排序和启用状态。" title="内容分类列表">
          <Table
            bordered
            columns={[
              { dataIndex: "name", key: "name", title: "分类名称" },
              { dataIndex: "slug", key: "slug", title: "Slug" },
              { dataIndex: "sortOrder", key: "sortOrder", title: "排序", width: 100 },
              {
                key: "status",
                render: (_, record: ContentCategoryRecord) => (record.isEnabled ? "启用" : "停用"),
                title: "状态",
                width: 100
              },
              {
                key: "action",
                render: (_, record: ContentCategoryRecord) => (
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
            dataSource={filteredCategories}
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
        title="编辑内容分类"
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
