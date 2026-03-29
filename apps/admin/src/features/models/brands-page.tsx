import { useQuery } from "@tanstack/react-query";
import { Button, Form, Image, Input, Modal, Select, Table } from "antd";
import { ImageUpIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

type BrandRecord = Awaited<ReturnType<typeof apiClient.listBrands>>[number];
type BrandFormValues = {
  slug: string;
  name: string;
  sortOrder?: number;
  isEnabled: boolean;
};

function BrandLogoPreview(props: { logoUrl?: string | null; alt: string }) {
  if (!props.logoUrl) {
    return <div className="admin-brand-logo admin-brand-logo--empty">暂无 Logo</div>;
  }

  return (
    <div className="admin-brand-logo">
      <Image alt={props.alt} preview={false} src={props.logoUrl} />
    </div>
  );
}

export function BrandsPage() {
  const brandsQuery = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => apiClient.listBrands()
  });

  const createInputRef = useRef<HTMLInputElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const [createForm] = Form.useForm<BrandFormValues>();
  const [editForm] = Form.useForm<BrandFormValues>();
  const [editing, setEditing] = useState<BrandRecord | null>(null);
  const [createLogoUrl, setCreateLogoUrl] = useState<string | null>(null);
  const [editLogoUrl, setEditLogoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const filteredBrands = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const items = brandsQuery.data ?? [];
    if (!keyword) {
      return items;
    }

    return items.filter((item) =>
      [item.name, item.slug].some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [brandsQuery.data, searchText]);

  async function uploadLogo(file: File | null, target: "create" | "edit") {
    if (!file) {
      return;
    }

    setIsUploadingLogo(true);
    setError(null);
    try {
      const response = await apiClient.uploadImage(file);
      if (target === "create") {
        setCreateLogoUrl(response.item.url);
      } else {
        setEditLogoUrl(response.item.url);
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Logo 上传失败");
    } finally {
      setIsUploadingLogo(false);
      if (target === "create" && createInputRef.current) {
        createInputRef.current.value = "";
      }
      if (target === "edit" && editInputRef.current) {
        editInputRef.current.value = "";
      }
    }
  }

  async function handleCreate(values: BrandFormValues) {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.createBrand({
        ...values,
        categoryId: null,
        logoUrl: createLogoUrl,
        sortOrder: Number(values.sortOrder ?? 0)
      });
      createForm.resetFields();
      setCreateLogoUrl(null);
      await brandsQuery.refetch();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "创建品牌失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(values: BrandFormValues) {
    if (!editing) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.updateBrand(editing.id, {
        ...values,
        categoryId: null,
        logoUrl: editLogoUrl,
        sortOrder: Number(values.sortOrder ?? editing.sortOrder ?? 0)
      });
      setEditing(null);
      setEditLogoUrl(null);
      await brandsQuery.refetch();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "更新品牌失败");
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
          placeholder="搜索品牌名或 slug"
          style={{ width: 240 }}
          value={searchText}
        />
      }
      description="品牌不再绑定一级分类。品牌库只维护品牌自身资料，机型发布时再单独选择分类。"
      title="品牌库"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}

      <div className="admin-split">
        <AdminPanel description="品牌资料只维护品牌本身，不再联动一级分类。" title="新增品牌">
          <Form
            form={createForm}
            initialValues={{ isEnabled: true }}
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
            <div className="admin-brand-upload">
              <div className="admin-brand-upload__header">
                <span>品牌 Logo</span>
                <Button
                  icon={<ImageUpIcon className="size-4" />}
                  loading={isUploadingLogo}
                  onClick={() => createInputRef.current?.click()}
                  type="default"
                >
                  上传 Logo
                </Button>
              </div>
              <BrandLogoPreview alt="新品牌 Logo" logoUrl={createLogoUrl} />
              {createLogoUrl ? (
                <Button
                  onClick={() => {
                    setCreateLogoUrl(null);
                  }}
                  size="small"
                  type="link"
                >
                  移除 Logo
                </Button>
              ) : null}
              <input
                accept="image/*"
                hidden
                onChange={(event) => {
                  void uploadLogo(event.target.files?.[0] ?? null, "create");
                }}
                ref={createInputRef}
                type="file"
              />
            </div>
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

        <AdminPanel description="品牌库列表不再显示分类绑定信息，机型页会单独选择已有品牌。" title="品牌列表">
          <Table
            bordered
            columns={[
              {
                key: "logo",
                render: (_, record: BrandRecord) => (
                  <BrandLogoPreview alt={record.name} logoUrl={record.logoUrl ?? null} />
                ),
                title: "Logo",
                width: 96
              },
              { dataIndex: "name", key: "name", title: "品牌" },
              { dataIndex: "slug", key: "slug", title: "Slug" },
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
                      setEditLogoUrl(record.logoUrl ?? null);
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
            dataSource={filteredBrands}
            loading={brandsQuery.isLoading}
            rowKey={(record) => record.id}
            size="middle"
          />
        </AdminPanel>
      </div>

      <Modal
        centered
        confirmLoading={isSubmitting}
        onCancel={() => {
          setEditing(null);
          setEditLogoUrl(null);
        }}
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
          <div className="admin-brand-upload">
            <div className="admin-brand-upload__header">
              <span>品牌 Logo</span>
              <Button
                icon={<ImageUpIcon className="size-4" />}
                loading={isUploadingLogo}
                onClick={() => editInputRef.current?.click()}
                type="default"
              >
                上传 Logo
              </Button>
            </div>
            <BrandLogoPreview alt={editing?.name ?? "品牌 Logo"} logoUrl={editLogoUrl} />
            {editLogoUrl ? (
              <Button
                onClick={() => {
                  setEditLogoUrl(null);
                }}
                size="small"
                type="link"
              >
                移除 Logo
              </Button>
            ) : null}
            <input
              accept="image/*"
              hidden
              onChange={(event) => {
                void uploadLogo(event.target.files?.[0] ?? null, "edit");
              }}
              ref={editInputRef}
              type="file"
            />
          </div>
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
