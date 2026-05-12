/**
 * 进程内发布订阅 EventEmitter 单例
 *
 * 为所有下游事件驱动广播提供通信基础。
 * 仅使用 Node.js 内置 events 模块，零新依赖。
 *
 * 事件类型：
 * - session:changed — session 创建/删除/状态变更
 * - run:changed     — pipeline run 创建/归档/置顶/删除
 * - gate:advanced   — Gate 推进（advance_gate / gate_jump）
 * - agent:event     — Agent 事件写入成功
 */
import { EventEmitter } from 'node:events';

/** 发布订阅事件类型常量 */
export type PubSubEventType =
  | 'session:changed'
  | 'run:changed'
  | 'gate:advanced'
  | 'agent:event';

/** 发布订阅事件结构 */
export interface PubSubEvent {
  /** 事件类型 */
  type: PubSubEventType;
  /** 事件载荷 */
  payload: Record<string, unknown>;
  /** 事件时间戳（毫秒） */
  timestamp: number;
}

// ── 全局状态 ──────────────────────────────────────────────

let _instance: EventEmitter | null = null;
let _emitCount = 0;
let _broadcastCount = 0;

/**
 * 递增广播计数（由 broadcastSSE() 调用）。
 * 从 pubsub.ts 导出以避免循环依赖。
 */
export function incrementBroadcastCount(): void {
  _broadcastCount++;
}

// ── 公开 API ──────────────────────────────────────────────

/**
 * 获取进程内 EventEmitter 单例。
 * 首次调用时创建实例并设置 maxListeners 无限制。
 *
 * @returns {EventEmitter} 全局唯一 EventEmitter 实例
 */
export function getPubSub(): EventEmitter {
  if (!_instance) {
    _instance = new EventEmitter();
    _instance.setMaxListeners(0);
  }
  return _instance;
}

/**
 * 便捷发布函数：构建 PubSubEvent 并自动注入 timestamp 后 emit。
 *
 * @param {PubSubEventType} type 事件类型
 * @param {Record<string, unknown>} payload 事件载荷
 */
export function emitEvent(
  type: PubSubEventType,
  payload: Record<string, unknown>,
): void {
  const event: PubSubEvent = {
    type,
    payload,
    timestamp: Date.now(),
  };
  _emitCount++;
  getPubSub().emit(type, event);
}

/**
 * 重置 PubSub 全局状态（测试隔离用）。
 * 移除所有监听器并归零计数器。
 */
export function resetPubSub(): void {
  if (_instance) {
    _instance.removeAllListeners();
  }
  _emitCount = 0;
  _broadcastCount = 0;
  // 不销毁实例，允许测试后续使用
}

/**
 * 获取 PubSub 统计信息（监控用）。
 *
 * @returns {{ emitCount: number; broadcastCount: number }}
 */
export function getPubSubStats(): { emitCount: number; broadcastCount: number } {
  return { emitCount: _emitCount, broadcastCount: _broadcastCount };
}
