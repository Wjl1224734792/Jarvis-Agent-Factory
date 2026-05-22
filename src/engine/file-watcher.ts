/**
 * 文件系统监听器 — 监控 .jarvis/ 目录变化，实时同步到 Web 面板
 *
 * 功能：
 * 1. 递归监听 .jarvis/ 下所有 .md 文件变化（创建/修改）
 * 2. 自动注册产物到 artifacts 表（匹配日期目录 + Gate 子目录模式）
 * 3. 同步文件副本到 .jarvis/requirements/ 扁平目录
 * 4. 触发 SSE 广播推送到 Web 面板侧边栏
 */
import { watch, existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { emitEvent } from './pubsub.js';
import { GATE_DIRS } from './gates.js';

/** 监听器实例引用 */
let _watcher: ReturnType<typeof watch> | null = null;

/** 去抖映射：filepath → timeout，避免短时间内重复触发 */
const _debounceMap = new Map<string, ReturnType<typeof setTimeout>>();

/** 去抖延迟（毫秒） */
const DEBOUNCE_MS = 300;

/**
 * 判断文件路径是否匹配日期目录 + Gate 子目录模式
 * 例如: .jarvis/2026-05-22/requirements/REQ-xxx.md
 *
 * @returns { gate, dateDir } 或 null
 */
function parseArtifactPath(
  root: string,
  fullPath: string,
): { gate: string; dateDir: string; relPath: string } | null {
  const rel = relative(resolve(root, '.jarvis'), fullPath);
  if (rel.startsWith('..')) return null;

  // 匹配: YYYY-MM-DD/{subdir}/*.md
  const m = rel.match(/^(\d{4}-\d{2}-\d{2})\/([^/]+)\/.+\.md$/);
  if (!m) return null;

  const dateDir = m[1];
  const subdir = m[2];

  // 查找匹配的 Gate（反向查 GATE_DIRS）
  for (const [gate, dir] of Object.entries(GATE_DIRS)) {
    if (dir === subdir) {
      return { gate, dateDir, relPath: rel.replace(/\\/g, '/') };
    }
  }

  return null;
}

/**
 * 同步文件到 .jarvis/requirements/ 扁平目录
 * 仅同步 requirements 类型的文件
 */
function syncToFlatRequirements(root: string, fullPath: string, parsed: { gate: string; dateDir: string; relPath: string }): void {
  // 仅处理 requirements 类型的 Gate
  if (parsed.gate !== 'Gate A') return;

  const flatDir = resolve(root, '.jarvis', 'requirements');
  if (!existsSync(flatDir)) {
    mkdirSync(flatDir, { recursive: true });
  }

  const fname = fullPath.replace(/\\/g, '/').split('/').pop()!;
  const dest = resolve(flatDir, fname);
  try {
    copyFileSync(fullPath, dest);
  } catch {
    // 复制失败不阻塞
  }
}

/**
 * 处理文件变化事件
 */
function handleFileChange(
  root: string,
  db: DatabaseSync,
  fullPath: string,
): void {
  if (!fullPath.endsWith('.md')) return;

  // 去抖：同一文件 300ms 内只处理一次
  const existing = _debounceMap.get(fullPath);
  if (existing) clearTimeout(existing);

  _debounceMap.set(fullPath, setTimeout(() => {
    _debounceMap.delete(fullPath);

    if (!existsSync(fullPath)) return; // 文件已被删除

    const parsed = parseArtifactPath(root, fullPath);
    if (!parsed) {
      // 非标准路径的文件（如 .jarvis/README.md），跳过
      return;
    }

    // 查找该日期目录对应哪个活跃 run
    try {
      const rows = db.prepare(
        "SELECT id FROM pipeline_runs WHERE started_at LIKE ? AND status = 'active' LIMIT 1"
      ).all(parsed.dateDir + '%') as { id: string }[];

      if (rows.length > 0) {
        const runId = rows[0].id;
        // 注册产物到 DB（幂等，UNIQUE 约束防重复）
        try {
          db.prepare(
            'INSERT OR IGNORE INTO artifacts (run_id, gate, filepath) VALUES (?, ?, ?)'
          ).run(runId, parsed.gate, parsed.relPath);
        } catch {
          // 插入失败不阻塞
        }
      }

      // 同步到扁平 requirements 目录
      syncToFlatRequirements(root, fullPath, parsed);
    } catch {
      // DB 查询失败不阻塞
    }

    // 触发 SSE 广播更新 Web 面板
    emitEvent('session:changed', { artifactPath: parsed.relPath });
  }, DEBOUNCE_MS));
}

/**
 * 扫描现有 .jarvis/ 目录，同步到 .jarvis/requirements/
 */
function syncExistingRequirements(root: string): void {
  const jarvisDir = resolve(root, '.jarvis');
  if (!existsSync(jarvisDir)) return;

  try {
    const entries = readdirSync(jarvisDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.name)) continue;

      const reqDir = join(jarvisDir, entry.name, 'requirements');
      if (!existsSync(reqDir)) continue;

      const flatDir = resolve(root, '.jarvis', 'requirements');
      if (!existsSync(flatDir)) {
        mkdirSync(flatDir, { recursive: true });
      }

      const mdFiles = readdirSync(reqDir).filter(f => f.endsWith('.md'));
      for (const f of mdFiles) {
        const src = join(reqDir, f);
        const dest = join(flatDir, f);
        try {
          const srcStat = statSync(src);
          let copy = true;
          if (existsSync(dest)) {
            const destStat = statSync(dest);
            if (srcStat.mtimeMs <= destStat.mtimeMs) copy = false;
          }
          if (copy) copyFileSync(src, dest);
        } catch {
          // 复制失败不阻塞
        }
      }
    }
  } catch {
    // 扫描失败不阻塞
  }
}

/**
 * 启动文件系统监听器
 *
 * @param root - 项目根目录
 * @param db - SQLite 数据库实例
 */
export function startFileWatcher(root: string, db: DatabaseSync): void {
  if (_watcher) return; // 防止重复启动

  const jarvisDir = resolve(root, '.jarvis');
  if (!existsSync(jarvisDir)) {
    mkdirSync(jarvisDir, { recursive: true });
  }

  // 启动时同步已有 requirements 到扁平目录
  syncExistingRequirements(root);

  // 递归监听 .jarvis/ 目录
  try {
    _watcher = watch(jarvisDir, { recursive: true }, (eventType, filename) => {
      if (!filename || !filename.endsWith('.md')) return;
      const fullPath = resolve(jarvisDir, filename);
      handleFileChange(root, db, fullPath);
    });

    _watcher.on('error', (err) => {
      // 监听器错误不崩溃，静默处理
      process.stderr.write(`[file-watcher] 监听错误: ${err.message}\n`);
    });

    process.stderr.write(`[file-watcher] 已启动，监听: ${jarvisDir}\n`);
  } catch (err) {
    process.stderr.write(`[file-watcher] 启动失败: ${(err as Error).message}\n`);
  }
}

/**
 * 停止文件系统监听器（测试隔离用）
 */
export function stopFileWatcher(): void {
  if (_watcher) {
    _watcher.close();
    _watcher = null;
  }
  for (const [, timer] of _debounceMap) {
    clearTimeout(timer);
  }
  _debounceMap.clear();
}
