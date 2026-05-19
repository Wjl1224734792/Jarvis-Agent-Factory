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
import { createMediaManager, uploadMediaBatch } from "@feijia/rich-text-editor";

type RegisteredAsset = {
  blobUrl: string;
  fileId: string;
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
  const powerTypesQuery = useQuery({
    queryKey: ["admin-power-types"],
    queryFn: () => apiClient.listPowerTypes()
  });
  const [form] = Form.useForm<ModelEditorValues>();
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [coverAsset, setCoverAsset] = useState<RegisteredAsset | null>(null);
  const [galleryAssets, setGalleryAssets] = useState<RegisteredAsset[]>([]);
  const [videoAsset, setVideoAsset] = useState<RegisteredAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const watchedName = Form.useWatch("name", form);
  const watchedLifecycle = Form.useWatch("lifecycleStatus", form);
  const mediaManager = useMemo(() => createMediaManager(), []);

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

  function handleSelectCover(file: File | null) {
    if (!file) {
      return;
    }

    setError(null);
    setStatusMessage(null);
    const { blobUrl, fileId } = mediaManager.register(file);
    setCoverAsset({
      blobUrl,
      fileId,
      fileName: file.name
    });
    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
  }

  function handleSelectGallery(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setError(null);
    setStatusMessage(null);
    const newAssets: RegisteredAsset[] = [];
    for (const file of Array.from(files)) {
      const { blobUrl, fileId } = mediaManager.register(file);
      newAssets.push({ blobUrl, fileId, fileName: file.name });
    }
    setGalleryAssets((current) => [...current, ...newAssets]);
    if (galleryInputRef.current) {
      galleryInputRef.current.value = "";
    }
  }

  function handleSelectVideo(file: File | null) {
    if (!file) {
      return;
    }

    setError(null);
    setStatusMessage(null);
    const { blobUrl, fileId } = mediaManager.register(file);
    setVideoAsset({
      blobUrl,
      fileId,
      fileName: file.name
    });
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
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

    if (!coverAsset?.blobUrl) {
      setError("请先上传封面图片。");
      return;
    }

    setIsSubmitting(true);
    try {
      const files = mediaManager.getAllFiles();
      const result = await uploadMediaBatch(
        files,
        (file) => apiClient.uploadAircraftCoverImage(file).then((r) => r.item),
        (file) => apiClient.uploadAircraftVideo(file).then((r) => r.item)
      );

      // Build blobUrl → fileId mapping from upload result order
      const blobIdMap = new Map<string, string>();
      let imageIdx = 0;
      let videoIdx = 0;
      for (const [blobUrl, file] of files) {
        const isVideo = file.type.startsWith("video/");
        if (isVideo) {
          const id = result.videoIds[videoIdx];
          if (id) {
            blobIdMap.set(blobUrl, id);
          }
          videoIdx++;
        } else {
          const id = result.imageIds[imageIdx];
          if (id) {
            blobIdMap.set(blobUrl, id);
          }
          imageIdx++;
        }
      }

      const coverImageFileId = blobIdMap.get(coverAsset.blobUrl) ?? null;
      const galleryImageFileIds = galleryAssets
        .map((a) => blobIdMap.get(a.blobUrl))
        .filter((id): id is string => !!id);
      const videoFileId = videoAsset ? (blobIdMap.get(videoAsset.blobUrl) ?? null) : null;

      const payload = buildModelUpsertPayload(values, {
        coverImageFileId,
        galleryImageFileIds,
        videoFileId
      });

      await apiClient.createModel(payload);
      await mediaManager.clear("admin-aircraft-creator");
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
              <Select
                loading={powerTypesQuery.isLoading}
                options={(powerTypesQuery.data ?? []).map((item) => ({
                  label: item.name,
                  value: item.slug,
                }))}
              />
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

            <div className="mt-4 border-t pt-4">
              <div className="mb-3 text-sm font-semibold text-gray-700">基础规格</div>
              <Space wrap>
                <Form.Item label="巡航速度（km/h）" name="cruiseSpeedKph">
                  <InputNumber min={0} precision={0} />
                </Form.Item>
                <Form.Item label="翼展（mm）" name="wingspanMm">
                  <InputNumber min={0} precision={0} />
                </Form.Item>
                <Form.Item label="长度（mm）" name="lengthMm">
                  <InputNumber min={0} precision={0} />
                </Form.Item>
                <Form.Item label="高度（mm）" name="heightMm">
                  <InputNumber min={0} precision={0} />
                </Form.Item>
                <Form.Item label="最大升限（m）" name="maxAltitudeM">
                  <InputNumber min={0} precision={0} />
                </Form.Item>
                <Form.Item label="爬升率（m/s）" name="climbRateMs">
                  <InputNumber min={0} precision={0} />
                </Form.Item>
                <Form.Item label="抗风等级" name="windResistance"><Input /></Form.Item>
                <Form.Item label="机身材料" name="materialType"><Input /></Form.Item>
              </Space>
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="mb-3 text-sm font-semibold text-gray-700">动力系统</div>
              <Space wrap>
                <Form.Item label="电机类型" name="motorType"><Input /></Form.Item>
                <Form.Item label="电池类型" name="batteryType"><Input /></Form.Item>
                <Form.Item label="电池容量（mAh）" name="batteryCapacityMah">
                  <InputNumber min={0} precision={0} />
                </Form.Item>
                <Form.Item label="电池电压" name="batteryVoltage"><Input /></Form.Item>
                <Form.Item label="电池能量（Wh）" name="batteryEnergyWh">
                  <InputNumber min={0} precision={0} />
                </Form.Item>
                <Form.Item label="充电时间（分钟）" name="chargeTimeMinutes">
                  <InputNumber min={0} precision={0} />
                </Form.Item>
                <Form.Item label="桨叶规格" name="propellerSize"><Input /></Form.Item>
              </Space>
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="mb-3 text-sm font-semibold text-gray-700">感知安全</div>
              <Space wrap>
                <Form.Item label="避障系统" name="obstacleAvoidance"><Input /></Form.Item>
                <Form.Item label="卫星定位" name="gnssType"><Input /></Form.Item>
                <Form.Item label="防护等级" name="ipRating"><Input /></Form.Item>
                <Form.Item label="工作温度" name="operatingTemperature"><Input /></Form.Item>
              </Space>
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="mb-3 text-sm font-semibold text-gray-700">相机载荷</div>
              <Space wrap>
                <Form.Item label="传感器尺寸" name="cameraSensorSize"><Input /></Form.Item>
                <Form.Item label="有效像素" name="cameraPixels"><Input /></Form.Item>
                <Form.Item label="视频分辨率" name="videoResolution"><Input /></Form.Item>
                <Form.Item label="镜头光圈" name="lensAperture"><Input /></Form.Item>
                <Form.Item label="ISO范围" name="isoRange"><Input /></Form.Item>
              </Space>
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="mb-3 text-sm font-semibold text-gray-700">图传通信</div>
              <Space wrap>
                <Form.Item label="图传系统" name="transmissionSystem"><Input /></Form.Item>
                <Form.Item label="图传距离（m）" name="transmissionRangeM">
                  <InputNumber min={0} precision={0} />
                </Form.Item>
              </Space>
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="mb-3 text-sm font-semibold text-gray-700">认证资质</div>
              <Space wrap>
                <Form.Item label="认证类型" name="certificationType"><Input /></Form.Item>
                <Form.Item label="噪音等级（dB）" name="noiseLevelDb">
                  <InputNumber min={0} precision={0} />
                </Form.Item>
              </Space>
            </div>

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
                  <Image alt="飞行器封面" preview={false} src={coverAsset.blobUrl} />
                </div>
              ) : (
                <div className="admin-ranking-cover__empty">尚未上传封面</div>
              )}
              <input
                accept="image/*"
                hidden
                onChange={(event) => {
                  handleSelectCover(event.target.files?.[0] ?? null);
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
                  onClick={() => galleryInputRef.current?.click()}
                  type="default"
                >
                  上传图集
                </Button>
              </div>

              <div className="admin-preview-list">
                {galleryAssets.map((item) => (
                  <div className="admin-preview-item admin-preview-item--ranking" key={item.fileId}>
                    <div className="admin-preview-item__media">
                      <Image alt={item.fileName ?? "图集图片"} preview={false} src={item.blobUrl} />
                    </div>
                    <div className="admin-row-actions">
                      <span className="admin-muted">{item.fileName ?? item.fileId}</span>
                      <Button
                        danger
                        icon={<Trash2Icon className="size-4" />}
                        onClick={() => {
                          setGalleryAssets((current) => current.filter((asset) => asset.fileId !== item.fileId));
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
                  handleSelectGallery(event.target.files);
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
                  src={videoAsset.blobUrl}
                  style={{ borderRadius: 8, maxWidth: "100%", width: "100%" }}
                />
              ) : (
                <div className="admin-ranking-cover__empty">尚未上传视频</div>
              )}
              <input
                accept="video/*"
                hidden
                onChange={(event) => {
                  handleSelectVideo(event.target.files?.[0] ?? null);
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
