import { resolve, join, dirname } from 'node:path';
import { existsSync, rmSync, readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { resolveScope } from '../utils/scope.js';
import { resolveTarget } from '../utils/resolve.js';
import { PLATFORMS, ALL_PLATFORMS, GLOBAL_ROOTS } from '../utils/constants.js';
import { getHashFilePath } from '../../hash-paths.js';
import { readMcpConfig } from '../../shared/mcp-config.js';
import type { CliOpts } from '../utils/args.js';

/** settings.json 中记录 jarvis 管理的 hook key 的字段 */
const MANAGED_HOOKS_KEY = '_jarvisManagedHooks';

/** 安装时使用的子目录列表 */
const INSTALL_BUCKETS = ['agents', 'commands', 'skills'];

/** MCP server 白名单：安装时添加的 server（仅删除这些） */
const JARVIS_MCP_SERVERS = new Set(['jarvis-engine', 'playwright']);

/**
 * 加载 jarvis 安装时写入的 hash 记录
 */
function loadHashes(hashFilePath: string): Record<string, unknown> {
  try { return existsSync(hashFilePath) ? JSON.parse(readFileSync(hashFilePath, 'utf-8')) : {}; }
  catch { return {}; }
}

/**
 * 细粒度移除——只删除 jarvis 安装的文件，保护用户自定义内容
 */
export async function execute(opts: CliOpts, positional: string[]): Promise<void> {
  const platforms: string[] = [];
  let path = '.';
  let dryRun = false;
  let listOnly = false;

  // 解析参数
  for (let i = 1; i < positional.length; i++) {
    const p = positional[i];
    if (p === '--dry-run') {
      dryRun = true;
    } else if (p === '--list') {
      listOnly = true;
    } else if (PLATFORMS[p]) {
      platforms.push(p);
    } else if (!p.startsWith('-')) {
      path = p;
    }
  }

  if (platforms.length === 0) {
    if (positional.length <= 1 + (dryRun ? 1 : 0) + (listOnly ? 1 : 0)) {
      platforms.push(...ALL_PLATFORMS);
    } else {
      console.error('\n❌  No valid platform specified.\n');
      console.log(`Valid platforms: ${ALL_PLATFORMS.join(', ')}\n`);
      return;
    }
  }

  const isGlobal = await resolveScope(opts);
  const target = resolveTarget(path, isGlobal);
  const hashFilePath = getHashFilePath(target, isGlobal);
  const hashes = loadHashes(hashFilePath);

  if (listOnly) {
    console.log(`\n📋 Jarvis-tracked files — ${isGlobal ? '~ (全局)' : target}\n`);
    printTrackedFiles(platforms, target, isGlobal, hashes);
    return;
  }

  const mode = dryRun ? '🔍 DRY RUN' : '🗑';
  console.log(`\n${mode} Removing jarvis-installed configs — ${isGlobal ? '~ (全局)' : target}\n`);

  let totalRemoved = 0;
  for (const name of platforms) {
    const dir = isGlobal
      ? GLOBAL_ROOTS[name]
      : resolve(target, PLATFORMS[name].dir);

    if (!existsSync(dir)) {
      console.log(`  ⏭  ${PLATFORMS[name].dir.padEnd(10)} not found`);
      continue;
    }

    // 按 bucket 细粒度删除：只删除 hash 记录匹配的文件
    for (const bucket of INSTALL_BUCKETS) {
      const bucketDir = join(dir, bucket);
      if (!existsSync(bucketDir)) continue;
      totalRemoved += removeBucketFiles(bucketDir, hashes, dryRun);
    }

    // 细粒度移除 settings.json 中的 jarvis hooks 和 env
    removeJarvisSettings(dir, dryRun);

    // 细粒度移除 MCP 配置中 jarvis 相关的 server
    removeJarvisMcp(name, target, isGlobal, dryRun);
  }

  // 清理 hash 记录文件本身
  if (!dryRun && existsSync(hashFilePath)) {
    rmSync(hashFilePath);
    console.log(`  - ${hashFilePath}`);
    totalRemoved++;
  }

  console.log(`\n✅ ${dryRun ? 'DRY RUN complete (no changes made)' : 'Done!'} (${totalRemoved} items removed)\n`);
}

/**
 * 删除目录中 hash 匹配的 jarvis 安装文件
 */
function removeBucketFiles(bucketDir: string, hashes: Record<string, unknown>, dryRun: boolean): number {
  let removed = 0;
  try {
    const entries = readdirSync(bucketDir);
    for (const entry of entries) {
      const fullPath = join(bucketDir, entry);
      const isDir = statSync(fullPath).isDirectory();
      if (isDir) {
        // 递归处理 skills 子目录
        removed += removeBucketFiles(fullPath, hashes, dryRun);
      } else {
        // 只删除 hash 记录中存在的文件（jarvis 安装的）
        if (hashes[fullPath]) {
          if (!dryRun) rmSync(fullPath);
          console.log(`  - ${entry}`);
          removed++;
        }
      }
    }
    // 删除空目录
    try {
      const remaining = readdirSync(bucketDir);
      if (remaining.length === 0 && !dryRun) {
        rmSync(bucketDir, { recursive: true });
      }
    } catch { /* ignore */ }
  } catch { /* ignore */ }
  return removed;
}

/**
 * 细粒度移除 settings.json 中 jarvis 管理的 hooks 和 env
 */
function removeJarvisSettings(claudeDir: string, dryRun: boolean): void {
  const settingsFile = join(claudeDir, 'settings.json');
  if (!existsSync(settingsFile)) return;

  try {
    const content = readFileSync(settingsFile, 'utf-8');
    const settings = JSON.parse(content);
    let changed = false;

    // 移除 jarvis 管理的 hooks
    const managedHooks: string[] = Array.isArray(settings[MANAGED_HOOKS_KEY]) ? settings[MANAGED_HOOKS_KEY] : [];
    if (managedHooks.length > 0 && settings.hooks) {
      for (const key of managedHooks) {
        if (key in (settings.hooks || {})) {
          delete settings.hooks[key];
          console.log(`  - settings.json hooks.${key}`);
          changed = true;
        }
      }
      if (settings.hooks && Object.keys(settings.hooks).length === 0) {
        delete settings.hooks;
      }
    }

    // 移除 jarvis 新增的 env 项（保留用户自定义的）
    const jarvisEnvKeys = ['CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS'];
    if (settings.env) {
      for (const key of jarvisEnvKeys) {
        if (key in settings.env) {
          delete settings.env[key];
          console.log(`  - settings.json env.${key}`);
          changed = true;
        }
      }
      if (Object.keys(settings.env).length === 0) {
        delete settings.env;
      }
    }

    // 移除 hook 管理标记
    if (MANAGED_HOOKS_KEY in settings) {
      delete settings[MANAGED_HOOKS_KEY];
      changed = true;
    }

    if (changed && !dryRun) {
      writeFileSync(settingsFile, JSON.stringify(settings, null, 2) + '\n');
    }
  } catch { /* ignore */ }
}

/**
 * 细粒度移除 MCP 配置中 jarvis 安装的 server 条目
 */
function removeJarvisMcp(platform: string, target: string, isGlobal: boolean, dryRun: boolean): void {
  if (platform !== 'claude') return;

  const projectRoot = isGlobal ? GLOBAL_ROOTS.claude : target;
  const mcpFile = resolve(projectRoot, '.mcp.json');

  if (!existsSync(mcpFile)) return;

  try {
    const existing = readMcpConfig(projectRoot);
    if (!existing) return;

    const mcpKey = existing.mcpServers ? 'mcpServers' : 'mcp';
    const servers = existing[mcpKey];
    if (!servers) return;

    let changed = false;
    for (const name of JARVIS_MCP_SERVERS) {
      if (name in servers) {
        delete servers[name];
        console.log(`  - ${mcpKey}.${name}`);
        changed = true;
      }
    }

    if (changed) {
      if (Object.keys(servers).length === 0) {
        delete existing[mcpKey];
      }
      if (!dryRun) {
        writeFileSync(mcpFile, JSON.stringify(existing, null, 2) + '\n');
      }
    }
  } catch { /* ignore */ }
}

/**
 * 列出 jarvis 跟踪的文件
 */
function printTrackedFiles(
  platforms: string[],
  target: string,
  isGlobal: boolean,
  hashes: Record<string, unknown>,
): void {
  const trackedFiles = Object.keys(hashes).filter(f => {
    for (const name of platforms) {
      const dir = isGlobal ? GLOBAL_ROOTS[name] : resolve(target, PLATFORMS[name]?.dir || '');
      if (f.startsWith(dir)) return true;
    }
    return false;
  });

  if (trackedFiles.length === 0) {
    console.log('  (no tracked files found)');
  } else {
    for (const f of trackedFiles) {
      console.log(`  ${f}`);
    }
    console.log(`\n  Total: ${trackedFiles.length} files`);
  }
}
