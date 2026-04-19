import { useQuery } from "@tanstack/react-query";
import { Button, Form, Image, Input, InputNumber, Select, Space, Tag } from "antd";
import { ImagePlusIcon, Trash2Icon, VideoIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";
import {
  buildModelUpsertPayload,
  modelLifecycleStatusOptions,
  modelPowerOptions,
  validateModelPriceRange,
  type ModelEditorValues
} from "./model-editor-helpers";

type UploadedAsset = {
  id: string;
  url: string;
  fileName?: string;
};

export function AircraftCreatorPage() {
  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiClient.listCategories()
  });
  const brandsQuery = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => apiClient.listBrands()
  });
  const [form] = Form.useForm<ModelEditorValues>();
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [coverAsset, setCoverAsset] = useState<UploadedAsset | null>(null);
  const [galleryAssets, setGalleryAssets] = useState<UploadedAsset[]>([]);
  const [videoAsset, setVideoAsset] = useState<UploadedAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const watchedName = Form.useWatch("name", form);
  const watchedLifecycle = Form.useWatch("lifecycleStatus", form);

  const categoryOptions = useMemo(
    () => (categoriesQuery.data ?? []).map((item) => ({ label: item.name, value: item.id })),
    [categoriesQuery.data]
  );
  const brandOptions = useMemo(
    () =>
      (brandsQuery.data ?? []).map((item) => ({
        label: `${item.name} · ${item.slug}`,
        value: item.id
      })),
    [brandsQuery.data]
  );
  const lifecycleLabel = useMemo(() => {
    const value = watchedLifecycle ?? "unreleased";
    return modelLifecycleStatusOptions.find((item) => item.value === value)?.label ?? "未发布";
  }, [watchedLifecycle]);

  async function uploadCover(file: File | null) {
    if (!file) {
      return;
    }

    setError(null);
    setStatusMessage(null);
    setIsUploadingCover(true);
    try {
      const uploaded = await apiClient.uploadAircraftCoverImage(file);
      setCoverAsset({
        id: uploaded.item.id,
        url: uploaded.item.url,
        fileName: uploaded.item.fileName
      });
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "封面上传失败");
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    }
  }

  async function uploadGallery(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setError(null);
    setStatusMessage(null);
    setIsUploadingGallery(true);
    try {
      const uploads: UploadedAsset[] = [];
      for (const file of Array.from(files)) {
        const uploaded = await apiClient.uploadAircraftCoverImage(file);
        uploads.push({
          id: uploaded.item.id,
          url: uploaded.item.url,
          fileName: uploaded.item.fileName
        });
      }
      setGalleryAssets((current) => [...current, ...uploads]);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "图集上传失败");
    } finally {
      setIsUploadingGallery(false);
      if (galleryInputRef.current) {
        galleryInputRef.current.value = "";
      }
    }
  }

  async function uploadVideo(file: File | null) {
    if (!file) {
      return;
    }

    setError(null);
    setStatusMessage(null);
    setIsUploadingVideo(true);
    try {
      const uploaded = await apiClient.uploadAircraftVideo(file);
      setVideoAsset({
        id: uploaded.item.id,
        url: uploaded.item.url,
        fileName: uploaded.item.fileName
      });
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "视频上传失败");
    } finally {
      setIsUploadingVideo(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(values: ModelEditorValues) {
    setError(null);
    setStatusMessage(null);

    const priceError = validateModelPriceRange({
      priceMin: values.priceMin ?? null,
      priceMax: values.priceMax ?? null
    });
    if (priceError) {
      setError(priceError);
      return;
    }

    if (!coverAsset?.id) {
      setError("请先上传封面图片。");
      return;
    }

    const payload = buildModelUpsertPayload(values, {
      coverImageFileId: coverAsset.id,
      galleryImageFileIds: galleryAssets.map((item) => item.id),
      videoFileId: videoAsset?.id ?? null
    });

    setIsSubmitting(true);
    try {
      await apiClient.createModel(payload);
      form.resetFields();
      form.setFieldsValue({
        powerType: "electric",
        lifecycleStatus: "unreleased",
        isPublished: true
      });
      setCoverAsset(null);
      setGalleryAssets([]);
      setVideoAsset(null);
      setStatusMessage("飞行器已创建。");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "创建飞行器失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminPage
      actions={
        <Button href={ADMIN_ROUTE_PATHS.managementModels} type="default">
          打开机型库
        </Button>
      }
      description="按新版内容创建契约上传媒体并完成机型建档。"
      title="创建飞行器"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {statusMessage ? <div className="admin-shell__banner">{statusMessage}</div> : null}

      <div className="admin-split admin-split--wide">
        <AdminPanel description="基础信息和参数会按新版模型契约提交。" title="飞行器资料">
          <Form
            form={form}
            initialValues={{
              powerType: "electric",
              lifecycleStatus: "unreleased",
              isPublished: true
            }}
            layout="vertical"
            onFinish={(values) => {
              void handleSubmit(values);
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
              <Select loading={categoriesQuery.isLoading} options={categoryOptions} placeholder="选择机型分类" />
            </Form.Item>
            <Form.Item label="品牌" name="brandId" rules={[{ required: true, message: "请选择品牌" }]}>
              <Select
                filterOption={(input, option) =>
                  String(option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                loading={brandsQuery.isLoading}
                options={brandOptions}
                placeholder="搜索并选择品牌"
                showSearch
              />
            </Form.Item>
            <Form.Item label="动力类型" name="powerType" rules={[{ required: true, message: "请选择动力类型" }]}>
              <Select options={modelPowerOptions} />
            </Form.Item>
            <Form.Item label="生命周期状态" name="lifecycleStatus" rules={[{ required: true, message: "请选择生命周期状态" }]}>
              <Select options={modelLifecycleStatusOptions} />
            </Form.Item>
            <Form.Item label="摘要" name="summary">
              <Input placeholder="简短摘要" />
            </Form.Item>
            <Form.Item label="详情描述" name="description">
              <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} placeholder="详情描述" />
            </Form.Item>
            <Space size="middle" style={{ width: "100%" }} wrap>
              <Form.Item label="最低价（元）" name="priceMin">
                <InputNumber min={0} precision={0} />
              </Form.Item>
              <Form.Item label="最高价（元）" name="priceMax">
                <InputNumber min={0} precision={0} />
              </Form.Item>
              <Form.Item label="最大续航（分钟）" name="maxFlightTimeMinutes">
                <InputNumber min={0} precision={0} />
              </Form.Item>
              <Form.Item label="最大航程（公里）" name="maxRangeKilometers">
                <InputNumber min={0} precision={0} />
              </Form.Item>
              <Form.Item label="最大速度（km/h）" name="maxSpeedKph">
                <InputNumber min={0} precision={0} />
              </Form.Item>
              <Form.Item label="起飞重量（g）" name="takeoffWeightGrams">
                <InputNumber min={0} precision={0} />
              </Form.Item>
            </Space>
            <Form.Item label="发布状态" name="isPublished">
              <Select
                options={[
                  { label: "发布", value: true },
                  { label: "草稿", value: false }
                ]}
              />
            </Form.Item>
            <div className="admin-form-actions">
              <Button htmlType="submit" loading={isSubmitting} type="primary">
                创建飞行器
              </Button>
            </div>
          </Form>
        </AdminPanel>

        <div className="admin-field-stack">
          <AdminPanel title="媒体上传">
            <div className="admin-uploader">
              <div className="admin-row-actions">
                <div>
                  <div className="admin-panel__title">封面图片（必填）</div>
                  <div className="admin-panel__description">提交时将写入 `coverImageFileId`。</div>
                </div>
                <Space wrap>
                  <Button
                    icon={<ImagePlusIcon className="size-4" />}
                    loading={isUploadingCover}
                    onClick={() => coverInputRef.current?.click()}
                    type="default"
                  >
                    上传封面
                  </Button>
                  {coverAsset ? (
                    <Button
                      onClick={() => {
                        setCoverAsset(null);
                      }}
                      size="small"
                      type="link"
                    >
                      清除
                    </Button>
                  ) : null}
                </Space>
              </div>
              {coverAsset ? (
                <div className="admin-ranking-cover__preview">
                  <Image alt="飞行器封面" preview={false} src={coverAsset.url} />
                </div>
              ) : (
                <div className="admin-ranking-cover__empty">尚未上传封面</div>
              )}
              <input
                accept="image/*"
                hidden
                onChange={(event) => {
                  void uploadCover(event.target.files?.[0] ?? null);
                }}
                ref={coverInputRef}
                type="file"
              />
            </div>

            <div className="admin-uploader">
              <div className="admin-row-actions">
                <div>
                  <div className="admin-panel__title">图集图片（可选）</div>
                  <div className="admin-panel__description">最多保留 6 张，会自动排除封面图。</div>
                </div>
                <Button
                  icon={<ImagePlusIcon className="size-4" />}
                  loading={isUploadingGallery}
                  onClick={() => galleryInputRef.current?.click()}
                  type="default"
                >
                  上传图集
                </Button>
              </div>

              <div className="admin-preview-list">
                {galleryAssets.map((item) => (
                  <div className="admin-preview-item admin-preview-item--ranking" key={item.id}>
                    <div className="admin-preview-item__media">
                      <Image alt={item.fileName ?? "图集图片"} preview={false} src={item.url} />
                    </div>
                    <div className="admin-row-actions">
                      <span className="admin-muted">{item.fileName ?? item.id}</span>
                      <Button
                        danger
                        icon={<Trash2Icon className="size-4" />}
                        onClick={() => {
                          setGalleryAssets((current) => current.filter((asset) => asset.id !== item.id));
                        }}
                        size="small"
                        type="link"
                      >
                        移除
                      </Button>
                    </div>
                  </div>
                ))}
                {galleryAssets.length === 0 ? <div className="admin-empty">暂无图集图片</div> : null}
              </div>
              <input
                accept="image/*"
                hidden
                multiple
                onChange={(event) => {
                  void uploadGallery(event.target.files);
                }}
                ref={galleryInputRef}
                type="file"
              />
            </div>

            <div className="admin-uploader">
              <div className="admin-row-actions">
                <div>
                  <div className="admin-panel__title">介绍视频（可选）</div>
                  <div className="admin-panel__description">提交时将写入 `videoFileId`。</div>
                </div>
                <Space wrap>
                  <Button
                    icon={<VideoIcon className="size-4" />}
                    loading={isUploadingVideo}
                    onClick={() => videoInputRef.current?.click()}
                    type="default"
                  >
                    上传视频
                  </Button>
                  {videoAsset ? (
                    <Button
                      onClick={() => {
                        setVideoAsset(null);
                      }}
                      size="small"
                      type="link"
                    >
                      清除
                    </Button>
                  ) : null}
                </Space>
              </div>
              {videoAsset ? (
                <video
                  controls
                  src={videoAsset.url}
                  style={{ borderRadius: 8, maxWidth: "100%", width: "100%" }}
                />
              ) : (
                <div className="admin-ranking-cover__empty">尚未上传视频</div>
              )}
              <input
                accept="video/*"
                hidden
                onChange={(event) => {
                  void uploadVideo(event.target.files?.[0] ?? null);
                }}
                ref={videoInputRef}
                type="file"
              />
            </div>
          </AdminPanel>

          <AdminPanel title="提交预览">
            <div className="admin-preview-item">
              <div className="admin-table-title">{watchedName?.trim() || "未命名飞行器"}</div>
              <div className="admin-table-subtitle">状态：{lifecycleLabel}</div>
              <Tag color={coverAsset ? "green" : "gold"}>{coverAsset ? "封面已上传" : "等待封面"}</Tag>
            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminPage>
  );
}
