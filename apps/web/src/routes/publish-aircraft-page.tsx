import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  CheckCircle2Icon,
  FileImageIcon,
  SearchIcon,
  SendHorizonalIcon,
  TagsIcon,
  XIcon
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BrandIdentity } from "@/components/brand-identity";
import { PublishAircraftLivePreview } from "@/components/publish-aircraft-live-preview";
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
const lifecycleStatusOptions = [
  { value: "concept", label: "概念" },
  { value: "development", label: "研发" },
  { value: "testing", label: "测试" },
  { value: "unreleased", label: "未发布" },
  { value: "released", label: "已发布" },
  { value: "not_in_market", label: "未上市" },
  { value: "marketed", label: "已上市" }
] as const;
const AIRCRAFT_SUMMARY_MAX_LENGTH = 50;
const AIRCRAFT_DESCRIPTION_MAX_LENGTH = 300;
const GALLERY_IMAGE_MAX = 6;

export function PublishAircraftPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const promptLogin = useLoginPrompt();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const coverMediaInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [modelName, setModelName] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedPowerType, setSelectedPowerType] = useState<string>("other");
  const [selectedLifecycleStatus, setSelectedLifecycleStatus] = useState<string>("unreleased");
  const [brandKeyword, setBrandKeyword] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [maxFlightTimeMinutes, setMaxFlightTimeMinutes] = useState("");
  const [maxRangeKilometers, setMaxRangeKilometers] = useState("");
  const [maxSpeedKph, setMaxSpeedKph] = useState("");
  const [takeoffWeightGrams, setTakeoffWeightGrams] = useState("");
  const [coverImage, setCoverImage] = useState<UploadedImage | null>(null);
  const [galleryImages, setGalleryImages] = useState<UploadedImage[]>([]);
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
    queryFn: () => {
      if (!editId) {
        throw new Error("Missing submission id");
      }
      return apiClient.getAircraftSubmission(editId);
    },
    enabled: Boolean(editId)
  });

  const categories = categoriesQuery.data ?? [];
  const brands = useMemo(() => brandsQuery.data ?? [], [brandsQuery.data]);

  const filteredBrands = useMemo(() => {
    const keyword = brandKeyword.trim().toLowerCase();
    if (!keyword) {
      return brands;
    }

    return brands.filter((item) => item.name.toLowerCase().includes(keyword));
  }, [brandKeyword, brands]);

  const selectedBrand = filteredBrands.find((item) => item.id === selectedBrandId) ?? null;
  const selectedCategory = categories.find((item) => item.id === selectedCategoryId) ?? null;
  const coverUrl = coverImage?.url ?? getModelImage("mini-4-pro", "electric");

  useEffect(() => {
    if (!submissionQuery.data?.item) {
      return;
    }

    const item = submissionQuery.data.item;
    setModelName(item.modelName);
    setSelectedBrandId(item.brand?.id ?? "");
    setSelectedCategoryId(item.category.id);
    setSelectedPowerType(item.powerType);
    setSelectedLifecycleStatus(item.lifecycleStatus);
    setSummary(item.summary ?? "");
    setDescription(item.description ?? "");
    setPriceMin(item.priceMin?.toString() ?? "");
    setPriceMax(item.priceMax?.toString() ?? "");
    setMaxFlightTimeMinutes(item.parameters.maxFlightTimeMinutes?.toString() ?? "");
    setMaxRangeKilometers(item.parameters.maxRangeKilometers?.toString() ?? "");
    setMaxSpeedKph(item.parameters.maxSpeedKph?.toString() ?? "");
    setTakeoffWeightGrams(item.parameters.takeoffWeightGrams?.toString() ?? "");
    setCoverImage(
      item.coverImageFileId && item.coverImageUrl
        ? { id: item.coverImageFileId, url: item.coverImageUrl }
        : null
    );
    const galleryIds = item.galleryImageFileIds ?? [];
    const galleryUrls = item.galleryImageUrls ?? [];
    const coverId = item.coverImageFileId ?? null;
    const galleryPairs = galleryIds
      .map((id, index) => ({ id, url: galleryUrls[index] ?? "" }))
      .filter((row) => row.id && row.url && row.id !== coverId)
      .slice(0, GALLERY_IMAGE_MAX);
    setGalleryImages(galleryPairs);
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

  async function handleCoverImageFile(file: File) {
    setError(null);
    setIsUploading(true);
    try {
      const uploaded = await apiClient.uploadAircraftCoverImage(file);
      setUploadedVideo(null);
      setCoverImage({ id: uploaded.item.id, url: uploaded.item.url });
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "图片上传失败");
    } finally {
      setIsUploading(false);
      if (coverMediaInputRef.current) {
        coverMediaInputRef.current.value = "";
      }
    }
  }

  async function handleGalleryFilesAdded(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setError(null);
    setUploadedVideo(null);
    setIsUploading(true);

    try {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
      let nextCover = coverImage;
      let nextGallery = [...galleryImages];

      for (const file of imageFiles) {
        const uploaded = await apiClient.uploadAircraftCoverImage(file);
        const row = { id: uploaded.item.id, url: uploaded.item.url };

        if (!nextCover) {
          nextCover = row;
          continue;
        }

        if (nextGallery.length >= GALLERY_IMAGE_MAX) {
          break;
        }
        nextGallery.push(row);
      }

      setCoverImage(nextCover);
      setGalleryImages(nextGallery);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "图片上传失败");
    } finally {
      setIsUploading(false);
      if (galleryInputRef.current) {
        galleryInputRef.current.value = "";
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
      setCoverImage(null);
      setGalleryImages([]);
      setUploadedVideo({
        id: uploaded.item.id,
        url: uploaded.item.url,
        fileName: uploaded.item.fileName
      });
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "视频上传失败");
    } finally {
      setIsUploading(false);
      if (coverMediaInputRef.current) {
        coverMediaInputRef.current.value = "";
      }
    }
  }

  async function handleCoverMediaPick(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    if (!file) {
      return;
    }

    if (file.type.startsWith("video/")) {
      await handleVideoUpload(file);
      return;
    }

    await handleCoverImageFile(file);
  }

  function promoteGalleryImageToCover(index: number) {
    const picked = galleryImages[index];
    if (!picked) {
      return;
    }
    const rest = galleryImages.filter((_, i) => i !== index);
    if (coverImage) {
      if (rest.length < GALLERY_IMAGE_MAX && !rest.some((g) => g.id === coverImage.id)) {
        rest.unshift(coverImage);
      }
    }
    setCoverImage(picked);
    setGalleryImages(rest.slice(0, GALLERY_IMAGE_MAX));
  }

  if (categoriesQuery.isLoading || brandsQuery.isLoading || submissionQuery.isLoading) {
    return <PublishFormSkeleton />;
  }

  return (
    <PublishShell
      className="mx-auto w-full max-w-[76rem] gap-4"
      description="飞行器投稿"
      eyebrow="飞行器"
      gridClassName="xl:grid-cols-[minmax(0,1fr)_22rem]"
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
            <SitePanelBody className="space-y-4">
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-primary">封面与图册</div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,13.5rem)] md:items-start">
                <div className="min-w-0">
                  <div className="overflow-hidden rounded-[0.95rem] border border-dashed border-border/70 bg-muted/20 p-0">
                    {uploadedVideo ? (
                      <div className="relative bg-slate-950">
                        <video
                          className="block aspect-[4/3] w-full object-cover sm:min-h-[14rem]"
                          controls
                          preload="metadata"
                          src={uploadedVideo.url}
                        />
                        <button
                          aria-label="移除视频"
                          className="absolute right-2 top-2 z-10 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white"
                          onClick={() => {
                            setUploadedVideo(null);
                          }}
                          type="button"
                        >
                          <XIcon className="size-3.5" />
                        </button>
                      </div>
                    ) : coverImage ? (
                      <div className="relative">
                        <img
                          alt="cover"
                          className="block aspect-[4/3] w-full object-cover sm:min-h-[14rem]"
                          src={coverImage.url}
                        />
                        <button
                          aria-label="移除封面"
                          className="absolute right-2 top-2 z-10 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white"
                          onClick={() => {
                            setCoverImage(null);
                          }}
                          type="button"
                        >
                          <XIcon className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="group flex aspect-[4/3] min-h-[12rem] w-full flex-col items-center justify-center rounded-none border-0 bg-transparent text-muted-foreground transition hover:bg-accent/25 hover:text-foreground sm:min-h-[14rem]"
                        onClick={() => coverMediaInputRef.current?.click()}
                        type="button"
                      >
                        <FileImageIcon className="size-8" />
                        <div className="mt-3 text-sm font-medium">
                          {isUploading ? "上传中..." : "点击上传封面图片或视频"}
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {!uploadedVideo ? (
                  <div className="space-y-2 md:border-l md:border-border/50 md:pl-4">
                    <div className="text-sm font-medium text-foreground/72">图册（可选，最多 {GALLERY_IMAGE_MAX} 张）</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        disabled={isUploading || galleryImages.length >= GALLERY_IMAGE_MAX}
                        onClick={() => galleryInputRef.current?.click()}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        添加图片
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {galleryImages.length}/{GALLERY_IMAGE_MAX}
                      </span>
                    </div>
                    {galleryImages.length > 0 ? (
                      <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto pr-0.5 md:flex-col md:flex-nowrap">
                        {galleryImages.map((img, index) => (
                          <div
                            className="relative w-[5.5rem] shrink-0 overflow-hidden rounded-md border border-border/70 sm:w-24"
                            key={img.id}
                          >
                            <img alt="" className="aspect-square w-full object-cover sm:h-20" src={img.url} />
                            <div className="flex flex-col gap-0.5 border-t border-border/60 bg-background/95 p-1">
                              <button
                                className="text-[0.65rem] font-medium text-primary"
                                onClick={() => promoteGalleryImageToCover(index)}
                                type="button"
                              >
                                设为封面
                              </button>
                              <button
                                className="text-[0.65rem] text-muted-foreground"
                                onClick={() => {
                                  setGalleryImages((prev) => prev.filter((_, i) => i !== index));
                                }}
                                type="button"
                              >
                                移除
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        批量选择时，若无封面则首张将作为封面，其余进入图册。
                      </p>
                    )}
                  </div>
                ) : null}
              </div>

              <input
                accept="image/*,video/*"
                className="hidden"
                onChange={(event) => {
                  void handleCoverMediaPick(event.target.files);
                }}
                ref={coverMediaInputRef}
                type="file"
              />

              <input
                accept="image/*"
                className="hidden"
                multiple
                onChange={(event) => {
                  void handleGalleryFilesAdded(event.target.files);
                }}
                ref={galleryInputRef}
                type="file"
              />
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-5">
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-primary">基本信息</div>
              <div className="grid gap-4 md:grid-cols-2">
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

                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground/72">状态</div>
                  <select
                    className="h-10 rounded-[calc(var(--radius-control)-0.1rem)] border border-input bg-card/88 px-3 text-sm"
                    onChange={(event) => setSelectedLifecycleStatus(event.target.value)}
                    value={selectedLifecycleStatus}
                  >
                    {lifecycleStatusOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="text-sm font-medium text-foreground/72">品牌</div>
                  <div className="relative">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="rounded-[calc(var(--radius-control)-0.1rem)] pl-9"
                      onChange={(event) => setBrandKeyword(event.target.value)}
                      placeholder="搜索已有品牌"
                      value={brandKeyword}
                    />
                  </div>
                  <div className="grid max-h-[9.5rem] grid-cols-2 gap-1 overflow-y-auto rounded-[calc(var(--radius-control)-0.15rem)] border border-border/70 bg-background/70 p-1.5 sm:grid-cols-3 lg:grid-cols-4">
                    {filteredBrands.map((brand) => {
                      const selected = selectedBrandId === brand.id;

                      return (
                        <button
                          className={cn(
                            "flex min-h-9 items-center gap-2 rounded-[calc(var(--radius-control)-0.2rem)] border px-2 py-1.5 text-left text-xs transition",
                            selected
                              ? "border-primary bg-primary/8 text-primary"
                              : "border-border/70 bg-white hover:border-primary/18 hover:bg-accent/24"
                          )}
                          key={brand.id}
                          onClick={() => setSelectedBrandId(brand.id)}
                          type="button"
                        >
                          <BrandIdentity
                            className="min-w-0 flex-1 truncate"
                            imageClassName="size-3.5 shrink-0"
                            logoUrl={brand.logoUrl}
                            name={brand.name}
                          />
                          {selected ? (
                            <span className="shrink-0 text-[0.65rem] font-medium">✓</span>
                          ) : null}
                        </button>
                      );
                    })}

                    {filteredBrands.length === 0 ? (
                      <div className="col-span-full px-2 py-4 text-center text-xs text-muted-foreground">
                        没有匹配的品牌。请先单独提交品牌申请。
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-[0.85rem] border border-dashed border-border/70 bg-surface-1 px-3 py-2 text-xs leading-snug text-muted-foreground">
                    仅支持选择已有品牌。
                  </div>
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-primary">参数与价格</div>
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
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-primary">简介</div>
              <div className="relative">
                <Textarea
                  className="min-h-24 resize-none pb-8"
                  maxLength={AIRCRAFT_SUMMARY_MAX_LENGTH}
                  onChange={(event) => setSummary(event.target.value.slice(0, AIRCRAFT_SUMMARY_MAX_LENGTH))}
                  placeholder="一句话摘要"
                  value={summary}
                />
                <div className="pointer-events-none absolute bottom-3 right-3 text-xs text-muted-foreground">
                  {summary.length}/{AIRCRAFT_SUMMARY_MAX_LENGTH}
                </div>
              </div>
              <div className="relative">
                <Textarea
                  className="min-h-44 resize-none pb-8"
                  maxLength={AIRCRAFT_DESCRIPTION_MAX_LENGTH}
                  onChange={(event) => setDescription(event.target.value.slice(0, AIRCRAFT_DESCRIPTION_MAX_LENGTH))}
                  placeholder="描述机型特点、场景和参数..."
                  value={description}
                />
                <div className="pointer-events-none absolute bottom-3 right-3 text-xs text-muted-foreground">
                  {description.length}/{AIRCRAFT_DESCRIPTION_MAX_LENGTH}
                </div>
              </div>
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
                    lifecycleStatus: selectedLifecycleStatus as
                      | "concept"
                      | "development"
                      | "testing"
                      | "unreleased"
                      | "released"
                      | "not_in_market"
                      | "marketed",
                    summary: summary.trim() || null,
                    description: description.trim() || null,
                    coverImageFileId: uploadedVideo ? null : coverImage?.id ?? null,
                    galleryImageFileIds: uploadedVideo
                      ? []
                      : galleryImages
                          .map((img) => img.id)
                          .filter((id) => id !== coverImage?.id)
                          .slice(0, GALLERY_IMAGE_MAX),
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
                        submissionPayload
                      )
                    : apiClient.createAircraftSubmission(submissionPayload);

                  void request
                    .then((payload) => {
                      void queryClient.invalidateQueries({ queryKey: ["models"] });
                      void queryClient.invalidateQueries({ queryKey: ["self-profile-content"] });
                      void navigate(buildPublishStatusPath("aircraft", payload.item.id), {
                        state: {
                          title: modelName.trim(),
                          description: summary.trim(),
                          imageUrl: uploadedVideo ? null : coverImage?.url ?? galleryImages[0]?.url ?? null
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
        <div className="space-y-3">
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">实时预览</div>
          <PublishAircraftLivePreview
            brand={selectedBrand}
            categoryName={selectedCategory?.name ?? null}
            coverImage={coverImage}
            description={description}
            galleryImages={galleryImages}
            galleryMax={GALLERY_IMAGE_MAX}
            lifecycleLabel={
              lifecycleStatusOptions.find((item) => item.value === selectedLifecycleStatus)?.label ?? "未发布"
            }
            modelName={modelName}
            placeholderImageUrl={coverUrl}
            powerLabel={powerTypeOptions.find((item) => item.value === selectedPowerType)?.label ?? "其他"}
            priceMaxStr={priceMax}
            priceMinStr={priceMin}
            summary={summary}
            uploadedVideo={uploadedVideo}
          />

          <details className="group rounded-xl border border-primary/20 bg-primary/[0.04] px-3 py-2.5 dark:bg-primary/[0.08]">
            <summary className="cursor-pointer list-none text-xs font-medium text-foreground/85 [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                <TagsIcon className="size-3.5 shrink-0 text-primary/80" />
                投稿说明
                <span className="text-[0.65rem] font-normal text-muted-foreground group-open:hidden">（点击展开）</span>
              </span>
            </summary>
            <ul className="mt-2 space-y-2 border-t border-primary/15 pt-2 text-[0.72rem] leading-relaxed text-muted-foreground">
              <li>分类由后台维护；选择品牌后，带 logo 的会在表单与预览中一致展示。</li>
              <li className="flex gap-1.5">
                <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-primary/70" />
                <span>审核通过后将进入机型库公开展示。</span>
              </li>
              <li className="flex gap-1.5">
                <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-primary/70" />
                <span>若无现成品牌，可先走品牌提案流程。</span>
              </li>
            </ul>
          </details>
        </div>
      }
      title="发布飞行器"
    />
  );
}
