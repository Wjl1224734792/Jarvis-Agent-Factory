import type { IDomEditor } from '@wangeditor/editor';
import { DownOutlined, FormatPainterOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Button, Dropdown, Space } from 'antd';
import type { MenuProps } from 'antd';
import { useCallback, useState } from 'react';
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

/** 删除当前选区内容（不触发剪贴板）。 */
function deleteCurrentSelection(): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
}

/**
 * AI 排版按钮（admin 端） — 主按钮执行美化，右侧下拉按钮执行全文结构化。
 */
export function AiFormatButton({ editor }: AiFormatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const aiFormat = useAiFormat();

  const handleBeautify = useCallback(async () => {
    if (!editor) return;

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

    if (!hasEditorContent(editor)) {
      editor.alert('请先输入内容', 'warning');
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

  const dropdownItems: MenuProps['items'] = [
    {
      key: 'structure',
      icon: <ThunderboltOutlined />,
      label: '全文结构化',
      onClick: () => void handleStructure()
    }
  ];

  const disabled = !editor || aiFormat.isLoading;

  return (
    <Space.Compact>
      <Button
        disabled={disabled}
        icon={aiFormat.isLoading ? undefined : <FormatPainterOutlined />}
        loading={aiFormat.isLoading}
        onClick={() => void handleBeautify()}
      >
        AI 排版
      </Button>
      <Dropdown
        menu={{ items: dropdownItems }}
        onOpenChange={setIsOpen}
        open={isOpen}
        trigger={['click']}
      >
        <Button
          disabled={disabled}
          icon={<DownOutlined />}
        />
      </Dropdown>
    </Space.Compact>
  );
}
