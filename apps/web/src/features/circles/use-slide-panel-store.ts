import { create } from 'zustand';

// ── 状态机：idle -> opening -> open -> closing -> idle ──

interface SlidePanelState {
  /** 当前打开的帖子 ID */
  postId: string | null;
  /** 当前帖子所属圈子标识（slug 或 id），为 null 时回退到全局帖子 API */
  circleId: string | null;
  /** 面板是否打开 */
  isOpen: boolean;
  /** 关闭动画进行中（防止重复触发） */
  isClosing: boolean;
  /** 面板关闭完成后的回调（用于 focus 恢复） */
  onClose?: () => void;
}

interface SlidePanelActions {
  /**
   * 打开面板（pushState + 锁定滚动）。
   * @param postId 帖子 ID
   * @param circleId 圈子标识（slug 或 id），传入时使用圈子帖子专属 API
   */
  open: (postId: string, circleId?: string | null) => void;
  /** 关闭面板（replaceState + 动画 + 解锁滚动） */
  close: () => void;
  /** popstate 事件处理：根据 URL 决定打开或关闭 */
  handlePopState: (pathname: string) => void;
  /** 从当前 URL 初始化面板状态（初始加载时调用） */
  initFromURL: () => void;
}

type SlidePanelStore = SlidePanelState & SlidePanelActions;

// ── URL 工具 ──

function writePostToURL(postId: string) {
  const params = new URLSearchParams(window.location.search);
  params.set('post', postId);
  const search = params.toString();
  const url = search
    ? `${window.location.pathname}?${search}`
    : window.location.pathname;
  window.history.pushState(null, '', url);
}

function removePostFromURL() {
  const params = new URLSearchParams(window.location.search);
  params.delete('post');
  const search = params.toString();
  const url = search
    ? `${window.location.pathname}?${search}`
    : window.location.pathname;
  window.history.replaceState(null, '', url);
}

function readPostFromURL(): string | null {
  return new URLSearchParams(window.location.search).get('post');
}

// ── 关闭动画时长（ms） ──

const CLOSE_ANIMATION_MS = 300;

// ── Store ──

export const useSlidePanelStore = create<SlidePanelStore>((set, get) => ({
  postId: null,
  circleId: null,
  isOpen: false,
  isClosing: false,
  onClose: undefined,

  open(postId, circleId) {
    const state = get();
    // 互斥防护：关闭动画期间不响应新打开请求
    if (state.isClosing) return;
    // 重复打开同一帖子不处理
    if (state.isOpen && state.postId === postId) return;

    writePostToURL(postId);
    set({ postId, circleId: circleId ?? null, isOpen: true, isClosing: false });
  },

  close() {
    const state = get();
    if (!state.isOpen && !state.isClosing) return;

    set({ isClosing: true });
    removePostFromURL();

    setTimeout(() => {
      const current = get();
      set({
        postId: null,
        circleId: null,
        isOpen: false,
        isClosing: false,
      });
      current.onClose?.();
    }, CLOSE_ANIMATION_MS);
  },

  handlePopState(pathname) {
    const params = new URLSearchParams(
      pathname.includes('?') ? pathname.split('?')[1] : ''
    );
    const postInURL = params.get('post');

    if (postInURL) {
      // URL 有 post 参数 -> 打开对应面板
      const state = get();
      if (state.isOpen && state.postId === postInURL) return;
      set({ postId: postInURL, isOpen: true, isClosing: false });
    } else {
      // URL 无 post 参数 -> 关闭面板
      get().close();
    }
  },

  initFromURL() {
    const postInURL = readPostFromURL();
    if (postInURL) {
      set({ postId: postInURL, isOpen: true, isClosing: false });
    }
  },
}));
