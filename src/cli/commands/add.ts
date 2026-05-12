import { install } from '../../install.js';
import { resolveScope } from '../utils/scope.js';
import { resolveTarget } from '../utils/resolve.js';
import { PLATFORMS, ALL_PLATFORMS, PKG_ROOT } from '../utils/constants.js';
import type { CliOpts } from '../utils/args.js';

/**
 * jarvis add <platform...> [path] — 向项目添加指定平台配置
 * 若不指定平台参数，则默认安装全部平台（与 init 行为一致）
 */
export async function execute(opts: CliOpts, positional: string[]): Promise<void> {
  const platforms: string[] = [];
  let path = '.';

  for (let i = 1; i < positional.length; i++) {
    const p = positional[i];
    if (PLATFORMS[p]) {
      platforms.push(p);
    } else if (!p.startsWith('-')) {
      path = p;
    }
  }

  if (platforms.length === 0) {
    if (positional.length === 1) {
      // 无平台参数时默认安装全部平台
      platforms.push(...ALL_PLATFORMS);
    } else {
      console.error('\n❌  No valid platform specified.\n');
      console.log(`Valid platforms: ${ALL_PLATFORMS.join(', ')}\n`);
      return;
    }
  }

  const isGlobal = await resolveScope(opts);
  const target = resolveTarget(path, isGlobal);
  const scope = isGlobal ? '~ (全局)' : target;

  console.log(`\n📦 Adding to ${scope}\n`);

  for (const name of platforms) {
    await install({
      platform: name,
      target,
      pkgRoot: PKG_ROOT,
      platforms: PLATFORMS,
      force: opts.yes,
      global: isGlobal,
    });
  }

  console.log(`\n✅ Done!\n`);
}
