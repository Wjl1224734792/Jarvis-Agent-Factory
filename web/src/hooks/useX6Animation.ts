import { useEffect, useRef } from 'react';
import type { Graph, Node, Edge } from '@antv/x6';
import { ANIMATION_DEFAULTS } from '../constants/x6-theme';

/**
 * 呼吸动画配置
 */
export interface BreathConfig {
  /** 是否启用呼吸动画 */
  enabled: boolean;
  /** 呼吸幅度，默认 0.05 */
  amplitude?: number;
  /** 呼吸频率，默认 3.0 */
  frequency?: number;
  /** 过滤需要呼吸动画的节点 */
  nodeFilter: (_node: Node) => boolean;
}

/**
 * 虚线流动动画配置
 */
export interface DashFlowConfig {
  /** 是否启用虚线流动 */
  enabled: boolean;
  /** 流动速度，默认 0.5 */
  speed?: number;
  /** 过滤需要虚线流动的边 */
  edgeFilter: (_edge: Edge) => boolean;
}

/**
 * 入场/退场过渡动画配置
 */
export interface TransitionConfig {
  /** 入场动画时长（ms），默认 300 */
  entranceDuration?: number;
  /** 退场动画时长（ms），默认 200 */
  exitDuration?: number;
  /** 入场缓动函数，默认 'ease-out' */
  entranceEasing?: string;
  /** 退场缓动函数，默认 'ease-in' */
  exitEasing?: string;
}

/**
 * 动画配置集合
 */
export interface AnimationConfig {
  /** 呼吸动画 */
  breath?: BreathConfig;
  /** 虚线流动动画 */
  dashFlow?: DashFlowConfig;
  /** 入场/退场过渡参数 */
  transitions?: TransitionConfig;
}

/**
 * 统一的 RAF 动画循环 hook
 *
 * 使用单一 requestAnimationFrame 调度呼吸动画和虚线流动动画。
 * 页面不可见时自动暂停，恢复可见时继续。
 *
 * @param graph - X6 Graph 实例（null 时不启动动画）
 * @param config - 动画配置
 * @param deps - 额外依赖数组，变化时重建动画循环
 */
export function useX6Animation(
  graph: Graph | null,
  config: AnimationConfig,
  deps?: any[],
): void {
  const rafRef = useRef<number>(0);
  const destroyedRef = useRef(false);
  const pausedRef = useRef(false);
  /** 呼吸动画相位，跨 effect 生命周期保持以支持数据轮询 */
  const phaseRef = useRef(0);
  /** 虚线流动偏移，跨 effect 生命周期保持以支持数据轮询 */
  const dashOffsetRef = useRef(0);

  // 在顶层计算所有配置值，确保依赖数组和回调内使用相同变量
  const breathEnabled = config.breath?.enabled ?? false;
  const breathAmplitude = config.breath?.amplitude ?? ANIMATION_DEFAULTS.breathAmplitude;
  const breathFrequency = config.breath?.frequency ?? ANIMATION_DEFAULTS.breathFrequency;
  const breathFilter = config.breath?.nodeFilter ?? (() => false);

  const dashEnabled = config.dashFlow?.enabled ?? false;
  const dashSpeed = config.dashFlow?.speed ?? ANIMATION_DEFAULTS.dashFlowSpeed;
  const dashFilter = config.dashFlow?.edgeFilter ?? (() => false);

  useEffect(() => {
    if (!graph) return;

    destroyedRef.current = false;
    pausedRef.current = false;

    /** 单帧 tick */
    const tick = () => {
      if (destroyedRef.current) return;

      // 暂停时不更新动画状态，但仍保持循环以继续检查暂停状态
      if (!pausedRef.current) {
        phaseRef.current = (phaseRef.current + 0.016) % (Math.PI * 2);
        dashOffsetRef.current = (dashOffsetRef.current - dashSpeed) % 256;

        try {
          // 呼吸动画：对匹配的节点应用 scale
          if (breathEnabled) {
            for (const id of getNodeIds(graph, breathFilter)) {
              const node = graph.getCellById(id);
              if (node && node.isNode()) {
                const s = 1 + Math.sin(phaseRef.current * breathFrequency) * breathAmplitude;
                node.scale(s, s);
              }
            }
          }

          // 虚线流动：修改匹配边的 strokeDashoffset
          if (dashEnabled) {
            const edges = graph.getEdges();
            for (const edge of edges) {
              if (!dashFilter(edge)) continue;

              const lineAttrs = edge.getAttrByPath('line') as Record<string, unknown> | null;
              if (lineAttrs && typeof lineAttrs.strokeDasharray === 'string' && lineAttrs.strokeDasharray) {
                edge.setAttrByPath('line/strokeDashoffset', dashOffsetRef.current);
              }
            }
          }
        } catch {
          // X6 操作可能在卸载后抛出异常，忽略
        }
      }

      // 继续调度下一帧
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    // visibilitychange：页面隐藏时暂停，可见时恢复
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        pausedRef.current = true;
      } else {
        pausedRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      destroyedRef.current = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [
    graph,
    breathEnabled,
    breathFrequency,
    breathAmplitude,
    dashEnabled,
    dashSpeed,
    ...(deps ?? []),
  ]);
}

/** 从 graph 中收集匹配 nodeFilter 的节点 ID */
function getNodeIds(g: Graph, filter: (_node: Node) => boolean): string[] {
  const result: string[] = [];
  try {
    const cells = g.getCells();
    for (const cell of cells) {
      if (cell.isNode() && filter(cell as Node)) {
        result.push(cell.id);
      }
    }
  } catch {
    // 图可能已销毁
  }
  return result;
}
