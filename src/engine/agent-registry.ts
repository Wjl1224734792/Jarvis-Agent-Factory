/**
 * Agent Registry — 动态扫描模板目录，生成完整 Agent 列表与文件映射（TASK-009：仅 claude 平台）。
 * 替代硬编码的 AGENT_LIST 和 AGENT_FILES。
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { homedir } from 'node:os';

/** 获取当前文件所在目录（跨 dev / 编译后兼容） */
function getDirname(): string {
  return dirname(fileURLToPath(import.meta.url));
}

/**
 * 解析模板目录路径。
 * 优先使用编译后的 dist/src/templates/platforms，
 * 不存在时回退到源码目录 src/templates/platforms。
 *
 * @param existsCheck - 可选的存在性检查函数（便于测试注入）
 * @returns 模板平台目录的绝对路径
 */
export function resolveTemplatesDir(existsCheck?: (_p: string) => boolean): string {
  const check = existsCheck ?? ((p: string) => existsSync(p));
  const __dirname = getDirname();

  // 优先：编译后 dist 路径（dist/src/templates/platforms）
  const distPath = resolve(__dirname, '..', 'templates', 'platforms');
  if (check(distPath)) return distPath;

  // 回退：从当前模块位置向上回溯到项目根，再定位源码目录
  const projectRoot = resolve(__dirname, '..', '..', '..');
  const srcPath = resolve(projectRoot, 'src', 'templates', 'platforms');

  return srcPath;
}

/** 平台 → 目录名 + 文件扩展名 + 前端格式约定（TASK-009：仅保留 claude） */
const PLATFORM_CONFIG = {
  claude: { dir: 'claude', subdirs: ['agents', 'commands'], ext: '.md', type: 'md' },
};

/** 图标色板（按 agent 角色关键词匹配） */
const ICON_MAP = {
  implementer: 'layout', 'frontend': 'layout', 'backend': 'server', 'api': 'route',
  'service': 'cog', 'data': 'table', 'database': 'table', 'test': 'test', 'e2e': 'play',
  'review': 'eye',
  'qa': 'eye', 'planner': 'map', 'plan': 'map', 'task': 'list', 'design': 'list',
  'architect': 'brain', 'algorithm': 'brain', 'expert': 'brain', 'explorer': 'globe',
  'researcher': 'globe', 'remediation': 'cog', 'worker': 'cog', 'infra': 'server',
  'flutter': 'palette', 'taro': 'palette',
  'expo': 'palette', 'swift': 'palette', 'kotlin': 'palette', 'miniprogram': 'palette', 'uni-app': 'palette', 'vue': 'palette', 'react': 'palette', 'mobile-architect': 'brain',
  'state': 'database', 'ui': 'palette', 'jarvis': 'brain', 'orchestrator': 'brain',
};

/** 领域分类关键词映射 */
// 按优先级排列：越具体的规则越靠前
const CATEGORY_RULES = [
  { cat: '编排', keys: ['jarvis', 'orchestrat'] },
  { cat: '测试', keys: ['test-expert', 'e2e-test', 'e2e_test', 'browser-test', 'browser_test', 'perf-test', 'performance-test', 'performance_test'] },
  { cat: '审查', keys: ['review-expert', 'review', 'review-only', 'security', 'qa'] },
  { cat: '架构', keys: ['architect', 'algorithm-expert'] },
  { cat: '浏览器', keys: ['browser-test', 'frontend-debug'] },
  { cat: '移动端', keys: ['flutter-dev-expert', 'flutter-ui', 'flutter-state', 'taro-dev-expert', 'taro-ui', 'taro-state', 'expo-dev-expert', 'expo-ui', 'expo-state', 'swift-dev-expert', 'swift-ui', 'swift-state', 'kotlin-dev-expert', 'kotlin-ui', 'kotlin-state', 'miniprogram-dev-expert', 'miniprogram-ui', 'miniprogram-state', 'uni-app-dev-expert', 'uni-app-ui', 'uni-app-state'] },
  { cat: '规划', keys: ['planner', 'task-design', 'skill-assignment', 'remediation-planner'] },
  { cat: '支撑', keys: ['external-resource', 'infra-deploy', 'code-explore-expert', 'api-contract', 'remediation', 'docs-engineer'] },
  { cat: '实现', keys: ['-dev-expert', '-ui-expert', '-state-expert', '-api-expert', '-logic-expert', '-data-expert'] },
];

