import { CheckIcon, CopyIcon, RefreshCwIcon, SparklesIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AiSummaryPanelProps {
  /** 摘要文本 */
  summary: string | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 是否缓存命中 */
  cached?: boolean;
  /** 重新生成回调 */
  onRegenerate?: () => void;
  /** 生成回调（未生成时显示） */
  onGenerate?: () => void;
  /** 采用此摘要回调 */
  onAdopt?: (summary: string) => void;
  /** 是否禁用生成按钮 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * AI 摘要展示面板
 *
 * @param props 组件属性
 * @returns 渲染摘要面板
 */
export function AiSummaryPanel({
  summary,
  isLoading,
  error,
  cached,
  onRegenerate,
  onGenerate,
  onAdopt,
  disabled,
  className
}: AiSummaryPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!summary) return;
    void navigator.clipboard.writeText(summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [summary]);
  // 空状态：未生成时显示"点击生成 AI 摘要"
  if (!summary && !isLoading && !error) {
    return (
      <div className={cn('rounded-lg border border-dashed border-border/60 p-4', className)}>
        <div className="flex flex-col items-center gap-3 text-center">
          <SparklesIcon className="size-8 text-muted-foreground/50" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">AI 摘要</p>
            <p className="text-xs text-muted-foreground">
              点击生成 AI 摘要，快速了解文章核心内容
            </p>
          </div>
          <Button
            disabled={disabled}
            onClick={onGenerate}
            size="sm"
            type="button"
            variant="outline"
          >
            <SparklesIcon data-icon="inline-start" />
            生成 AI 摘要
          </Button>
        </div>
      </div>
    );
  }

  // 加载状态：显示 spinner
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border border-border/60 p-4', className)}>
        <div className="flex items-center gap-3">
          <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">正在生成 AI 摘要...</span>
        </div>
      </div>
    );
  }

  // 错误状态：显示错误信息
  if (error) {
    return (
      <div className={cn('rounded-lg border border-destructive/30 bg-destructive/5 p-4', className)}>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">生成失败</p>
            <p className="text-xs text-destructive/80">{error}</p>
          </div>
          {onRegenerate && (
            <Button
              disabled={disabled}
              onClick={onRegenerate}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCwIcon data-icon="inline-start" />
              重试
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 成功状态：显示摘要
  return (
    <div className={cn('rounded-lg border border-border/60 p-4', className)}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" />
            <span className="text-sm font-medium text-foreground">AI 摘要</span>
            {cached && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] text-primary">
                缓存
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onAdopt && summary && (
              <Button
                disabled={disabled}
                onClick={() => onAdopt(summary)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <CheckIcon data-icon="inline-start" />
                采用此摘要
              </Button>
            )}
            <Button
              disabled={disabled}
              onClick={handleCopy}
              size="sm"
              type="button"
              variant="ghost"
            >
              {copied ? (
                <CheckIcon data-icon="inline-start" className="text-green-600" />
              ) : (
                <CopyIcon data-icon="inline-start" />
              )}
              {copied ? '已复制' : '复制'}
            </Button>
            {onRegenerate && (
              <Button
                disabled={disabled}
                onClick={onRegenerate}
                size="sm"
                type="button"
                variant="ghost"
              >
                <RefreshCwIcon data-icon="inline-start" />
                重新生成
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm leading-6 text-foreground/82">{summary}</p>
        <div className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
          <SparklesIcon className="size-3" />
          <span>AI 生成</span>
        </div>
      </div>
    </div>
  );
}
