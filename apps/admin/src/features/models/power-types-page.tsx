import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { Button, Form, Input, Modal, Select, Table } from "antd";

type PowerTypeRecord = Awaited<ReturnType<typeof apiClient.listPowerTypes>>[number];

type PowerTypeFormValues = {
  slug: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
};

export function PowerTypesPage() {
  const powerTypesQuery = useQuery({
    queryKey: ["admin-power-types"],
    queryFn: () => apiClient.listPowerTypes(),
  });
  const [createForm] = Form.useForm<PowerTypeFormValues>();
  const [editForm] = Form.useForm<PowerTypeFormValues>();
  const [editing, setEditing] = useState<PowerTypeRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const items = powerTypesQuery.data ?? [];
    if (!keyword) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.slug.toLowerCase().includes(keyword)
    );
  }, [powerTypesQuery.data, searchText]);

  async function handleCreate(values: PowerTypeFormValues) {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.createPowerType(values);
      createForm.resetFields();
      await powerTypesQuery.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(values: PowerTypeFormValues) {
    if (!editing) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.updatePowerType(editing.id, values);
      setEditing(null);
      editForm.resetFields();
      await powerTypesQuery.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns = [
    { title: "名称", dataIndex: "name", key: "name" },
    { title: "标识", dataIndex: "slug", key: "slug" },
    {
      title: "排序",
      dataIndex: "sortOrder",
      key: "sortOrder",
      width: 80,
    },
    {
      title: "启用",
      dataIndex: "isEnabled",
      key: "isEnabled",
      width: 80,
      render: (value: boolean) => (value ? "是" : "否"),
    },
    {
      title: "操作",
      key: "actions",
      width: 120,
      render: (_: unknown, record: PowerTypeRecord) => (
        <Button
          onClick={() => {
            setEditing(record);
            editForm.setFieldsValue(record);
          }}
          size="small"
          type="link"
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <AdminPage description="管理飞行器动力类型配置" title="动力分类">
      {error ? (
        <div style={{ color: "#ff4d4f", marginBottom: 16 }}>{error}</div>
      ) : null}

      <AdminPanel>
        <div className="flex items-center justify-between gap-3">
          <Input.Search
            allowClear
            className="max-w-[280px]"
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={setSearchText}
            placeholder="搜索名称或标识"
          />
          <Button
            onClick={() => {
              createForm.resetFields();
              Modal.confirm({
                content: (
                  <Form
                    form={createForm}
                    initialValues={{ sortOrder: 0, isEnabled: true }}
                    layout="vertical"
                    onFinish={(values) => {
                      void handleCreate(values).then(() =>
                        Modal.destroyAll()
                      );
                    }}
                    style={{ marginTop: 16 }}
                  >
                    <Form.Item
                      label="标识"
                      name="slug"
                      rules={[{ required: true, message: "请输入标识" }]}
                    >
                      <Input placeholder="例如 electric" />
                    </Form.Item>
                    <Form.Item
                      label="名称"
                      name="name"
                      rules={[{ required: true, message: "请输入名称" }]}
                    >
                      <Input placeholder="例如 电动" />
                    </Form.Item>
                    <Form.Item label="排序" name="sortOrder">
                      <Input type="number" />
                    </Form.Item>
                    <Form.Item label="启用" name="isEnabled">
                      <Select
                        options={[
                          { value: true, label: "是" },
                          { value: false, label: "否" },
                        ]}
                      />
                    </Form.Item>
                  </Form>
                ),
                onOk: () => createForm.submit(),
                title: "新增动力分类",
              });
            }}
            type="primary"
          >
            新增动力分类
          </Button>
        </div>
      </AdminPanel>

      <Table
        columns={columns}
        dataSource={filteredItems}
        loading={powerTypesQuery.isLoading}
        pagination={false}
        rowKey="id"
        size="middle"
      />

      <Modal
        footer={null}
        onCancel={() => {
          setEditing(null);
          editForm.resetFields();
        }}
        open={editing !== null}
        title="编辑动力分类"
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={(values) => {
            void handleUpdate(values).then(() => Modal.destroyAll());
          }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="标识"
            name="slug"
            rules={[{ required: true, message: "请输入标识" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: "请输入名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="排序" name="sortOrder">
            <Input type="number" />
          </Form.Item>
          <Form.Item label="启用" name="isEnabled">
            <Select
              options={[
                { value: true, label: "是" },
                { value: false, label: "否" },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Button htmlType="submit" loading={isSubmitting} type="primary">
              保存
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </AdminPage>
  );
}
