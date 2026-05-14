import { resolve, relative } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';
import { PKG_NAME } from './constants.js';

/**
 * 解析安装目标路径
 * - 全局模式：始终返回当前工作目录
 * - 项目模式：返回用户指定路径或默认 '.'
 *
 * 包含路径遍历防护：解析后的路径必须在项目根或用户 home 范围内。
 *
 * @param path - 用户指定的路径
 * @param isGlobal - 是否为全局安装
 * @returns 解析后的绝对路径
 * @throws 当路径越界（超出项目根或用户 home 范围）时抛出
 */
export function resolveTarget(path: string | undefined, isGlobal: boolean): string {
  const target = isGlobal ? resolve('.') : resolve(path || '.');

  // 边界检查：防止路径遍历越界
  // 全局模式边界为用户 home 目录，项目模式边界为当前工作目录
  const boundary = isGlobal ? homedir() : resolve('.');
  const rel = relative(boundary, target);
  if (rel.startsWith('..')) {
    throw new Error(
      `路径越界: ${target} (超出${isGlobal ? '用户 home' : '项目根'}目录范围)`,
    );
  }

  return target;
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
