import { doctor } from '../../doctor.js';
import { resolveScope } from '../utils/scope.js';
import { resolveTarget } from '../utils/resolve.js';
import { PLATFORMS, PKG_ROOT } from '../utils/constants.js';
import type { CliOpts } from '../utils/args.js';

/**
 * jarvis doctor [path] — 验证安装健康状态
 * 别名: jarvis check
 */
export async function execute(opts: CliOpts, positional: string[]): Promise<void> {
  const path = positional[1];
  const isGlobal = await resolveScope(opts);
  const target = resolveTarget(path, isGlobal);

  doctor({
    target,
    platforms: PLATFORMS,
    pkgRoot: PKG_ROOT,
    global: isGlobal,
  });
}