/** 从数据库查询已激活项目列表（distinct project，archived=0 且路径存在） */
export function getActiveProjects(db: unknown): string[] {
  try {
    const rows = (db as any).prepare(
      "SELECT DISTINCT project FROM pipeline_runs WHERE archived=0 AND project LIKE '%:%'",
    ).all() as { project: string }[];
    // 过滤出实际存在的目录路径
    return rows
      .map(r => r.project)
      .filter(p => existsSync(p))
      .sort();
  } catch {
    return [];
  }
}

/** 扫描所有已激活项目的智能体目录（TASK-009：仅 claude 平台） */
export function scanAllProjectAgents(db: unknown): AgentItem[] {
  const projects = getActiveProjects(db);
  const allAgents: AgentItem[] = [];
  for (const projectPath of projects) {
    const projectName = basename(projectPath);
    const dir = resolve(projectPath, '.claude', 'agents');
    const config = PLATFORM_CONFIG.claude;
    const agents = scanAgentDir(dir, 'claude', config, 'project', projectName);
    allAgents.push(...agents);
  }
  return allAgents;
}

export function getCategories(db?: unknown) {
  const projects = db ? getActiveProjects(db).map(p => basename(p)) : [];
  return ['全部', '全局配置', ...projects];
}

/** 根据文件名+内容推断领域分类 */
function inferCategory(fileName: string, content: string) {
  const lower = ((fileName || '') + ' ' + (content || '')).toLowerCase();
  for (const rule of CATEGORY_RULES) {
    for (const key of rule.keys) {
      if (lower.includes(key)) return rule.cat;
    }
  }
  return '支撑'; // 兜底
}

/** 从 agent 文件名/内容推断图标 */
function inferIcon(fileName: string, content: string) {
  const lower = (fileName + ' ' + (content || '')).toLowerCase();
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return 'cog';
}

/** 从 agent 内容提取 role 描述 */
function inferRole(fileName: string, desc: string) {
  if (desc) {
    const m = desc.match(/^(.+?)(?::|——|·|，|,)/);
    if (m) return m[1].trim().slice(0, 20);
    return desc.slice(0, 20);
  }
  return fileName.replace(/[-_]/g, ' ');
}

import { parseFrontmatter as parseMdFrontmatter } from '../shared/markdown-utils.js';

/** 扫描单个平台的所有 agent（模板目录）（TASK-009：仅 claude，移除 plugins 扫描） */
function scanPlatform(platformKey: string, config: { dir: string; subdirs: string[]; ext: string; type: string }, templatesDir: string): { agents: AgentItem[]; fileMap: AgentFileMap } {
  const platformDir = resolve(templatesDir, config.dir);
  const fileMap: AgentFileMap = {};

  const agents = config.subdirs.flatMap(subdir => {
    // 扫描 agents 子目录
    if (subdir === 'agents') {
      const targetDir = join(platformDir, subdir);
      if (!existsSync(targetDir)) return [];

      return readdirSync(targetDir)
        .filter(entry => entry.endsWith(config.ext))
        .map(entry => {
          const filePath = join(targetDir, entry);
          const baseName = basename(entry, config.ext);
          const agent = parseAgentFile(filePath, baseName, platformKey, { ext: config.ext, type: config.type });
          const installBase = `.claude/${subdir}/${entry}`;
          fileMap[agent.id] = { base: installBase, type: config.type as 'md' };
          return { ...agent, subdir, source: 'template' as const, category: '模板默认' };
        });
    }

    return [];
  });

  return { agents, fileMap };
}

// ---- 导出 ----

type AgentItem = {
  id: string; name: string; role: string; icon: string;
  platform: string; defaultModel: string; defaultEffort: string;
  category?: string; fileName?: string; subdir?: string;
  /** 配置来源：template（模板默认）/ global（全局用户） / project（项目级） */
  source?: 'template' | 'global' | 'project';
};
type AgentFileMap = Record<string, { base: string; type: 'md' }>;

