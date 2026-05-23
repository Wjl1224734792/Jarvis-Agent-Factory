import { CheckIcon, CopyIcon, DownloadIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useShareQrDataUrl } from '@/hooks/use-share-qr-data-url';
import { toAbsoluteShareUrl } from '@/lib/share-url';

type ShareQrCodeDialogProps = {
  /** 控制弹窗开关 */
  open: boolean;
  /** 弹窗状态变化回调 */
  onOpenChange: (open: boolean) => void;
  /** 帖子详情页的站内 path（如 /post/:id） */
  url: string;
  /** 帖子标题（可选，用于无障碍描述） */
  title?: string;
};

/**
 * 帖子分享二维码弹窗。
 * 展示二维码图片和可复制的帖子链接。
 */
export function ShareQrCodeDialog({
  open,
  onOpenChange,
  url,
  title,
}: ShareQrCodeDialogProps) {
  const absoluteUrl = useMemo(() => toAbsoluteShareUrl(url), [url]);
  const { dataUrl, error: qrError } = useShareQrDataUrl(absoluteUrl, open);
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      toast.success('链接已复制');
      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      toast.error('复制失败，请手动复制');
    }
  }, [absoluteUrl]);

  const downloadQr = useCallback(() => {
    if (!dataUrl) {
      return;
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'feijia-share-qr.png';
    a.rel = 'noopener';
    a.click();
  }, [dataUrl]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>分享帖子</DialogTitle>
          {title ? (
            <DialogDescription>{title}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* 二维码区域 */}
          <div className="flex size-[200px] items-center justify-center rounded-lg bg-white p-3 dark:bg-white">
            {dataUrl ? (
              <img
                alt={title ? `「${title}」分享二维码` : '分享二维码'}
                className="size-[200px] max-w-full"
                height={200}
                src={dataUrl}
                width={200}
              />
            ) : qrError ? (
              <div className="flex size-[200px] items-center justify-center text-center text-xs text-muted-foreground">
                二维码生成失败
              </div>
            ) : (
              <div className="flex size-[200px] items-center justify-center text-xs text-muted-foreground">
                生成中...
              </div>
            )}
          </div>

          {/* 链接 + 复制按钮 */}
          <div className="flex w-full items-center gap-2">
            <Input
              aria-label="帖子链接"
              className="flex-1 text-xs"
              readOnly
              value={absoluteUrl}
            />
            <Button
              className="shrink-0"
              onClick={() => void copyLink()}
              size="sm"
              type="button"
              variant={copied ? 'secondary' : 'outline'}
            >
              {copied ? (
                <CheckIcon className="mr-1 size-3.5" data-icon="inline-start" />
              ) : (
                <CopyIcon className="mr-1 size-3.5" data-icon="inline-start" />
              )}
              {copied ? '已复制' : '复制'}
            </Button>
          </div>

          {/* 下载二维码按钮 */}
          <Button
            className="w-full"
            disabled={!dataUrl}
            onClick={downloadQr}
            size="sm"
            type="button"
            variant="ghost"
          >
            <DownloadIcon className="mr-1.5 size-3.5" data-icon="inline-start" />
            下载二维码
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
