import { resolve, join } from 'node:path';
import { existsSync, rmSync, readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
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
const JARVIS_MCP_SERVERS = new Set(['jarvis-engine', 'playwright', 'chrome-devtools']);

/**
 * 加载 jarvis 安装时写入的 hash 记录
 */
function loadHashes(hashFilePath: string): Record<string, unknown> {
  try { return existsSync(hashFilePath) ? JSON.parse(readFileSync(hashFilePath, 'utf-8')) : {}; }
  catch { return {}; }
}

/**
 * 细粒度移除——只删除 jarvis 安装的文件，保护用户自定义内容
 *
 * jarvis remove [platform] [path] [flags]
 *
 * Flags:
 *   --dry-run   仅预览，不执行删除
 *   --list      列出会被删除的文件
 *   --engine    同时清理 .jarvis/ 引擎数据（数据库 + 产物文档 + 归档）
 *   --force     跳过确认提示（非交互模式）
 *   --global    清理用户全局 ~ 目录下的配置
 */
export async function execute(opts: CliOpts, positional: string[]): Promise<void> {
  const platforms: string[] = [];
  let path = '.';
  let dryRun = false;
  let listOnly = false;
  let cleanEngine = false;
  let force = false;

  // 解析参数
  for (let i = 1; i < positional.length; i++) {
    const p = positional[i];
    if (p === '--dry-run') {
      dryRun = true;
    } else if (p === '--list') {
      listOnly = true;
    } else if (p === '--engine') {
      cleanEngine = true;
    } else if (p === '--force') {
      force = true;
    } else if (PLATFORMS[p]) {
      platforms.push(p);
    } else if (!p.startsWith('-')) {
      path = p;
    }
  }

  if (platforms.length === 0) {
    if (positional.length <= 1 + (dryRun ? 1 : 0) + (listOnly ? 1 : 0) + (cleanEngine ? 1 : 0)) {
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
    if (cleanEngine) printEngineData(target, isGlobal);
    return;
  }

  // 引擎数据清理需确认（安全保护）：仅阻止引擎数据，配置清理正常进行
  const engineForced = cleanEngine && (force || dryRun);
  if (cleanEngine && !force && !dryRun) {
    console.log(`\n⚠️  --engine 需配合 --force 使用（不可逆操作保护）`);
    console.log(`   .jarvis/ 引擎数据不会被删除，只清理配置。\n`);
  }

  const mode = dryRun ? '🔍 DRY RUN' : '🗑';
  const scope = isGlobal ? '~ (全局)' : target;
  const what = engineForced ? 'configs + engine data' : 'configs';
  console.log(`\n${mode} Removing jarvis ${what} — ${scope}\n`);

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

  // 清理引擎数据（需显式 --engine --force）
  if (engineForced) {
    totalRemoved += removeEngineData(target, isGlobal, dryRun);
  }

  // 清理 hash 记录文件本身（引擎数据清理时一并处理）
  if (!engineForced && !dryRun && existsSync(hashFilePath)) {
    rmSync(hashFilePath);
    console.log(`  - ${hashFilePath}`);
    totalRemoved++;
  }

  console.log(`\n✅ ${dryRun ? 'DRY RUN complete (no changes made)' : 'Done!'} (${totalRemoved} items removed)\n`);
}

/**
 * 清理 .jarvis/ 引擎数据目录
 * 仅当显式传入 --engine 时调用，包含：
 *   - engine.db / engine.db-wal / engine.db-shm（SQLite 数据库）
 *   - engine.pid（进程锁）
 *   - YYYY-MM-DD/（产物文档日期目录）
 *   - flows/（已保存的流程 Skill）
 *   - tmp/（临时文件）
 *   - README.md（自动生成的说明）
 *   - file-hashes.json（安装记录）
 */
function removeEngineData(target: string, isGlobal: boolean, dryRun: boolean): number {
  const jarvisDir = isGlobal
    ? resolve(homedir(), '.jarvis')
    : resolve(target, '.jarvis');

  if (!existsSync(jarvisDir)) {
    console.log(`  ⏭  .jarvis/ not found`);
    return 0;
  }

  let removed = 0;
  try {
    const entries = readdirSync(jarvisDir);
    for (const entry of entries) {
      const fullPath = join(jarvisDir, entry);
      const isDir = statSync(fullPath).isDirectory();

      // 保留用户可能自己的文件（不匹配已知 Jarvis 模式的跳过）
      if (isDir) {
        // 日期目录 (YYYY-MM-DD) 或 flows/tmp/requirements
        if (/^\d{4}-\d{2}-\d{2}$/.test(entry) || entry === 'flows' || entry === 'tmp' || entry === 'requirements') {
          const fileCount = countFiles(fullPath);
          if (!dryRun) rmSync(fullPath, { recursive: true });
          console.log(`  - .jarvis/${entry}/ (${fileCount} files)`);
          removed += fileCount;
        } else {
          console.log(`  ⏭  .jarvis/${entry}/ (skipped, not Jarvis-managed)`);
        }
      } else {
        // engine.db*, engine.pid, README.md, file-hashes.json, priority-context.md
        const isJarvisFile = /^(engine\.db|engine\.db-wal|engine\.db-shm|engine\.pid|file-hashes\.json|priority-context\.md|README\.md)$/.test(entry);
        if (isJarvisFile) {
          if (!dryRun) rmSync(fullPath);
          console.log(`  - .jarvis/${entry}`);
          removed++;
        } else {
          console.log(`  ⏭  .jarvis/${entry} (skipped, not Jarvis-managed)`);
        }
      }
    }

    // 删除空的 .jarvis/ 目录
    try {
      const remaining = readdirSync(jarvisDir);
      if (remaining.length === 0 && !dryRun) {
        rmSync(jarvisDir);
        console.log(`  - .jarvis/ (empty dir removed)`);
      }
    } catch { /* ignore */ }
  } catch { /* ignore */ }

  return removed;
}

/** 递归计算目录中的文件数 */
function countFiles(dir: string): number {
  let count = 0;
  try {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) {
        count += countFiles(p);
      } else {
        count++;
      }
    }
  } catch { /* ignore */ }
  return count;
}

/** 打印引擎数据内容（预览用） */
function printEngineData(target: string, isGlobal: boolean): void {
  const jarvisDir = isGlobal
    ? resolve(homedir(), '.jarvis')
    : resolve(target, '.jarvis');

  if (!existsSync(jarvisDir)) {
    console.log('  (no .jarvis/ directory)');
    return;
  }

  try {
    for (const entry of readdirSync(jarvisDir)) {
      const p = join(jarvisDir, entry);
      const isDir = statSync(p).isDirectory();
      if (isDir && /^\d{4}-\d{2}-\d{2}$/.test(entry)) {
        console.log(`  .jarvis/${entry}/ (${countFiles(p)} files)`);
      } else if (isDir) {
        console.log(`  .jarvis/${entry}/`);
      } else {
        const size = statSync(p).size;
        console.log(`  .jarvis/${entry} (${formatSize(size)})`);
      }
    }
  } catch { /* ignore */ }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
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
