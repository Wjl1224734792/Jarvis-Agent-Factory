import { hookCommand } from '../../hook.js';
import type { CliOpts } from '../utils/args.js';

/**
 * jarvis hook <subcommand...> — 执行钩子命令
 * 委托到 src/hook.ts 的 hookCommand 函数
 */
export async function execute(_opts: CliOpts, positional: string[]): Promise<void> {
  await hookCommand(positional.slice(1));
}
