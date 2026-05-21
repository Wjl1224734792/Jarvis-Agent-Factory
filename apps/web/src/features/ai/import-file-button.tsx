import { FileUpIcon, FileTextIcon, XIcon } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { SitePanel, SitePanelBody } from '@/components/site-shell';
import { Button } from '@/components/ui/button';
import { sanitizeHtml } from '@/lib/sanitize';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const VALID_EXTENSIONS = ['.md', '.markdown', '.docx', '.txt'];

interface ImportFileButtonProps {
  /** 导入回调，接收净化后的 HTML 字符串 */
  onImport: (html: string) => void;
  /** 按钮禁用状态 */
  disabled?: boolean;
}

/** 校验文件扩展名 */
function isValidImportFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return VALID_EXTENSIONS.some(ext => name.endsWith(ext));
}

/** 解析 .md / .markdown → HTML */
async function parseMarkdownFile(file: File): Promise<string> {
  const { marked } = await import('marked');
  const text = await file.text();
  return marked.parse(text, { async: false, gfm: true, breaks: true });
}

/** 解析 .docx → HTML */
async function parseDocxFile(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value;
}

/** 解析 .txt → HTML（先转义后包裹，防 HTML 注入） */
async function parseTextFile(file: File): Promise<string> {
  const text = await file.text();
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<p>${escaped.replace(/\n/g, '<br>')}</p>`;
}

/** 根据文件扩展名路由到正确的解析器 */
async function parseFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.md') || name.endsWith('.markdown')) {
    return parseMarkdownFile(file);
  }
  if (name.endsWith('.docx')) {
    return parseDocxFile(file);
  }
  return parseTextFile(file);
}

/**
 * 文档文件导入按钮 — 弹窗支持拖拽和点击选择文件，
 * 浏览器端解析并回调净化后的 HTML。
 *
 * 支持格式：.md / .docx / .txt
 *
 * @param props.onImport - 文件解析成功后的回调。
 * @param props.disabled - 按钮禁用状态。
 * @returns 渲染导入按钮及弹窗。
 */
export function ImportFileButton({ onImport, disabled }: ImportFileButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const resetInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!isValidImportFile(file)) {
        setError('仅支持 .docx / .md / .txt 文件');
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError('文件过大（最大 10MB），请缩减内容后重试');
        return;
      }

      try {
        const rawHtml = await parseFile(file);
        const cleanHtml = sanitizeHtml(rawHtml);

        if (!cleanHtml.trim()) {
          setError('文件内容为空或无法解析');
          return;
        }

        onImport(cleanHtml);
        setOpen(false);
        setError(null);
      } catch {
        setError('文件解析失败，请检查文件格式后重试');
      }

      resetInput();
    },
    [onImport, resetInput]
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void processFile(file);
      }
    },
    [processFile]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);

      const file = event.dataTransfer.files[0];
      if (file) {
        void processFile(file);
      }
    },
    [processFile]
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        setError(null);
        setIsDragOver(false);
        resetInput();
      }
    },
    [resetInput]
  );

  return (
    <>
      <input
        accept=".md,.markdown,.docx,.txt"
        aria-label="选择要导入的文档文件"
        className="hidden"
        onChange={event => void handleFileChange(event)}
        ref={inputRef}
        type="file"
      />

      <Button
        disabled={disabled}
        onClick={() => handleOpenChange(true)}
        size="sm"
        type="button"
        variant="outline"
        title={disabled ? "请先点击正文编辑区以启用导入功能" : undefined}
      >
        <FileUpIcon data-icon="inline-start" />
        导入文件
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/48 px-4 py-8 backdrop-blur-md">
          <SitePanel className="w-full max-w-[480px]" variant="floating">
            <SitePanelBody className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-foreground">
                    导入文档文件
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    将文件内容导入到编辑器中
                  </p>
                </div>
                <Button
                  onClick={() => handleOpenChange(false)}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <XIcon className="size-4" />
                  <span className="sr-only">关闭</span>
                </Button>
              </div>

              {/* 拖拽区域 */}
              <div
                className={[
                  'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors',
                  isDragOver
                    ? 'border-primary bg-primary/8'
                    : 'border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/40'
                ].join(' ')}
                onClick={() => inputRef.current?.click()}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <FileTextIcon className="size-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {isDragOver ? '释放以导入文件' : '拖拽文件到此处或点击选择'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    支持 .docx / .md / .txt，最大 10MB
                  </p>
                </div>
              </div>

              {/* 错误提示 */}
              {error ? (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button
                  onClick={() => handleOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  取消
                </Button>
              </div>
            </SitePanelBody>
          </SitePanel>
        </div>
      ) : null}
    </>
  );
}
