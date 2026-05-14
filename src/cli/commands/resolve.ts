import { resolve, join, dirname, basename, sep } from 'node:path';
import { existsSync, readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { resolveTarget } from '../utils/resolve.js';
import { getHashFilePath } from '../../hash-paths.js';
import { computeSectionHashes } from '../../shared/markdown-utils.js';
import type { CliOpts } from '../utils/args.js';

/** 冲突标记正则：匹配三个捕获组 */
const CONFLICT_RE = /<<<<<<< user.*?\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> template.*?(\n|$)/g;

/** 接受模式 */
type AcceptMode = 'user' | 'template';

/** 冲突块解析结果 */
interface ConflictBlock {
  /** 完整匹配文本（含冲突标记） */
  fullMatch: string;
  /** 用户内容（======= 之前） */
  userContent: string;
  /** 模板内容（======= 之后、>>>>>>> 之前） */
  templateContent: string;
  /** 提取的 section 标题 */
  title: string;
  /** 模板版本号 */
  templateVersion: string;
}

// ─── 冲突解析 ────────────────────────────────────────────

/**
 * 从用户/模板内容中提取 section 标题（首个 ## 标题）。
 * 无 ## 标题时返回 '(preamble)'。
 *
 * @param content 冲突块中的内容文本
 */
function extractSectionTitle(content: string): string {
  const match = content.match(/^## (.+)$/m);
  return match ? match[1] : '(preamble)';
}

/**
 * 从完整冲突标记中提取模板版本号。
 *
 * @param fullMatch 完整冲突块文本
 */
function extractTemplateVersion(fullMatch: string): string {
  const match = fullMatch.match(/>>>>>>> template v([\d.]+)/);
  return match ? match[1] : 'unknown';
}

/**
 * 解析文件中所有冲突块。
 *
 * @param content 文件完整文本
 * @returns 冲突块数组，无冲突时为空数组
 */
function parseConflicts(content: string): ConflictBlock[] {
  const conflicts: ConflictBlock[] = [];
  // 每次创建新的 RegExp 避免 lastIndex 残留问题
  const re = new RegExp(CONFLICT_RE.source, CONFLICT_RE.flags);
  let match: RegExpExecArray | null;

  while ((match = re.exec(content)) !== null) {
    conflicts.push({
      fullMatch: match[0],
      userContent: match[1],
      templateContent: match[2],
      title: extractSectionTitle(match[1]),
      templateVersion: extractTemplateVersion(match[0]),
    });
  }

  return conflicts;
}

/**
 * 检查文件是否包含未解决的冲突标记。
 *
 * @param filePath 文件绝对路径
 */
function hasConflicts(filePath: string): boolean {
  try {
    return /<<<<<<< user/.test(readFileSync(filePath, 'utf-8'));
  } catch {
    return false;
  }
}

// ─── Hash 记录更新 ────────────────────────────────────────

/**
 * 更新 file-hashes.json 中指定文件的 hash 记录。
 * 仅处理已存在于 hash 记录中的文件条目，发现时无操作。
 *
 * @param filePath 已解决冲突的文件绝对路径
 * @param hashFilePath hash 文件绝对路径
 */
function updateHashRecord(filePath: string, hashFilePath: string): void {
  if (!existsSync(hashFilePath)) return;

  let hashes: Record<string, unknown>;
  try {
    hashes = JSON.parse(readFileSync(hashFilePath, 'utf-8'));
  } catch {
    return;
  }

  const absPath = resolve(filePath);

  // 只更新已存在于 hash 记录中的文件
  if (!(absPath in hashes)) return;

  // 对 .md 文件使用 section 级 hash 格式（_v: 2），与 install.ts saveHashes 一致
  if (absPath.endsWith('.md') && existsSync(absPath)) {
    try {
      const sectionInfo = computeSectionHashes(absPath);
      hashes[absPath] = {
        _v: 2,
        preamble: sectionInfo.preamble,
        sections: sectionInfo.sections,
      };
    } catch {
      // 计算失败时不更新，保留原记录
      return;
    }
  }

  writeFileSync(hashFilePath, JSON.stringify(hashes, null, 2));
}

// ─── 目录扫描 ─────────────────────────────────────────────

/**
 * 扫描指定根目录下的冲突文件。
 * 扫描子目录：agents、commands、skills。
 *
 * @param rootDir .claude 目录的绝对路径
 * @returns 包含冲突标记的文件绝对路径列表
 */
function scanConflictFiles(rootDir: string): string[] {
  const buckets = ['agents', 'commands', 'skills'];
  const results: string[] = [];

  for (const bucket of buckets) {
    const dir = join(rootDir, bucket);
    if (!existsSync(dir)) continue;

    try {
      for (const entry of readdirSync(dir)) {
        const fp = join(dir, entry);
        if (statSync(fp).isDirectory()) continue;
        if (hasConflicts(fp)) results.push(resolve(fp));
      }
    } catch {
      // 目录不可访问时跳过
    }
  }

  return results;
}

/**
 * 从给定文件路径向上查找 hash 文件。
 * 最多向上遍历 10 层，回退到全局 ~/.jarvis/ 目录。
 *
 * @param filePath 文件路径
 * @returns hash 文件路径，未找到时返回 null
 */
function findHashFile(filePath: string): string | null {
  let dir = dirname(resolve(filePath));
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, '.jarvis', 'file-hashes.json');
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  // 回退到全局
  const globalHash = resolve(homedir(), '.jarvis', 'file-hashes.json');
  return existsSync(globalHash) ? globalHash : null;
}

// ─── 单文件解决 ───────────────────────────────────────────

/**
 * 非交互式解决单个文件的所有冲突。
 * 用选中的版本替换每个冲突块。
 *
 * @param filePath 文件路径
 * @param mode 接受模式：user 保留用户版本，template 使用模板版本
 * @returns 解决结果：是否实际写入、冲突数量
 */
function resolveFileNonInteractive(
  filePath: string,
  mode: AcceptMode,
): { resolved: boolean; conflictCount: number } {
  const content = readFileSync(filePath, 'utf-8');
  const conflicts = parseConflicts(content);

  if (conflicts.length === 0) return { resolved: false, conflictCount: 0 };

  let result = content;
  for (const c of conflicts) {
    const replacement = mode === 'user' ? c.userContent : c.templateContent;
    result = result.replace(c.fullMatch, replacement);
  }

  writeFileSync(filePath, result);
  return { resolved: true, conflictCount: conflicts.length };
}

/**
 * 交互式解决单个文件的所有冲突。
 * 逐冲突显示标题并提示用户选择。
 *
 * @param filePath 文件路径
 * @returns 是否至少解决了一个冲突
 */
async function resolveFileInteractive(filePath: string): Promise<boolean> {
  const content = readFileSync(filePath, 'utf-8');
  const conflicts = parseConflicts(content);

  if (conflicts.length === 0) {
    console.log('  ✅ 没有冲突标记。');
    return false;
  }

  console.log(`\n📄 ${basename(filePath)} — ${conflicts.length} 个冲突\n`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> =>
    new Promise(rs => { rl.question(q, rs); });

  let result = content;
  let resolvedCount = 0;

  for (let idx = 0; idx < conflicts.length; idx++) {
    const c = conflicts[idx];
    console.log(`⚠ Section "## ${c.title}" 冲突 (${idx + 1}/${conflicts.length}):`);
    console.log(`  1. 保留我的版本 (user)`);
    console.log(`  2. 使用模板版本 (template v${c.templateVersion})`);
    console.log(`  3. 跳过此冲突，保留标记`);

    const answer = await ask('  请选择 [1/2/3] (默认: 3): ');

    if (answer === '1') {
      result = result.replace(c.fullMatch, c.userContent);
      resolvedCount++;
      console.log('  ✅ 已保留用户版本\n');
    } else if (answer === '2') {
      result = result.replace(c.fullMatch, c.templateContent);
      resolvedCount++;
      console.log('  ✅ 已使用模板版本\n');
    } else {
      console.log('  ⏭ 跳过\n');
    }
  }

  rl.close();

  if (resolvedCount > 0) {
    writeFileSync(filePath, result);
  }

  return resolvedCount > 0;
}

// ─── 批量解决 ─────────────────────────────────────────────

/**
 * 批量解决所有冲突文件。
 *
 * @param files 冲突文件路径列表
 * @param mode 接受模式
 * @param hashFilePath hash 文件路径
 */
function resolveBatch(
  files: string[],
  mode: AcceptMode,
  hashFilePath: string,
): void {
  console.log(`\n📋 批量解决 ${files.length} 个文件的冲突 → --accept ${mode}\n`);

  let totalResolved = 0;
  for (const f of files) {
    const { resolved, conflictCount } = resolveFileNonInteractive(f, mode);
    if (resolved) {
      totalResolved += conflictCount;
      console.log(`  ✅ ${basename(f)} (${conflictCount} 个冲突)`);
      updateHashRecord(f, hashFilePath);
    }
  }

  console.log(`\n💡 共解决 ${totalResolved} 个冲突。提交前请检查变更。\n`);
}

// ─── 参数解析 ─────────────────────────────────────────────

/**
 * 从 positional 参数中提取 resolve 专用选项。
 * 因为 parseArgs 不识别 --accept/--all/--list，需在此手动解析。
 */
function parseResolveArgs(positional: string[]): {
  acceptMode: AcceptMode | null;
  isAll: boolean;
  isList: boolean;
  filePath: string | undefined;
} {
  let acceptMode: AcceptMode | null = null;
  let isAll = false;
  let isList = false;
  let filePath: string | undefined;

  // positional[0] = 'resolve'，跳过；其余为子命令参数
  const args = positional.slice(1);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--accept') {
      const next = args[i + 1];
      if (next === 'user' || next === 'template') {
        acceptMode = next;
        i++; // 跳过值
      }
    } else if (arg === '--all') {
      isAll = true;
    } else if (arg === '--list') {
      isList = true;
    } else if (!arg.startsWith('--')) {
      filePath = arg;
    }
  }

  return { acceptMode, isAll, isList, filePath };
}

