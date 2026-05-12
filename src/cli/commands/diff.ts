import { resolve, join } from 'node:path';
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { resolveScope } from '../utils/scope.js';
import { resolveTarget } from '../utils/resolve.js';
import { PLATFORMS, ALL_PLATFORMS, PKG_ROOT } from '../utils/constants.js';
import { getHashFilePath } from '../../hash-paths.js';
import type { CliOpts } from '../utils/args.js';

/**
 * 对比单个平台模板与已安装文件的差异
 */
async function diffPlatform(
  platform: string,
  target: string,
  isGlobal: boolean,
): Promise<void> {
  const srcRoot = resolve(PKG_ROOT, 'dist/src', 'templates', 'platforms', platform);

  const destRoot = isGlobal
    ? (platform === 'opencode'
      ? resolve(homedir(), '.config', 'opencode')
      : resolve(homedir(), `.${platform}`))
    : resolve(target, PLATFORMS[platform].dir);

  if (!existsSync(srcRoot)) return;

  const hashFile = getHashFilePath(target, isGlobal);
  const hashes = existsSync(hashFile)
    ? JSON.parse(readFileSync(hashFile, 'utf-8'))
    : {};

  const hash = (f: string) =>
    createHash('sha256').update(readFileSync(f)).digest('hex');

  let changed = 0;

  for (const bucket of ['agents', 'commands', 'skills']) {
    const sd = join(srcRoot, bucket);
    const dd = join(destRoot, bucket);
    if (!existsSync(sd) || !existsSync(dd)) continue;

    for (const entry of readdirSync(sd)) {
      const sp = join(sd, entry);
      const dp = join(dd, entry);
      if (statSync(sp).isDirectory()) continue;

      const rel = `${bucket}/${entry}`;
      const newHash = hash(sp);

      if (!existsSync(dp)) {
        if (changed < 20) console.log(`  + ${rel.padEnd(30)} (new)`);
        changed++;
        continue;
      }

      const oldHash = hashes[dp];
      if (newHash !== oldHash) {
        if (changed < 20) {
          const destHash = hash(dp);
          const status =
            !oldHash || destHash === oldHash
              ? 'update'
              : 'skip (modified by user)';
          console.log(`  ~ ${rel.padEnd(30)} ${status}`);
        }
        changed++;
      }
    }
  }

  if (changed === 0) {
    console.log(`  ✅ ${platform.padEnd(10)} up to date`);
  } else if (changed > 20) {
    console.log(`  ... and ${changed - 20} more files`);
  }
}

/**
 * jarvis diff [path] — 预览升级变更（不实际执行）
 */
export async function execute(opts: CliOpts, positional: string[]): Promise<void> {
  const path = positional[1];
  const isGlobal = await resolveScope(opts);
  const target = resolveTarget(path, isGlobal);

  console.log(`\n📋 检查变更预览 → ${isGlobal ? '~ (全局)' : target}\n`);

  for (const name of ALL_PLATFORMS) {
    await diffPlatform(name, target, isGlobal);
  }

  console.log(`\n💡 运行 \`jarvis upgrade\` 应用这些变更。\n`);
}
