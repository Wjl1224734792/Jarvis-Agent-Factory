/**
 * 模型配置 —— 仅提供默认模型名，方便统一修改内置默认值。
 *
 * 引擎不预存模型名。Agent 模板文件中的 model: 字段即为默认值，
 * 用户通过 Web 面板或直接编辑 .md 文件自定义每个 agent 的模型。
 */
export const DEFAULT_HEAVY_MODEL = 'deepseek-v4-pro';
export const DEFAULT_LIGHT_MODEL = 'deepseek-v4-flash';