let _agentList: AgentItem[] | null = null;
let _agentFiles: AgentFileMap | null = null;
/** 缓存记录的最后一次 projectRoot，用于检测变化时刷新 */
let _lastProjectRoot: string | undefined = undefined;

/**
 * 解析单个智能体文件为 AgentItem
 * @param filePath - 智能体文件的绝对路径
 * @param fileName - 无扩展名的文件名
 * @param platformKey - 平台标识（claude）
 * @param config - 平台配置（ext, type）
 * @returns AgentItem 或 null
 */
function parseAgentFile(
  filePath: string,
  fileName: string,
  platformKey: string,
  config: { ext: string; type: string },
): AgentItem {
  const content = readFileSync(filePath, 'utf-8');

  // TASK-009: 仅 claude 平台使用 .md 格式
  const { meta: fm } = parseMdFrontmatter(content);
  const model = (fm.model as string) || '';
  const effort = (fm.effort as string) || (fm.reasoningEffort as string) || '';
  const name = (fm.name as string) || fileName;
  const description = (fm.description as string) || '';

  const role = inferRole(fileName, description);
  const id = fileName;
  const icon = inferIcon(fileName, description || content);
  const category = inferCategory(fileName, description || content);

  return {
    id,
    name,
    role,
    icon,
    category,
    platform: platformKey,
    defaultModel: model || '',
    defaultEffort: effort || '',
    fileName: entryName(fileName, config.ext),
    subdir: 'agents',
    source: 'template',
  };
}

/** 拼接文件名 */
function entryName(baseName: string, ext: string): string {
  return `${baseName}${ext}`;
}

/**
 * 扫描单个目录下的智能体文件
 * @param dirPath - 要扫描的目录路径
 * @param platformKey - 平台标识
 * @param config - 平台配置
 * @param source - 配置来源标记
 * @returns AgentItem 数组
 */
function scanAgentDir(
  dirPath: string,
  platformKey: string,
  config: { ext: string; type: string },
  source: 'global' | 'project',
  projectName?: string,
): AgentItem[] {
  if (!existsSync(dirPath)) return [];
  const entries = readdirSync(dirPath);
  return entries
    .filter((entry: string) => entry.endsWith(config.ext))
    .map((entry: string) => {
      const filePath = join(dirPath, entry);
      const baseName = basename(entry, config.ext);
      const agent = parseAgentFile(filePath, baseName, platformKey, config);
      // 按来源归属设置分类
      const category = source === 'global' ? '全局配置'
        : source === 'project' ? (projectName || '项目配置')
        : '模板默认';
      return { ...agent, source, category };
    });
}

/**
 * 合并两个智能体列表，第二个列表中的项按 id 覆写第一个
 * @param base - 基础列表（如模板默认）
 * @param override - 覆写列表（如全局/项目配置）
 * @returns 合并后的新数组
 */
function mergeAgents(base: readonly AgentItem[], override: readonly AgentItem[]): AgentItem[] {
  const overrideIds = new Set(override.map(a => a.id));
  const kept = base.filter(a => !overrideIds.has(a.id));
  return [...kept, ...override];
}

/** 强制重新扫描模板目录 */
export function getAgentList(_force?: boolean): AgentItem[];
/**
 * 获取合并后的智能体列表（三层配置：模板默认 → 全局用户 → 项目级）
 * @param force - 是否强制刷新缓存
 * @param projectRoot - 项目根目录（传入后启用全局/项目级配置合并）
 * @returns 合并后的智能体列表
 */
export function getAgentList(_force: boolean, _projectRoot: string): AgentItem[];
export function getAgentList(force?: boolean, projectRoot?: string): AgentItem[] {
  if (force || !_agentList || (projectRoot !== _lastProjectRoot)) {
    _lastProjectRoot = projectRoot;
    const templatesDir = resolveTemplatesDir();
    _agentList = [];
    _agentFiles = {};
    for (const [key, config] of Object.entries(PLATFORM_CONFIG)) {
      const { agents, fileMap } = scanPlatform(key, config, templatesDir);
      _agentList.push(...agents);
      Object.assign(_agentFiles, fileMap);
    }

    // 二层：全局用户配置（TASK-009：仅 claude 平台）
    if (projectRoot) {
      const globalDir = resolve(homedir(), '.claude', 'agents');
      const config = PLATFORM_CONFIG.claude;
      const globalAgents = scanAgentDir(globalDir, 'claude', config, 'global');
      if (globalAgents.length > 0) {
        _agentList = mergeAgents(_agentList, globalAgents);
      }

      // 三层：项目级配置（TASK-009：仅 claude 平台）
      const projectDir = resolve(projectRoot, '.claude', 'agents');
      const projectAgents = scanAgentDir(projectDir, 'claude', config, 'project');
      if (projectAgents.length > 0) {
        _agentList = mergeAgents(_agentList, projectAgents);
      }
    }
  }
  return _agentList;
}

