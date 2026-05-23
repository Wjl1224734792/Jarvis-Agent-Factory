import { useEffect } from 'react';
import { useSlidePanelStore } from './use-slide-panel-store';

/**
 * SlidePanel URL 同步 hook。
 *
 * 职责：
 * 1. 初始加载时从 URL 读取 ?post= 参数并初始化面板
 * 2. 监听 popstate 事件，响应浏览器前进/后退
 *
 * 在包含 SlidePanel 的页面顶层调用一次即可。
 */
export function useSlidePanelURLSync() {
  const handlePopState = useSlidePanelStore(s => s.handlePopState);
  const initFromURL = useSlidePanelStore(s => s.initFromURL);

  // 初始加载：从 URL 初始化面板状态
  useEffect(() => {
    initFromURL();
  }, [initFromURL]);

  // 监听 popstate 事件
  useEffect(() => {
    function onPopState() {
      handlePopState(window.location.pathname + window.location.search);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [handlePopState]);
}
