// 必须作为第一个 import：在 node:sqlite 被加载前拦截 ExperimentalWarning
import '../suppress-warnings.js';
import { parseArgs, type CliOpts } from './utils/args.js';
import { getHelpText, PKG_VERSION, PKG_NAME } from './utils/constants.js';
import { checkLatest, semverGt } from './utils/resolve.js';

/** 命令模块延迟加载签名 */
type CmdModule = { execute: (_opts: CliOpts, _positional: string[]) => Promise<void> };

const COMMANDS: Record<string, () => Promise<CmdModule>> = {
  init:    () => import('./commands/init.js'),
  add:     () => import('./commands/add.js'),
  remove:  () => import('./commands/remove.js'),
  rm:      () => import('./commands/remove.js'),
  upgrade: () => import('./commands/upgrade.js'),
  update:  () => import('./commands/upgrade.js'),
  diff:    () => import('./commands/diff.js'),
  engine:  () => import('./commands/engine.js'),
  hook:    () => import('./commands/hook.js'),
  resolve: () => import('./commands/resolve.js'),
  doctor:  () => import('./commands/doctor.js'),
  check:   () => import('./commands/doctor.js'),
};

export async function run(): Promise<void> {
  const { opts, positional } = parseArgs(process.argv.slice(2));

  // 全局标志处理
  if (opts.help)    { console.log(getHelpText()); return; }
  if (opts.version) {
    console.log(`${PKG_NAME} v${PKG_VERSION}`);
    const latest = checkLatest();
    if (latest && semverGt(latest, PKG_VERSION)) {
      console.log(`\n  Update available: v${latest} → npm i -g ${PKG_NAME}@latest`);
    }
    return;
  }

  const cmd = positional[0] || 'init';

  // web 命令：直接调用 executeWeb（与 engine start 行为不同）
  if (cmd === 'web') {
    const { executeWeb } = await import('./commands/engine.js');
    await executeWeb(opts, positional);
    return;
  }

  const loader = COMMANDS[cmd];
  if (!loader) {
    console.error(`\n❌  Unknown command: ${cmd}\n`);
    console.log(getHelpText());
    return;
  }

  const mod = await loader();
  await mod.execute(opts, positional);
}
