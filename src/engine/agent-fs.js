/**
 * Agent file sync — writes model/effort back to .md and .toml files.
 * Maps agent IDs to file paths in installed platform configs.
 */
import { resolve, join } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const YAML_MODEL_RE = /^model:\s*.+$/m;
const YAML_EFFORT_RE = /^effort:\s*.+$/m;
const YAML_REASON_RE = /^reasoningEffort:\s*.+$/m;
const TOML_MODEL_RE = /^model\s*=\s*"[^"]*"/m;
const TOML_EFFORT_RE = /^model_reasoning_effort\s*=\s*"[^"]*"/m;
const TOML_DESC_MODEL_RE = /^model\s*=\s*"gpt-[^"]+"/m;

// Agent ID → file path mapping (relative to platform root)
const AGENT_FILES = {
  // Claude/OpenCode agents (.md format)
  'jarvis':                  { base: '.claude/commands/jarvis.md', type: 'md' },
  'frontend-implementer':    { base: '.claude/agents/frontend-implementer.md', type: 'md' },
  'frontend-ui-worker':      { base: '.claude/agents/frontend-ui-worker.md', type: 'md' },
  'frontend-state-worker':   { base: '.claude/agents/frontend-state-worker.md', type: 'md' },
  'frontend-test-worker':    { base: '.claude/agents/frontend-test-worker.md', type: 'md' },
  'backend-implementer':     { base: '.claude/agents/backend-implementer.md', type: 'md' },
  'backend-api-worker':      { base: '.claude/agents/backend-api-worker.md', type: 'md' },
  'backend-service-worker':  { base: '.claude/agents/backend-service-worker.md', type: 'md' },
  'backend-data-worker':     { base: '.claude/agents/backend-data-worker.md', type: 'md' },
  'backend-test-worker':     { base: '.claude/agents/backend-test-worker.md', type: 'md' },
  'browser-test-worker':     { base: '.claude/agents/browser-test-worker.md', type: 'md' },
  'e2e-test-worker':         { base: '.claude/agents/e2e-test-worker.md', type: 'md' },
  'api-docs-worker':         { base: '.claude/agents/api-docs-worker.md', type: 'md' },
  'planner':                 { base: '.claude/agents/planner.md', type: 'md' },
  'task-design':             { base: '.claude/agents/task-design.md', type: 'md' },
  'security-auditor':        { base: '.claude/agents/security-auditor.md', type: 'md' },
  'review-qa':               { base: '.claude/agents/review-qa.md', type: 'md' },
  // OpenCode agents (.md format, in .opencode/agents/)
  'opencode-jarvis':        { base: '.opencode/agents/jarvis.md', type: 'md' },
  'opencode-frontend':      { base: '.opencode/agents/frontend.md', type: 'md' },
  'opencode-backend':       { base: '.opencode/agents/backend.md', type: 'md' },
  // Codex agents (.toml format)
  'codex-jarvis':           { base: '.codex/agents/planner.toml', type: 'toml' },
  'codex-frontend-implementer': { base: '.codex/agents/frontend_implementer.toml', type: 'toml' },
};

/**
 * Write model and effort back to the agent's source file.
 * Returns true if file was updated.
 */
export function syncAgentFile(root, agentId, model, effort) {
  const mapping = AGENT_FILES[agentId];
  if (!mapping) return false;

  const filePath = resolve(root, mapping.base);
  if (!existsSync(filePath)) return false;

  let content = readFileSync(filePath, 'utf-8');

  if (mapping.type === 'md') {
    // YAML frontmatter: model: xxx / effort: xxx / reasoningEffort: xxx
    if (YAML_MODEL_RE.test(content)) {
      content = content.replace(YAML_MODEL_RE, `model: ${model}`);
    }
    // OpenCode uses reasoningEffort, Claude uses effort
    if (YAML_EFFORT_RE.test(content)) {
      content = content.replace(YAML_EFFORT_RE, `effort: ${effort}`);
    }
    if (YAML_REASON_RE.test(content)) {
      content = content.replace(YAML_REASON_RE, `reasoningEffort: ${effort}`);
    }
  } else if (mapping.type === 'toml') {
    // TOML: model = "xxx" / model_reasoning_effort = "xxx"
    if (TOML_MODEL_RE.test(content)) {
      content = content.replace(TOML_MODEL_RE, `model = "${model}"`);
    } else if (TOML_DESC_MODEL_RE.test(content)) {
      content = content.replace(TOML_DESC_MODEL_RE, `model = "${model}"`);
    }
    if (TOML_EFFORT_RE.test(content)) {
      content = content.replace(TOML_EFFORT_RE, `model_reasoning_effort = "${effort}"`);
    }
  }

  if (content !== readFileSync(filePath, 'utf-8')) {
    writeFileSync(filePath, content);
    return true;
  }
  return false;
}
