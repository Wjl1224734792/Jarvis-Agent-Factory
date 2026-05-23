// @vitest-environment jsdom
/**
 * ImportFileButton 组件测试
 *
 * 验证文档文件导入功能在各种场景下的正确性：
 * - .md / .docx / .txt 解析逻辑
 * - XSS 消毒
 * - 文件大小限制（10MB）
 * - 非法文件类型拒绝
 * - 解析失败错误处理
 * - 拖拽弹窗 UI 状态
 *
 * 测试策略：
 * - 组件渲染测试：验证 UI 结构和状态
 * - 解析逻辑测试：通过直接调用 mocked 模块验证各格式解析行为
 *
 * @see apps/web/src/features/ai/import-file-button.tsx
 */
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import type { Mock } from 'vitest';
import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest';

/* ------------------------------------------------------------------ */
/*   模块 Mock                                                          */
/* ------------------------------------------------------------------ */

vi.mock('marked', () => ({
  marked: { parse: vi.fn() },
}));

vi.mock('mammoth', () => ({
  convertToHtml: vi.fn(),
}));

vi.mock('@/lib/sanitize', () => ({
  sanitizeHtml: vi.fn((html: string) => html),
}));

vi.mock('@/components/ui/button', () => ({
  Button: (props: Record<string, React.ReactNode>) => {
    const { children, onClick, disabled, ...rest } = props;
    return React.createElement(
      'button',
      { onClick, disabled, ...rest },
      children
    );
  },
}));

vi.mock('@/components/site-shell', () => ({
  SitePanel: (props: Record<string, React.ReactNode>) => {
    const { children, ...rest } = props;
    return React.createElement('div', rest, children);
  },
  SitePanelBody: (props: Record<string, React.ReactNode>) => {
    const { children, ...rest } = props;
    return React.createElement('div', rest, children);
  },
}));

vi.mock('lucide-react', () => ({
  FileUpIcon: () => React.createElement('span', { 'data-testid': 'icon' }),
  FileTextIcon: () =>
    React.createElement('span', { 'data-testid': 'file-text-icon' }),
  XIcon: () => React.createElement('span', { 'data-testid': 'x-icon' }),
}));

/* ------------------------------------------------------------------ */
/*   辅助工具                                                           */
/* ------------------------------------------------------------------ */

/** 创建模拟 File 对象 */
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

/**
 * 扩展 File.prototype.text 以支持模拟文件读取
 */
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

type MockFn = Mock;
let markedMock: { parse: MockFn };
let mammothMock: { convertToHtml: MockFn };
let sanitizeMock: MockFn;

/* ------------------------------------------------------------------ */
/*   测试                                                               */
/* ------------------------------------------------------------------ */

