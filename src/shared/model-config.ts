/**
 * 模型配置解析 —— 读取用户自定义的模型映射。
 *
 * 配置位置（优先级从高到低）：
 *   1. 项目级: <project>/.jarvis/model-config.json
 *   2. 全局:   ~/.jarvis/model-config.json
 *
 * 格式：
 *   { "heavy": "deepseek-v4-pro", "light": "deepseek-v4-flash" }
 *
 * 引擎不预存模型名，全部从配置文件读取。
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

export interface ModelConfig {
  heavy: string;
  light: string;
}

const DEFAULT_HEAVY = 'deepseek-v4-pro';
const DEFAULT_LIGHT = 'deepseek-v4-flash';

const DEFAULTS: ModelConfig = {
  heavy: DEFAULT_HEAVY,
  light: DEFAULT_LIGHT,
};

function readConfigFile(filePath: string): ModelConfig | null {
  try {
    if (!existsSync(filePath)) return null;
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    if (typeof raw.heavy !== 'string' || typeof raw.light !== 'string') return null;
    return { heavy: raw.heavy, light: raw.light };
  } catch {
    return null;
  }
}

let _cached: ModelConfig | null = null;
let _cachedProjectRoot: string | undefined;

export function resolveModelConfig(projectRoot?: string): ModelConfig {
  if (projectRoot && projectRoot === _cachedProjectRoot && _cached) return _cached;

  // 1. 项目级配置
  if (projectRoot) {
    const projectConfig = readConfigFile(resolve(projectRoot, '.jarvis', 'model-config.json'));
    if (projectConfig) {
      _cached = projectConfig;
      _cachedProjectRoot = projectRoot;
      return projectConfig;
    }
  }

  // 2. 全局配置
  const globalConfig = readConfigFile(resolve(homedir(), '.jarvis', 'model-config.json'));
  if (globalConfig) {
    _cached = globalConfig;
    _cachedProjectRoot = undefined;
    return globalConfig;
  }

  // 3. 内置默认值
  return DEFAULTS;
}

/** 解析单个模型标签 */
export function resolveModel(tier: string, projectRoot?: string): string {
  const config = resolveModelConfig(projectRoot);
  if (tier === 'heavy') return config.heavy;
  if (tier === 'light') return config.light;
  // 如果已经是具体模型名（不是标签），直接返回
  return tier;
}

/** 清除缓存（配置更新后调用） */
export function clearModelConfigCache(): void {
  _cached = null;
  _cachedProjectRoot = undefined;
}

/** 生成默认配置 JSON 内容 */
export function defaultModelConfigContent(): string {
  return JSON.stringify({ heavy: DEFAULT_HEAVY, light: DEFAULT_LIGHT }, null, 2) + '\n';
}
