/**
 * 文件系统监听器 — 监控 .jarvis/ 目录变化，实时同步到 Web 面板
 *
 * 功能：
 * 1. 递归监听 .jarvis/ 下所有 .md 文件变化（创建/修改）
 * 2. 自动注册产物到 artifacts 表（关联到当前活跃 run，杜绝跨会话污染）
 * 3. 触发 SSE 广播推送到 Web 面板侧边栏
 *
 * 不再做扁平目录复制——产物唯一存放于 .jarvis/YYYY-MM-DD/{gate}/ 日期目录下，
 * Web 面板通过 artifacts 表（按 run_id + gate 精确查询）展示当前会话的产物。
 */
import { watch, existsSync, mkdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { emitEvent } from './pubsub.js';
import { GATE_DIRS } from './gates.js';

let _watcher: ReturnType<typeof watch> | null = null;
const _debounceMap = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 300;

function parseArtifactPath(
  root: string,
  fullPath: string,
): { gate: string; dateDir: string; relPath: string } | null {
  const rel = relative(resolve(root, '.jarvis'), fullPath);
  if (rel.startsWith('..')) return null;

  // 统一为正斜杠（Windows 上 path.relative 返回反斜杠）
  const normalized = rel.replace(/\\/g, '/');
  const m = normalized.match(/^(\d{4}-\d{2}-\d{2})\/([^/]+)\/.+\.md$/);
  if (!m) return null;

  const dateDir = m[1];
  const subdir = m[2];

  for (const [gate, dir] of Object.entries(GATE_DIRS)) {
    if (dir === subdir) return { gate, dateDir, relPath: normalized };
  }

  return null;
}

function handleFileChange(
  root: string,
  db: DatabaseSync,
  fullPath: string,
): void {
  if (!fullPath.endsWith('.md')) return;

  const existing = _debounceMap.get(fullPath);
  if (existing) clearTimeout(existing);

  _debounceMap.set(fullPath, setTimeout(() => {
    _debounceMap.delete(fullPath);

    if (!existsSync(fullPath)) return;

    const parsed = parseArtifactPath(root, fullPath);
    if (!parsed) return;

    try {
      // 获取当前活跃 run（全局唯一，避免日期模糊匹配导致跨会话污染）
      const rows = db.prepare(
        "SELECT id FROM pipeline_runs WHERE status = 'active' ORDER BY started_at DESC LIMIT 1"
      ).all() as { id: string }[];

      if (rows.length > 0) {
        const runId = rows[0].id;
        try {
          db.prepare(
            'INSERT OR IGNORE INTO artifacts (run_id, gate, filepath) VALUES (?, ?, ?)'
          ).run(runId, parsed.gate, parsed.relPath);
        } catch { /* 插入失败不阻塞 */ }
      }
    } catch { /* DB 查询失败不阻塞 */ }

    emitEvent('session:changed', { artifactPath: parsed.relPath });
  }, DEBOUNCE_MS));
}

export function startFileWatcher(root: string, db: DatabaseSync): void {
  if (_watcher) return;

  const jarvisDir = resolve(root, '.jarvis');
  if (!existsSync(jarvisDir)) {
    mkdirSync(jarvisDir, { recursive: true });
  }

  try {
    _watcher = watch(jarvisDir, { recursive: true }, (_eventType, filename) => {
      if (!filename || !filename.endsWith('.md')) return;
      const fullPath = resolve(jarvisDir, filename);
      handleFileChange(root, db, fullPath);
    });

    _watcher.on('error', (err) => {
      process.stderr.write(`[file-watcher] 监听错误: ${err.message}\n`);
    });

    process.stderr.write(`[file-watcher] 已启动，监听: ${jarvisDir}\n`);
  } catch (err) {
    process.stderr.write(`[file-watcher] 启动失败: ${(err as Error).message}\n`);
  }
}

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
