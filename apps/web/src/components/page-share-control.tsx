import { DownloadIcon, Share2Icon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useShareQrDataUrl } from "@/hooks/use-share-qr-data-url";
import { toAbsoluteShareUrl } from "@/lib/share-url";
import { cn } from "@/lib/utils";

type PageShareControlProps = {
  sharePath: string;
  className?: string;
  /** 阻止外层（如卡片 Link）接收指针事件 */
  stopPointerPropagation?: boolean;
  /** 剪贴板写入成功后回调（如记录服务端分享次数） */
  onCopySuccess?: () => void;
  disabled?: boolean;
  /** default：悬停 primary；sky：机型详情互动条；plainShare：帖子互动条 agree-gray / rating-blue */
  tone?: "default" | "sky" | "plainShare";
  /** 已分享等高亮态（配合 tone="sky" | "plainShare"） */
  active?: boolean;
  /** 覆盖分享图标尺寸，默认 size-4 */
  iconClassName?: string;
  "aria-label"?: string;
};

export function PageShareControl({
  sharePath,
  className,
  stopPointerPropagation = false,
  onCopySuccess,
  disabled = false,
  tone = "default",
  active = false,
  iconClassName,
  "aria-label": ariaLabel = "分享"
}: PageShareControlProps) {
  const absoluteUrl = useMemo(() => toAbsoluteShareUrl(sharePath), [sharePath]);
  const { dataUrl, error: qrError } = useShareQrDataUrl(absoluteUrl);
  const [feedback, setFeedback] = useState<string | null>(null);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setFeedback("已复制链接");
      onCopySuccess?.();
    } catch {
      setFeedback("复制失败");
    }
    window.setTimeout(() => {
      setFeedback(null);
    }, 2000);
  }, [absoluteUrl, onCopySuccess]);

  function downloadQr() {
    if (!dataUrl) {
      return;
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "feijia-share-qr.png";
    a.rel = "noopener";
    a.click();
  }

  function swallowCardNavigation(e: React.SyntheticEvent) {
    if (stopPointerPropagation) {
      e.stopPropagation();
    }
  }

  return (
    <span className={cn("inline-flex", className)}>
      <HoverCard closeDelay={120} openDelay={180}>
        <HoverCardTrigger asChild>
          <Button
            aria-label={ariaLabel}
            className={cn(
              "group inline-flex size-auto min-h-0 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-1 shadow-none active:translate-y-0",
              tone === "sky" &&
                (active
                  ? "text-sky-700 hover:!bg-transparent hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                  : "text-muted-foreground hover:!bg-transparent hover:text-sky-700 dark:hover:text-sky-400"),
              tone === "plainShare" &&
                (active
                  ? "text-rating-blue hover:!bg-transparent hover:text-rating-blue"
                  : "text-agree-gray hover:!bg-transparent hover:text-rating-blue"),
              tone === "default" && "text-muted-foreground hover:!bg-transparent hover:text-primary",
              tone === "sky" && "focus-visible:ring-2 focus-visible:ring-sky-400/45 focus-visible:ring-offset-2",
              tone === "plainShare" && "focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2",
              tone === "default" && "focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
              disabled && "pointer-events-none opacity-45"
            )}
            disabled={disabled}
            onClick={(e) => {
              swallowCardNavigation(e);
              void copyLink();
            }}
            onPointerDown={swallowCardNavigation}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Share2Icon
              className={cn(
                "shrink-0 transition-transform duration-150 ease-out group-active:scale-[0.92]",
                iconClassName ?? "size-4",
                active && tone === "sky" && "scale-105",
                active && tone === "plainShare" && "scale-105 text-rating-blue"
              )}
              fill={active && tone === "plainShare" ? "currentColor" : "none"}
              strokeWidth={active && tone === "plainShare" ? 1.7 : 2}
            />
          </Button>
        </HoverCardTrigger>
        <HoverCardContent
          align="end"
          className="w-[min(20rem,calc(100vw-1.5rem))] border-border/70 bg-card p-4 shadow-lg"
          onPointerDown={swallowCardNavigation}
          sideOffset={8}
        >
        <div aria-live="polite" className="sr-only">
          {feedback}
        </div>
        <div className="space-y-3">
          <div className="text-center text-sm font-medium text-foreground">扫码分享</div>
          <div className="flex justify-center rounded-md bg-white p-3 dark:bg-white">
            {dataUrl ? (
              <img alt="" className="size-[200px] max-w-full" height={200} src={dataUrl} width={200} />
            ) : qrError ? (
              <div className="flex size-[200px] items-center justify-center text-center text-xs text-muted-foreground">
                二维码生成失败
              </div>
            ) : (
              <div className="flex size-[200px] items-center justify-center text-xs text-muted-foreground">
                生成中…
              </div>
            )}
          </div>
          <p className="break-all text-center text-[0.72rem] leading-relaxed text-muted-foreground">{absoluteUrl}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button className="h-8 text-xs" onClick={() => void copyLink()} size="sm" type="button" variant="outline">
              复制链接
            </Button>
            <Button
              className="h-8 text-xs"
              disabled={!dataUrl}
              onClick={downloadQr}
              size="sm"
              type="button"
              variant="outline"
            >
              <DownloadIcon className="mr-1 size-3.5" data-icon="inline-start" />
              下载二维码
            </Button>
          </div>
        </div>
      </HoverCardContent>
      </HoverCard>
    </span>
  );
}
