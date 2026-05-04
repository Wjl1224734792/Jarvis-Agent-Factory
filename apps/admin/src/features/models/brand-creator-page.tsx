import { Button, Form, Image, Input, Select } from "antd";
import { ImageUpIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";
import { apiClient } from "../../lib/api-client";
import { createMediaManager, uploadMediaBatch } from "@feijia/rich-text-editor";

type BrandCreateValues = {
  slug: string;
  name: string;
  sortOrder?: number;
  isEnabled: boolean;
};

type LogoAsset = {
  blobUrl: string;
  fileId: string;
  fileName?: string;
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

export function BrandCreatorPage() {
  const [form] = Form.useForm<BrandCreateValues>();
  const watchedName = Form.useWatch("name", form);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [logoAsset, setLogoAsset] = useState<LogoAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const mediaManager = useMemo(() => createMediaManager(), []);

  function handleSelectLogo(file: File | null) {
    if (!file) {
      return;
    }

    setError(null);
    setStatusMessage(null);
    const { blobUrl, fileId } = mediaManager.register(file);
    setLogoAsset({
      blobUrl,
      fileId,
      fileName: file.name
    });
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleCreate(values: BrandCreateValues) {
    setError(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      let logoUrl: string | null = null;

      if (logoAsset?.blobUrl) {
        const files = mediaManager.getAllFiles();
        const result = await uploadMediaBatch(
          files,
          (file) => apiClient.uploadPostImage(file).then((r) => r.item),
          () => Promise.reject(new Error("品牌创建不支持视频上传"))
        );

        logoUrl = result.urlMapping.get(logoAsset.blobUrl) ?? null;
      }

      await apiClient.createBrand({
        slug: values.slug.trim(),
        name: values.name.trim(),
        categoryId: null,
        logoUrl,
        sortOrder: Number(values.sortOrder ?? 0),
        isEnabled: values.isEnabled
      });
      await mediaManager.clear("admin-brand-creator");
      form.resetFields();
      form.setFieldsValue({
        isEnabled: true
      });
      setLogoAsset(null);
      setStatusMessage("品牌已创建。");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "创建品牌失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminPage
      actions={
        <Button href={ADMIN_ROUTE_PATHS.managementBrands} type="default">
          打开品牌库
        </Button>
      }
      description="运营区只负责新品牌创建，品牌库维护入口已独立。"
      title="创建品牌"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {statusMessage ? <div className="admin-shell__banner">{statusMessage}</div> : null}

      <AdminPanel description="品牌创建完成后，可在品牌库继续维护状态与排序。" title="品牌资料">
        <Form
          form={form}
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

          <div className="admin-brand-upload">
            <div className="admin-brand-upload__header">
              <span>品牌 Logo</span>
              <Button
                icon={<ImageUpIcon className="size-4" />}
                onClick={() => inputRef.current?.click()}
                type="default"
              >
                上传 Logo
              </Button>
            </div>
            <BrandLogoPreview alt={watchedName?.trim() || "品牌 Logo"} logoUrl={logoAsset?.blobUrl ?? null} />
            {logoAsset ? (
              <Button
                onClick={() => {
                  setLogoAsset(null);
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
                handleSelectLogo(event.target.files?.[0] ?? null);
              }}
              ref={inputRef}
              type="file"
            />
          </div>

          <div className="admin-form-actions">
            <Button htmlType="submit" loading={isSubmitting} type="primary">
              创建品牌
            </Button>
          </div>
        </Form>
      </AdminPanel>
    </AdminPage>
  );
}
