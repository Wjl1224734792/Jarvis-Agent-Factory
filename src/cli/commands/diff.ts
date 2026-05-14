import { resolve, join } from 'node:path';
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { resolveScope } from '../utils/scope.js';
import { resolveTarget } from '../utils/resolve.js';
import { PLATFORMS, ALL_PLATFORMS, PKG_ROOT } from '../utils/constants.js';
import { getHashFilePath } from '../../hash-paths.js';
import { readFrontmatter, splitMarkdownSections, isSectionHashRecord } from '../../shared/markdown-utils.js';
import type { CliOpts } from '../utils/args.js';

/**
 * 计算 Markdown 文件当前各 section 的 SHA256 hash 映射。
 * @param filePath 文件绝对路径
 * @returns section title → hash 映射
 */
function computeCurrentSectionHashes(filePath: string): Record<string, string> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const { sections } = splitMarkdownSections(content);
    const result: Record<string, string> = {};
    for (const s of sections) {
      result[s.title] = s.hash;
    }
    return result;
  } catch {
    return {};
  }
}

// ============================================================================
// diffJsonConfig — JSON 字段级差异对比
// ============================================================================

/**
 * 深度对比两个 JSON 对象，返回字段级差异列表。
 * @param template 模板对象（新版）
 * @param target 目标对象（已安装版）
 * @param prefix 当前字段路径前缀（用于递归拼接）
 * @returns 差异描述行列表（含缩进前缀）
 */
function diffJsonConfig(
  template: Record<string, unknown>,
  target: Record<string, unknown>,
  prefix: string,
): string[] {
  const diffs: string[] = [];
  const allKeys = new Set([...Object.keys(template), ...Object.keys(target)]);

  for (const key of allKeys) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const inTemplate = key in template;
    const inTarget = key in target;

    if (!inTarget) {
      // 目标中不存在此字段 → 来自模板的新增字段
      diffs.push(`     + ${fullPath}`);
    } else if (!inTemplate) {
      // 模板中不存在此字段 → 模板已移除此字段
      diffs.push(`     - ${fullPath}`);
    } else {
      const tv = template[key];
      const tg = target[key];
      const isTvObj = typeof tv === 'object' && tv !== null && !Array.isArray(tv);
      const isTgObj = typeof tg === 'object' && tg !== null && !Array.isArray(tg);

      if (isTvObj && isTgObj) {
        // 双方都是纯对象 → 递归对比
        diffs.push(...diffJsonConfig(
          tv as Record<string, unknown>,
          tg as Record<string, unknown>,
          fullPath,
        ));
      } else if (JSON.stringify(tv) !== JSON.stringify(tg)) {
        // 值不同 → 已修改
        diffs.push(`     ~ ${fullPath}  (已修改)`);
      }
    }
  }

  return diffs;
}

// ============================================================================
// 冲突文件扫描
// ============================================================================

/**
 * 递归扫描目录及子目录，查找所有包含未解决冲突标记（<<<<<<< user）的文件。
 * 仅检查 .md 和 .json 文件，跳过隐藏目录和 node_modules。
 * @param root 搜索根目录
 * @returns 冲突文件的相对路径列表（相对于 root）
 */
function scanConflictFiles(root: string): string[] {
  const conflicts: string[] = [];
  let scanned = 0;
  const MAX_SCAN = 200;

  /** 检查单个文件是否含冲突标记并记录 */
  function checkFileForConflict(fullPath: string): void {
    if (hasConflictMarker(fullPath)) {
      conflicts.push(fullPath.substring(root.length + 1));
    }
  }

  /** 递归扫描子目录 */
  function scanDir(dir: string): void {
    if (scanned >= MAX_SCAN) return;
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return; }

    for (const entry of entries) {
      if (scanned >= MAX_SCAN) return;
      if (entry.startsWith('.') || entry === 'node_modules') continue;

      const fullPath = join(dir, entry);
      let isDir: boolean;
      try { isDir = statSync(fullPath).isDirectory(); } catch { continue; }

      if (isDir) {
        scanDir(fullPath);
      } else if (entry.endsWith('.md') || entry.endsWith('.json')) {
        scanned++;
        checkFileForConflict(fullPath);
      }
    }
  }

  scanDir(root);
  return conflicts;
}

