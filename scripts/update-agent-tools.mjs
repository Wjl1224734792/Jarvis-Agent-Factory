/**
 * 批量更新 agent 模板的 tools: 字段，添加 AST + LSP MCP 工具
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const AGENTS_DIR = join(import.meta.dirname, '..', 'src', 'templates', 'platforms', 'claude', 'agents');

// 按 agent 类型分配的工具
const BASE_TOOLS = [
  'mcp__jarvis-engine__jarvis_ast_search',
  'mcp__jarvis-engine__jarvis_lsp_hover',
  'mcp__jarvis-engine__jarvis_lsp_goto_definition',
  'mcp__jarvis-engine__jarvis_lsp_find_references',
];

const CODE_TOOLS = [
  'mcp__jarvis-engine__jarvis_ast_replace',
  'mcp__jarvis-engine__jarvis_lsp_diagnostics',
  'mcp__jarvis-engine__jarvis_lsp_document_symbols',
];

const REVIEW_TOOLS = [
  'mcp__jarvis-engine__jarvis_lsp_diagnostics',
  'mcp__jarvis-engine__jarvis_lsp_find_references',
];

const PLAN_TOOLS = [
  'mcp__jarvis-engine__jarvis_lsp_workspace_symbols',
  'mcp__jarvis-engine__jarvis_lsp_document_symbols',
];

const ORCHESTRATOR_TOOLS = [
  'mcp__jarvis-engine__jarvis_priority_context',
];

// 按文件名前缀分类
const IMPL_PATTERNS = [/dev-expert/, /ui-expert/, /state-expert/, /api-expert/, /logic-expert/, /data-expert/];
const REVIEW_PATTERNS = [/review-expert/, /audit/];
const PLAN_PATTERNS = [/planner/, /task-design/, /architect/, /algorithm-expert/];
const TEST_PATTERNS = [/test-expert/, /test-executor/, /test-doc/];
const EXPLORE_PATTERNS = [/explore/, /research-expert/, /external-resource/];
const BROWSER_PATTERNS = [/browser/, /e2e/];
const ORCHESTRATOR_PATTERNS = [/skill-assignment/, /remediation/, /verify-expert/];

function getCategory(filename) {
  const name = filename.replace('.md', '');
  const isImpl = IMPL_PATTERNS.some(p => p.test(name));
  const isReview = REVIEW_PATTERNS.some(p => p.test(name));
  const isPlan = PLAN_PATTERNS.some(p => p.test(name));
  const isTest = TEST_PATTERNS.some(p => p.test(name));
  const isExplore = EXPLORE_PATTERNS.some(p => p.test(name));
  const isBrowser = BROWSER_PATTERNS.some(p => p.test(name));
  const isOrch = ORCHESTRATOR_PATTERNS.some(p => p.test(name));

  if (isBrowser) return 'browser';  // 不加 AST/LSP
  if (isExplore) return 'explore';
  if (isOrch) return 'orchestrator';  // orchestrator 优先于 plan（remediation-planner）
  if (isPlan) return 'plan';
  if (isImpl) return 'impl';
  if (isReview) return 'review';
  if (isTest) return 'test';
  return 'base';  // 默认加基础工具
}

const CATEGORY_TOOLS = {
  base: BASE_TOOLS,
  explore: BASE_TOOLS,
  impl: [...BASE_TOOLS, ...CODE_TOOLS],
  review: [...BASE_TOOLS, ...REVIEW_TOOLS],
  plan: [...BASE_TOOLS, ...PLAN_TOOLS],
  test: [...BASE_TOOLS, ...CODE_TOOLS],
  orchestrator: ORCHESTRATOR_TOOLS,
  browser: [],  // 不加
};

let updated = 0, skipped = 0;

for (const file of readdirSync(AGENTS_DIR)) {
  if (!file.endsWith('.md')) continue;
  const fp = join(AGENTS_DIR, file);
  let content = readFileSync(fp, 'utf-8');

  // 跳过已经有 jarvis_ast 或 jarvis_lsp 工具的
  if (content.includes('jarvis_ast_search') || content.includes('jarvis_lsp_hover')) {
    skipped++;
    continue;
  }

  const category = getCategory(file);
  const tools = CATEGORY_TOOLS[category];
  if (tools.length === 0) continue;

  // 找到 tools: 行并追加
  const toolsLineRegex = /^tools:\s*(.+)$/m;
  const match = content.match(toolsLineRegex);
  if (!match) continue;

  const existingTools = match[1].trim();
  const newTools = tools.join(', ');
  const newLine = `tools: ${existingTools}, ${newTools}`;

  content = content.replace(toolsLineRegex, newLine);
  writeFileSync(fp, content, 'utf-8');
  updated++;
  console.log(`  ✓ ${file} (${category})`);
}

console.log(`\nUpdated: ${updated}, Skipped: ${skipped}`);
