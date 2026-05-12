import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { install } from '../../install.js';
import { resolveScope } from '../utils/scope.js';
import { resolveTarget, checkLatest, semverGt } from '../utils/resolve.js';
import { PLATFORMS, ALL_PLATFORMS, PKG_ROOT, PKG_VERSION, PKG_NAME, GLOBAL_ROOTS } from '../utils/constants.js';
import type { CliOpts } from '../utils/args.js';

/**
 * jarvis upgrade [path] — 升级所有已安装的平台配置到最新版本
 * 别名: jarvis update
 */
export async function execute(opts: CliOpts, positional: string[]): Promise<void> {
  // 检查 CLI 自身是否可升级
  const latest = checkLatest();
  if (latest && semverGt(latest, PKG_VERSION)) {
    console.log(`\n⬆️  CLI: v${PKG_VERSION} → v${latest}`);
    console.log(`   npm i -g ${PKG_NAME}@latest\n`);
  }

  const path = positional[1];
  const isGlobal = await resolveScope(opts);
  const target = resolveTarget(path, isGlobal);
  const scope = isGlobal ? '~ (全局)' : target;

  console.log(`🔄 Upgrading → ${scope}\n`);

  for (const name of ALL_PLATFORMS) {
    const dir = isGlobal
      ? GLOBAL_ROOTS[name]
      : resolve(target, PLATFORMS[name].dir);

    if (existsSync(dir)) {
      await install({
        platform: name,
        target,
        pkgRoot: PKG_ROOT,
        platforms: PLATFORMS,
        force: opts.yes,
        global: isGlobal,
      });
    } else {
      console.log(`  ⏭  ${PLATFORMS[name].dir} not installed, skipped`);
    }
  }

  console.log(`\n✅ Done!\n`);
}
