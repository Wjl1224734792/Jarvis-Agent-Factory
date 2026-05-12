import { question } from './io.js';

/**
 * 与用户交互选择安装范围（全局 vs 项目级别）
 * @returns true = 全局安装
 */
export async function promptScope(): Promise<boolean> {
  console.log('\n📋 请选择安装范围:');
  console.log('  [1] 项目级别 — 安装到当前项目目录（推荐）');
  console.log('  [2] 全局级别 — 安装到用户目录，所有项目共享');
  const answer = await question('  请输入 1 或 2（默认: 1）: ');
  return answer === '2';
}

/**
 * 解析安装范围：
 * - 用户显式传递 -g 时，直接使用该值
 * - 否则通过注入的 promptFn 交互选择（生产环境使用真实 promptScope）
 *
 * @param opts - 解析后的 CLI 选项，需包含 global 和 globalExplicit
 * @param promptFn - 可注入的交互提示函数，便于单元测试
 * @returns 是否为全局安装
 */
export async function resolveScope(
  opts: { globalExplicit?: boolean; global?: boolean },
  promptFn: () => Promise<boolean> = promptScope,
): Promise<boolean> {
  if (opts.globalExplicit) return opts.global ?? false;
  return promptFn();
}
