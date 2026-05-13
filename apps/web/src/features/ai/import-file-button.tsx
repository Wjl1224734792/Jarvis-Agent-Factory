import type { IDomEditor } from '@wangeditor/editor';
import { FileUpIcon } from 'lucide-react';
import { useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = '.docx,.md,.txt';

/** 将 .docx 文件解析为 HTML */
async function parseDocxFile(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value;
}

/** 将 .md 文件解析为 HTML */
async function parseMarkdownFile(file: File): Promise<string> {
  const { marked } = await import('marked');
  const text = await file.text();
  return marked.parse(text, { gfm: true, breaks: true }) as string;
}

/** 将 .txt 文件包裹为 HTML 段落 */
function parsePlainTextFile(file: File): Promise<string> {
  return file.text().then(
    text =>
      text
        .split('\n')
        .map(line => `<p>${line || '<br>'}</p>`)
        .join('')
  );
}

/** 根据文件扩展名选择解析策略 */
function parseFileByExtension(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.docx')) {
    return parseDocxFile(file);
  }

  if (name.endsWith('.md') || name.endsWith('.markdown')) {
    return parseMarkdownFile(file);
  }

  if (name.endsWith('.txt')) {
    return parsePlainTextFile(file);
  }

  return Promise.reject(new Error('不支持的文件格式'));
}

interface ImportFileButtonProps {
  /** wangEditor 编辑器实例，为 null 时按钮禁用 */
  editor: IDomEditor | null;
}

/**
 * 文件导入按钮 — 支持 docx/md/txt 浏览器端解析并注入 wangEditor。
 *
 * @param props.editor - wangEditor 编辑器实例。
 * @returns 渲染导入文件按钮。
 * @throws 不会主动抛出异常，解析失败通过 editor.alert 展示。
 */
export function ImportFileButton({ editor }: ImportFileButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        editor?.alert('文件过大，请缩减内容后重试', 'error');
        resetInput();
        return;
      }

      try {
        const { default: DOMPurify } = await import('dompurify');
        const rawHtml = await parseFileByExtension(file);
        const cleanHtml = DOMPurify.sanitize(rawHtml);

        if (!cleanHtml.trim()) {
          editor?.alert('文件内容为空或无法解析', 'warning');
          resetInput();
          return;
        }

        if (editor) {
          const currentHtml = editor.getHtml();
          if (currentHtml.trim() && currentHtml !== '<p><br></p>') {
            editor.dangerouslyInsertHtml(cleanHtml);
          } else {
            editor.setHtml(cleanHtml);
          }
          editor.focus();
        }
      } catch {
        editor?.alert('文件解析失败，请检查文件格式后重试', 'error');
      }

      resetInput();
    },
    [editor]
  );

  function resetInput() {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  return (
    <>
      <input
        accept={ACCEPTED_EXTENSIONS}
        aria-label="选择要导入的文件"
        className="hidden"
        onChange={event => void handleFileChange(event)}
        ref={inputRef}
        type="file"
      />
      <Button
        disabled={!editor}
        onClick={() => inputRef.current?.click()}
        size="sm"
        type="button"
        variant="outline"
      >
        <FileUpIcon data-icon="inline-start" />
        导入文件
      </Button>
    </>
  );
}
