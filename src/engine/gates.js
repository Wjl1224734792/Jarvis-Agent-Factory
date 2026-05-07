import { join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';

export const GATES = ['Gate A', 'Gate B', 'Gate C', 'Gate C1', 'Gate C1.5', 'Gate C2', 'Gate D', 'Gate E'];

export const GATE_DIRS = { 'Gate A':'requirements','Gate B':'tasks','Gate C':'plans','Gate C1':'implementation','Gate C1.5':'implementation','Gate C2':'testing','Gate D':'review','Gate E':'shipping' };

export const GATE_CHECKS = {
  'Gate A':{check:'至少1个需求文档，含REQ-XXX编号'},'Gate B':{check:'每个TASK-XXX映射至少1个REQ-XXX'},
  'Gate C':{check:'计划文档含parallel_batches+Execution Packet'},'Gate C1':{check:'Lint+Type-check+Build+Deps Audit全部通过'},
  'Gate C1.5':{check:'页面/组件视觉验证截图证据已附'},'Gate C2':{check:'单元/集成/E2E/浏览器测试全部通过，API契约验证通过'},
  'Gate D':{check:'review-qa评审通过，REQ追踪矩阵完整'},'Gate E':{check:'安全审计+上线检查清单+回滚预案就绪'},
};

export const AGENT_LIST = [
  // Claude Code agents
  { id:'jarvis', name:'Jarvis', role:'编排中枢', icon:'brain', platform:'claude', defaultModel:'deepseek-v4-pro', defaultEffort:'max' },
  { id:'frontend-implementer', name:'Frontend', role:'前端全栈', icon:'layout', platform:'claude', defaultModel:'deepseek-v4-pro', defaultEffort:'high' },
  { id:'frontend-ui-worker', name:'UI Worker', role:'UI/样式', icon:'palette', platform:'claude', defaultModel:'deepseek-v4-flash', defaultEffort:'high' },
  { id:'frontend-state-worker', name:'State Worker', role:'状态/数据', icon:'database', platform:'claude', defaultModel:'deepseek-v4-flash', defaultEffort:'high' },
  { id:'frontend-test-worker', name:'Frontend Test', role:'前端测试', icon:'test', platform:'claude', defaultModel:'deepseek-v4-flash', defaultEffort:'high' },
  { id:'backend-implementer', name:'Backend', role:'后端全栈', icon:'server', platform:'claude', defaultModel:'deepseek-v4-pro', defaultEffort:'high' },
  { id:'backend-api-worker', name:'API Worker', role:'API/路由', icon:'route', platform:'claude', defaultModel:'deepseek-v4-flash', defaultEffort:'high' },
  { id:'backend-service-worker', name:'Service Worker', role:'业务逻辑', icon:'cog', platform:'claude', defaultModel:'deepseek-v4-flash', defaultEffort:'high' },
  { id:'backend-data-worker', name:'Data Worker', role:'数据层', icon:'table', platform:'claude', defaultModel:'deepseek-v4-flash', defaultEffort:'high' },
  { id:'backend-test-worker', name:'Backend Test', role:'后端测试', icon:'test', platform:'claude', defaultModel:'deepseek-v4-flash', defaultEffort:'high' },
  { id:'browser-test-worker', name:'Browser Test', role:'浏览器测试', icon:'globe', platform:'claude', defaultModel:'deepseek-v4-flash', defaultEffort:'high' },
  { id:'e2e-test-worker', name:'E2E Test', role:'端到端测试', icon:'play', platform:'claude', defaultModel:'deepseek-v4-flash', defaultEffort:'high' },
  { id:'api-docs-worker', name:'API Docs', role:'API文档', icon:'file', platform:'claude', defaultModel:'deepseek-v4-flash', defaultEffort:'high' },
  { id:'planner', name:'Planner', role:'执行规划', icon:'map', platform:'claude', defaultModel:'deepseek-v4-pro', defaultEffort:'max' },
  { id:'task-design', name:'Task Design', role:'任务分解', icon:'list', platform:'claude', defaultModel:'deepseek-v4-pro', defaultEffort:'max' },
  { id:'security-auditor', name:'Security', role:'安全审计', icon:'shield', platform:'claude', defaultModel:'deepseek-v4-pro', defaultEffort:'max' },
  { id:'review-qa', name:'Review QA', role:'评审', icon:'eye', platform:'claude', defaultModel:'deepseek-v4-pro', defaultEffort:'max' },
  // OpenCode agents (primary orchestrators)
  { id:'opencode-jarvis', name:'Jarvis (OC)', role:'编排中枢', icon:'brain', platform:'opencode', defaultModel:'deepseek/deepseek-v4-pro', defaultEffort:'max' },
  { id:'opencode-frontend', name:'Frontend (OC)', role:'前端编排', icon:'layout', platform:'opencode', defaultModel:'deepseek/deepseek-v4-pro', defaultEffort:'high' },
  { id:'opencode-backend', name:'Backend (OC)', role:'后端编排', icon:'server', platform:'opencode', defaultModel:'deepseek/deepseek-v4-pro', defaultEffort:'high' },
  // Codex agents
  { id:'codex-jarvis', name:'Jarvis (CX)', role:'编排中枢', icon:'brain', platform:'codex', defaultModel:'gpt-5.5', defaultEffort:'max' },
  { id:'codex-frontend-implementer', name:'Frontend (CX)', role:'前端全栈', icon:'layout', platform:'codex', defaultModel:'gpt-5.4', defaultEffort:'high' },
];

export const AVAILABLE_MODELS = [
  'deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek/deepseek-v4-pro', 'deepseek/deepseek-v4-flash',
  'gpt-5.5', 'gpt-5.4', 'gpt-5.3-codex', 'gpt-5.3-codex-spark', 'gpt-5.4-mini', 'gpt-5.2',
  'claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5',
];

export function findGateArtifacts(docsDir, gate) {
  const subdir = GATE_DIRS[gate]; if (!subdir) return [];
  const dir = join(docsDir, subdir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.md')).slice(0, 5);
}

export function formatGateDisplay(gates, current) {
  return gates.map(g => `${g.passed ? '✅' : g.gate === current ? '🔵' : '⏳'} ${g.gate}${g.passed && g.checkpoints?.length ? ` (${g.checkpoints[0].passed_at?.slice(0,10)})` : ''}`).join(' → ');
}
