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
  { id:'jarvis', name:'Jarvis', role:'编排中枢', icon:'brain', defaultModel:'deepseek-v4-pro' },
  { id:'frontend-implementer', name:'Frontend', role:'前端全栈', icon:'layout', defaultModel:'deepseek-v4-pro' },
  { id:'frontend-ui-worker', name:'UI Worker', role:'UI/样式', icon:'palette', defaultModel:'deepseek-v4-flash' },
  { id:'frontend-state-worker', name:'State Worker', role:'状态/数据', icon:'database', defaultModel:'deepseek-v4-flash' },
  { id:'frontend-test-worker', name:'Frontend Test', role:'前端测试', icon:'test', defaultModel:'deepseek-v4-flash' },
  { id:'backend-implementer', name:'Backend', role:'后端全栈', icon:'server', defaultModel:'deepseek-v4-pro' },
  { id:'backend-api-worker', name:'API Worker', role:'API/路由', icon:'route', defaultModel:'deepseek-v4-flash' },
  { id:'backend-service-worker', name:'Service Worker', role:'业务逻辑', icon:'cog', defaultModel:'deepseek-v4-flash' },
  { id:'backend-data-worker', name:'Data Worker', role:'数据层', icon:'table', defaultModel:'deepseek-v4-flash' },
  { id:'backend-test-worker', name:'Backend Test', role:'后端测试', icon:'test', defaultModel:'deepseek-v4-flash' },
  { id:'browser-test-worker', name:'Browser Test', role:'浏览器测试', icon:'globe', defaultModel:'deepseek-v4-flash' },
  { id:'e2e-test-worker', name:'E2E Test', role:'端到端测试', icon:'play', defaultModel:'deepseek-v4-flash' },
  { id:'api-docs-worker', name:'API Docs', role:'API文档', icon:'file', defaultModel:'deepseek-v4-flash' },
  { id:'planner', name:'Planner', role:'执行规划', icon:'map', defaultModel:'deepseek-v4-pro' },
  { id:'task-design', name:'Task Design', role:'任务分解', icon:'list', defaultModel:'deepseek-v4-pro' },
  { id:'security-auditor', name:'Security', role:'安全审计', icon:'shield', defaultModel:'deepseek-v4-pro' },
  { id:'review-qa', name:'Review QA', role:'评审', icon:'eye', defaultModel:'deepseek-v4-pro' },
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
