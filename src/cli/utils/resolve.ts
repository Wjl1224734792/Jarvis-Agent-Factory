import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { PKG_NAME } from './constants.js';

/**
 * 解析安装目标路径
 * - 全局模式：始终返回当前工作目录
 * - 项目模式：返回用户指定路径或默认 '.'
 *
 * @param path - 用户指定的路径
 * @param isGlobal - 是否为全局安装
 * @returns 解析后的绝对路径
 */
export function resolveTarget(path: string | undefined, isGlobal: boolean): string {
  return isGlobal ? resolve('.') : resolve(path || '.');
}

/**
 * 从 npm registry 查询最新版本号
 * @returns 最新版本号字符串，失败返回 null
 */
export function checkLatest(): string | null {
  try {
    return execSync(`npm view ${PKG_NAME} version`, {
      encoding: 'utf-8',
      timeout: 8000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Semver 版本比较：a > b
 * @returns true 表示 a 大于 b
 */
export function semverGt(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return true;
    if (pa[i] < pb[i]) return false;
  }
  return false;
}
