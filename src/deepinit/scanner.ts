import { readdirSync, statSync, existsSync, readFileSync, realpathSync } from 'node:fs';
import { relative, join, basename, sep } from 'node:path';

export interface DirEntry {
  /** 相对于项目根的路径 */
  relPath: string;
  /** 绝对路径 */
  absPath: string;
  /** 目录名 */
  name: string;
  /** 该目录中的文件列表（不含子目录） */
  files: string[];
  /** 子目录条目 */
  subdirs: DirEntry[];
  /** 深度层级（0 = root） */
  depth: number;
}

/** 不生成 AGENTS.md 的目录（相对路径片段匹配） */
const EXCLUDE_PATTERNS = [
  'node_modules', '.git', 'dist', 'build', '.claude', '.codex',
  '.agents', '.jarvis', '.omc', '__pycache__', '.next', 'coverage',
  '.idea', '.vscode', 'design-system', '.git-rewrite', 'logs',
  '.cache', 'tmp', 'bun.lock',
];

function isExcluded(name: string): boolean {
  return EXCLUDE_PATTERNS.includes(name) || name.startsWith('.');
}

/**
 * 递归扫描项目目录树，返回层级化的 DirEntry 结构。
 * 不生成 AGENTS.md 的目录会被排除（不在树中出现）。
 *
 * @param root 项目根目录
 * @param current 当前扫描目录（递归参数）
 * @param depth 当前深度
 * @returns 目录条目，或 null（如该目录无需文档）
 */
export function scanDirectory(
  root: string,
  current: string = root,
  depth: number = 0,
  visitedInodes?: Set<number>,
): DirEntry | null {
  const name = basename(current);

  // 排除隐藏目录和黑名单
  if (depth > 0 && isExcluded(name)) return null;

  // Symlink loop protection via inode tracking (OMC parity)
  if (!visitedInodes) visitedInodes = new Set();
  try {
    const s = statSync(current);
    if (visitedInodes.has(s.ino)) return null;
    visitedInodes.add(s.ino);
  } catch { return null; }

  // Symlink containment check
  try {
    const realPath = realpathSync(current);
    const realRoot = realpathSync(root);
    if (realPath !== realRoot && !realPath.startsWith(realRoot + sep)) return null;
  } catch { /* allow if realpath fails */ }

  let entries: ReturnType<typeof readdirSyncWithTypes>;
  try {
    entries = readdirSyncWithTypes(current);
  } catch {
    return null;
  }

  const files: string[] = [];
  const subdirs: DirEntry[] = [];

  for (const e of entries) {
    if (e.isDir) {
      if (isExcluded(e.name)) continue;
      const childPath = join(current, e.name);
      const child = scanDirectory(root, childPath, depth + 1, visitedInodes);
      if (child) subdirs.push(child);
    } else if (e.isFile) {
      files.push(e.name);
    }
  }

  // 目录中无文件且无有效子目录 → 跳过
  if (files.length === 0 && subdirs.length === 0) return null;

  return {
    relPath: relative(root, current) || '.',
    absPath: current,
    name: depth === 0 ? basename(root) : name,
    files,
    subdirs,
    depth,
  };
}

/** readdirSync 返回带类型标记的条目 */
function readdirSyncWithTypes(dir: string): { name: string; isDir: boolean; isFile: boolean }[] {
  const result: { name: string; isDir: boolean; isFile: boolean }[] = [];
  for (const name of readdirSync(dir)) {
    try {
      const s = statSync(join(dir, name));
      result.push({ name, isDir: s.isDirectory(), isFile: s.isFile() });
    } catch {
      // 忽略无法访问的文件
    }
  }
  return result;
}

/**
 * 将扫描树扁平化为按深度排序的列表（浅层在前），便于按层级顺序生成。
 */
export function flattenTree(root: DirEntry): DirEntry[] {
  const result: DirEntry[] = [];
  const queue: DirEntry[] = [root];
  while (queue.length > 0) {
    const entry = queue.shift()!;
    result.push(entry);
    queue.push(...entry.subdirs);
  }
  return result;
}

/**
 * 加载项目根目录已有的 AGENTS.md（如果存在），提取 MANUAL 区域。
 * @returns manual 内容字符串，或 null
 */
export function readExistingManual(dir: string): string | null {
  const agentsPath = join(dir, 'AGENTS.md');
  if (!existsSync(agentsPath)) return null;
  try {
    const content = readFileSync(agentsPath, 'utf-8');
    const m = content.match(/<!-- MANUAL:START -->\n?([\s\S]*?)<!-- MANUAL:END -->/);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}
