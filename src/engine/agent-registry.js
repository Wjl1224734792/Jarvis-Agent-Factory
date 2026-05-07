/**
 * Agent Registry — 动态扫描三平台模板目录，生成完整 Agent 列表与文件映射。
 * 替代硬编码的 AGENT_LIST 和 AGENT_FILES。
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join, basename, extname } from 'node:path';
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
  { cat: '测试', keys: ['test-worker', 'test_worker', 'e2e-test', 'e2e_test', 'browser-test', 'browser_test', 'performance-test', 'performance_test'] },
  { cat: '审查', keys: ['review', 'audit', 'security', 'code-reviewer', 'qa', 'auditor'] },
  { cat: '架构', keys: ['architect', 'algorithm', 'database-specialist', 'database_specialist'] },
  { cat: '移动端', keys: ['android-worker', 'android-ui', 'android-state', 'ios-worker', 'ios-ui', 'ios-state', 'flutter-worker', 'flutter-ui', 'flutter-state', 'taro-worker', 'taro-ui', 'taro-state', 'react-native-worker', 'rn-worker', 'rn-ui', 'rn-state', 'android_worker', 'ios_worker', 'flutter_worker', 'taro_worker', 'react_native_worker'] },
  { cat: '支撑', keys: ['docs', 'infra', 'repo-explorer', 'researcher', 'planner', 'task-design', 'remediation', 'explorer', 'design'] },
  { cat: '实现', keys: ['implementer', 'worker', '-api-', '-service-', '-data-', '-state-', '-ui-', 'api_worker', 'service_worker', 'data_worker', 'state_worker', 'ui_worker'] },
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
function parseMdFrontmatter(content) {
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

/** 解析 .toml frontmatter → { model, model_reasoning_effort, description, name } */
function parseTomlFrontmatter(content) {
  const fm = {};
  for (const line of content.split('\n')) {
    const kv = line.match(/^(\w+)\s*=\s*"([^"]*)"\s*$/);
    if (kv) fm[kv[1]] = kv[2];
  }
  return fm;
}

/** 扫描单个平台的所有 agent */
function scanPlatform(platformKey, config) {
  const platformDir = resolve(TEMPLATES_DIR, config.dir);
  const agents = [];
  const fileMap = {};

  for (const subdir of config.subdirs) {
    const dir = join(platformDir, subdir);
    if (!existsSync(dir)) continue;

    // 跳过 plugins 目录（不是 agent 文件）
    if (subdir === 'plugins') continue;

    for (const entry of readdirSync(dir)) {
      if (!entry.endsWith(config.ext)) continue;
      const filePath = join(dir, entry);
      const content = readFileSync(filePath, 'utf-8');
      const fileName = basename(entry, config.ext);
      const relativePath = `.${platformDir.slice(TEMPLATES_DIR.length + config.dir.length)}/${subdir}/${entry}`;
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

      fileMap[id] = { base: installBase, type: config.type };
    }
  }

  return { agents, fileMap };
}

// ---- 导出 ----

/** @type {Array<{id, name, role, icon, platform, defaultModel, defaultEffort}>} */
let _agentList = null;
/** @type {Record<string, {base:string, type:'md'|'toml'}>} */
let _agentFiles = null;

export function getAgentList() {
  if (!_agentList) {
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

export function getAgentFiles() {
  if (!_agentFiles) getAgentList(); // 触发扫描
  return _agentFiles;
}

/** 按平台筛选 agent 列表 */
export function getAgentsByPlatform(platform) {
  return getAgentList().filter(a => a.platform === platform);
}

/** 获取所有平台名称 */
export function getPlatforms() {
  return Object.keys(PLATFORM_CONFIG);
}

/** 按平台分组的可用模型 */
export function getPlatformModels() {
  const agents = getAgentList();
  const models = {};
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
