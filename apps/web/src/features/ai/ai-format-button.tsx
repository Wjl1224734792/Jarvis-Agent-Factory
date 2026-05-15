import type { IDomEditor } from '@wangeditor/editor';
import { Loader2Icon, SparklesIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAiFormat } from './use-ai-format';

interface AiFormatButtonProps {
  /** wangEditor 编辑器实例，为 null 时按钮禁用 */
  editor: IDomEditor | null;
}

/**
 * 从当前 DOM Selection 中提取选区的 HTML 片段。
 */
function getSelectionHtml(): string | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (range.collapsed) {
    return null;
  }

  const container = document.createElement('div');
  container.appendChild(range.cloneContents());
  const html = container.innerHTML.trim();
  return html || null;
}

/**
 * 删除当前选区内容。
 */
function deleteCurrentSelection(): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
}

/**
 * AI 排版按钮 — 选中内容后自动美化排版。
 */
export function AiFormatButton({ editor }: AiFormatButtonProps) {
  const aiFormat = useAiFormat();
  const [warnMsg, setWarnMsg] = useState<string | null>(null);

  const handleFormat = useCallback(async () => {
    if (!editor) return;

    const selectedHtml = getSelectionHtml();
    if (!selectedHtml) {
      setWarnMsg('请先选中需要排版的内容');
      editor.focus();
      setTimeout(() => setWarnMsg(null), 2500);
      return;
    }
    setWarnMsg(null);

    try {
      const result = await aiFormat.formatAsync({
        content: selectedHtml,
        mode: 'beautify'
      });

      if (result.html) {
        deleteCurrentSelection();
        editor.dangerouslyInsertHtml(result.html);
        editor.focus();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '排版失败，请稍后重试';
      setWarnMsg(message);
      setTimeout(() => setWarnMsg(null), 3000);
    } finally {
      aiFormat.reset();
    }
  }, [editor, aiFormat]);

  return (
    <div className="relative inline-flex items-center gap-2">
      <Button
        disabled={!editor || aiFormat.isLoading}
        onClick={() => void handleFormat()}
        size="sm"
        type="button"
        variant="outline"
      >
        {aiFormat.isLoading ? (
          <Loader2Icon className="size-3.5 animate-spin" data-icon="inline-start" />
        ) : (
          <SparklesIcon data-icon="inline-start" />
        )}
        AI 排版
      </Button>
      {warnMsg ? (
        <span className="text-xs text-amber-600 whitespace-nowrap animate-in fade-in">{warnMsg}</span>
      ) : null}
    </div>
  );
}