/** 强制重新扫描 */
export function getAgentFiles(force?: boolean): AgentFileMap | null {
  if (force || !_agentFiles) getAgentList(force);
  return _agentFiles;
}

/** 按平台筛选 agent 列表，force 强制重新扫描 */
export function getAgentsByPlatform(platform: string, force?: boolean): AgentItem[] {
  return getAgentList(force).filter(a => a.platform === platform);
}

/** 平台特性：claude 支持 commands（TASK-009：仅保留 claude） */
export const PLATFORM_FEATURES: Record<string, string[]> = {
  claude: ['commands'],
};

/** 获取所有平台名称 */
export function getPlatforms() {
  return Object.keys(PLATFORM_CONFIG);
}

/**
 * 收集所有模板 agent 文件中 frontmatter 的 model 值（去重）
 * 用于 /api/agents 的 available_models 动态来源
 */
export function getAgentModelValues(): string[] {
  const templatesDir = resolveTemplatesDir();
  const models = new Set<string>();
  for (const [, config] of Object.entries(PLATFORM_CONFIG)) {
    const agentsDir = join(templatesDir, config.dir, 'agents');
    if (!existsSync(agentsDir)) continue;
    for (const entry of readdirSync(agentsDir)) {
      if (!entry.endsWith(config.ext)) continue;
      try {
        const content = readFileSync(join(agentsDir, entry), 'utf-8');
        const { meta: fm } = parseMdFrontmatter(content);
        if (fm.model) models.add(fm.model as string);
      } catch { /* skip */ }
    }
  }
  return [...models];
}

/** 按平台分组的可用模型，force 强制重新扫描 */
export function getPlatformModels(force?: boolean): Record<string, string[]> {
  const agents = getAgentList(force);
  const models: Record<string, Set<string>> = {};
  for (const a of agents) {
    if (!models[a.platform]) models[a.platform] = new Set();
    if (a.defaultModel) models[a.platform].add(a.defaultModel);
  }
  // 补充模板中的模型名
  const tmplModels = getAgentModelValues();
  if (!models.claude) models.claude = new Set();
  for (const m of tmplModels) models.claude.add(m);
  const result: Record<string, string[]> = {};
  for (const [p, s] of Object.entries(models)) result[p] = [...s];
  return result;
}

// ════════════════════════════════════════════════════════════════════
// Skill Registry — 三层技能动态发现（模板 → 全局用户 → 项目级）
// 与 Agent Registry 镜像：弥补 PLATFORM_CONFIG.subdirs 未包含 skills 的漏洞
// ════════════════════════════════════════════════════════════════════

export type SkillItem = {
  id: string;
  name: string;
  description: string;
  platform: string;
  version?: string;
  updated?: string;
  /** 配置来源：template（模板默认）/ global（全局用户） / project（项目级） */
  source?: 'template' | 'global' | 'project';
  category?: string;
};

let _skillList: SkillItem[] | null = null;
/** 缓存记录的最后一次 projectRoot，用于检测变化时刷新 */
let _skillLastProjectRoot: string | undefined = undefined;

/**
 * 扫描单个目录下的技能子目录。
 * 每个技能是一个子目录，内含 SKILL.md 文件（含 frontmatter）。
 *
 * @param dirPath - 技能目录的绝对路径（如 ~/.claude/skills）
 * @param platformKey - 平台标识（claude）
 * @param source - 配置来源标记
 * @param projectName - 项目名称（仅项目级来源时传入）
 * @returns SkillItem 数组
 */
