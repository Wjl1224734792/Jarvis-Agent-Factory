import { resolve } from 'node:path';
import { existsSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolveScope } from '../utils/scope.js';
import { resolveTarget } from '../utils/resolve.js';
import { PLATFORMS, ALL_PLATFORMS, GLOBAL_ROOTS } from '../utils/constants.js';
import { confirm } from '../utils/io.js';
import type { CliOpts } from '../utils/args.js';

/**
 * 移除平台的 MCP 配置文件
 */
function removeMcp(platform: string, target: string, isGlobal: boolean): void {
  const files: Record<string, string> = {
    claude:   '.mcp.json',
    opencode: 'opencode.json',
    codex:    '.codex/config.toml',
  };
  const f = files[platform];
  if (!f) return;
  const dest = isGlobal ? resolve(homedir(), f) : resolve(target, f);
  if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
    console.log(`  - ${f.padEnd(18)} removed`);
  }
}

/**
 * jarvis remove <platform...> [path] — 从项目移除指定平台配置
 * 别名: jarvis rm
 * 若不指定平台参数，则默认移除全部平台
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
      // 无平台参数时默认移除全部平台
      platforms.push(...ALL_PLATFORMS);
    } else {
      console.error('\n❌  No valid platform specified.\n');
      console.log(`Valid platforms: ${ALL_PLATFORMS.join(', ')}\n`);
      return;
    }
  }

  const isGlobal = await resolveScope(opts);
  const target = resolveTarget(path, isGlobal);

  for (const name of platforms) {
    const dir = isGlobal
      ? GLOBAL_ROOTS[name]
      : resolve(target, PLATFORMS[name].dir);

    if (existsSync(dir)) {
      if (!opts.yes) {
        const ok = await confirm(`  Remove ${dir}? [y/N] `);
        if (!ok) {
          console.log(`  ⏭  Skipped ${name}`);
          continue;
        }
      }
      rmSync(dir, { recursive: true, force: true });
      console.log(`  - ${PLATFORMS[name].dir.padEnd(10)} removed`);
      // 同时移除 MCP 配置
      removeMcp(name, target, isGlobal);
    } else {
      console.log(`  ⏭  ${PLATFORMS[name].dir.padEnd(10)} not found`);
    }
  }

  console.log(`\n✅ Done!\n`);
}
