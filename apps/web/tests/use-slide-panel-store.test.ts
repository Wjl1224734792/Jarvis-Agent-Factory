import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSlidePanelStore } from '../src/features/circles/use-slide-panel-store';

// ── 浏览器 API mock（使用 as unknown 断言绕过完整类型检查） ──

const pushStateSpy = vi.fn();
const replaceStateSpy = vi.fn();
const backSpy = vi.fn();

function setupBrowserMock() {
  (globalThis as Record<string, unknown>).window = {
    location: {
      pathname: '/circle',
      search: '?tab=recommended',
      href: 'http://localhost:5173/circle?tab=recommended',
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
  });
});

describe('useSlidePanelStore', () => {
  // S1: 初始状态 idle, postId=null
  it('S1: 初始状态为 idle，postId 为 null', () => {
    const state = useSlidePanelStore.getState();
    expect(state.postId).toBeNull();
    expect(state.isOpen).toBe(false);
    expect(state.isClosing).toBe(false);
  });

  // S2: open(postId) -> 状态转为 open, postId 设置
  it('S2: open(postId) 后状态变为 open，postId 被设置', () => {
    useSlidePanelStore.getState().open('post_123');

    const state = useSlidePanelStore.getState();
    expect(state.postId).toBe('post_123');
    expect(state.isOpen).toBe(true);
    expect(state.isClosing).toBe(false);
  });

  // S3: close() -> 进入 isClosing=true -> 动画完成后 idle
  it('S3: close() 后进入 isClosing 状态，动画完成后回到 idle', () => {
    useSlidePanelStore.getState().open('post_123');
    useSlidePanelStore.getState().close();

    // 立即检查 isClosing
    expect(useSlidePanelStore.getState().isClosing).toBe(true);
    expect(useSlidePanelStore.getState().isOpen).toBe(true);

    // 等待动画完成（默认 300ms）
    vi.useFakeTimers();
    useSlidePanelStore.getState().open('post_123');
    useSlidePanelStore.getState().close();
    vi.advanceTimersByTime(350);

    const state = useSlidePanelStore.getState();
    expect(state.isClosing).toBe(false);
    expect(state.isOpen).toBe(false);
    expect(state.postId).toBeNull();
    vi.useRealTimers();
  });

  // S4: 关闭动画期间 open(postId2) -> 被忽略（互斥防护）
  it('S4: 关闭动画期间调用 open() 被忽略', () => {
    useSlidePanelStore.getState().open('post_123');
    useSlidePanelStore.getState().close();

    // isClosing 期间尝试打开新帖子
    useSlidePanelStore.getState().open('post_456');

    const state = useSlidePanelStore.getState();
    expect(state.isClosing).toBe(true);
    expect(state.postId).toBe('post_123'); // 未改变
  });

  // S5: 快速双击 open -> 第二次被忽略
  it('S5: 快速双击 open 同一 postId，第二次被忽略', () => {
    useSlidePanelStore.getState().open('post_123');
    useSlidePanelStore.getState().open('post_123');

    // pushState 只应被调用一次
    expect(pushStateSpy).toHaveBeenCalledTimes(1);
  });

  // S6: open(postId1) -> open(postId2) -> 切换到新帖子（不触发 close 动画）
  it('S6: 面板已打开时 open 不同 postId，直接切换不触发关闭动画', () => {
    useSlidePanelStore.getState().open('post_123');
    useSlidePanelStore.getState().open('post_456');

    const state = useSlidePanelStore.getState();
    expect(state.postId).toBe('post_456');
    expect(state.isOpen).toBe(true);
    expect(state.isClosing).toBe(false);
    // pushState 调用了两次（每次 open 都 pushState）
    expect(pushStateSpy).toHaveBeenCalledTimes(2);
  });

  // S7: 重复 open(同 postId) -> 忽略
  it('S7: 重复 open 相同 postId 被忽略，不重复 pushState', () => {
    useSlidePanelStore.getState().open('post_123');
    pushStateSpy.mockClear();

    useSlidePanelStore.getState().open('post_123');

    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(useSlidePanelStore.getState().postId).toBe('post_123');
  });

  // S8: URL 同步 — pushState on open
  it('S8: open() 时调用 history.pushState 写入 ?post= 参数', () => {
    useSlidePanelStore.getState().open('post_123');

    expect(pushStateSpy).toHaveBeenCalledTimes(1);
    const [data, _title, url] = pushStateSpy.mock.calls[0];
    expect(data).toBeNull();
    expect(url).toContain('post=post_123');
  });

  // S9: URL 同步 — replaceState on close
  it('S9: close() 时调用 history.replaceState 移除 ?post= 参数', () => {
    useSlidePanelStore.getState().open('post_123');
    replaceStateSpy.mockClear();

    useSlidePanelStore.getState().close();

    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
    const [data, _title, url] = replaceStateSpy.mock.calls[0];
    expect(data).toBeNull();
    expect(url).not.toContain('post=');
  });

  // S10: popstate 事件 -> 调用 close()
  it('S10: popstate 事件触发面板关闭', () => {
    useSlidePanelStore.getState().open('post_123');
    replaceStateSpy.mockClear();

    // 模拟 popstate（URL 中无 post 参数）
    useSlidePanelStore.getState().handlePopState('/circle?tab=recommended');

    expect(useSlidePanelStore.getState().isClosing).toBe(true);
    expect(replaceStateSpy).toHaveBeenCalled();
  });

  // S11: 面板关闭后 focus 回到触发元素
  it('S11: close 完成后触发 onClose 回调', () => {
    const onClose = vi.fn();
    useSlidePanelStore.setState({ onClose });
    useSlidePanelStore.getState().open('post_123');

    vi.useFakeTimers();
    useSlidePanelStore.getState().close();
    vi.advanceTimersByTime(350);

    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  // S12: 初始加载 URL 含 ?post=xxx -> store 从 URL 初始化
  it('S12: 初始化时从 URL 读取 post 参数并打开面板', () => {
    // 模拟 URL 含 post 参数
    const win = globalThis.window as unknown as Record<string, unknown>;
    const loc = win.location as Record<string, string>;
    loc.search = '?tab=recommended&post=post_789';
    loc.href = 'http://localhost:5173/circle?tab=recommended&post=post_789';

    useSlidePanelStore.getState().initFromURL();

    const state = useSlidePanelStore.getState();
    expect(state.postId).toBe('post_789');
    expect(state.isOpen).toBe(true);
  });
});
