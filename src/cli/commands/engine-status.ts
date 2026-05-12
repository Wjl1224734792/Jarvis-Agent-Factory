/**
 * engine status 子命令：返回引擎运行状态、PID、运行时长、重启次数
 *
 * 通过 guardian PID JSON 文件获取详细信息。
 */
import { readPidFile, isEngineRunning } from '../../engine/guardian.js';
import type { CliOpts } from '../utils/args.js';

/**
 * 格式化秒数为人类可读的持续时间字符串
 *
 * @param seconds - 总秒数
 * @returns 格式化后的字符串（如 "2h 30m 5s"）
 */
function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

/**
 * 查询并显示引擎状态
 *
 * @param opts - CLI 选项（未使用，保留接口一致性）
 * @param positional - 位置参数数组（未使用）
 */
export function executeStatus(_opts: CliOpts, _positional: string[]): void {
  const data = readPidFile();

  if (!data) {
    console.log('Engine: not running');
    return;
  }

  if (isEngineRunning()) {
    const uptime = Math.floor((Date.now() - data.startedAt) / 1000);

    console.log('Engine Status:');
    console.log(`  Status:    running`);
    console.log(`  PID:       ${data.pid}`);
    console.log(`  Uptime:    ${formatUptime(uptime)}`);
    console.log(`  Restarts:  ${data.restartCount}`);
    console.log(`  Started:   ${new Date(data.startedAt).toISOString()}`);
  } else {
    console.log(`Engine: not running (stale PID ${data.pid})`);
  }
}
