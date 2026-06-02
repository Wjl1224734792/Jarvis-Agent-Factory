/**
 * 会话日志存储 — 独立于 RepoWiki 的文件系统存储
 * 数据目录: <projectRoot>/.jarvis/session-logs/
 *
 * 会话归档自动存入此目录，不污染 .jarvis/wiki/pages/。
 * DB 中的 session_context 表提供查询能力，此处仅提供文件读写。
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

function ensureSessionLogDir(root: string): string {
  const dir = resolve(root, '.jarvis', 'session-logs');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * 保存会话日志文件
 * @param root 项目根目录
 * @param slug 文件名（不含 .md 扩展名）
 * @param content Markdown 内容（含 YAML frontmatter）
 * @returns 写入的完整文件路径
 */
export function saveSessionLog(root: string, slug: string, content: string): string {
  const dir = ensureSessionLogDir(root);
  const file = resolve(dir, `${slug}.md`);
  writeFileSync(file, content, 'utf-8');
  return file;
}

/**
 * 列出所有会话日志文件
 * @param root 项目根目录
 * @returns 文件名数组（不含 .md 扩展名）
 */
export function listSessionLogs(root: string): string[] {
  const dir = resolve(root, '.jarvis', 'session-logs');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f: string) => f.endsWith('.md'));
}

/**
 * 读取指定的会话日志
 * @param root 项目根目录
 * @param slug 文件名（不含 .md 扩展名）
 * @returns 文件内容，不存在时返回 null
 */
export function readSessionLog(root: string, slug: string): string | null {
  const file = resolve(root, '.jarvis', 'session-logs', `${slug}.md`);
  if (!existsSync(file)) return null;
  return readFileSync(file, 'utf-8');
}
