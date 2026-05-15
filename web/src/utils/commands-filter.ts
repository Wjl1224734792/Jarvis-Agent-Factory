import type { CommandItem } from '../api.js';

/** 来源 Tab 类型 */
export type SourceTab = 'project' | 'global';

/**
 * 根据来源 Tab 和分类 Tab 过滤指令列表
 * @param projectCommands - 项目指令列表
 * @param globalCommands - 全局指令列表
 * @param sourceTab - 当前选中的来源 Tab
 * @param categoryTab - 当前选中的分类 Tab（"all" 表示全部）
 * @returns 过滤后的指令列表
 */
export function filterCommands(
  projectCommands: CommandItem[],
  globalCommands: CommandItem[],
  sourceTab: SourceTab,
  categoryTab: string,
): CommandItem[] {
  const source = sourceTab === 'project' ? projectCommands : globalCommands;
  if (categoryTab === 'all') return source;
  return source.filter(c => c.category === categoryTab);
}

/**
 * 来源 Tab 切换时的状态转换逻辑：重置分类筛选为"全部"
 * @param newSourceTab - 新选中的来源 Tab
 * @returns 新的 { sourceTab, categoryTab } 状态
 */
export function onSourceTabChange(
  newSourceTab: SourceTab,
): { sourceTab: SourceTab; categoryTab: 'all' } {
  return { sourceTab: newSourceTab, categoryTab: 'all' };
}