// ============================================================================
// Markdown section 差异计算
// ============================================================================

/**
 * 三向对比 section hash，返回差异描述列表。
 * 源 hash（srcHash）对比旧记录 hash（oldHash）和目标 hash（dstHash）：
 * - 源未记录 → 删除；旧未记录 → 新增
 * - 源变 + 目标变 → 冲突；仅源变 → 修改
 *
 * @param oldSections 旧 hash 记录中的 section 映射
 * @param srcSecHashes 当前模板 section hash 映射
 * @param dstSecHashes 当前已安装文件 section hash 映射
 * @returns 差异描述行列表
 */
function diffSectionChanges(
  oldSections: Record<string, string>,
  srcSecHashes: Record<string, string>,
  dstSecHashes: Record<string, string>,
): string[] {
  const diffs: string[] = [];
  const allTitles = new Set([...Object.keys(oldSections), ...Object.keys(srcSecHashes)]);

  for (const title of allTitles) {
    const oldHash = oldSections[title];
    const srcHash = srcSecHashes[title];
    const dstHash = dstSecHashes[title];

    if (!srcHash) {
      diffs.push(`     §  ## ${title}  删除`);
    } else if (!oldHash) {
      diffs.push(`     §  ## ${title}  新增`);
    } else if (srcHash !== oldHash && dstHash && dstHash !== oldHash) {
      diffs.push(`     §  ## ${title}  冲突`);
    } else if (srcHash !== oldHash) {
      diffs.push(`     §  ## ${title}  修改`);
    }
    // srcHash === oldHash → 源未变，忽略
  }

  return diffs;
}

// ============================================================================
// diffPlatform — 对比单个平台模板与已安装文件的差异
// ============================================================================

/**
 * 检查文件是否包含未解决的冲突标记（<<<<<<< user）。
 * @param filePath 文件绝对路径
 * @returns 含冲突标记返回 true，读取失败返回 false
 */
function hasConflictMarker(filePath: string): boolean {
  try {
    return readFileSync(filePath, 'utf-8').includes('<<<<<<< user');
  } catch {
    return false;
  }
}

/**
 * 对比单个平台模板与已安装文件的差异（增强版）。
 * - Markdown 文件（v2 section hash）：显示 version diff + section 级差异
 * - JSON 配置文件：显示字段级差异
 * - 旧 hash 格式（字符串）：降级为文件级展示
 * - 汇总冲突文件
 *
 * @param platform 平台名称
 * @param target 项目根目录
 * @param isGlobal 是否为全局安装
 * @returns 该平台下检测到的冲突文件相对路径列表（用于末尾汇总）
 */
