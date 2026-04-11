import { useEffect, useMemo, useRef, useState } from "react";
import { PlayIcon } from "lucide-react";
import { BrandIdentity } from "@/components/brand-identity";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatModelPriceRange } from "@/routes/model-detail-helpers";

type GalleryImage = { id: string; url: string };

type MediaSlot = { kind: "image" | "video"; url: string };

export type PublishAircraftLivePreviewProps = {
  modelName: string;
  categoryName: string | null;
  brand: { name: string; logoUrl?: string | null } | null;
  powerLabel: string;
  lifecycleLabel: string;
  priceMinStr: string;
  priceMaxStr: string;
  summary: string;
  description: string;
  coverImage: { url: string } | null;
  galleryImages: GalleryImage[];
  uploadedVideo: { url: string } | null;
  /** 无封面时的占位图 URL */
  placeholderImageUrl: string;
  galleryMax: number;
};

type LivePreviewMediaInput = Pick<
  PublishAircraftLivePreviewProps,
  "uploadedVideo" | "coverImage" | "galleryImages" | "placeholderImageUrl"
>;

function buildMediaSlots(input: LivePreviewMediaInput): MediaSlot[] {
  if (input.uploadedVideo) {
    return [{ kind: "video", url: input.uploadedVideo.url }];
  }

  const slots: MediaSlot[] = [];
  const seen = new Set<string>();

  if (input.coverImage) {
    slots.push({ kind: "image", url: input.coverImage.url });
    seen.add(input.coverImage.url);
  }

  for (const row of input.galleryImages) {
    if (!seen.has(row.url)) {
      slots.push({ kind: "image", url: row.url });
      seen.add(row.url);
    }
  }

  if (slots.length === 0) {
    return [{ kind: "image", url: input.placeholderImageUrl }];
  }

  return slots;
}

export function PublishAircraftLivePreview(props: PublishAircraftLivePreviewProps) {
  const { uploadedVideo, coverImage, galleryImages, placeholderImageUrl } = props;
  const slots = useMemo(
    () =>
      buildMediaSlots({
        uploadedVideo,
        coverImage,
        galleryImages,
        placeholderImageUrl
      }),
    [coverImage, galleryImages, placeholderImageUrl, uploadedVideo]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  const galleryKey = useMemo(
    () => galleryImages.map((g) => g.id).join(","),
    [galleryImages]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [uploadedVideo?.url, coverImage?.url, galleryKey]);

  useEffect(() => {
    heroVideoRef.current?.pause();
  }, [activeIndex]);

  useEffect(() => {
    if (activeIndex >= slots.length) {
      setActiveIndex(Math.max(0, slots.length - 1));
    }
  }, [activeIndex, slots.length]);

  const active = slots[activeIndex] ?? slots[0];
  const title = props.modelName.trim() || "机型名称预览";
  const pm = props.priceMinStr.trim() ? Number(props.priceMinStr) : null;
  const px = props.priceMaxStr.trim() ? Number(props.priceMaxStr) : null;
  const priceLabel = formatModelPriceRange(
    pm !== null && !Number.isNaN(pm) ? pm : null,
    px !== null && !Number.isNaN(px) ? px : null
  );
  const blurb =
    props.summary.trim() || props.description.trim() || "填写摘要或描述后，将显示在机型详情摘要区域。";

  const footerHint = props.uploadedVideo
    ? "封面为视频"
    : props.coverImage
      ? `图册 ${props.galleryImages.length}/${props.galleryMax} 张`
      : "尚未上传封面（示意配图）";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-none border border-border/80 bg-card shadow-sm",
        "ring-1 ring-black/3 dark:ring-white/6"
      )}
    >
      <div className="border-b border-border/60 bg-black">
        {active?.kind === "video" ? (
          <div className="relative aspect-[4/3] w-full">
            <video
              ref={heroVideoRef}
              aria-label="封面视频预览"
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
              src={active.url}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-black/50 text-white">
                <PlayIcon className="size-5 translate-x-0.5 fill-current" />
              </span>
            </span>
          </div>
        ) : (
          <img
            alt=""
            className="aspect-[4/3] w-full object-cover"
            src={active?.url ?? props.placeholderImageUrl}
          />
        )}
      </div>

      {slots.length > 1 ? (
        <div className="flex gap-1.5 overflow-x-auto border-b border-border/50 px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1">
          {slots.map((slot, index) => (
            <button
              className={cn(
                "h-12 w-[3.35rem] shrink-0 overflow-hidden border transition",
                activeIndex === index ? "border-primary ring-1 ring-primary/30" : "border-border/60 opacity-90 hover:opacity-100"
              )}
              key={`${slot.url}-${index}`}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              {slot.kind === "video" ? (
                <span className="relative block h-full w-full bg-black">
                  <video
                    aria-hidden
                    className="h-full w-full object-cover pointer-events-none"
                    muted
                    playsInline
                    preload="metadata"
                    src={slot.url}
                  />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                    <PlayIcon className="size-3 fill-white text-white" />
                  </span>
                </span>
              ) : (
                <img alt="" className="h-full w-full object-cover" src={slot.url} />
              )}
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-2.5 p-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge className="max-w-full font-normal" variant="outline">
            {props.brand ? (
              <BrandIdentity
                className="min-w-0"
                imageClassName="size-3"
                logoUrl={props.brand.logoUrl}
                name={props.brand.name}
              />
            ) : (
              <span className="text-muted-foreground">未选择品牌</span>
            )}
          </Badge>
          <Badge variant="outline">
            {props.categoryName ? (
              props.categoryName
            ) : (
              <span className="font-normal text-muted-foreground">未选择分类</span>
            )}
          </Badge>
          <Badge variant="outline">{props.powerLabel}</Badge>
          <Badge className="text-muted-foreground" variant="outline">
            {props.lifecycleLabel}
          </Badge>
        </div>

        <div className="text-lg font-semibold leading-snug tracking-tight text-foreground">{title}</div>

        {priceLabel ? (
          <div className="text-sm font-semibold text-primary">{priceLabel}</div>
        ) : (
          <div className="text-xs text-muted-foreground">价格未填写</div>
        )}

        <p className="line-clamp-4 text-[0.8125rem] leading-6 text-muted-foreground">{blurb}</p>

        <p className="border-t border-border/40 pt-2 text-[0.7rem] text-muted-foreground">{footerHint}</p>
      </div>
    </div>
  );
}
