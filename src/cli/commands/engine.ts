import { startEngine, stopEngine } from '../../engine/server.js';
import { executeRestart } from './engine-restart.js';
import { executeStatus } from './engine-status.js';
import type { CliOpts } from '../utils/args.js';

/**
 * jarvis engine <start|stop|restart|status> — 管理 MCP 编排引擎
 * jarvis web [--port=N] — 启动 Web 面板（≡ engine start）
 */
export async function execute(opts: CliOpts, positional: string[]): Promise<void> {
  const sub = positional[1];

  if (sub === 'start') {
    const port = parseInt(
      positional.find(a => a.startsWith('--port='))?.split('=')[1] ||
        process.env.PORT ||
        '3456',
    );
    const stdio = positional.includes('--stdio');
    await startEngine({
      port,
      stdio,
      projectRoot:
        positional.find(
          a =>
            !a.startsWith('-') &&
            a !== 'start' &&
            a !== 'engine' &&
            a !== '--stdio',
        ) || '.',
    });
  } else if (sub === 'stop') {
    stopEngine();
  } else if (sub === 'restart') {
    await executeRestart(opts, positional);
  } else if (sub === 'status') {
    executeStatus(opts, positional);
  } else {
    console.log('\nUsage: jarvis engine <start|stop|restart|status> [--port=<N>]\n');
  }
}

/**
 * jarvis web [--port=N] — Web 面板快捷命令
 * 底层复用 engine start，无需独立实现
 */
export async function executeWeb(opts: CliOpts, positional: string[]): Promise<void> {
  const port = parseInt(
    positional.find(a => a.startsWith('--port='))?.split('=')[1] ||
      process.env.WEB_PORT ||
      '3456',
  );
  await startEngine({ port, projectRoot: '.' });
}
