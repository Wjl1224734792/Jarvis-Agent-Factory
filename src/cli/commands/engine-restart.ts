/**
 * engine restart 子命令：停止引擎后重新启动
 *
 * 流程：
 * 1. 调用 stopEngine 停止当前引擎
 * 2. 等待端口释放
 * 3. 调用 startEngine 重新启动
 */
import { stopEngine, startEngine } from '../../engine/server.js';
import type { CliOpts } from '../utils/args.js';

/**
 * 执行引擎重启
 *
 * @param opts - CLI 选项（未使用，保留接口一致性）
 * @param positional - 位置参数数组，第二项及以后为子命令参数
 */
export async function executeRestart(opts: CliOpts, positional: string[]): Promise<void> {
  console.log('Restarting Jarvis Engine...');

  // 解析参数：跳过 "engine" 和 "restart"
  const args = positional.slice(2);
  const port = parseInt(
    args.find(a => a.startsWith('--port='))?.split('=')[1] ||
      process.env.PORT ||
      '3456',
  );
  const stdio = args.includes('--stdio');
  const projectRoot = args.find(
    a => !a.startsWith('-') && a !== '--stdio',
  ) || '.';

  // 1. 停止当前引擎
  stopEngine();

  // 2. 等待端口释放（500ms 缓冲）
  await new Promise(resolve => setTimeout(resolve, 500));

  // 3. 重新启动
  await startEngine({
    port,
    stdio,
    projectRoot,
  });
}
