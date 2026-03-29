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
  categoryId: string | null;
  sortOrder?: number;
  isEnabled: boolean;
};

function BrandLogoPreview(props: { logoUrl?: string | null; alt: string }) {
  if (!props.logoUrl) {
    return <div className="admin-brand-logo admin-brand-logo--empty">无 Logo</div>;
  }

  return (
    <div className="admin-brand-logo">
      <Image alt={props.alt} preview={false} src={props.logoUrl} />
    </div>
  );
}

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
    <AdminPage description="维护品牌与所属分类关系，并支持品牌 Logo 展示。" title="品牌管理">
      {error ? <div className="admin-login__error">{error}</div> : null}

      <div className="admin-split">
        <AdminPanel description="新增品牌时自动按当前最大排序递增，Logo 上传后可立即在前台展示。" title="新增品牌">
          <Form
            form={createForm}
            initialValues={{ isEnabled: true, categoryId: null }}
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

        <AdminPanel description="支持查看 Logo、分类、排序和状态。" title="品牌列表">
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
                      setEditLogoUrl(record.logoUrl ?? null);
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
          <Form.Item label="所属分类" name="categoryId">
            <Select allowClear options={categoryOptions} />
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