// ─── 主入口 ───────────────────────────────────────────────

/**
 * jarvis resolve — 交互式和批量模式解决合并冲突。
 *
 * 用法：
 *   jarvis resolve <file>                 交互式逐冲突选择
 *   jarvis resolve <file> --accept user   保留所有用户版本
 *   jarvis resolve <file> --accept template  使用所有模板版本
 *   jarvis resolve --all --accept user|template  批量解决
 *   jarvis resolve --list                 列出所有冲突文件
 */
export async function execute(opts: CliOpts, positional: string[]): Promise<void> {
  const { acceptMode, isAll, isList, filePath } = parseResolveArgs(positional);

  // ── --list 模式：列出所有冲突文件 ──
  if (isList) {
    const isGlobal = opts.global;
    const target = resolveTarget(filePath, isGlobal);
    const claudeDir = isGlobal
      ? resolve(homedir(), '.claude')
      : resolve(target, '.claude');
    const files = scanConflictFiles(claudeDir);

    if (files.length === 0) {
      console.log('(没有冲突文件)');
    } else {
      for (const f of files) console.log(f);
    }
    return;
  }

  // ── --all 模式：批量解决 ──
  if (isAll) {
    if (!acceptMode) {
      console.error('❌ --all 需要指定 --accept user 或 --accept template');
      return;
    }

    const isGlobal = opts.global;
    const target = resolveTarget(filePath, isGlobal);
    const claudeDir = isGlobal
      ? resolve(homedir(), '.claude')
      : resolve(target, '.claude');
    const files = scanConflictFiles(claudeDir);

    if (files.length === 0) {
      console.log('✅ 没有冲突文件。');
      return;
    }

    const hashFilePath = getHashFilePath(target, isGlobal);
    resolveBatch(files, acceptMode, hashFilePath);
    return;
  }

  // ── 单文件模式 ──
  if (!filePath) {
    console.error('❌ 缺少文件参数。');
    console.error('用法:');
    console.error('  jarvis resolve <file>');
    console.error('  jarvis resolve <file> --accept user|template');
    console.error('  jarvis resolve --all --accept user|template');
    console.error('  jarvis resolve --list');
    return;
  }

  const absPath = resolve(filePath);

  // 安全检查：目标文件必须在 .claude/ 子目录下
  const cwd = resolve('.');
  const claudeDir = resolve(cwd, '.claude');
  if (!absPath.startsWith(claudeDir + sep)) {
    console.error(`❌ 文件不在 .claude/ 目录下: ${absPath}`);
    console.error('resolve 命令仅支持解决 .claude/ 子目录下的冲突文件');
    return;
  }

  if (!existsSync(absPath)) {
    console.error(`❌ 文件不存在: ${absPath}`);
    return;
  }

  // 非交互模式（指定了 --accept）
  if (acceptMode) {
    const { resolved, conflictCount } = resolveFileNonInteractive(absPath, acceptMode);
    if (resolved) {
      console.log(`✅ ${conflictCount} 个冲突已解决 → --accept ${acceptMode}`);
      const hashFile = findHashFile(absPath);
      if (hashFile) {
        updateHashRecord(absPath, hashFile);
      } else {
        console.warn('⚠ 未找到 hash 文件，跳过 hash 更新。');
      }
    } else {
      console.log('✅ 没有冲突标记。');
    }
    return;
  }

  // 交互模式
  const resolved = await resolveFileInteractive(absPath);
  if (resolved) {
    console.log('✅ 冲突已解决。');
    const hashFile = findHashFile(absPath);
    if (hashFile) {
      updateHashRecord(absPath, hashFile);
    } else {
      console.warn('⚠ 未找到 hash 文件，跳过 hash 更新。');
    }
  } else {
    console.log('⏭ 没有冲突被解决。');
  }
}
