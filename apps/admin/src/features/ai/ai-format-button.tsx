import type { IDomEditor } from '@wangeditor/editor';
import { FormatPainterOutlined } from '@ant-design/icons';
import { App, Button } from 'antd';
import { useCallback } from 'react';
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

/** 删除当前选区内容。 */
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
  const { message } = App.useApp();

  const handleFormat = useCallback(async () => {
    if (!editor) return;

    const selectedHtml = getSelectionHtml();
    if (!selectedHtml) {
      message.warning('请先选中需要排版的内容');
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
      const msg = error instanceof Error ? error.message : '排版失败，请稍后重试';
      message.error(msg);
    } finally {
      aiFormat.reset();
    }
  }, [editor, aiFormat]);

  const disabled = !editor || aiFormat.isLoading;

  return (
    <Button
      disabled={disabled}
      icon={aiFormat.isLoading ? undefined : <FormatPainterOutlined />}
      loading={aiFormat.isLoading}
      onClick={() => void handleFormat()}
    >
      AI 排版
    </Button>
  );
}
