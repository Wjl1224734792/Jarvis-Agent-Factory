import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { CheckCircle2Icon, FileImageIcon, PlaneTakeoffIcon, SendHorizonalIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  SiteGrid,
  SitePage,
  SitePageDescription,
  SitePageEyebrow,
  SitePageHead,
  SitePageTitle,
  SitePanel,
  SitePanelBody,
  SiteRail
} from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "../lib/api-client";
import { getModelImage } from "../lib/aviation-media";

type UploadedImage = {
  id: string;
  url: string;
};

const powerTypeOptions = [
  { value: "electric", label: "电动" },
  { value: "fuel", label: "燃油" },
  { value: "hybrid", label: "混动" },
  { value: "other", label: "其他" }
] as const;

function buildNamedOptions(items: Array<{ slug: string; name: string }>) {
  if (items.some((item) => item.slug === "other")) {
    return items;
  }

  return [...items, { slug: "other", name: "其他" }];
}

export function PublishAircraftPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [modelName, setModelName] = useState("");
  const [selectedBrandSlug, setSelectedBrandSlug] = useState("other");
  const [selectedCategorySlug, setSelectedCategorySlug] = useState("other");
  const [selectedPowerType, setSelectedPowerType] = useState<string>("other");
  const [customBrandName, setCustomBrandName] = useState("");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [maxFlightTimeMinutes, setMaxFlightTimeMinutes] = useState("");
  const [maxRangeKilometers, setMaxRangeKilometers] = useState("");
  const [maxSpeedKph, setMaxSpeedKph] = useState("");
  const [takeoffWeightGrams, setTakeoffWeightGrams] = useState("");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtersQuery = useQuery({
    queryKey: ["aircraft-submission-filters"],
    queryFn: () => apiClient.listModels()
  });

  const categories = useMemo(
    () => buildNamedOptions((filtersQuery.data?.filters.categories ?? []).map((item) => ({ slug: item.slug, name: item.name }))),
    [filtersQuery.data?.filters.categories]
  );
  const brands = useMemo(
    () => buildNamedOptions((filtersQuery.data?.filters.brands ?? []).map((item) => ({ slug: item.slug, name: item.name }))),
    [filtersQuery.data?.filters.brands]
  );

  const selectedBrand = brands.find((item) => item.slug === selectedBrandSlug);
  const selectedCategory = categories.find((item) => item.slug === selectedCategorySlug);
  const coverUrl = uploadedImages[0]?.url ?? getModelImage("mini-4-pro", "electric");

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    if (uploadedImages.length + files.length > 6) {
      setError("最多上传 6 张图片。");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const nextImages: UploadedImage[] = [];
      for (const file of Array.from(files)) {
        const uploaded = await apiClient.uploadPostImage(file);
        nextImages.push({
          id: uploaded.item.id,
          url: uploaded.item.url
        });
      }
      setUploadedImages((current) => [...current, ...nextImages]);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "图片上传失败");
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  function resolveBrandName() {
    return selectedBrandSlug === "other" ? customBrandName.trim() || "其他" : selectedBrand?.name ?? "其他";
  }

  function resolveCategoryName() {
    return selectedCategorySlug === "other"
      ? customCategoryName.trim() || "其他"
      : selectedCategory?.name ?? "其他";
  }

  return (
    <SitePage className="gap-5">
      <SitePageHead>
        <SitePageEyebrow>Aircraft Submission</SitePageEyebrow>
        <SitePageTitle className="text-[2.8rem]">发布飞行器</SitePageTitle>
        <SitePageDescription>
          可直接选择品牌、分类和动力，也可以选“其他”自行填写。提交后会进入审核流，审核通过后可自动进入机型库。
        </SitePageDescription>
      </SitePageHead>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>飞行器发布失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <SiteGrid className="xl:grid-cols-[minmax(0,1fr)_320px]" variant="default">
        <div className="space-y-5">
          <SitePanel>
            <SitePanelBody className="grid gap-4 md:grid-cols-2">
              <select
                className="h-11 rounded-[var(--radius-control)] border border-border/70 bg-white px-3 text-sm"
                onChange={(event) => setSelectedBrandSlug(event.target.value)}
                value={selectedBrandSlug}
              >
                {brands.map((brand) => (
                  <option key={brand.slug} value={brand.slug}>
                    {brand.name}
                  </option>
                ))}
              </select>
              <Input
                onChange={(event) => setModelName(event.target.value)}
                placeholder="机型名称，例如 Mini 4 Pro"
                value={modelName}
              />
              {selectedBrandSlug === "other" ? (
                <Input
                  onChange={(event) => setCustomBrandName(event.target.value)}
                  placeholder="填写品牌名称"
                  value={customBrandName}
                />
              ) : (
                <div className="flex items-center rounded-[var(--radius-control)] border border-border/70 bg-muted/15 px-3 text-sm text-muted-foreground">
                  已选择品牌：{selectedBrand?.name ?? "其他"}
                </div>
              )}

              <select
                className="h-11 rounded-[var(--radius-control)] border border-border/70 bg-white px-3 text-sm"
                onChange={(event) => setSelectedCategorySlug(event.target.value)}
                value={selectedCategorySlug}
              >
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>

              {selectedCategorySlug === "other" ? (
                <Input
                  onChange={(event) => setCustomCategoryName(event.target.value)}
                  placeholder="填写机型分类"
                  value={customCategoryName}
                />
              ) : (
                <div className="flex items-center rounded-[var(--radius-control)] border border-border/70 bg-muted/15 px-3 text-sm text-muted-foreground">
                  已选择分类：{selectedCategory?.name ?? "其他"}
                </div>
              )}

              <select
                className="h-11 rounded-[var(--radius-control)] border border-border/70 bg-white px-3 text-sm"
                onChange={(event) => setSelectedPowerType(event.target.value)}
                value={selectedPowerType}
              >
                {powerTypeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="text-lg font-semibold text-foreground">封面与媒体资料</div>
              <div className="grid gap-4 md:grid-cols-[180px_repeat(3,minmax(0,1fr))]">
                <button
                  className="flex h-44 items-center justify-center border border-dashed border-border/70 bg-muted/20"
                  onClick={() => imageInputRef.current?.click()}
                  type="button"
                >
                  {uploadedImages[0] ? (
                    <img
                      alt="cover"
                      className="h-full w-full object-cover"
                      src={uploadedImages[0].url}
                    />
                  ) : (
                    <FileImageIcon className="size-8 text-muted-foreground" />
                  )}
                </button>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div className="flex h-28 items-center justify-center border border-dashed border-border/70 bg-muted/20" key={index}>
                    {uploadedImages[index + 1] ? (
                      <img
                        alt="gallery"
                        className="h-full w-full object-cover"
                        src={uploadedImages[index + 1].url}
                      />
                    ) : (
                      <FileImageIcon className="size-5 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
              <input
                accept="image/*"
                className="hidden"
                multiple
                onChange={(event) => {
                  void handleImageUpload(event.target.files);
                }}
                ref={imageInputRef}
                type="file"
              />
              <Input
                onChange={(event) => setVideoUrl(event.target.value)}
                placeholder="视频演示 URL（可选）"
                value={videoUrl}
              />
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="text-lg font-semibold text-foreground">参数</div>
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
              <div className="text-lg font-semibold text-foreground">机型介绍</div>
              <Textarea
                className="min-h-28 rounded-none"
                onChange={(event) => setSummary(event.target.value)}
                placeholder="一句话摘要"
                value={summary}
              />
              <Textarea
                className="min-h-48 rounded-none"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="描述机型特点、应用场景和核心参数..."
                value={description}
              />
              <div className="flex flex-wrap justify-end gap-3">
                <Button asChild type="button" variant="outline">
                  <Link to={APP_ROUTES.models}>取消</Link>
                </Button>
                <Button
                  disabled={
                    !modelName.trim() ||
                    !resolveBrandName().trim() ||
                    !resolveCategoryName().trim() ||
                    isSubmitting ||
                    isUploading
                  }
                  onClick={() => {
                    setError(null);
                    setIsSubmitting(true);

                    void apiClient
                      .createAircraftSubmission({
                        brandName: resolveBrandName(),
                        modelName: modelName.trim(),
                        aircraftType: resolveCategoryName(),
                        powerType: selectedPowerType as "electric" | "fuel" | "hybrid" | "other",
                        summary: summary.trim() || null,
                        description: description.trim() || null,
                        coverImageUrl: uploadedImages[0]?.url ?? null,
                        galleryImageUrls: uploadedImages.slice(1).map((item) => item.url),
                        videoUrl: videoUrl.trim() || null,
                        maxFlightTimeMinutes: maxFlightTimeMinutes ? Number(maxFlightTimeMinutes) : null,
                        maxRangeKilometers: maxRangeKilometers ? Number(maxRangeKilometers) : null,
                        maxSpeedKph: maxSpeedKph ? Number(maxSpeedKph) : null,
                        takeoffWeightGrams: takeoffWeightGrams ? Number(takeoffWeightGrams) : null
                      })
                      .then((payload) => {
                        void queryClient.invalidateQueries({ queryKey: ["models"] });
                        navigate(APP_ROUTES.modelDetail.replace(":slug", payload.item.approvedModelSlug ?? "mini-4-pro"));
                      })
                      .catch((reason: unknown) => {
                        setError(reason instanceof Error ? reason.message : "飞行器发布失败");
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
              </div>
            </SitePanelBody>
          </SitePanel>
        </div>

        <SiteRail>
          <SitePanel variant="muted">
            <SitePanelBody className="space-y-4">
              <div className="text-sm uppercase tracking-[0.24em] text-muted-foreground">预览</div>
              <img alt="model preview" className="h-48 w-full object-cover" src={coverUrl} />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {[
                  { label: "品牌", value: resolveBrandName() || "其他" },
                  { label: "分类", value: resolveCategoryName() || "其他" },
                  {
                    label: "动力",
                    value: powerTypeOptions.find((item) => item.value === selectedPowerType)?.label ?? "其他"
                  }
                ].map((item) => (
                  <div className="border border-border/60 p-3" key={item.label}>
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</div>
                    <div className="mt-2 text-lg font-semibold text-foreground">{item.value}</div>
                  </div>
                ))}
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="highlight">
            <SitePanelBody className="space-y-4">
              <CheckCircle2Icon className="size-6" />
              <div className="text-2xl font-semibold">投稿规范</div>
              <p className="text-sm leading-7 text-panel-highlight-foreground/84">
                优先使用清晰封面图、完整参数和可验证的品牌/机型信息，未命中的分类与品牌可以直接选择“其他”。
              </p>
            </SitePanelBody>
          </SitePanel>
        </SiteRail>
      </SiteGrid>
    </SitePage>
  );
}