function scanSkillDir(
  dirPath: string,
  platformKey: string,
  source: 'template' | 'global' | 'project',
  projectName?: string,
): SkillItem[] {
  if (!existsSync(dirPath)) return [];
  let entries: string[];
  try {
    entries = readdirSync(dirPath);
  } catch {
    return [];
  }
  const result: SkillItem[] = [];
  for (const e of entries) {
    const entryPath = join(dirPath, e);
    try { if (!statSync(entryPath).isDirectory()) continue; } catch { continue; }
    const skillMdPath = join(entryPath, 'SKILL.md');
    if (!existsSync(skillMdPath)) continue;
    try {
      const content = readFileSync(skillMdPath, 'utf-8');
      const { meta: fm } = parseMdFrontmatter(content);
      const name = (fm.name as string) || e;
      const description = (fm.description as string) || '';
      const category = source === 'global' ? '全局配置'
        : source === 'project' ? (projectName || '项目配置')
        : '模板默认';
      result.push({
        id: e,
        name,
        description,
        platform: platformKey,
        version: fm.version as string | undefined,
        updated: fm.updated as string | undefined,
        source,
        category,
      });
    } catch { /* skip unparseable */ }
  }
  return result;
}

/**
 * 获取合并后的技能列表（三层配置：模板默认 → 全局用户 → 项目级）。
 * 去重规则：项目技能 > 全局同名技能 > 模板技能。
 *
 * @param force - 是否强制刷新缓存
 * @param projectRoot - 项目根目录（传入后启用全局/项目级配置合并）
 * @returns 合并后的技能列表
 */
export function getSkillList(force?: boolean, projectRoot?: string): SkillItem[] {
  if (force || !_skillList || (projectRoot !== _skillLastProjectRoot)) {
    _skillLastProjectRoot = projectRoot;
    const templatesDir = resolveTemplatesDir();

    // 一层：模板默认
    _skillList = [];
    for (const [key, config] of Object.entries(PLATFORM_CONFIG)) {
      const platformDir = resolve(templatesDir, config.dir);
      const skillsDir = join(platformDir, 'skills');
      const templateSkills = scanSkillDir(skillsDir, key, 'template');
      _skillList.push(...templateSkills);
    }

    // 二层 & 三层：全局用户 + 项目级（需要 projectRoot）
    if (projectRoot) {
      const globalSkillsDir = resolve(homedir(), '.claude', 'skills');
      const globalSkills = scanSkillDir(globalSkillsDir, 'claude', 'global');

      const projectSkillsDir = resolve(projectRoot, '.claude', 'skills');
      const projectSkills = scanSkillDir(projectSkillsDir, 'claude', 'project', basename(projectRoot));

      // 合并：项目 > 全局 > 模板
      const projectIds = new Set(projectSkills.map(s => s.id));
      const globalOverrideIds = new Set([
        ...globalSkills.map(s => s.id),
        ...projectSkills.map(s => s.id),
      ]);

      _skillList = [
        // 模板中未被全局或项目覆盖的
        ..._skillList.filter(s => !globalOverrideIds.has(s.id)),
        // 全局中未被项目覆盖的
        ...globalSkills.filter(s => !projectIds.has(s.id)),
        // 项目技能（最高优先级）
        ...projectSkills,
      ];
    }
  }
  return _skillList;
}

/**
 * 收集所有模板技能 SKILL.md frontmatter 的 name 值（去重）。
 */
export function getSkillNames(): string[] {
  const templatesDir = resolveTemplatesDir();
  const names = new Set<string>();
  for (const [, config] of Object.entries(PLATFORM_CONFIG)) {
    const skillsDir = join(templatesDir, config.dir, 'skills');
    if (!existsSync(skillsDir)) continue;
    let entries: string[];
    try {
      entries = readdirSync(skillsDir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const entryPath = join(skillsDir, entry);
      if (!statSync(entryPath).isDirectory()) continue;
      const skillMdPath = join(entryPath, 'SKILL.md');
      if (!existsSync(skillMdPath)) continue;
      try {
        const content = readFileSync(skillMdPath, 'utf-8');
        const { meta: fm } = parseMdFrontmatter(content);
        if (fm.name) names.add(fm.name as string);
      } catch { /* skip */ }
    }
  }
  return [...names];
}
