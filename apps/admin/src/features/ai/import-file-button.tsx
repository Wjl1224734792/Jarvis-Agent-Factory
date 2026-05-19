import { UploadOutlined } from '@ant-design/icons';
import { Button, Modal, Typography } from 'antd';
import { useCallback, useRef, useState } from 'react';

const { Text } = Typography;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const VALID_EXTENSIONS = ['.md', '.markdown'];

interface ImportFileButtonProps {
  /** 导入回调，接收净化后的 HTML 字符串 */
  onImport: (html: string) => void;
  /** 按钮禁用状态 */
  disabled?: boolean;
}

/** 将 .md 文件解析为 HTML */
async function parseMarkdownFile(file: File): Promise<string> {
  const { marked } = await import('marked');
  const text = await file.text();
  return marked.parse(text, { async: false, gfm: true, breaks: true });
}

/** 校验文件扩展名 */
function isValidMarkdownFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return VALID_EXTENSIONS.some(ext => name.endsWith(ext));
}

/**
 * Markdown 文件导入按钮（admin 端） — 弹窗支持拖拽和点击选择 .md 文件，
 * 浏览器端解析并回调净化后的 HTML。
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

      if (!isValidMarkdownFile(file)) {
        setError('仅支持 .md (Markdown) 文件');
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError('文件过大（最大 10MB），请缩减内容后重试');
        return;
      }

      try {
        const { default: DOMPurify } = await import('dompurify');
        const rawHtml = await parseMarkdownFile(file);
        const cleanHtml = DOMPurify.sanitize(rawHtml);

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

  const handleClose = useCallback(() => {
    setOpen(false);
    setError(null);
    setIsDragOver(false);
    resetInput();
  }, [resetInput]);

  return (
    <>
      <input
        accept=".md,.markdown"
        aria-label="选择要导入的 Markdown 文件"
        style={{ display: 'none' }}
        onChange={event => void handleFileChange(event)}
        ref={inputRef}
        type="file"
      />

      <Button
        disabled={disabled}
        icon={<UploadOutlined />}
        onClick={() => setOpen(true)}
        size="small"
      >
        导入 MD
      </Button>

      <Modal
        cancelText="取消"
        okButtonProps={{ style: { display: 'none' } }}
        onCancel={handleClose}
        open={open}
        title="导入 Markdown 文件"
        width={480}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Text type="secondary">将 .md 文件内容导入到编辑器中</Text>

          {/* 拖拽区域 */}
          <div
            onClick={() => inputRef.current?.click()}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            role="button"
            style={{
              alignItems: 'center',
              borderColor: isDragOver ? '#1677ff' : '#d9d9d9',
              borderRadius: 12,
              borderStyle: 'dashed',
              borderWidth: 2,
              backgroundColor: isDragOver ? '#e6f4ff' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              justifyContent: 'center',
              padding: 32,
              transition: 'all 0.2s'
            }}
            tabIndex={0}
          >
            <UploadOutlined
              style={{
                color: isDragOver ? '#1677ff' : '#999',
                fontSize: 36
              }}
            />
            <div style={{ textAlign: 'center' }}>
              <Text
                strong
                style={{ color: isDragOver ? '#1677ff' : undefined }}
              >
                {isDragOver ? '释放以导入文件' : '拖拽 .md 文件到此处'}
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                仅支持 .md (Markdown) 文件，最大 10MB
              </Text>
            </div>
          </div>

          {/* 错误提示 */}
          {error ? (
            <Text type="danger">{error}</Text>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
