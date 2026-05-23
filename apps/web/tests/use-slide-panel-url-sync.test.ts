import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSlidePanelStore } from '../src/features/circles/use-slide-panel-store';

// ── 浏览器 API mock（使用 as unknown 断言绕过完整类型检查） ──

const pushStateSpy = vi.fn();
const replaceStateSpy = vi.fn();
const backSpy = vi.fn();

function setupBrowserMock(search = '?tab=recommended') {
  (globalThis as Record<string, unknown>).window = {
    location: {
      pathname: '/circle',
      search,
      href: `http://localhost:5173/circle${search}`,
    },
    history: {
      pushState: pushStateSpy,
      replaceState: replaceStateSpy,
      back: backSpy,
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
}

beforeEach(() => {
  setupBrowserMock();
  pushStateSpy.mockClear();
  replaceStateSpy.mockClear();
  backSpy.mockClear();
  useSlidePanelStore.setState({
    postId: null,
    isOpen: false,
    isClosing: false,
    onClose: undefined,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('use-slide-panel-url-sync', () => {
  // 场景 1: 打开面板时写入 URL
  it('打开面板时通过 pushState 写入 ?post= 参数', () => {
    useSlidePanelStore.getState().open('post_123');

    expect(pushStateSpy).toHaveBeenCalledTimes(1);
    const [, , url] = pushStateSpy.mock.calls[0] as [null, string, string];
    expect(url).toContain('post=post_123');
    expect(url).toContain('tab=recommended');
  });

  // 场景 2: 关闭面板时恢复 URL
  it('关闭面板时通过 replaceState 移除 ?post= 参数', () => {
    useSlidePanelStore.getState().open('post_123');
    replaceStateSpy.mockClear();

    useSlidePanelStore.getState().close();

    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
    const [, , url] = replaceStateSpy.mock.calls[0] as [null, string, string];
    expect(url).not.toContain('post=');
    expect(url).toContain('tab=recommended');
  });

  // 场景 3: 后退关闭面板
  it('popstate 事件触发面板关闭', () => {
    useSlidePanelStore.getState().open('post_123');
    replaceStateSpy.mockClear();

    // 模拟浏览器后退（URL 中 post 参数被移除）
    useSlidePanelStore.getState().handlePopState('/circle?tab=recommended');

    expect(useSlidePanelStore.getState().isClosing).toBe(true);
  });

  // 场景 4: 前进重新打开面板
  it('popstate 带 post 参数时打开对应面板', () => {
    useSlidePanelStore.getState().initFromURL(); // 初始无 post，不开

    // 模拟前进到带 post 参数的 URL
    useSlidePanelStore.getState().handlePopState('/circle?tab=recommended&post=post_456');

    expect(useSlidePanelStore.getState().postId).toBe('post_456');
    expect(useSlidePanelStore.getState().isOpen).toBe(true);
  });

  // 场景 5: 初始 URL 加载
  it('初始 URL 含 post 参数时自动打开面板', () => {
    setupBrowserMock('?tab=recommended&post=post_789');
    pushStateSpy.mockClear();

    useSlidePanelStore.getState().initFromURL();

    expect(useSlidePanelStore.getState().postId).toBe('post_789');
    expect(useSlidePanelStore.getState().isOpen).toBe(true);
    // 初始化不应触发 pushState（URL 已经正确）
    expect(pushStateSpy).not.toHaveBeenCalled();
  });
});
