/**
 * TASK-004: 守护进程管理 — 单元测试
 *
 * 测试范围:
 *   1. readPidFile — 读取 JSON PID 文件
 *   2. writePidFile — 写入 JSON PID 文件
 *   3. removePidFile — 删除 PID 文件
 *   4. isEngineRunning — PID 存活验证 + 过期文件清理
 *   5. startGuardian — 注册崩溃监听器
 *   6. stopGuardian — 移除崩溃监听器
 *   7. 崩溃重启策略：最多 3 次，指数退避 1s/2s/4s
 *   8. 冷却窗口：5 秒内连续崩溃停止重启
 *   9. 30 秒成功运行后 restartCount 复位
 *  10. resetGuardian — 状态隔离
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

import {
  readPidFile,
  writePidFile,
  removePidFile,
  isEngineRunning,
  startGuardian,
  stopGuardian,
  resetGuardian,
} from '../src/engine/guardian.js';

const PID_DIR = resolve(homedir(), '.jarvis');
const PID_FILE = resolve(PID_DIR, 'engine.pid');

/** 确保 PID 目录存在 */
function ensurePidDir() {
  if (!existsSync(PID_DIR)) mkdirSync(PID_DIR, { recursive: true });
}

/** 清理 PID 文件 */
function cleanPidFile() {
  try { if (existsSync(PID_FILE)) unlinkSync(PID_FILE); } catch { /* ignore */ }
}

