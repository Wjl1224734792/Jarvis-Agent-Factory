import type { PowerType } from "@feijia/schemas";
import { PlayIcon } from "lucide-react";
import { getModelImage } from "@/lib/aviation-media";
import { cn } from "@/lib/utils";

type ModelThumbCoverProps = {
  alt: string;
  slug: string;
  powerType: PowerType;
  index?: number;
  coverImageUrl?: string | null;
  coverVideoUrl?: string | null;
  className?: string;
  /** 列表卡片上的小播放角标（侧栏缩略可关） */
  showVideoPlayBadge?: boolean;
};

export function ModelThumbCover({
  alt,
  slug,
  powerType,
  index = 0,
  coverImageUrl,
  coverVideoUrl,
  className,
  showVideoPlayBadge = true
}: ModelThumbCoverProps) {
  const fallback = getModelImage(slug, powerType, index);

  if (coverVideoUrl) {
    return (
      <div className={cn("relative overflow-hidden bg-black", className)}>
        <video
          aria-hidden
          className="h-full w-full object-cover pointer-events-none"
          muted
          playsInline
          preload="metadata"
          src={coverVideoUrl}
        />
        {showVideoPlayBadge ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-black/50 text-white shadow-md sm:size-10">
              <PlayIcon className="size-4 translate-x-0.5 fill-current sm:size-5" />
            </span>
          </span>
        ) : null}
      </div>
    );
  }

  return <img alt={alt} className={cn("h-full w-full object-cover", className)} src={coverImageUrl ?? fallback} />;
}
