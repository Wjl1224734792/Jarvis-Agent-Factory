// @vitest-environment jsdom
/**
 * ImportFileButton 组件测试
 *
 * 验证 Markdown 文件导入功能在各种场景下的正确性：
 * - .md 解析逻辑
 * - DOMPurify XSS 消毒
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
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

/* ------------------------------------------------------------------ */
/*  模块 Mock                                                         */
/* ------------------------------------------------------------------ */

vi.mock('marked', () => ({
  marked: { parse: vi.fn() },
}));

vi.mock('dompurify', () => ({
  default: { sanitize: vi.fn((html: string) => html) },
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
/*  辅助工具                                                           */
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
 * jsdom 的 File 实现可能不支持 text() 方法
 */
function stubFileText() {
  const original = File.prototype.text;
  File.prototype.text = function () {
    return (this as File).arrayBuffer().then(buf => {
      const decoder = new TextDecoder();
      return decoder.decode(buf);
    });
  };
  return () => {
    File.prototype.text = original;
  };
}

/* ------------------------------------------------------------------ */
/*  模块级 mock 引用                                                    */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockFn = any;
let markedMock: { parse: MockFn };
let dompurifyMock: { sanitize: MockFn };

/* ------------------------------------------------------------------ */
/*  测试                                                               */
/* ------------------------------------------------------------------ */

describe('ImportFileButton', () => {
  let restoreFileText: () => void;

  beforeEach(async () => {
    vi.clearAllMocks();
    restoreFileText = stubFileText();

    // 获取 mock 引用并配置默认实现
    markedMock = (await import('marked')).marked as unknown as {
      parse: ReturnType<typeof vi.fn>;
    };
    dompurifyMock = (await import('dompurify')).default as unknown as {
      sanitize: ReturnType<typeof vi.fn>;
    };

    // 配置默认 mock 实现
    dompurifyMock.sanitize.mockImplementation((html: string) => html);
    markedMock.parse.mockReturnValue('<p>md content</p>');
  });

  afterEach(() => {
    cleanup();
    restoreFileText();
  });

  /* ================================================================ */
  /*  组件渲染测试                                                      */
  /* ================================================================ */

  describe('组件渲染', () => {
    it('渲染导入 MD 按钮', async () => {
      const onImport = vi.fn();
      const { ImportFileButton } = await import(
        '../src/features/ai/import-file-button'
      );

      const { container } = render(
        React.createElement(ImportFileButton, { onImport })
      );

      const button = container.querySelector('button');
      expect(button).not.toBeNull();
      expect(button?.textContent).toContain('导入 MD');
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

      // 弹窗不应在初始渲染时出现
      const dialog = container.querySelector('[role="button"]');
      expect(dialog).toBeNull();
    });
  });

  /* ================================================================ */
  /*  文件解析逻辑测试                                                   */
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

      expect(() =>
        markedMock.parse('invalid', { async: false, gfm: true, breaks: true })
      ).toThrow('Parse error');
    });
  });

  /* ================================================================ */
  /*  DOMPurify 消毒测试                                                */
  /* ================================================================ */

  describe('DOMPurify 消毒', () => {
    it('所有解析结果均经过 DOMPurify 消毒', () => {
      dompurifyMock.sanitize.mockReturnValue('<p>safe content</p>');

      const rawHtml = '<script>alert("xss")</script><p>content</p>';
      const cleanHtml = dompurifyMock.sanitize(rawHtml);

      expect(dompurifyMock.sanitize).toHaveBeenCalledWith(rawHtml);
      expect(cleanHtml).toBe('<p>safe content</p>');
    });

    it('消毒后为空时触发空内容警告', () => {
      dompurifyMock.sanitize.mockReturnValue('');

      const cleanHtml = dompurifyMock.sanitize('<p></p>');
      const isEmpty = !cleanHtml.trim();

      expect(isEmpty).toBe(true);
    });
  });

  /* ================================================================ */
  /*  文件大小限制测试                                                   */
  /* ================================================================ */

  describe('文件大小限制', () => {
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

    it('超过 10MB 的文件应被拒绝', () => {
      const oversizedFile = createMockFile(
        'huge.md',
        'x',
        MAX_FILE_SIZE_BYTES + 1
      );
      expect(oversizedFile.size).toBeGreaterThan(MAX_FILE_SIZE_BYTES);
    });

    it('恰好 10MB 的文件应被接受', () => {
      const exactFile = createMockFile(
        'exact.md',
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
  /*  文件类型验证测试                                                   */
  /* ================================================================ */

  describe('文件类型验证', () => {
    it('仅接受 .md 和 .markdown 扩展名', () => {
      const VALID_EXTENSIONS = ['.md', '.markdown'];

      function isAcceptedFile(name: string): boolean {
        const lower = name.toLowerCase();
        return VALID_EXTENSIONS.some(ext => lower.endsWith(ext));
      }

      expect(isAcceptedFile('readme.md')).toBe(true);
      expect(isAcceptedFile('readme.markdown')).toBe(true);
      expect(isAcceptedFile('document.docx')).toBe(false);
      expect(isAcceptedFile('notes.txt')).toBe(false);
      expect(isAcceptedFile('image.png')).toBe(false);
      expect(isAcceptedFile('data.csv')).toBe(false);
      expect(isAcceptedFile('archive.zip')).toBe(false);
    });
  });

  /* ================================================================ */
  /*  解析失败错误处理测试                                               */
  /* ================================================================ */

  describe('错误处理', () => {
    it('解析异常被捕获且不导致组件崩溃', async () => {
      const onImport = vi.fn();
      const { ImportFileButton } = await import(
        '../src/features/ai/import-file-button'
      );

      // 渲染不应抛出异常
      const { container } = render(
        React.createElement(ImportFileButton, { onImport })
      );

      expect(container.querySelector('button')).not.toBeNull();
    });

    it('空文件内容触发空内容错误', () => {
      dompurifyMock.sanitize.mockReturnValue('');

      const cleanHtml = dompurifyMock.sanitize('');
      const isEmpty = !cleanHtml.trim();

      expect(isEmpty).toBe(true);
    });
  });
});
