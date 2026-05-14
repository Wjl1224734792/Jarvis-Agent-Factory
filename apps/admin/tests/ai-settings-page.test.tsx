// @vitest-environment jsdom
/**
 * AiSettingsPage 组件测试 — 验证表单渲染、保存交互、测试连接反馈和功能开关联动。
 *
 * @see REQ-002 / TASK-004
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AiSettingsPage } from '../src/features/ai/ai-settings-page';

// ---------------------------------------------------------------------------
// 浏览器 API polyfill — Ant Design 6 在 jsdom 中需要这些
// ---------------------------------------------------------------------------
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  class ResizeObserverMock {
    callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverMock,
  });

  HTMLElement.prototype.scrollIntoView = vi.fn();
});

// ---------------------------------------------------------------------------
// Mock apiClient
// ---------------------------------------------------------------------------
vi.mock('../src/lib/api-client', () => ({
  apiClient: {
    getAiSettings: vi.fn(),
    updateAiSettings: vi.fn(),
    testAiConnection: vi.fn(),
  },
}));

import { apiClient } from '../src/lib/api-client';

const mockApiClient = vi.mocked(apiClient);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const DEFAULT_AI_SETTINGS = {
  provider: 'dashscope',
  apiKey: 'sk-***',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  summaryModel: 'qwen-plus',
  formatModel: 'qwen-plus',
  features: { summary: true, format: true, chat: true },
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

function renderPage() {
  const queryClient = createQueryClient();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <App>
        <AiSettingsPage />
      </App>
    </QueryClientProvider>
  );
  return { ...result, queryClient };
}

/** 等待表单完全渲染 */
async function waitForFormReady() {
  await waitFor(() => {
    const labels = screen.getAllByLabelText('AI 服务商');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
}

/** 获取最后一个匹配元素 */
function lastOf(elements: HTMLElement[]): HTMLElement {
  return elements[elements.length - 1];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AiSettingsPage', () => {
  beforeAll(() => {
    mockApiClient.getAiSettings.mockResolvedValue({ item: DEFAULT_AI_SETTINGS });
    mockApiClient.updateAiSettings.mockResolvedValue({
      item: DEFAULT_AI_SETTINGS,
    });
    mockApiClient.testAiConnection.mockResolvedValue({
      success: true,
      message: 'ok',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockApiClient.getAiSettings.mockResolvedValue({ item: DEFAULT_AI_SETTINGS });
    mockApiClient.updateAiSettings.mockResolvedValue({
      item: DEFAULT_AI_SETTINGS,
    });
    mockApiClient.testAiConnection.mockResolvedValue({
      success: true,
      message: 'ok',
    });
  });

  describe('表单渲染', () => {
    it('渲染所有表单字段标签', async () => {
      renderPage();
      await waitForFormReady();

      expect(screen.getAllByLabelText('AI 服务商').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByLabelText('API Key').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByLabelText('Base URL').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByLabelText('摘要模型').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByLabelText('排版模型').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByLabelText('摘要功能开关').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByLabelText('排版功能开关').length).toBeGreaterThanOrEqual(1);
    });

    it('渲染保存和测试连接按钮', async () => {
      renderPage();
      await waitForFormReady();

      const saveButtons = screen.getAllByRole('button', { name: '保存配置' });
      const testButtons = screen.getAllByRole('button', { name: '测试连接' });

      expect(saveButtons.length).toBeGreaterThanOrEqual(1);
      expect(testButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('回填服务端返回的配置数据', async () => {
      renderPage();
      await waitForFormReady();

      expect(
        screen.getAllByDisplayValue(
          'https://dashscope.aliyuncs.com/compatible-mode/v1'
        ).length
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByDisplayValue('qwen-plus').length
      ).toBeGreaterThanOrEqual(1);
    });

    it('API Key 字段不回填脱敏值', async () => {
      renderPage();
      await waitForFormReady();

      expect(screen.queryAllByDisplayValue('sk-***')).toHaveLength(0);
    });

    it('加载状态时 Card 显示 loading', () => {
      mockApiClient.getAiSettings.mockReturnValue(new Promise(() => {}));

      const { container } = renderPage();

      const loadingEl = container.querySelector('.ant-card-loading');
      expect(loadingEl).toBeTruthy();
    });
  });

  describe('保存交互', () => {
    it('填写完整表单后点击保存，调用 updateAiSettings', async () => {
      const user = userEvent.setup();

      renderPage();
      await waitForFormReady();

      const apiKeyInput = lastOf(screen.getAllByPlaceholderText('sk-...'));
      await user.clear(apiKeyInput);
      await user.type(apiKeyInput, 'sk-new-key');

      // 通过 fireEvent 提交表单（更可靠）
      const form = apiKeyInput.closest('form');
      expect(form).toBeTruthy();
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockApiClient.updateAiSettings).toHaveBeenCalledTimes(1);
      });

      const callArg = mockApiClient.updateAiSettings.mock.calls[0]?.[0];
      expect(callArg).toEqual(
        expect.objectContaining({
          provider: 'dashscope',
          apiKey: 'sk-new-key',
          baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        })
      );
    });

    it('API Key 为空时保存触发警告提示', async () => {
      renderPage();
      await waitForFormReady();

      const apiKeyInput = lastOf(screen.getAllByPlaceholderText('sk-...'));
      fireEvent.change(apiKeyInput, { target: { value: '' } });

      const form = apiKeyInput.closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockApiClient.updateAiSettings).not.toHaveBeenCalled();
      });
    });
  });

  describe('测试连接', () => {
    it('点击测试连接后显示成功提示', async () => {
      renderPage();
      await waitForFormReady();

      const testBtn = lastOf(
        screen.getAllByRole('button', { name: '测试连接' })
      );
      fireEvent.click(testBtn);

      await waitFor(() => {
        expect(screen.getByText('连接成功')).toBeTruthy();
      });

      expect(mockApiClient.testAiConnection).toHaveBeenCalledTimes(1);
    });

    it('测试连接失败时显示错误提示', async () => {
      mockApiClient.testAiConnection.mockRejectedValueOnce(
        new Error('连接超时')
      );

      renderPage();
      await waitForFormReady();

      const testBtn = lastOf(
        screen.getAllByRole('button', { name: '测试连接' })
      );
      fireEvent.click(testBtn);

      await waitFor(() => {
        expect(screen.getByText('连接失败')).toBeTruthy();
      });

      expect(screen.getByText('连接超时')).toBeTruthy();
    });

    it('测试连接中按钮显示 loading 状态', async () => {
      let resolveTest!: (v: unknown) => void;
      mockApiClient.testAiConnection.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveTest = resolve;
        })
      );

      renderPage();
      await waitForFormReady();

      const testBtn = lastOf(
        screen.getAllByRole('button', { name: '测试连接' })
      );
      fireEvent.click(testBtn);

      // Ant Design Button loading 状态通过 .ant-btn-loading 类标识
      await waitFor(() => {
        expect(
          testBtn.classList.contains('ant-btn-loading')
        ).toBe(true);
      });

      resolveTest({ success: true, message: 'ok' });

      await waitFor(() => {
        expect(screen.getByText('连接成功')).toBeTruthy();
      });
    });
  });

  describe('功能开关联动', () => {
    it('摘要功能开关默认为开启状态', async () => {
      renderPage();
      await waitForFormReady();

      const summarySwitch = screen
        .getByLabelText('摘要功能开关')
        .closest('.ant-form-item')
        ?.querySelector('.ant-switch');

      expect(
        summarySwitch?.classList.contains('ant-switch-checked')
      ).toBe(true);
    });

    it('排版功能开关默认为开启状态', async () => {
      renderPage();
      await waitForFormReady();

      const formatSwitch = screen
        .getByLabelText('排版功能开关')
        .closest('.ant-form-item')
        ?.querySelector('.ant-switch');

      expect(
        formatSwitch?.classList.contains('ant-switch-checked')
      ).toBe(true);
    });

    it('关闭摘要功能开关后状态正确更新', async () => {
      const user = userEvent.setup();

      renderPage();
      await waitForFormReady();

      const summarySwitch = screen
        .getByLabelText('摘要功能开关')
        .closest('.ant-form-item')
        ?.querySelector('.ant-switch');

      expect(summarySwitch).toBeTruthy();

      await user.click(summarySwitch!);

      await waitFor(() => {
        expect(
          summarySwitch!.classList.contains('ant-switch-checked')
        ).toBe(false);
      });
    });

    it('功能开关关闭后保存能正确提交', async () => {
      const user = userEvent.setup();

      renderPage();
      await waitForFormReady();

      // 关闭摘要开关
      const summarySwitch = screen
        .getByLabelText('摘要功能开关')
        .closest('.ant-form-item')
        ?.querySelector('.ant-switch');

      await user.click(summarySwitch!);

      // 输入 API Key
      const apiKeyInput = lastOf(screen.getAllByPlaceholderText('sk-...'));
      await user.clear(apiKeyInput);
      await user.type(apiKeyInput, 'sk-test');

      // 通过 form submit 提交
      const form = apiKeyInput.closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockApiClient.updateAiSettings).toHaveBeenCalledTimes(1);
      });

      const callArg = mockApiClient.updateAiSettings.mock.calls[0]?.[0];
      // 验证提交的数据包含 features 字段
      expect(callArg).toEqual(
        expect.objectContaining({
          features: expect.objectContaining({
            format: true,
          }),
        })
      );
    });
  });
});
