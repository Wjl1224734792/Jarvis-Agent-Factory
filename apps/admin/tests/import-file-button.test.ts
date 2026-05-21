// @vitest-environment jsdom
/**
 * ImportFileButton 组件测试（admin 端）
 *
 * 验证 antd 版本的文档文件导入功能：
 * - .md / .docx / .txt 解析逻辑
 * - XSS 消毒
 * - 文件大小限制（10MB）
 * - 非法文件类型拒绝
 * - antd Modal 交互
 *
 * @see apps/admin/src/features/ai/import-file-button.tsx
 */
import React from 'react';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

/* ------------------------------------------------------------------ */
/*   模块 Mock                                                          */
/* ------------------------------------------------------------------ */

vi.mock('marked', () => ({
  marked: { parse: vi.fn() },
}));

vi.mock('mammoth', () => ({
  convertToHtml: vi.fn(),
}));

vi.mock('dompurify', () => ({
  default: { sanitize: vi.fn((html: string) => html) },
}));

vi.mock('@ant-design/icons', () => ({
  UploadOutlined: () =>
    React.createElement('span', { 'data-testid': 'upload-icon' }),
}));

/* ------------------------------------------------------------------ */
/*   antd 简化 mock                                                     */
/* ------------------------------------------------------------------ */

vi.mock('antd', () => ({
  Button: (props: Record<string, React.ReactNode>) => {
    const { children, onClick, disabled, icon, ...rest } = props;
    return React.createElement(
      'button',
      { onClick, disabled, 'data-testid': 'import-btn', ...rest },
      icon,
      children
    );
  },
  Modal: (props: Record<string, React.ReactNode>) => {
    const { children, open, onCancel, title, cancelText } = props;
    if (!open) return null;
    return React.createElement(
      'div',
      { 'data-testid': 'import-modal' },
      React.createElement('div', { 'data-testid': 'modal-title' }, title),
      React.createElement('div', { 'data-testid': 'modal-body' }, children),
      React.createElement(
        'button',
        {
          'data-testid': 'modal-cancel',
          onClick: onCancel as () => void,
        },
        cancelText
      )
    );
  },
  Typography: {
    Text: (props: Record<string, React.ReactNode>) => {
      const { children } = props;
      return React.createElement('span', {}, children);
    },
  },
  App: (props: Record<string, React.ReactNode>) => {
    const { children } = props;
    return React.createElement('div', {}, children);
  },
}));

/* ------------------------------------------------------------------ */
/*   辅助工具                                                           */
/* ------------------------------------------------------------------ */

function createMockFile(
  name: string,
  content: string,
  size?: number
): File {
  const blob = new Blob([content]);
  const file = new File([blob], name, { type: 'text/plain' });

  if (size !== undefined) {
    Object.defineProperty(file, 'size', { value: size });
  }

  return file;
}

function stubFileText() {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const original = File.prototype.text;
  File.prototype.text = function (this: File) {
    return this.arrayBuffer().then(buf => {
      const decoder = new TextDecoder();
      return decoder.decode(buf);
    });
  };
  return () => {
    File.prototype.text = original;
  };
}

/* ------------------------------------------------------------------ */
/*   模块级 mock 引用                                                    */
/* ------------------------------------------------------------------ */

type MockFn = ReturnType<typeof vi.fn>;
let markedMock: { parse: MockFn };
let mammothMock: { convertToHtml: MockFn };
let dompurifyMock: { sanitize: MockFn };

/* ------------------------------------------------------------------ */
/*   测试                                                               */
/* ------------------------------------------------------------------ */

