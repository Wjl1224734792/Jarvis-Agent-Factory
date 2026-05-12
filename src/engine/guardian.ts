/**
 * 引擎守护进程 — PID JSON 文件管理 + 崩溃自动重启
 *
 * PID 文件路径：~/.jarvis/engine.pid
 * JSON 格式：{"pid": 1234, "startedAt": 1715500000000, "restartCount": 0}
 *
 * 重启策略：
 * - 最多重启 3 次
 * - 指数退避：1s → 2s → 4s
 * - 5 秒内连续崩溃则停止重启（冷却窗口）
 * - 成功运行 30 秒后复位 restartCount
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

/** PID 文件存放目录 */
const PID_DIR = resolve(homedir(), '.jarvis');

/** PID 文件完整路径 */
const PID_FILE = resolve(PID_DIR, 'engine.pid');

/** 最大重启次数 */
const MAX_RESTART = 3;

/** 指数退避延迟（毫秒），索引 0/1/2 对应第 1/2/3 次重启 */
const BACKOFF_DELAYS = [1000, 2000, 4000];

/** 冷却窗口（毫秒）：在此窗口内连续两次崩溃则停止重启 */
const COOLDOWN_WINDOW_MS = 5000;

/** 成功运行窗口（毫秒）：超过此时间后复位 restartCount */
const SUCCESS_WINDOW_MS = 30000;

/** PID 文件数据结构 */
export interface PidData {
  /** 进程 ID */
  pid: number;
  /** 启动时间戳（毫秒） */
  startedAt: number;
  /** 当前重启次数 */
  restartCount: number;
}

// ── 进程内状态 ─────────────────────────────────────────────

/** 守护进程是否激活 */
let _guardianActive = false;

/** 上次崩溃时间戳（毫秒），用于冷却窗口判定 */
let _lastCrashTime = 0;

/** 当前累计重启次数 */
let _currentRestartCount = 0;

/** 成功运行计时器 */
let _successTimer: ReturnType<typeof setTimeout> | null = null;

/** 已注册的崩溃处理器引用（用于 stopGuardian 时精确移除） */
let _crashHandlers: Array<{ event: string; handler: (..._args: any[]) => void }> = [];

// ── PID 文件管理 ───────────────────────────────────────────

/**
 * 读取 PID JSON 文件。
 *
 * @returns PidData 对象，若文件不存在、格式错误或缺少必要字段则返回 null
 */
export function readPidFile(): PidData | null {
  try {
    if (!existsSync(PID_FILE)) return null;
    const raw = readFileSync(PID_FILE, 'utf-8').trim();
    if (!raw) return null;
    const data = JSON.parse(raw);
    // 验证必要字段
    if (typeof data.pid !== 'number' || typeof data.startedAt !== 'number') {
      return null;
    }
    return {
      pid: data.pid,
      startedAt: data.startedAt,
      restartCount: typeof data.restartCount === 'number' ? data.restartCount : 0,
    };
  } catch {
    return null;
  }
}

/**
 * 写入 PID JSON 文件。
 * 自动创建 ~/.jarvis 目录（若不存在）。
 *
 * @param pid - 当前进程 ID
 */
export function writePidFile(pid: number): void {
  if (!existsSync(PID_DIR)) {
    mkdirSync(PID_DIR, { recursive: true });
  }
  const data: PidData = {
    pid,
    startedAt: Date.now(),
    restartCount: _currentRestartCount,
  };
  writeFileSync(PID_FILE, JSON.stringify(data) + '\n');
}

/**
 * 删除 PID 文件（正常退出时调用）。
 * 删除失败不抛异常。
 */
export function removePidFile(): void {
  try {
    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }
  } catch {
    // 忽略清理错误（如并发删除、权限问题）
  }
}

// ── 运行状态检测 ───────────────────────────────────────────

/**
 * 检测引擎是否正在运行。
 * 通过 PID 文件存在性 + 进程存活验证（kill(pid, 0)）。
 * 若 PID 文件存在但进程已死，自动清理过期文件。
 *
 * @returns 引擎正在运行则返回 true
 */
export function isEngineRunning(): boolean {
  const data = readPidFile();
  if (!data) return false;
  try {
    // kill(pid, 0) 不发送信号，仅检查进程是否存在（POSIX）或进程句柄有效性（Windows）
    process.kill(data.pid, 0);
    return true;
  } catch {
    // PID 不存在 → 清理过期文件
    removePidFile();
    return false;
  }
}

