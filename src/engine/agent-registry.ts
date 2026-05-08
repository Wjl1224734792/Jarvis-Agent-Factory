/**
 * Agent Registry — 动态扫描三平台模板目录，生成完整 Agent 列表与文件映射。
 * 替代硬编码的 AGENT_LIST 和 AGENT_FILES。
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, '..', 'templates', 'platforms');

/** 平台 → 目录名 + 文件扩展名 + 前端格式约定 */
const PLATFORM_CONFIG = {
  claude:   { dir: 'claude',   subdirs: ['agents', 'commands'], ext: '.md',   type: 'md' },
  opencode: { dir: 'opencode', subdirs: ['agents', 'plugins'],  ext: '.md',   type: 'md', pluginExt: '.ts' },
  codex:    { dir: 'codex',    subdirs: ['agents'],              ext: '.toml', type: 'toml' },
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
  { cat: '移动端', keys: ['android-dev-expert', 'android-ui', 'android-state', 'ios-dev-expert', 'ios-ui', 'ios-state', 'flutter-dev-expert', 'flutter-ui', 'flutter-state', 'taro-dev-expert', 'taro-ui', 'taro-state', 'react-native-dev-expert', 'react-native-ui', 'react-native-state'] },
  { cat: '支撑', keys: ['docs-research', 'infra-deploy', 'code-explore-expert', 'api-contract', 'planner', 'task-design', 'remediation'] },
  { cat: '实现', keys: ['-dev-expert', '-ui-expert', '-state-expert', '-api-expert', '-logic-expert', '-data-expert'] },
];

export function getCategories() {
  return ['全部', '编排', '实现', '测试', '审查', '架构', '移动端', '支撑'];
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

/** 解析 .toml frontmatter → { model, model_reasoning_effort, description, name } */
function parseTomlFrontmatter(content: string): Record<string, string> {
  const fm: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const kv = line.match(/^(\w+)\s*=\s*"([^"]*)"\s*$/);
    if (kv) fm[kv[1]] = kv[2];
  }
  return fm;
}

/** 扫描单个平台的所有 agent */
function scanPlatform(platformKey: string, config: { dir: string; subdirs: string[]; ext: string; type: string; pluginExt?: string }): { agents: AgentItem[]; fileMap: AgentFileMap } {
  const platformDir = resolve(TEMPLATES_DIR, config.dir);
  const agents: AgentItem[] = [];
  const fileMap: AgentFileMap = {};

  for (const subdir of config.subdirs) {
    const dir = join(platformDir, subdir);
    if (!existsSync(dir)) continue;

    // 只扫描 agents 目录，跳过 commands / plugins 等
    if (subdir !== 'agents') continue;

    for (const entry of readdirSync(dir)) {
      if (!entry.endsWith(config.ext)) continue;
      const filePath = join(dir, entry);
      const content = readFileSync(filePath, 'utf-8');
      const fileName = basename(entry, config.ext);
      // 实际安装路径
      const installBase = platformKey === 'claude'
        ? `.claude/${subdir}/${entry}`
        : platformKey === 'opencode'
          ? `.opencode/${subdir}/${entry}`
          : `.codex/${subdir}/${entry}`;

      let model, effort, name, role, description;
      if (config.type === 'md') {
        const fm = parseMdFrontmatter(content);
        model = fm.model || '';
        effort = fm.effort || fm.reasoningEffort || '';
        name = fm.name || fileName;
        description = fm.description || '';
        role = inferRole(fileName, description);
      } else {
        const fm = parseTomlFrontmatter(content);
        model = fm.model || '';
        effort = fm.model_reasoning_effort || '';
        name = fm.name || fileName;
        description = fm.description || '';
        role = inferRole(fileName, description);
      }

      const id = platformKey === 'claude' ? fileName : `${platformKey}-${fileName}`;
      const icon = inferIcon(fileName, description || content);
      const category = inferCategory(fileName, description || content);

      agents.push({
        id,
        name,
        role,
        icon,
        category,
        platform: platformKey,
        defaultModel: model || '',
        defaultEffort: effort || 'high',
        fileName: entry,
        subdir,
      });

      fileMap[id] = { base: installBase, type: config.type as 'md' | 'toml' };
    }
  }

  return { agents, fileMap };
}

// ---- 导出 ----

type AgentItem = {
  id: string; name: string; role: string; icon: string;
  platform: string; defaultModel: string; defaultEffort: string;
  category?: string; fileName?: string; subdir?: string;
};
type AgentFileMap = Record<string, { base: string; type: 'md' | 'toml' }>;

let _agentList: AgentItem[] | null = null;
let _agentFiles: AgentFileMap | null = null;

/** 强制重新扫描模板目录 */
export function getAgentList(force?: boolean): AgentItem[] {
  if (force || !_agentList) {
    _agentList = [];
    _agentFiles = {};
    for (const [key, config] of Object.entries(PLATFORM_CONFIG)) {
      const { agents, fileMap } = scanPlatform(key, config);
      _agentList.push(...agents);
      Object.assign(_agentFiles, fileMap);
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
  // 补充常见模型
  const extras = {
    claude: ['deepseek-v4-pro', 'deepseek-v4-flash'],
    opencode: ['deepseek/deepseek-v4-pro', 'deepseek/deepseek-v4-flash'],
    codex: ['gpt-5.5', 'gpt-5.4', 'gpt-5.3-codex'],
  };
  for (const [p, list] of Object.entries(extras)) {
    if (!models[p]) models[p] = new Set();
    for (const m of list) models[p].add(m);
  }
  const result = {};
  for (const [p, s] of Object.entries(models)) result[p] = [...s];
  return result;
}
