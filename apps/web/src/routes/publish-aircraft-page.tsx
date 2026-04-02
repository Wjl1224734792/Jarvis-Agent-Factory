import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  CheckCircle2Icon,
  FileImageIcon,
  PlaneTakeoffIcon,
  SearchIcon,
  SendHorizonalIcon,
  TagsIcon,
  XIcon
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BrandIdentity } from "@/components/brand-identity";
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
import { cn } from "../lib/utils";
import { buildPublishStatusPath } from "../lib/web-routes";

type UploadedImage = {
  id: string;
  url: string;
  fileName?: string;
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
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [modelName, setModelName] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedPowerType, setSelectedPowerType] = useState<string>("other");
  const [brandKeyword, setBrandKeyword] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
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
  const submissionQuery = useQuery({
    queryKey: ["aircraft-submission-edit", editId],
    queryFn: () => apiClient.getAircraftSubmission(editId!),
    enabled: Boolean(editId)
  });

  const categories = categoriesQuery.data ?? [];
  const brands = brandsQuery.data ?? [];

  const filteredBrands = useMemo(() => {
    const keyword = brandKeyword.trim().toLowerCase();
    if (!keyword) {
      return brands;
    }

    return brands.filter((item) => item.name.toLowerCase().includes(keyword));
  }, [brandKeyword, brands]);

  const selectedBrand = filteredBrands.find((item) => item.id === selectedBrandId) ?? null;
  const selectedCategory = categories.find((item) => item.id === selectedCategoryId) ?? null;
  const coverUrl = uploadedImages[0]?.url ?? getModelImage("mini-4-pro", "electric");

  useEffect(() => {
    if (!submissionQuery.data?.item) {
      return;
    }

    const item = submissionQuery.data.item;
    setModelName(item.modelName);
    setSelectedBrandId(item.brand?.id ?? "");
    setSelectedCategoryId(item.category.id);
    setSelectedPowerType(item.powerType);
    setSummary(item.summary ?? "");
    setDescription(item.description ?? "");
    setPriceMin(item.priceMin?.toString() ?? "");
    setPriceMax(item.priceMax?.toString() ?? "");
    setMaxFlightTimeMinutes(item.parameters.maxFlightTimeMinutes?.toString() ?? "");
    setMaxRangeKilometers(item.parameters.maxRangeKilometers?.toString() ?? "");
    setMaxSpeedKph(item.parameters.maxSpeedKph?.toString() ?? "");
    setTakeoffWeightGrams(item.parameters.takeoffWeightGrams?.toString() ?? "");
    setUploadedImages(
      item.coverImageFileId && item.coverImageUrl
        ? [{ id: item.coverImageFileId, url: item.coverImageUrl }]
        : []
    );
    setUploadedVideo(
      item.videoAsset
        ? {
            id: item.videoAsset.id,
            url: item.videoAsset.url,
            fileName: item.videoAsset.fileName
          }
        : null
    );
  }, [submissionQuery.data?.item]);

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

      const uploaded = await apiClient.uploadAircraftCoverImage(file);
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
      const uploaded = await apiClient.uploadAircraftVideo(file);
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

  if (categoriesQuery.isLoading || brandsQuery.isLoading || submissionQuery.isLoading) {
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

          {submissionQuery.data?.item.rejectionReason ? (
            <Alert>
              <AlertTitle>驳回原因</AlertTitle>
              <AlertDescription>{submissionQuery.data.item.rejectionReason}</AlertDescription>
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
                <div className="text-sm font-medium text-foreground/72">Brand</div>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    onChange={(event) => setBrandKeyword(event.target.value)}
                    placeholder="Search existing brands"
                    value={brandKeyword}
                  />
                </div>
                <div className="grid max-h-56 gap-2 overflow-y-auto border border-border/70 bg-background/70 p-2">
                  {filteredBrands.map((brand) => {
                    const selected = selectedBrandId === brand.id;

                    return (
                      <button
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-[0.9rem] border px-3 py-2 text-left text-sm transition",
                          selected
                            ? "border-primary bg-primary/8 text-primary"
                            : "border-border/70 bg-white hover:border-primary/18 hover:bg-accent/24"
                        )}
                        key={brand.id}
                        onClick={() => setSelectedBrandId(brand.id)}
                        type="button"
                      >
                        <BrandIdentity
                          className="min-w-0"
                          imageClassName="size-4"
                          logoUrl={brand.logoUrl}
                          name={brand.name}
                        />
                        {selected ? <span className="text-[0.72rem]">Selected</span> : null}
                      </button>
                    );
                  })}

                  {filteredBrands.length === 0 ? (
                    <div className="px-3 py-6 text-sm text-muted-foreground">
                      No matching brand. Please submit a separate brand application first.
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[0.9rem] border border-dashed border-border/70 bg-surface-1 px-3 py-3 text-sm text-muted-foreground">
                  <span>Aircraft publishing now supports only existing brands. Brand application has been split out.</span>
                  <Button asChild size="sm" type="button" variant="outline">
                    <Link to={APP_ROUTES.publishBrand}>Apply Brand</Link>
                  </Button>
                </div>
              </div>

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
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  inputMode="numeric"
                  onChange={(event) => setPriceMin(event.target.value)}
                  placeholder="最低价（元）"
                  value={priceMin}
                />
                <Input
                  inputMode="numeric"
                  onChange={(event) => setPriceMax(event.target.value)}
                  placeholder="最高价（元）"
                  value={priceMax}
                />
              </div>
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
                  !selectedBrandId ||
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

                  const nextPriceMin = priceMin ? Number(priceMin) : null;
                  const nextPriceMax = priceMax ? Number(priceMax) : null;

                  if ((nextPriceMin === null) !== (nextPriceMax === null)) {
                    setError("请同时填写最低价和最高价，或都留空。");
                    setIsSubmitting(false);
                    return;
                  }

                  if (
                    nextPriceMin !== null &&
                    nextPriceMax !== null &&
                    nextPriceMin > nextPriceMax
                  ) {
                    setError("最低价不能高于最高价。");
                    setIsSubmitting(false);
                    return;
                  }

                  const submissionPayload = {
                    categoryId: selectedCategoryId,
                    brandId: selectedBrandId || null,
                    proposedBrandName: null,
                    modelName: modelName.trim(),
                    aircraftType: selectedCategory?.name ?? "飞行器",
                    powerType: selectedPowerType as "electric" | "fuel" | "hybrid" | "other",
                    summary: summary.trim() || null,
                    description: description.trim() || null,
                    coverImageFileId: uploadedVideo ? null : uploadedImages[0]?.id ?? null,
                    galleryImageFileIds: [],
                    videoFileId: uploadedVideo?.id ?? null,
                    priceMin: nextPriceMin,
                    priceMax: nextPriceMax,
                    maxFlightTimeMinutes: maxFlightTimeMinutes ? Number(maxFlightTimeMinutes) : null,
                    maxRangeKilometers: maxRangeKilometers ? Number(maxRangeKilometers) : null,
                    maxSpeedKph: maxSpeedKph ? Number(maxSpeedKph) : null,
                    takeoffWeightGrams: takeoffWeightGrams ? Number(takeoffWeightGrams) : null
                  } as Parameters<typeof apiClient.createAircraftSubmission>[0];

                  const request = editId
                    ? apiClient.updateAircraftSubmission(
                        editId,
                        submissionPayload as Parameters<typeof apiClient.updateAircraftSubmission>[1]
                      )
                    : apiClient.createAircraftSubmission(submissionPayload);

                  void request
                    .then((payload) => {
                      void queryClient.invalidateQueries({ queryKey: ["models"] });
                      void queryClient.invalidateQueries({ queryKey: ["self-profile-content"] });
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
                  {
                    label: "品牌",
                    value: selectedBrand?.name || "Not selected"
                  },
                  {
                    label: "动力",
                    value: powerTypeOptions.find((item) => item.value === selectedPowerType)?.label ?? "其他"
                  },
                  {
                    label: "价格",
                    value:
                      priceMin && priceMax
                        ? Number(priceMin) === Number(priceMax)
                          ? `¥${Number(priceMin).toLocaleString("zh-CN")}`
                          : `¥${Number(priceMin).toLocaleString("zh-CN")} - ¥${Number(priceMax).toLocaleString("zh-CN")}`
                        : "未填写"
                  }
                ].map((item) => (
                  <div className="rounded-[0.85rem] border border-border/70 bg-white px-3 py-3" key={item.label}>
                    <div className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {item.label === "品牌" && selectedBrand ? (
                        <BrandIdentity
                          imageClassName="size-4"
                          logoUrl={selectedBrand.logoUrl}
                          name={selectedBrand.name}
                        />
                      ) : (
                        item.value
                      )}
                    </div>
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
                分类来自后台维护；品牌可以直接选择，带 logo 的品牌会在选择器和预览中同步展示。
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-panel-highlight-foreground/84">
                <TagsIcon className="size-4" />
                通过审核后会进入机型库
              </div>
              <div className="inline-flex items-center gap-2 text-sm text-panel-highlight-foreground/84">
                <CheckCircle2Icon className="size-4" />
                没有现成品牌时，仍可提交品牌提案
              </div>
            </SitePanelBody>
          </SitePanel>
        </>
      }
      title="发布飞行器"
    />
  );
}