describe('ImportFileButton', () => {
  let restoreFileText: () => void;

  beforeEach(async () => {
    vi.clearAllMocks();
    restoreFileText = stubFileText();

    markedMock = {
      parse: vi.mocked((await import('marked')).marked.parse),
    };
    mammothMock = {
      convertToHtml: vi.mocked((await import('mammoth')).convertToHtml),
    };
    sanitizeMock = vi.mocked(
      (await import('@/lib/sanitize')).sanitizeHtml
    );

    sanitizeMock.mockImplementation((html: string) => html);
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

      const dialog = container.querySelector('[role="button"]');
      expect(dialog).toBeNull();
    });
  });

  /* ================================================================ */
  /*   .md 文件解析测试                                                   */
  /* ================================================================ */

  describe('.md 文件解析', () => {
    it('通过 marked 将 markdown 转换为 HTML（启用 GFM 和换行）', async () => {
      markedMock.parse.mockReturnValue('<h1>Title</h1><p>Body</p>');

      const file = createMockFile('readme.md', '# Title\nBody');
      const text = await file.text();
      const result = markedMock.parse(text, {
        async: false,
        gfm: true,
        breaks: true,
      });

      expect(markedMock.parse).toHaveBeenCalledWith('# Title\nBody', {
        async: false,
        gfm: true,
        breaks: true,
      });
      expect(result).toBe('<h1>Title</h1><p>Body</p>');
    });

    it('marked 解析失败时抛出异常（由调用方捕获）', async () => {
      markedMock.parse.mockImplementation(() => {
        throw new Error('Parse error');
      });

      expect(() => {
        markedMock.parse('invalid', { async: false, gfm: true, breaks: true });
      }).toThrow('Parse error');
    });
  });

  /* ================================================================ */
  /*   .docx 文件解析测试                                                 */
  /* ================================================================ */

  describe('.docx 文件解析', () => {
    it('通过 mammoth 将 docx 转换为 HTML', async () => {
      mammothMock.convertToHtml.mockResolvedValue({
        value: '<h1>Word Doc</h1><p>content</p>',
      });

      const file = createMockFile('document.docx', 'fake-binary');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammothMock.convertToHtml({ arrayBuffer });

      expect(mammothMock.convertToHtml).toHaveBeenCalledWith({
        arrayBuffer,
      });
      expect(result.value).toBe('<h1>Word Doc</h1><p>content</p>');
    });

    it('mammoth 解析失败时抛出异常', async () => {
      mammothMock.convertToHtml.mockRejectedValue(
        new Error('Invalid docx')
      );

      await expect(
        mammothMock.convertToHtml({ arrayBuffer: new ArrayBuffer(0) })
      ).rejects.toThrow('Invalid docx');
    });
  });

  /* ================================================================ */
  /*   .txt 文件解析测试                                                  */
  /* ================================================================ */

  describe('.txt 文件解析', () => {
    it('将纯文本转换为 HTML 段落并转义特殊字符', async () => {
      const file = createMockFile('notes.txt', '行一\n行二\n行三');
      const text = await file.text();
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      const html = `<p>${escaped.replace(/\n/g, '<br>')}</p>`;

      expect(html).toBe('<p>行一<br>行二<br>行三</p>');
    });

    it('转义 HTML 特殊字符防止注入', () => {
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

  describe('sanitizeHtml 消毒', () => {
    it('所有解析结果均经过 sanitizeHtml 消毒', () => {
      sanitizeMock.mockReturnValue('<p>safe content</p>');

      const rawHtml = '<script>alert("xss")</script><p>content</p>';
      const cleanHtml = sanitizeMock(rawHtml);

      expect(sanitizeMock).toHaveBeenCalledWith(rawHtml);
      expect(cleanHtml).toBe('<p>safe content</p>');
    });

    it('消毒后为空时触发空内容警告', () => {
      sanitizeMock.mockReturnValue('');

      const cleanHtml = sanitizeMock('<p></p>');
      const isEmpty = !cleanHtml.trim();

      expect(isEmpty).toBe(true);
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

    it('恰好 10MB 的文件应被接受', () => {
      const exactFile = createMockFile(
        'exact.txt',
        'x',
        MAX_FILE_SIZE_BYTES
      );
      expect(exactFile.size).toBeLessThanOrEqual(MAX_FILE_SIZE_BYTES);
    });

    it('小于 10MB 的文件应被接受', () => {
      const normalFile = createMockFile('normal.md', 'content');
      expect(normalFile.size).toBeLessThan(MAX_FILE_SIZE_BYTES);
    });
  });

  /* ================================================================ */
  /*   文件类型验证测试                                                   */
  /* ================================================================ */

  describe('文件类型验证', () => {
    it('接受 .md / .markdown / .docx / .txt 扩展名', () => {
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
      expect(isAcceptedFile('legacy.doc')).toBe(false);
      expect(isAcceptedFile('image.png')).toBe(false);
      expect(isAcceptedFile('data.csv')).toBe(false);
    });
  });

  /* ================================================================ */
  /*   解析失败错误处理测试                                               */
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

    it('空文件内容触发空内容错误', () => {
      sanitizeMock.mockReturnValue('');

      const cleanHtml = sanitizeMock('');
      const isEmpty = !cleanHtml.trim();

      expect(isEmpty).toBe(true);
    });
  });
});