// ── 守护进程 ───────────────────────────────────────────────

/**
 * 重置成功运行计时器。
 * 启动 30 秒定时器，到期后复位 restartCount 并更新 PID 文件。
 */
function resetSuccessTimer(): void {
  if (_successTimer) clearTimeout(_successTimer);
  _successTimer = setTimeout(() => {
    _currentRestartCount = 0;
    _lastCrashTime = 0;
    // 同步更新 PID 文件中的 restartCount
    const data = readPidFile();
    if (data) {
      writePidFile(data.pid);
    }
  }, SUCCESS_WINDOW_MS);
}

/**
 * 崩溃处理器：记录崩溃时间、检查重启策略、按退避延迟调度重启。
 *
 * @param err - 崩溃错误
 * @param origin - 崩溃来源（uncaughtException / unhandledRejection）
 * @param onRestart - 重启回调
 */
function handleCrash(err: Error, origin: string, onRestart: () => void): void {
  const now = Date.now();

  // 检查冷却窗口：两次崩溃间隔 < 5 秒则停止
  if (_lastCrashTime > 0 && (now - _lastCrashTime) < COOLDOWN_WINDOW_MS) {
    console.error(
      `[guardian] 冷却窗口内连续崩溃（${now - _lastCrashTime}ms < ${COOLDOWN_WINDOW_MS}ms），停止重启。`,
    );
    stopGuardian();
    return;
  }

  _lastCrashTime = now;
  _currentRestartCount++;

  // 超过最大重启次数
  if (_currentRestartCount > MAX_RESTART) {
    console.error(
      `[guardian] 已达最大重启次数（${MAX_RESTART}），停止重启。`,
    );
    stopGuardian();
    return;
  }

  const delay = BACKOFF_DELAYS[Math.min(_currentRestartCount - 1, BACKOFF_DELAYS.length - 1)];
  console.error(
    `[guardian] ${origin}: ${err.message}\n` +
    `           第 ${_currentRestartCount}/${MAX_RESTART} 次重启，${delay}ms 后退避…`,
  );

  setTimeout(() => {
    try {
      onRestart();
      // 重启成功后，启动成功运行计时器
      resetSuccessTimer();
    } catch (e) {
      console.error(`[guardian] 重启失败:`, (e as Error).message);
      stopGuardian();
    }
  }, delay);
}

/**
 * 启动守护进程：注册 uncaughtException 和 unhandledRejection 监听器，
 * 崩溃时根据重启策略调用 onRestart 回调。
 *
 * 幂等：重复调用不会重复注册。
 *
 * @param port - 引擎端口号（预留，供未来扩展使用）
 * @param onRestart - 重启回调，由调用方实现引擎重新初始化逻辑
 */
export function startGuardian(port: number, onRestart: () => void): void {
  if (_guardianActive) return;
  _guardianActive = true;

  const uncaughtHandler = (err: Error) => handleCrash(err, 'uncaughtException', onRestart);
  const unhandledHandler = (reason: unknown) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    handleCrash(err, 'unhandledRejection', onRestart);
  };

  process.on('uncaughtException', uncaughtHandler);
  process.on('unhandledRejection', unhandledHandler);

  _crashHandlers = [
    { event: 'uncaughtException', handler: uncaughtHandler },
    { event: 'unhandledRejection', handler: unhandledHandler },
  ];

  // 启动成功运行计时器
  resetSuccessTimer();
}

/**
 * 停止守护进程：移除所有崩溃监听器，清除计时器。
 *
 * 幂等：重复调用无副作用。
 */
export function stopGuardian(): void {
  _guardianActive = false;

  if (_successTimer) {
    clearTimeout(_successTimer);
    _successTimer = null;
  }

  for (const { event, handler } of _crashHandlers) {
    process.removeListener(event, handler);
  }
  _crashHandlers = [];
}

/**
 * 重置守护进程内部状态（测试隔离用）。
 * 调用 stopGuardian 清理监听器，并重置所有计数器。
 */
export function resetGuardian(): void {
  stopGuardian();
  _currentRestartCount = 0;
  _lastCrashTime = 0;
}