async function diffPlatform(
  platform: string,
  target: string,
  isGlobal: boolean,
): Promise<string[]> {
  const srcRoot = resolve(PKG_ROOT, 'dist/src', 'templates', 'platforms', platform);

  const destRoot = isGlobal
    ? (platform === 'opencode'
      ? resolve(homedir(), '.config', 'opencode')
      : resolve(homedir(), `.${platform}`))
    : resolve(target, PLATFORMS[platform].dir);

  if (!existsSync(srcRoot)) return [];

  const hashFile = getHashFilePath(target, isGlobal);
  const hashes: Record<string, unknown> = existsSync(hashFile)
    ? JSON.parse(readFileSync(hashFile, 'utf-8'))
    : {};

  /** 计算文件整文件 SHA256 hash */
  const fileHash = (f: string): string =>
    createHash('sha256').update(readFileSync(f)).digest('hex');

  let totalChanged = 0;
  let shownCount = 0;
  const MAX_SHOW = 30;
  const conflictFiles: string[] = [];

  // ═══════════════════════════════════════════════════════════════
  // 第一步：遍历 agents / commands / skills buckets
  // ═══════════════════════════════════════════════════════════════

  for (const bucket of ['agents', 'commands', 'skills']) {
    const sd = join(srcRoot, bucket);
    const dd = join(destRoot, bucket);
    if (!existsSync(sd) || !existsSync(dd)) continue;

    for (const entry of readdirSync(sd)) {
      const sp = join(sd, entry);
      const dp = join(dd, entry);
      if (statSync(sp).isDirectory()) continue;

      const rel = `${bucket}/${entry}`;
      const newHash = fileHash(sp);
      const oldHashRecord = hashes[dp];

      // ── 场景 A：新文件（目标中不存在）──
      if (!existsSync(dp)) {
        if (shownCount < MAX_SHOW) {
          const srcFm = entry.endsWith('.md') ? readFrontmatter(sp) : null;
          const verExtra = srcFm && srcFm.version !== '0.0.0'
            ? `, version: ${srcFm.version}`
            : '';
          console.log(`  +  ${rel.padEnd(40)} (新增${verExtra})`);
          shownCount++;
        }
        totalChanged++;
        continue;
      }

      const destHash = fileHash(dp);

      // 整文件未变化 → 跳过
      if (newHash === destHash) continue;

      const isV2 = isSectionHashRecord(oldHashRecord);

      // ── 场景 B：Markdown section 级 diff（v2 hash 记录）──
      if (entry.endsWith('.md') && isV2) {
        const srcFm = readFrontmatter(sp);
        const destFm = readFrontmatter(dp);
        const oldSections = (oldHashRecord as { sections: Record<string, string> }).sections;

        const secDiffs = diffSectionChanges(
          oldSections,
          computeCurrentSectionHashes(sp),
          computeCurrentSectionHashes(dp),
        );

        // 版本对比
        const srcVer = srcFm.version || '0.0.0';
        const destVer = destFm.version || '0.0.0';
        const verInfo = srcVer !== destVer ? ` (version: ${destVer} → ${srcVer})` : '';

        if (shownCount < MAX_SHOW) {
          const label = secDiffs.length > 0 ? verInfo : (verInfo || ' (preamble 变更)');
          console.log(`  M  ${rel.padEnd(40)}${label}`);
          secDiffs.forEach(d => console.log(d));
          shownCount++;
        }
        totalChanged++;

        // 内联检测冲突标记
        if (hasConflictMarker(dp)) conflictFiles.push(rel);
      } else {
        // ── 场景 C：文件级 diff（旧 hash 格式或非 markdown）──
        // 降级为文件级展示，保持向后兼容
        const canUpdate = typeof oldHashRecord === 'string' && destHash === oldHashRecord;
        const status = typeof oldHashRecord === 'undefined' || canUpdate
          ? '(更新)'
          : '(跳过, 用户已修改)';

        if (shownCount < MAX_SHOW) {
          console.log(`  M  ${rel.padEnd(40)} ${status}`);
          shownCount++;
        }
        totalChanged++;
      }
    }

    // ── 检测目标中存在但模板中已删除的文件 ──
    const srcFileSet = new Set(
      existsSync(sd) ? readdirSync(sd).filter(e => !statSync(join(sd, e)).isDirectory()) : [],
    );
    for (const entry of readdirSync(dd)) {
      if (statSync(join(dd, entry)).isDirectory()) continue;
      if (!srcFileSet.has(entry)) {
        const dp = join(dd, entry);
        const oldHashRecord = hashes[dp];
        if (typeof oldHashRecord === 'undefined') continue;
        // 仅当有旧 hash 记录时（曾由 Jarvis 安装）才标记为删除
        const rel = `${bucket}/${entry}`;
        if (shownCount < MAX_SHOW) {
          console.log(`  -  ${rel.padEnd(40)} (模板已移除)`);
          shownCount++;
        }
        totalChanged++;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 第二步：模板根级别 JSON 配置文件（如 settings.json）
  // ═══════════════════════════════════════════════════════════════

  for (const entry of readdirSync(srcRoot)) {
    const sp = join(srcRoot, entry);
    if (statSync(sp).isDirectory()) continue;
    if (!entry.endsWith('.json')) continue;
    if (entry.startsWith('settings.local')) continue;

    const dp = join(destRoot, entry);
    if (!existsSync(dp)) {
      if (shownCount < MAX_SHOW) {
        console.log(`  +  ${entry.padEnd(40)} (新增配置文件)`);
        shownCount++;
      }
      totalChanged++;
      continue;
    }

    try {
      const srcJson = JSON.parse(readFileSync(sp, 'utf-8'));
      const destJson = JSON.parse(readFileSync(dp, 'utf-8'));
      const diffs = diffJsonConfig(
        srcJson as Record<string, unknown>,
        destJson as Record<string, unknown>,
        '',
      );

      if (diffs.length > 0) {
        if (shownCount < MAX_SHOW) {
          console.log(`  M  ${entry.padEnd(40)}`);
          diffs.forEach(d => console.log(d));
          shownCount++;
        }
        totalChanged++;
      }
    } catch {
      // JSON 解析失败 → 降级为文件级对比
      const newHash = fileHash(sp);
      const destHash = fileHash(dp);
      if (newHash !== destHash) {
        if (shownCount < MAX_SHOW) {
          console.log(`  M  ${entry.padEnd(40)} (JSON 差异)`);
          shownCount++;
        }
        totalChanged++;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 第三步：输出摘要
  // ═══════════════════════════════════════════════════════════════

  if (totalChanged === 0) {
    console.log(`  ✅ ${platform.padEnd(10)} up to date`);
  } else if (totalChanged > shownCount) {
    console.log(`  ... 还有 ${totalChanged - shownCount} 个文件未显示`);
  }

  return conflictFiles;
}

// ============================================================================
// execute — jarvis diff 入口
// ============================================================================

/**
 * jarvis diff [path] — 预览升级变更（不实际执行）
 *
 * 增强输出：
 * - Markdown 文件：显示 version diff + section 级差异
 * - JSON 配置文件：显示字段级差异
 * - 末尾：冲突文件汇总
 * - 向后兼容：旧 hash 格式降级为文件级展示
 */
/**
 * 计算指定平台的已安装目标根目录。
 * 逻辑与 diffPlatform 内 destRoot 计算保持一致。
 */
function getDestRoot(platform: string, target: string, isGlobal: boolean): string {
  return isGlobal
    ? (platform === 'opencode'
      ? resolve(homedir(), '.config', 'opencode')
      : resolve(homedir(), `.${platform}`))
    : resolve(target, PLATFORMS[platform].dir);
}

export async function execute(opts: CliOpts, positional: string[]): Promise<void> {
  const path = positional[1];
  const isGlobal = await resolveScope(opts);
  const target = resolveTarget(path, isGlobal);

  console.log(`\n📋 检查变更预览 → ${isGlobal ? '~ (全局)' : target}\n`);

  const allConflicts: string[] = [];

  for (const name of ALL_PLATFORMS) {
    // 内联冲突检测（来自 diff 过程中的 section 对比）
    const platformConflicts = await diffPlatform(name, target, isGlobal);
    for (const cf of platformConflicts) {
      allConflicts.push(cf);
    }

    // 全面扫描冲突标记（覆盖未变更但含冲突标记的文件）
    const destRoot = getDestRoot(name, target, isGlobal);
    const scannedConflicts = scanConflictFiles(destRoot);
    for (const cf of scannedConflicts) {
      allConflicts.push(cf);
    }
  }

  // ── 冲突文件汇总（去重后末尾统一展示）──
  const uniqueConflicts = [...new Set(allConflicts)];
  if (uniqueConflicts.length > 0) {
    console.log(`\n冲突文件 (${uniqueConflicts.length}):`);
    for (const file of uniqueConflicts) {
      console.log(`  ⚠ ${file}`);
    }
  }

  console.log(`\n💡 运行 \`jarvis upgrade\` 应用这些变更。\n`);
}
