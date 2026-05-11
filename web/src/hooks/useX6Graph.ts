import { useRef, useEffect, useState } from 'react';
import { Graph } from '@antv/x6';

/**
 * useX6Graph 配置项
 */
export interface UseX6GraphOptions {
  /** 容器宽度 */
  width: number;
  /** 容器高度 */
  height: number;
  /** 背景配置 */
  background?: { color: string };
  /** 交互配置 */
  interacting?: { nodeMovable: boolean; edgeMovable: boolean };
  /** 鼠标滚轮配置 */
  mousewheel?: {
    enabled: boolean;
    modifiers: string;
    minScale: number;
    maxScale: number;
    zoomAtMousePosition?: boolean;
  };
  /** 是否自动跟随容器 resize */
  autoResize?: boolean;
  /** X6 插件数组 */
  plugins?: any[];
}

/**
 * 封装 @antv/x6 Graph 实例的创建、插件注册与销毁
 *
 * 仅在 containerRef.current 存在且 width/height 均大于 0 时创建 Graph。
 * 组件卸载时自动调用 graph.dispose() 清理资源。
 *
 * @param containerRef - 指向容器 DOM 元素的引用
 * @param options - Graph 配置项
 * @returns Graph 实例或 null
 */
export function useX6Graph(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseX6GraphOptions,
): Graph | null {
  const graphRef = useRef<Graph | null>(null);
  const destroyedRef = useRef(false);
  const [graph, setGraph] = useState<Graph | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const { width, height } = options;

    // 条件不满足时不创建 Graph
    if (!container || width === 0 || height === 0) {
      return;
    }

    destroyedRef.current = false;

    const instance = new Graph({
      container,
      width,
      height,
      background: options.background,
      interacting: options.interacting,
      mousewheel: options.mousewheel,
      autoResize: options.autoResize,
    });

    // 注册插件
    if (options.plugins && options.plugins.length > 0) {
      for (const plugin of options.plugins) {
        instance.use(plugin);
      }
    }

    graphRef.current = instance;
    setGraph(instance);

    return () => {
      destroyedRef.current = true;
      try {
        instance.dispose();
      } catch {
        // dispose 可能因实例已销毁而抛出异常，忽略
      }
      graphRef.current = null;
      setGraph(null);
    };
  // containerRef.current 为 ref 值，不应放入依赖数组（React ref 变化不触发重渲染）
  }, [options.width, options.height]);

  return graph;
}
