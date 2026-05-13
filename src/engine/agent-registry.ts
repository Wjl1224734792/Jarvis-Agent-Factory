/**
 * Agent Registry — 动态扫描模板目录，生成完整 Agent 列表与文件映射（TASK-009：仅 claude 平台）。
 * 替代硬编码的 AGENT_LIST 和 AGENT_FILES。
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
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
  'browser': 'globe', 'docs': 'file', 'security': 'shield', 'audit': 'eye', 'review': 'eye',
  'qa': 'eye', 'planner': 'map', 'plan': 'map', 'task': 'list', 'design': 'list',
  'architect': 'brain', 'algorithm': 'brain', 'expert': 'brain', 'explorer': 'globe',
  'researcher': 'globe', 'remediation': 'cog', 'worker': 'cog', 'infra': 'server',
  'android': 'palette', 'ios': 'palette', 'flutter': 'palette', 'taro': 'palette',
  'react-native': 'palette', 'expo': 'palette',
  'state': 'database', 'ui': 'palette', 'jarvis': 'brain', 'orchestrator': 'brain',
};

/** 领域分类关键词映射 */
// 按优先级排列：越具体的规则越靠前
const CATEGORY_RULES = [
  { cat: '编排', keys: ['jarvis', 'orchestrat'] },
  { cat: '测试', keys: ['test-expert', 'test-expert', 'e2e-test', 'e2e_test', 'browser-test', 'browser_test', 'perf-test', 'performance-test', 'performance_test'] },
  { cat: '审查', keys: ['review-expert', 'review', 'audit', 'security', 'qa'] },
  { cat: '架构', keys: ['architect', 'algorithm-expert'] },
  { cat: '浏览器', keys: ['browser-use', 'browser-test'] },
  { cat: '移动端', keys: ['android-dev-expert', 'android-ui', 'android-state', 'ios-dev-expert', 'ios-ui', 'ios-state', 'flutter-dev-expert', 'flutter-ui', 'flutter-state', 'taro-dev-expert', 'taro-ui', 'taro-state', 'react-native-dev-expert', 'react-native-ui', 'react-native-state'] },
  { cat: '支撑', keys: ['external-resource', 'infra-deploy', 'code-explore-expert', 'api-contract', 'planner', 'task-design', 'remediation', 'skill-assignment', 'docs-engineer'] },
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
function inferCategory(fileName, content) {
  const lower = ((fileName || '') + ' ' + (content || '')).toLowerCase();
  for (const rule of CATEGORY_RULES) {
    for (const key of rule.keys) {
      if (lower.includes(key)) return rule.cat;
    }
  }
  return '支撑'; // 兜底
}

/** 从 agent 文件名/内容推断图标 */
function inferIcon(fileName, content) {
  const lower = (fileName + ' ' + (content || '')).toLowerCase();
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return 'cog';
}

/** 从 agent 内容提取 role 描述 */
function inferRole(fileName, desc) {
  if (desc) {
    const m = desc.match(/^(.+?)(?::|——|·|，|,)/);
    if (m) return m[1].trim().slice(0, 20);
    return desc.slice(0, 20);
  }
  return fileName.replace(/[-_]/g, ' ');
}

/** 解析 .md frontmatter → { model, effort, reasoningEffort, description } */
function parseMdFrontmatter(content: string): Record<string, string> {
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

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
  const fm = parseMdFrontmatter(content);
  const model = fm.model || '';
  const effort = fm.effort || fm.reasoningEffort || '';
  const name = fm.name || fileName;
  const description = fm.description || '';

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

/** 按平台分组的可用模型，force 强制重新扫描 */
export function getPlatformModels(force?: boolean): Record<string, string[]> {
  const agents = getAgentList(force);
  const models: Record<string, Set<string>> = {};
  for (const a of agents) {
    if (!models[a.platform]) models[a.platform] = new Set();
    if (a.defaultModel) models[a.platform].add(a.defaultModel);
  }
  // 补充常见模型（TASK-009：仅 claude）
  const extras = {
    claude: ['deepseek-v4-pro', 'deepseek-v4-flash'],
  };
  for (const [p, list] of Object.entries(extras)) {
    if (!models[p]) models[p] = new Set();
    for (const m of list) models[p].add(m);
  }
  const result = {};
  for (const [p, s] of Object.entries(models)) result[p] = [...s];
  return result;
}
