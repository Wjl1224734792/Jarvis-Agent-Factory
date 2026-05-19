import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Space, Table, Tag, Popconfirm, Modal, Form, Input, Select, message } from "antd";
import { useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

export function CirclesPage() {
  const queryClient = useQueryClient();
  const [editCircle, setEditCircle] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const circlesQuery = useQuery({
    queryKey: ["admin-circles"],
    queryFn: () => (apiClient as any).listCircles({ sort: "latest" }) as Promise<{ items: Array<Record<string, unknown>> }>,
  });

  const items = circlesQuery.data?.items ?? [];

  async function handleEdit(values: Record<string, unknown>) {
    if (!editCircle) return;
    setEditLoading(true);
    try {
      await (apiClient as any).updateCircle(editCircle.id as string, values);
      message.success("圈子已更新");
      setEditCircle(null);
      queryClient.invalidateQueries({ queryKey: ["admin-circles"] });
    } catch (e: any) {
      message.error(e?.message ?? "更新失败");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteLoading(id);
    try {
      await (apiClient as any).deleteCircle(id);
      message.success("圈子已删除");
      queryClient.invalidateQueries({ queryKey: ["admin-circles"] });
    } catch (e: any) {
      message.error(e?.message ?? "删除失败");
    } finally {
      setDeleteLoading(null);
    }
  }

  return (
    <AdminPage title="圈子管理" description="管理所有飞友圈，包括编辑、禁用、删除圈子">
      <AdminPanel>
        <Table
          columns={[
            { title: "名称", dataIndex: "name", key: "name", width: 200,
              render: (name: string, record: any) => (
                <span className="font-medium">{name}</span>
              ),
            },
            { title: "Slug", dataIndex: "slug", key: "slug", width: 150 },
            { title: "加入模式", dataIndex: "joinMode", key: "joinMode", width: 100,
              render: (mode: string) => (
                <Tag color={mode === "free" ? "green" : "orange"}>
                  {mode === "free" ? "自由加入" : "审核加入"}
                </Tag>
              ),
            },
            { title: "成员", dataIndex: "memberCount", key: "memberCount", width: 80 },
            { title: "帖子", dataIndex: "postCount", key: "postCount", width: 80 },
            { title: "状态", dataIndex: "isEnabled", key: "isEnabled", width: 80,
              render: (v: boolean) => (
                <Tag color={v !== false ? "green" : "red"}>
                  {v !== false ? "启用" : "禁用"}
                </Tag>
              ),
            },
            { title: "创建时间", dataIndex: "createdAt", key: "createdAt", width: 180,
              render: (v: string) => v ? new Date(v).toLocaleString("zh-CN") : "-",
            },
            { title: "操作", key: "action", width: 200,
              render: (_: unknown, record: any) => (
                <Space>
                  <Button
                    size="small"
                    type="link"
                    onClick={() => setEditCircle(record)}
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="确定要删除这个圈子吗？所有帖子、评论将被一并删除。"
                    onConfirm={() => handleDelete(record.id)}
                  >
                    <Button
                      danger
                      loading={deleteLoading === record.id}
                      size="small"
                      type="link"
                    >
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
          dataSource={items}
          loading={circlesQuery.isLoading}
          pagination={{ pageSize: 20 }}
          rowKey="id"
          size="middle"
        />
      </AdminPanel>

      <Modal
        destroyOnClose
        onCancel={() => setEditCircle(null)}
        onOk={() => {
          const form = document.querySelector("#edit-circle-form") as HTMLFormElement | null;
          if (form) form.requestSubmit();
        }}
        okButtonProps={{ loading: editLoading }}
        open={editCircle !== null}
        title="编辑圈子"
      >
        {editCircle ? (
          <Form
            id="edit-circle-form"
            initialValues={{
              name: editCircle.name,
              slug: editCircle.slug,
              description: editCircle.description ?? "",
              joinMode: editCircle.joinMode ?? "free",
              isEnabled: editCircle.isEnabled !== false,
            }}
            layout="vertical"
            onFinish={handleEdit}
          >
            <Form.Item label="名称" name="name" rules={[{ required: true, message: "请输入名称" }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Slug" name="slug" rules={[{ required: true, message: "请输入Slug" }]}>
              <Input />
            </Form.Item>
            <Form.Item label="简介" name="description">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item label="加入模式" name="joinMode">
              <Select
                options={[
                  { label: "自由加入", value: "free" },
                  { label: "审核加入", value: "audit" },
                ]}
              />
            </Form.Item>
            <Form.Item label="状态" name="isEnabled" valuePropName="checked">
              <Select
                options={[
                  { label: "启用", value: true },
                  { label: "禁用", value: false },
                ]}
              />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
    </AdminPage>
  );
}
