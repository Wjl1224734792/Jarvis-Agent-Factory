/**
 * TASK-001: PubSub EventEmitter 单元测试
 *
 * 测试范围:
 *   1. PubSubEventType 类型包含 4 种事件
 *   2. getPubSub() 返回单例
 *   3. emitEvent() 自动注入 timestamp 并触发监听器
 *   4. resetPubSub() 移除所有监听器并重置计数器
 *   5. getPubSubStats() 返回正确统计
 *   6. 多监听器和多事件类型
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPubSub,
  emitEvent,
  resetPubSub,
  getPubSubStats,
} from '../src/engine/pubsub.js';
import type { PubSubEvent } from '../src/engine/pubsub.js';

describe('TASK-001: PubSub EventEmitter', () => {
  beforeEach(() => {
    resetPubSub();
  });

  describe('单一事件 emit 与监听', () => {
    it('emitEvent 触发监听器并传递完整 PubSubEvent', () => {
      let received: PubSubEvent | null = null;

      const ee = getPubSub();
      ee.on('session:changed', (event: PubSubEvent) => {
        received = event;
      });

      emitEvent('session:changed', { sessionId: 's1', action: 'join' });

      expect(received).not.toBeNull();
      expect(received!.type).toBe('session:changed');
      expect(received!.payload).toEqual({ sessionId: 's1', action: 'join' });
      expect(received!.timestamp).toBeGreaterThan(0);
      expect(typeof received!.timestamp).toBe('number');
    });

    it('emitEvent 自动注入当前时间戳', () => {
      const before = Date.now();
      let eventTimestamp = 0;

      const ee = getPubSub();
      ee.once('run:changed', (event: PubSubEvent) => {
        eventTimestamp = event.timestamp;
      });

      emitEvent('run:changed', { runId: 'r1', sessionId: 's1', action: 'create' });
      const after = Date.now();

      expect(eventTimestamp).toBeGreaterThanOrEqual(before);
      expect(eventTimestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('单例模式', () => {
    it('getPubSub() 多次调用返回同一实例', () => {
      const ee1 = getPubSub();
      const ee2 = getPubSub();
      expect(ee1).toBe(ee2);
    });

    it('单例上的监听器在后续调用中仍然有效', () => {
      let callCount = 0;
      getPubSub().on('gate:advanced', () => { callCount++; });

      emitEvent('gate:advanced', { sessionId: 's1', runId: 'r1', gate: 'Gate B', previousGate: 'Gate A' });
      emitEvent('gate:advanced', { sessionId: 's2', runId: 'r2', gate: 'Gate C', previousGate: 'Gate B' });

      expect(callCount).toBe(2);
    });
  });

  describe('多监听器', () => {
    it('同一事件的多个监听器均被调用', () => {
      let countA = 0;
      let countB = 0;

      const ee = getPubSub();
      ee.on('agent:event', () => { countA++; });
      ee.on('agent:event', () => { countB++; });

      emitEvent('agent:event', { runId: 'r1', sessionId: 's1', agentId: 'a1', eventType: 'start' });

      expect(countA).toBe(1);
      expect(countB).toBe(1);
    });

    it('不同事件的监听器互不干扰', () => {
      let sessionCount = 0;
      let runCount = 0;

      getPubSub().on('session:changed', () => { sessionCount++; });
      getPubSub().on('run:changed', () => { runCount++; });

      emitEvent('session:changed', { sessionId: 's1', action: 'join' });

      expect(sessionCount).toBe(1);
      expect(runCount).toBe(0);
    });
  });

  describe('stats 统计', () => {
    it('初始 stats 为零', () => {
      const stats = getPubSubStats();
      expect(stats.emitCount).toBe(0);
      expect(stats.broadcastCount).toBe(0);
    });

    it('每次 emit 后 stats 递增', () => {
      emitEvent('session:changed', { sessionId: 's1', action: 'join' });
      emitEvent('run:changed', { runId: 'r1', sessionId: 's1', action: 'create' });
      emitEvent('gate:advanced', { sessionId: 's1', runId: 'r1', gate: 'Gate B', previousGate: 'Gate A' });

      const stats = getPubSubStats();
      expect(stats.emitCount).toBe(3);
    });
  });

  describe('reset 隔离', () => {
    it('resetPubSub 后监听器不再触发', () => {
      let callCount = 0;
      getPubSub().on('session:changed', () => { callCount++; });

      emitEvent('session:changed', { sessionId: 's1', action: 'join' });
      expect(callCount).toBe(1);

      resetPubSub();

      emitEvent('session:changed', { sessionId: 's2', action: 'join' });
      expect(callCount).toBe(1); // 不再触发
    });

    it('resetPubSub 后 stats 归零', () => {
      emitEvent('session:changed', { sessionId: 's1', action: 'join' });
      emitEvent('session:changed', { sessionId: 's2', action: 'leave' });

      const before = getPubSubStats();
      expect(before.emitCount).toBe(2);

      resetPubSub();

      const after = getPubSubStats();
      expect(after.emitCount).toBe(0);
    });

    it('resetPubSub 后单例仍然可用', () => {
      resetPubSub();

      let received = false;
      getPubSub().once('session:changed', () => { received = true; });
      emitEvent('session:changed', { sessionId: 's1', action: 'join' });

      expect(received).toBe(true);
    });
  });

  describe('四种事件类型', () => {
    it('session:changed 正常触发', () => {
      let received: PubSubEvent | null = null;
      getPubSub().on('session:changed', (e) => { received = e; });

      emitEvent('session:changed', { sessionId: 's1', action: 'join' });

      expect(received!.type).toBe('session:changed');
      expect(received!.payload.sessionId).toBe('s1');
      expect(received!.payload.action).toBe('join');
    });

    it('run:changed 正常触发', () => {
      let received: PubSubEvent | null = null;
      getPubSub().on('run:changed', (e) => { received = e; });

      emitEvent('run:changed', { runId: 'r1', sessionId: 's1', action: 'create' });

      expect(received!.type).toBe('run:changed');
      expect(received!.payload.runId).toBe('r1');
    });

    it('gate:advanced 正常触发', () => {
      let received: PubSubEvent | null = null;
      getPubSub().on('gate:advanced', (e) => { received = e; });

      emitEvent('gate:advanced', { sessionId: 's1', runId: 'r1', gate: 'Gate B', previousGate: 'Gate A' });

      expect(received!.type).toBe('gate:advanced');
      expect(received!.payload.gate).toBe('Gate B');
    });

    it('agent:event 正常触发', () => {
      let received: PubSubEvent | null = null;
      getPubSub().on('agent:event', (e) => { received = e; });

      emitEvent('agent:event', { runId: 'r1', sessionId: 's1', agentId: 'a1', eventType: 'end' });

      expect(received!.type).toBe('agent:event');
      expect(received!.payload.agentId).toBe('a1');
    });
  });

  describe('broadcastCount 追踪', () => {
    it('broadcastCount 可通过 stats 读取并独立递增', () => {
      // broadcastCount 用于记录 SSE 广播次数
      // 初始为 0，外部（routes.ts）调用 increment 后递增
      const statsBefore = getPubSubStats();
      expect(statsBefore.broadcastCount).toBe(0);

      // emitEvent 只影响 emitCount，不影响 broadcastCount
      emitEvent('session:changed', { sessionId: 's1', action: 'join' });
      const statsAfter = getPubSubStats();
      expect(statsAfter.emitCount).toBe(1);
      expect(statsAfter.broadcastCount).toBe(0);
    });
  });
});
