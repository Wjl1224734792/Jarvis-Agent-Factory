import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  CheckCircle2Icon,
  FileImageIcon,
  PlaneTakeoffIcon,
  SendHorizonalIcon,
  TagsIcon,
  XIcon
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PublishFormSkeleton } from "@/components/page-skeletons";
import { PublishShell } from "@/components/publish-shell";
import { SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { apiClient } from "../lib/api-client";
import { getModelImage } from "../lib/aviation-media";
import { buildPublishStatusPath } from "../lib/web-routes";

type UploadedImage = {
  id: string;
  url: string;
};

type UploadedVideo = {
  id: string;
  url: string;
  fileName?: string;
};

const powerTypeOptions = [
  { value: "electric", label: "电动" },
  { value: "fuel", label: "燃油" },
  { value: "hybrid", label: "混动" },
  { value: "other", label: "其他" }
] as const;

export function PublishAircraftPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const promptLogin = useLoginPrompt();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [modelName, setModelName] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedPowerType, setSelectedPowerType] = useState<string>("other");
  const [brandMode, setBrandMode] = useState<"existing" | "proposed">("existing");
  const [proposedBrandName, setProposedBrandName] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [maxFlightTimeMinutes, setMaxFlightTimeMinutes] = useState("");
  const [maxRangeKilometers, setMaxRangeKilometers] = useState("");
  const [maxSpeedKph, setMaxSpeedKph] = useState("");
  const [takeoffWeightGrams, setTakeoffWeightGrams] = useState("");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<UploadedVideo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ["aircraft-submission-categories"],
    queryFn: () => apiClient.listAircraftCategories()
  });
  const brandsQuery = useQuery({
    queryKey: ["aircraft-submission-brands"],
    queryFn: () => apiClient.listBrands()
  });

  const categories = categoriesQuery.data ?? [];
  const brands = brandsQuery.data ?? [];

  const filteredBrands = useMemo(() => {
    if (!selectedCategoryId) {
      return brands;
    }

    return brands.filter((item) => item.categoryId === null || item.categoryId === selectedCategoryId);
  }, [brands, selectedCategoryId]);

  const selectedBrand = filteredBrands.find((item) => item.id === selectedBrandId) ?? null;
  const selectedCategory = categories.find((item) => item.id === selectedCategoryId) ?? null;
  const coverUrl = uploadedImages[0]?.url ?? getModelImage("mini-4-pro", "electric");

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const file = files[0];
      if (!file) {
        return;
      }

      const uploaded = await apiClient.uploadPostImage(file);
      setUploadedVideo(null);
      setUploadedImages([
        {
          id: uploaded.item.id,
          url: uploaded.item.url
        }
      ]);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "图片上传失败");
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  async function handleVideoUpload(file: File | null) {
    if (!file) {
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const uploaded = await apiClient.uploadPostVideo(file);
      setUploadedImages([]);
      setUploadedVideo({
        id: uploaded.item.id,
        url: uploaded.item.url,
        fileName: uploaded.item.fileName
      });
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "视频上传失败");
    } finally {
      setIsUploading(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
    }
  }

  if (categoriesQuery.isLoading || brandsQuery.isLoading) {
    return <PublishFormSkeleton />;
  }

  return (
    <PublishShell
      description="飞行器投稿"
      eyebrow="飞行器"
      main={
        <>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>飞行器提交失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <SitePanel>
            <SitePanelBody className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground/72">机型分类</div>
                <select
                  className="h-10 rounded-[calc(var(--radius-control)-0.1rem)] border border-input bg-card/88 px-3 text-sm"
                  onChange={(event) => setSelectedCategoryId(event.target.value)}
                  value={selectedCategoryId}
                >
                  <option value="">选择机型分类</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground/72">机型名称</div>
                <Input
                  onChange={(event) => setModelName(event.target.value)}
                  placeholder="例如 Mini 4 Pro"
                  value={modelName}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="text-sm font-medium text-foreground/72">品牌</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "existing", label: "选择已有品牌" },
                    { id: "proposed", label: "新增品牌提案" }
                  ].map((item) => (
                    <button
                      className={`site-tab-trigger rounded-full border px-3 py-1.5 text-[0.82rem] transition ${
                        brandMode === item.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 text-foreground/72"
                      }`}
                      key={item.id}
                      onClick={() => setBrandMode(item.id as "existing" | "proposed")}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {brandMode === "existing" ? (
                <div className="space-y-2 md:col-span-2">
                  <select
                    className="h-10 rounded-[calc(var(--radius-control)-0.1rem)] border border-input bg-card/88 px-3 text-sm"
                    onChange={(event) => setSelectedBrandId(event.target.value)}
                    value={selectedBrandId}
                  >
                    <option value="">选择品牌</option>
                    {filteredBrands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2 md:col-span-2">
                  <Input
                    onChange={(event) => setProposedBrandName(event.target.value)}
                    placeholder="输入品牌名称"
                    value={proposedBrandName}
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground/72">动力</div>
                <select
                  className="h-10 rounded-[calc(var(--radius-control)-0.1rem)] border border-input bg-card/88 px-3 text-sm"
                  onChange={(event) => setSelectedPowerType(event.target.value)}
                  value={selectedPowerType}
                >
                  {powerTypeOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-base font-semibold text-foreground">封面</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => imageInputRef.current?.click()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <FileImageIcon data-icon="inline-start" />
                    {isUploading ? "上传中..." : "上传图片"}
                  </Button>
                  <Button
                    onClick={() => videoInputRef.current?.click()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <PlaneTakeoffIcon data-icon="inline-start" />
                    {isUploading ? "上传中..." : "上传视频"}
                  </Button>
                </div>
              </div>

              <div className="rounded-[0.95rem] border border-dashed border-border/70 bg-muted/20 p-3">
                {uploadedVideo ? (
                  <div className="relative overflow-hidden rounded-[0.95rem] border border-border/70 bg-slate-950">
                    <video className="h-56 w-full object-cover" controls preload="metadata" src={uploadedVideo.url} />
                    <button
                      className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white"
                      onClick={() => {
                        setUploadedVideo(null);
                      }}
                      type="button"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </div>
                ) : uploadedImages[0] ? (
                  <div className="relative overflow-hidden rounded-[0.95rem] border border-border/70">
                    <img alt="cover" className="h-56 w-full object-cover" src={uploadedImages[0].url} />
                    <button
                      className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white"
                      onClick={() => {
                        setUploadedImages([]);
                      }}
                      type="button"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    className="flex h-56 w-full items-center justify-center rounded-[0.95rem] border border-dashed border-border/70 bg-background"
                    onClick={() => imageInputRef.current?.click()}
                    type="button"
                  >
                    <FileImageIcon className="size-8 text-muted-foreground" />
                  </button>
                )}
              </div>

              <input
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void handleImageUpload(event.target.files);
                }}
                ref={imageInputRef}
                type="file"
              />
              <input
                accept="video/*"
                className="hidden"
                onChange={(event) => {
                  void handleVideoUpload(event.target.files?.[0] ?? null);
                }}
                ref={videoInputRef}
                type="file"
              />

              <div className="rounded-[0.9rem] border border-dashed border-border/70 bg-surface-1 px-4 py-4 text-sm text-muted-foreground">
                封面只能上传图片或视频其一，重新选择另一种素材会自动替换当前封面。
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="text-base font-semibold text-foreground">参数</div>
              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  inputMode="numeric"
                  onChange={(event) => setMaxFlightTimeMinutes(event.target.value)}
                  placeholder="最大续航"
                  value={maxFlightTimeMinutes}
                />
                <Input
                  inputMode="numeric"
                  onChange={(event) => setMaxRangeKilometers(event.target.value)}
                  placeholder="航程"
                  value={maxRangeKilometers}
                />
                <Input
                  inputMode="numeric"
                  onChange={(event) => setMaxSpeedKph(event.target.value)}
                  placeholder="极速"
                  value={maxSpeedKph}
                />
                <Input
                  inputMode="numeric"
                  onChange={(event) => setTakeoffWeightGrams(event.target.value)}
                  placeholder="起飞重量"
                  value={takeoffWeightGrams}
                />
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="text-base font-semibold text-foreground">简介</div>
              <Textarea
                className="min-h-24"
                onChange={(event) => setSummary(event.target.value)}
                placeholder="一句话摘要"
                value={summary}
              />
              <Textarea
                className="min-h-44"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="描述机型特点、场景和参数..."
                value={description}
              />
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="flex flex-wrap justify-end gap-3">
              <Button asChild type="button" variant="outline">
                <Link to={APP_ROUTES.models}>取消</Link>
              </Button>
              <Button
                disabled={
                  !modelName.trim() ||
                  !selectedCategoryId ||
                  (brandMode === "existing" ? !selectedBrandId : !proposedBrandName.trim()) ||
                  isSubmitting ||
                  isUploading
                }
                onClick={() => {
                  if (
                    !promptLogin({
                      title: "登录后才能投稿飞行器",
                      description: "投稿飞行器前请先登录。"
                    })
                  ) {
                    return;
                  }
                  setError(null);
                  setIsSubmitting(true);

                  const compatibilityPayload = {
                    categoryId: selectedCategoryId,
                    brandId: brandMode === "existing" ? selectedBrandId || null : null,
                    proposedBrandName: brandMode === "proposed" ? proposedBrandName.trim() || null : null,
                    brandName:
                      brandMode === "existing"
                        ? selectedBrand?.name ?? "未命名品牌"
                        : proposedBrandName.trim() || "未命名品牌",
                    modelName: modelName.trim(),
                    aircraftType: selectedCategory?.name ?? "飞行器",
                    powerType: selectedPowerType as "electric" | "fuel" | "hybrid" | "other",
                    summary: summary.trim() || null,
                    description: description.trim() || null,
                    coverImageUrl: uploadedVideo ? null : uploadedImages[0]?.url ?? null,
                    galleryImageUrls: [],
                    videoAssetId: uploadedVideo?.id ?? null,
                    maxFlightTimeMinutes: maxFlightTimeMinutes ? Number(maxFlightTimeMinutes) : null,
                    maxRangeKilometers: maxRangeKilometers ? Number(maxRangeKilometers) : null,
                    maxSpeedKph: maxSpeedKph ? Number(maxSpeedKph) : null,
                    takeoffWeightGrams: takeoffWeightGrams ? Number(takeoffWeightGrams) : null
                  } as Parameters<typeof apiClient.createAircraftSubmission>[0];

                  void apiClient
                    .createAircraftSubmission(compatibilityPayload)
                    .then((payload) => {
                      void queryClient.invalidateQueries({ queryKey: ["models"] });
                      navigate(buildPublishStatusPath("aircraft", payload.item.id), {
                        state: {
                          title: modelName.trim(),
                          description: summary.trim(),
                          imageUrl: uploadedVideo ? null : uploadedImages[0]?.url ?? null
                        }
                      });
                    })
                    .catch((reason: unknown) => {
                      setError(reason instanceof Error ? reason.message : "飞行器提交失败");
                    })
                    .finally(() => {
                      setIsSubmitting(false);
                    });
                }}
                type="button"
                variant="hero"
              >
                <SendHorizonalIcon data-icon="inline-start" />
                {isSubmitting ? "提交中..." : "提交审核"}
              </Button>
            </SitePanelBody>
          </SitePanel>
        </>
      }
      aside={
        <>
          <SitePanel variant="muted">
            <SitePanelBody className="space-y-4">
              <div className="text-sm uppercase tracking-[0.18em] text-muted-foreground">预览</div>
              {uploadedVideo ? (
                <video className="h-48 w-full rounded-[0.9rem] object-cover" controls preload="metadata" src={uploadedVideo.url} />
              ) : (
                <img alt="model preview" className="h-48 w-full rounded-[0.9rem] object-cover" src={coverUrl} />
              )}
              <div className="grid gap-3">
                {[
                  { label: "机型分类", value: selectedCategory?.name || "未选择" },
                  { label: "品牌", value: brandMode === "existing" ? selectedBrand?.name || "未选择" : proposedBrandName || "未填写" },
                  {
                    label: "动力",
                    value: powerTypeOptions.find((item) => item.value === selectedPowerType)?.label ?? "其他"
                  }
                ].map((item) => (
                  <div className="rounded-[0.85rem] border border-border/70 bg-white px-3 py-3" key={item.label}>
                    <div className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-[0.85rem] border border-border/70 bg-white px-3 py-3 text-sm text-muted-foreground">
                {uploadedVideo ? "当前封面为视频" : uploadedImages[0] ? "当前封面为图片" : "尚未选择封面"}
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="highlight">
            <SitePanelBody className="space-y-4">
              <PlaneTakeoffIcon className="size-6" />
              <div className="text-xl font-semibold">投稿说明</div>
              <p className="text-sm leading-6 text-panel-highlight-foreground/86">
                分类来自后台维护；品牌可直接选择，或在投稿时补充品牌提案。
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-panel-highlight-foreground/84">
                <TagsIcon className="size-4" />
                通过审核后再进入机型库
              </div>
              <div className="inline-flex items-center gap-2 text-sm text-panel-highlight-foreground/84">
                <CheckCircle2Icon className="size-4" />
                不需要额外后台开关
              </div>
            </SitePanelBody>
          </SitePanel>
        </>
      }
      title="发布飞行器"
    />
  );
}
