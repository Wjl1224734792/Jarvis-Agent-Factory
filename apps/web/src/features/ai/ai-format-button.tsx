import type { IDomEditor } from '@wangeditor/editor';
import { ChevronDownIcon, Loader2Icon, PaintbrushIcon, SparklesIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAiFormat } from './use-ai-format';

interface AiFormatButtonProps {
  /** wangEditor 编辑器实例，为 null 时按钮禁用 */
  editor: IDomEditor | null;
}

/** 判断编辑器是否有实际内容 */
function hasEditorContent(editor: IDomEditor): boolean {
  const html = editor.getHtml().trim();
  return html.length > 0 && html !== '<p><br></p>';
}

/**
 * 从当前 DOM Selection 中提取选区的 HTML 片段。
 *
 * @returns 选区 HTML；无选区或选区为空时返回 null。
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
 * 删除当前选区内容（不触发剪贴板）。
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
 * AI 排版下拉按钮 — 支持 beautify（局部美化）和 structure（全文结构化）两种模式。
 *
 * @param props.editor - wangEditor 编辑器实例。
 * @returns 渲染排版下拉按钮。
 */
export function AiFormatButton({ editor }: AiFormatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const aiFormat = useAiFormat();

  // 点击外部关闭下拉菜单
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleBeautify = useCallback(async () => {
    if (!editor) return;

    setIsOpen(false);

    const selectedHtml = getSelectionHtml();
    if (!selectedHtml) {
      editor.alert('请先选中需要排版的内容', 'warning');
      return;
    }

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
      editor.alert(message, 'error');
    } finally {
      aiFormat.reset();
    }
  }, [editor, aiFormat]);

  const handleStructure = useCallback(async () => {
    if (!editor) return;

    setIsOpen(false);

    if (!hasEditorContent(editor)) {
      editor.alert('请先输入内容', 'warning');
      return;
    }

    const confirmed = window.confirm('AI 将重新组织结构，是否继续？');
    if (!confirmed) {
      return;
    }

    const fullHtml = editor.getHtml();

    try {
      const result = await aiFormat.formatAsync({
        content: fullHtml,
        mode: 'structure'
      });

      if (result.html) {
        editor.setHtml(result.html);
        editor.focus();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '排版失败，请稍后重试';
      editor.alert(message, 'error');
    } finally {
      aiFormat.reset();
    }
  }, [editor, aiFormat]);

  return (
    <div className="relative inline-flex" ref={dropdownRef}>
      <Button
        className="rounded-r-none"
        disabled={!editor || aiFormat.isLoading}
        onClick={() => setIsOpen(current => !current)}
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
        <ChevronDownIcon data-icon="inline-end" className="size-3" />
      </Button>
      <Button
        className="rounded-l-none border-l-0 px-1.5"
        disabled={!editor || aiFormat.isLoading}
        onClick={() => setIsOpen(current => !current)}
        size="sm"
        type="button"
        variant="outline"
      >
        <ChevronDownIcon className="size-3" />
      </Button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-44 overflow-hidden rounded-lg border border-border/70 bg-white py-1 shadow-lg">
          <button
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition',
              'hover:bg-surface-1 focus:bg-surface-1 focus:outline-none'
            )}
            onClick={() => void handleBeautify()}
            type="button"
          >
            <PaintbrushIcon className="size-4 text-muted-foreground" />
            <span>美化选中内容</span>
          </button>
          <button
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition',
              'hover:bg-surface-1 focus:bg-surface-1 focus:outline-none'
            )}
            onClick={() => void handleStructure()}
            type="button"
          >
            <SparklesIcon className="size-4 text-muted-foreground" />
            <span>全文结构化</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