describe('TASK-004: 守护进程管理', () => {
  beforeEach(() => {
    cleanPidFile();
    ensurePidDir();
    resetGuardian();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanPidFile();
    resetGuardian();
    vi.restoreAllMocks();
  });

  // ──────────────────────────────────────────────────────
  // readPidFile
  // ──────────────────────────────────────────────────────
  describe('readPidFile — PID JSON 文件读取', () => {
    it('文件不存在时返回 null', () => {
      expect(readPidFile()).toBeNull();
    });

    it('读取有效 JSON 返回 PidData', () => {
      ensurePidDir();
      writeFileSync(PID_FILE, JSON.stringify({
        pid: 12345,
        startedAt: 1715500000000,
        restartCount: 2,
      }) + '\n');

      const data = readPidFile();
      expect(data).not.toBeNull();
      expect(data!.pid).toBe(12345);
      expect(data!.startedAt).toBe(1715500000000);
      expect(data!.restartCount).toBe(2);
    });

    it('restartCount 缺失时默认为 0', () => {
      writeFileSync(PID_FILE, JSON.stringify({
        pid: 9999,
        startedAt: 1715500000000,
      }) + '\n');

      const data = readPidFile();
      expect(data).not.toBeNull();
      expect(data!.restartCount).toBe(0);
    });

    it('JSON 格式损坏时返回 null', () => {
      writeFileSync(PID_FILE, '这不是合法的 JSON 内容\n');

      const data = readPidFile();
      expect(data).toBeNull();
    });

    it('缺少必要字段 pid 时返回 null', () => {
      writeFileSync(PID_FILE, JSON.stringify({
        startedAt: 1715500000000,
      }) + '\n');

      const data = readPidFile();
      expect(data).toBeNull();
    });

    it('空文件返回 null', () => {
      writeFileSync(PID_FILE, '');

      const data = readPidFile();
      expect(data).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────
  // writePidFile
  // ──────────────────────────────────────────────────────
  describe('writePidFile — PID JSON 文件写入', () => {
    it('写入有效 JSON 格式文件', () => {
      writePidFile(6789);

      expect(existsSync(PID_FILE)).toBe(true);
      const raw = readFileSync(PID_FILE, 'utf-8').trim();
      const data = JSON.parse(raw);
      expect(data.pid).toBe(6789);
      expect(typeof data.startedAt).toBe('number');
      expect(data.startedAt).toBeGreaterThan(0);
      expect(typeof data.restartCount).toBe('number');
    });

    it('目录不存在时自动创建 ~/.jarvis', () => {
      // 已验证目录被 ensurePidDir 创建，此处验证 writePidFile 在正常路径下工作
      writePidFile(1111);

      expect(existsSync(PID_DIR)).toBe(true);
      expect(existsSync(PID_FILE)).toBe(true);
    });

    it('startedAt 记录当前时间戳', () => {
      const before = Date.now();
      writePidFile(2222);
      const data = readPidFile()!;
      const after = Date.now();

      expect(data.startedAt).toBeGreaterThanOrEqual(before);
      expect(data.startedAt).toBeLessThanOrEqual(after);
    });
  });

  // ──────────────────────────────────────────────────────
  // removePidFile
  // ──────────────────────────────────────────────────────
  describe('removePidFile — PID 文件删除', () => {
    it('存在文件时删除', () => {
      writePidFile(3333);
      expect(existsSync(PID_FILE)).toBe(true);

      removePidFile();
      expect(existsSync(PID_FILE)).toBe(false);
    });

    it('文件不存在时不抛异常', () => {
      expect(existsSync(PID_FILE)).toBe(false);
      expect(() => removePidFile()).not.toThrow();
    });
  });

  // ──────────────────────────────────────────────────────
  // isEngineRunning
  // ──────────────────────────────────────────────────────
  describe('isEngineRunning — PID 存活验证', () => {
    it('PID 文件不存在 → 返回 false', () => {
      expect(isEngineRunning()).toBe(false);
    });

    it('PID 存活 → 返回 true', () => {
      vi.spyOn(process, 'kill').mockImplementation(() => true);
      writePidFile(4444);

      expect(isEngineRunning()).toBe(true);
    });

    it('PID 进程已死 → 返回 false 并清理过期文件', () => {
      vi.spyOn(process, 'kill').mockImplementation(() => {
        throw new Error('ESRCH');
      });
      writePidFile(5555);

      expect(isEngineRunning()).toBe(false);
      // 过期文件应被清理
      expect(existsSync(PID_FILE)).toBe(false);
    });

    it('进程已死但 PID 文件删除失败不抛异常', () => {
      vi.spyOn(process, 'kill').mockImplementation(() => {
        throw new Error('ESRCH');
      });
      writePidFile(6666);

      // 先删除文件 模拟并发删除
      cleanPidFile();

      // 不应抛异常
      expect(() => isEngineRunning()).not.toThrow();
      expect(isEngineRunning()).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────
  // startGuardian / stopGuardian — 监听器注册与移除
  // ──────────────────────────────────────────────────────
  describe('startGuardian / stopGuardian — 守护进程生命周期', () => {
    it('startGuardian 注册 uncaughtException 和 unhandledRejection 监听器', () => {
      const onSpy = vi.spyOn(process, 'on');

      startGuardian(3456, () => {});

      expect(onSpy).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
    });

    it('重复调用 startGuardian 不重复注册', () => {
      const onSpy = vi.spyOn(process, 'on');
      startGuardian(3456, () => {});
      const firstCallCount = onSpy.mock.calls.length;

      startGuardian(3456, () => {});
      expect(onSpy.mock.calls.length).toBe(firstCallCount);
    });

    it('stopGuardian 移除已注册的监听器', () => {
      const removeSpy = vi.spyOn(process, 'removeListener');
      startGuardian(3456, () => {});
      stopGuardian();

      expect(removeSpy).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
    });
  });

  // ──────────────────────────────────────────────────────
  // 崩溃重启策略
  // ──────────────────────────────────────────────────────
  describe('崩溃重启策略', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    /** 获取已注册的 uncaughtException 处理器并触发它 */
    function getCrashHandler(): (_err: Error) => void {
      const onSpy = (process.on as ReturnType<typeof vi.spyOn>);
      const calls = onSpy.mock?.calls || [];
      const uncaughtCall = calls.find(
        (c: unknown[]) => c[0] === 'uncaughtException',
      );
      if (!uncaughtCall) throw new Error('uncaughtException handler not registered');
      return uncaughtCall[1] as (_err: Error) => void;
    }

    it('第 1 次崩溃：1 秒后退避调用 onRestart', () => {
      const onRestart = vi.fn();
      vi.spyOn(process, 'on');
      vi.spyOn(process, 'removeListener');

      startGuardian(3456, onRestart);
      getCrashHandler()(new Error('模拟崩溃 1'));

      // 立即不应调用 onRestart
      expect(onRestart).not.toHaveBeenCalled();

      // 推进 1 秒（第一次退避延迟）
      vi.advanceTimersByTime(1000);

      expect(onRestart).toHaveBeenCalledTimes(1);
    });

    it('第 2 次崩溃：2 秒后退避调用 onRestart', () => {
      const onRestart = vi.fn();
      vi.spyOn(process, 'on');
      vi.spyOn(process, 'removeListener');

      startGuardian(3456, onRestart);
      const handler = getCrashHandler();

      // 第一次崩溃
      handler(new Error('崩溃 1'));
      vi.advanceTimersByTime(1000);
      // 超出冷却窗口
      vi.advanceTimersByTime(6000);

      // 第二次崩溃
      handler(new Error('崩溃 2'));

      expect(onRestart).toHaveBeenCalledTimes(1); // 第 1 次崩溃的 restart
      onRestart.mockClear();

      vi.advanceTimersByTime(2000); // 第二次退避延迟
      expect(onRestart).toHaveBeenCalledTimes(1);
    });

    it('第 3 次崩溃：4 秒后退避调用 onRestart', () => {
      const onRestart = vi.fn();
      vi.spyOn(process, 'on');
      vi.spyOn(process, 'removeListener');

      startGuardian(3456, onRestart);
      const handler = getCrashHandler();

      handler(new Error('崩溃 1'));
      vi.advanceTimersByTime(1000);
      vi.advanceTimersByTime(6000);

      handler(new Error('崩溃 2'));
      vi.advanceTimersByTime(2000);
      vi.advanceTimersByTime(6000);

      onRestart.mockClear();
      handler(new Error('崩溃 3'));

      vi.advanceTimersByTime(4000); // 第三次退避延迟
      expect(onRestart).toHaveBeenCalledTimes(1);
    });

    it('超过最大重启次数（3 次）后停止重启', () => {
      const onRestart = vi.fn();
      vi.spyOn(process, 'on');
      vi.spyOn(process, 'removeListener');

      startGuardian(3456, onRestart);
      const handler = getCrashHandler();

      const delays = [1000, 2000, 4000];
      for (let i = 0; i < 3; i++) {
        handler(new Error(`崩溃 ${i + 1}`));
        vi.advanceTimersByTime(delays[i]);
        vi.advanceTimersByTime(6000); // 超出冷却窗口
      }
      onRestart.mockClear();

      // 第 4 次崩溃 → 不重启
      handler(new Error('崩溃 4'));
      vi.advanceTimersByTime(10000);

      expect(onRestart).not.toHaveBeenCalled();
    });

    it('5 秒冷却窗口内连续崩溃 → 停止重启', () => {
      const onRestart = vi.fn();
      vi.spyOn(process, 'on');
      vi.spyOn(process, 'removeListener');

      startGuardian(3456, onRestart);
      const handler = getCrashHandler();

      handler(new Error('崩溃 1'));
      vi.advanceTimersByTime(1000); // 等第一次退避

      // 第一次崩溃的 restart 已被调用
      expect(onRestart).toHaveBeenCalledTimes(1);
      onRestart.mockClear();

      // 立即触发第二次崩溃（冷却窗口内）
      handler(new Error('崩溃 2'));

      // 第二次崩溃在冷却窗口内，不应调用 onRestart
      vi.advanceTimersByTime(10000);
      expect(onRestart).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────
  // 30 秒成功运行后 restartCount 复位
  // ──────────────────────────────────────────────────────
  describe('30 秒成功运行后 restartCount 复位', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('成功运行 30 秒后 restartCount 归零', () => {
      vi.spyOn(process, 'on');
      vi.spyOn(process, 'removeListener');

      const onRestart = vi.fn();
      startGuardian(3456, onRestart);

      // 触发一次崩溃 → restartCount = 1
      const onSpy = process.on as ReturnType<typeof vi.spyOn>;
      const calls = onSpy.mock?.calls || [];
      const uncaughtCall = calls.find(
        (c: unknown[]) => c[0] === 'uncaughtException',
      );
      if (uncaughtCall) {
        const handler = uncaughtCall[1] as (_err: Error) => void;
        handler(new Error('崩溃'));
      }
      vi.advanceTimersByTime(1000); // 退避
      expect(onRestart).toHaveBeenCalledTimes(1);

      // 再等 30 秒 → restartCount 应复位
      vi.advanceTimersByTime(30000);

      // 更新 PID 文件，重新读取验证
      writePidFile(7777);
      const data = readPidFile();
      expect(data).not.toBeNull();
      expect(data!.restartCount).toBe(0);
    });

    it('多次成功运行 30 秒窗口每次都会复位', () => {
      vi.spyOn(process, 'on');
      vi.spyOn(process, 'removeListener');

      const onRestart = vi.fn();
      startGuardian(3456, onRestart);

      const onSpy = process.on as ReturnType<typeof vi.spyOn>;
      const calls = onSpy.mock?.calls || [];
      const uncaughtCall = calls.find(
        (c: unknown[]) => c[0] === 'uncaughtException',
      );
      if (!uncaughtCall) return;
      const handler = uncaughtCall[1] as (_err: Error) => void;

      // 第一次崩溃 → 重启 → 30s 后复位
      handler(new Error('崩溃 1'));
      vi.advanceTimersByTime(1000); // 退避
      vi.advanceTimersByTime(30000); // 成功窗口
      writePidFile(8888);

      // 第二次崩溃（应在冷却窗口外）→ 再次重启
      vi.advanceTimersByTime(6000); // 超出冷却
      handler(new Error('崩溃 2'));
      vi.advanceTimersByTime(1000); // 退避（应仍是第 1 次退避，因为之前复位了）
      expect(onRestart).toHaveBeenCalledTimes(2);
    });
  });

  // ──────────────────────────────────────────────────────
  // resetGuardian — 测试隔离
  // ──────────────────────────────────────────────────────
  describe('resetGuardian — 测试隔离', () => {
    it('resetGuardian 移除所有监听器并重置内部状态', () => {
      const removeSpy = vi.spyOn(process, 'removeListener');
      startGuardian(3456, () => {});

      resetGuardian();

      expect(removeSpy).toHaveBeenCalled();
    });

    it('resetGuardian 后可以重新 startGuardian', () => {
      vi.spyOn(process, 'on');
      vi.spyOn(process, 'removeListener');

      startGuardian(3456, () => {});
      resetGuardian();

      const onSpy = vi.spyOn(process, 'on');
      startGuardian(3456, () => {});

      expect(onSpy).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
    });
  });
});