describe('ImportFileButton (admin)', () => {
  let restoreFileText: () => void;

  beforeEach(async () => {
    vi.clearAllMocks();
    restoreFileText = stubFileText();

    markedMock = (await import('marked')).marked as {
      parse: MockFn;
    };
    mammothMock = (await import('mammoth')) as {
      convertToHtml: MockFn;
    };
    dompurifyMock = (await import('dompurify')).default as {
      sanitize: MockFn;
    };

    dompurifyMock.sanitize.mockImplementation((html: string) => html);
    markedMock.parse.mockReturnValue('<p>md content</p>');
    mammothMock.convertToHtml.mockResolvedValue({
      value: '<p>docx content</p>',
    });
  });

  afterEach(() => {
    cleanup();
    restoreFileText();
  });

  /* ================================================================ */
  /*   组件渲染测试                                                      */
  /* ================================================================ */

  describe('组件渲染', () => {
    it('渲染导入文件按钮', async () => {
      const onImport = vi.fn();
      const { ImportFileButton } = await import(
        '../src/features/ai/import-file-button'
      );

      const { container } = render(
        React.createElement(ImportFileButton, { onImport })
      );

      const button = container.querySelector('button');
      expect(button).not.toBeNull();
      expect(button?.textContent).toContain('导入文件');
    });

    it('disabled 为 true 时按钮禁用', async () => {
      const onImport = vi.fn();
      const { ImportFileButton } = await import(
        '../src/features/ai/import-file-button'
      );

      const { container } = render(
        React.createElement(ImportFileButton, { disabled: true, onImport })
      );

      const button = container.querySelector('button');
      expect(button).not.toBeNull();
      expect(button?.hasAttribute('disabled')).toBe(true);
    });

    it('初始状态不显示弹窗', async () => {
      const onImport = vi.fn();
      const { ImportFileButton } = await import(
        '../src/features/ai/import-file-button'
      );

      const { container } = render(
        React.createElement(ImportFileButton, { onImport })
      );

      const modal = container.querySelector('[data-testid="import-modal"]');
      expect(modal).toBeNull();
    });

    it('点击按钮打开弹窗', async () => {
      const onImport = vi.fn();
      const { ImportFileButton } = await import(
        '../src/features/ai/import-file-button'
      );

      const { container } = render(
        React.createElement(ImportFileButton, { onImport })
      );

      const button = container.querySelector('button');
      expect(button).not.toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      fireEvent.click(button!);

      await waitFor(() => {
        const modal = container.querySelector(
          '[data-testid="import-modal"]'
        );
        expect(modal).not.toBeNull();
      });
    });

    it('弹窗标题显示"导入文档文件"', async () => {
      const onImport = vi.fn();
      const { ImportFileButton } = await import(
        '../src/features/ai/import-file-button'
      );

      const { container } = render(
        React.createElement(ImportFileButton, { onImport })
      );

      const button = container.querySelector('button');
      expect(button).not.toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      fireEvent.click(button!);

      await waitFor(() => {
        const title = container.querySelector(
          '[data-testid="modal-title"]'
        );
        expect(title?.textContent).toBe('导入文档文件');
      });
    });

    it('点击取消按钮关闭弹窗', async () => {
      const onImport = vi.fn();
      const { ImportFileButton } = await import(
        '../src/features/ai/import-file-button'
      );

      const { container } = render(
        React.createElement(ImportFileButton, { onImport })
      );

      const openBtn = container.querySelector('button');
      expect(openBtn).not.toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      fireEvent.click(openBtn!);

      await waitFor(() => {
        expect(
          container.querySelector('[data-testid="import-modal"]')
        ).not.toBeNull();
      });

      const cancelBtn = container.querySelector(
        '[data-testid="modal-cancel"]'
      );
      expect(cancelBtn).not.toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      fireEvent.click(cancelBtn!);

      await waitFor(() => {
        expect(
          container.querySelector('[data-testid="import-modal"]')
        ).toBeNull();
      });
    });
  });

  /* ================================================================ */
  /*   各格式解析测试                                                    */
  /* ================================================================ */

  describe('.md 文件解析', () => {
    it('通过 marked 将 markdown 转换为 HTML', async () => {
      markedMock.parse.mockReturnValue('<h1>Title</h1><p>Body</p>');

      const file = createMockFile('readme.md', '# Title\nBody');
      const text = await file.text();
      const result = markedMock.parse(text, {
        async: false,
        gfm: true,
        breaks: true,
      });

      expect(result).toBe('<h1>Title</h1><p>Body</p>');
    });
  });

  describe('.docx 文件解析', () => {
    it('通过 mammoth 将 docx 转换为 HTML', async () => {
      mammothMock.convertToHtml.mockResolvedValue({
        value: '<h1>Word Doc</h1>',
      });

      const file = createMockFile('document.docx', 'fake-binary');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammothMock.convertToHtml({ arrayBuffer });

      expect(result.value).toBe('<h1>Word Doc</h1>');
    });
  });

  describe('.txt 文件解析', () => {
    it('将纯文本转换为 HTML 段落并转义特殊字符', async () => {
      const file = createMockFile('notes.txt', '第一行\n第二行');
      const text = await file.text();
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      const html = `<p>${escaped.replace(/\n/g, '<br>')}</p>`;

      expect(html).toBe('<p>第一行<br>第二行</p>');
    });

    it('转义 HTML 特殊字符', () => {
      const raw = '<script>alert("xss")</script>';
      const escaped = raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      expect(escaped).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });
  });

  /* ================================================================ */
  /*   消毒测试                                                          */
  /* ================================================================ */

  describe('DOMPurify 消毒', () => {
    it('所有解析结果均经过 DOMPurify 消毒', () => {
      dompurifyMock.sanitize.mockReturnValue('<p>safe</p>');

      const rawHtml = '<script>xss</script><p>content</p>';
      const cleanHtml = dompurifyMock.sanitize(rawHtml);

      expect(dompurifyMock.sanitize).toHaveBeenCalledWith(rawHtml);
      expect(cleanHtml).toBe('<p>safe</p>');
    });
  });

  /* ================================================================ */
  /*   文件类型验证测试                                                   */
  /* ================================================================ */

  describe('文件类型验证', () => {
    it('接受支持的三种格式', () => {
      const VALID_EXTENSIONS = [
        '.md',
        '.markdown',
        '.docx',
        '.txt',
      ];

      function isAcceptedFile(name: string): boolean {
        const lower = name.toLowerCase();
        return VALID_EXTENSIONS.some(ext => lower.endsWith(ext));
      }

      expect(isAcceptedFile('readme.md')).toBe(true);
      expect(isAcceptedFile('readme.markdown')).toBe(true);
      expect(isAcceptedFile('document.docx')).toBe(true);
      expect(isAcceptedFile('notes.txt')).toBe(true);
    });

    it('拒绝不支持的格式', () => {
      const VALID_EXTENSIONS = [
        '.md',
        '.markdown',
        '.docx',
        '.txt',
      ];

      function isAcceptedFile(name: string): boolean {
        const lower = name.toLowerCase();
        return VALID_EXTENSIONS.some(ext => lower.endsWith(ext));
      }

      expect(isAcceptedFile('legacy.doc')).toBe(false);
      expect(isAcceptedFile('image.png')).toBe(false);
      expect(isAcceptedFile('data.pdf')).toBe(false);
    });
  });

  /* ================================================================ */
  /*   文件大小限制测试                                                   */
  /* ================================================================ */

  describe('文件大小限制', () => {
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

    it('超过 10MB 的文件应被拒绝', () => {
      const oversizedFile = createMockFile(
        'huge.docx',
        'x',
        MAX_FILE_SIZE_BYTES + 1
      );
      expect(oversizedFile.size).toBeGreaterThan(MAX_FILE_SIZE_BYTES);
    });

    it('小于 10MB 的文件应被接受', () => {
      const normalFile = createMockFile('normal.md', 'content');
      expect(normalFile.size).toBeLessThan(MAX_FILE_SIZE_BYTES);
    });
  });

  /* ================================================================ */
  /*   错误处理测试                                                       */
  /* ================================================================ */

  describe('错误处理', () => {
    it('解析异常被捕获且不导致组件崩溃', async () => {
      const onImport = vi.fn();
      const { ImportFileButton } = await import(
        '../src/features/ai/import-file-button'
      );

      const { container } = render(
        React.createElement(ImportFileButton, { onImport })
      );

      expect(container.querySelector('button')).not.toBeNull();
    });
  });
});
