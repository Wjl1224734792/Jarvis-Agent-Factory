import { install } from '../../install.js';
import { resolveScope } from '../utils/scope.js';
import { resolveTarget } from '../utils/resolve.js';
import { PLATFORMS, ALL_PLATFORMS, PKG_ROOT, PKG_VERSION, PKG_NAME } from '../utils/constants.js';
import { checkLatest, semverGt } from '../utils/resolve.js';
import type { CliOpts } from '../utils/args.js';

/**
 * jarvis init [path] — 初始化项目配置（安装所有平台 + MCP）
 * jarvis (无参数) — 等同于 jarvis init .
 */
export async function execute(opts: CliOpts, positional: string[]): Promise<void> {
  const path = positional[1];
  const isGlobal = await resolveScope(opts);
  const target = resolveTarget(path, isGlobal);
  const scope = isGlobal ? '~ (全局)' : target;

  console.log(`\n🚀 Jarvis v${PKG_VERSION}\n`);
  console.log(`   Target: ${scope}\n`);

  // 检查 CLI 自身更新
  const latest = checkLatest();
  if (latest && semverGt(latest, PKG_VERSION)) {
    console.log(`   Update available: ${PKG_NAME} v${PKG_VERSION} → v${latest}`);
    console.log(`   npm i -g ${PKG_NAME}@latest\n`);
  }

  for (const name of ALL_PLATFORMS) {
    await install({
      platform: name,
      target,
      pkgRoot: PKG_ROOT,
      platforms: PLATFORMS,
      force: opts.yes,
      global: isGlobal,
    });
  }

  console.log(`\n✅ Done! \`jarvis doctor\` to verify.\n`);
}
