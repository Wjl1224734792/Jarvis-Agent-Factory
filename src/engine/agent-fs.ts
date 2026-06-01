/**
 * Agent file sync — writes model/effort back to .md and .toml files.
 * File mappings auto-generated from template directory scan.
 */
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { getAgentFiles, resolveTemplatesDir } from './agent-registry.js';

const YAML_MODEL_RE = /^model:\s*.+$/m;
const YAML_EFFORT_RE = /^effort:\s*.+$/m;
const YAML_REASON_RE = /^reasoningEffort:\s*.+$/m;
const TOML_MODEL_RE = /^model\s*=\s*"[^"]*"/m;
const TOML_EFFORT_RE = /^model_reasoning_effort\s*=\s*"[^"]*"/m;
const TOML_DESC_MODEL_RE = /^model\s*=\s*"gpt-[^"]+"/m;

function sanitizeFMValue(v: string): string {
  return v.replace(/[\n\r]/g, ' ').replace(/"/g, '\\"');
}

/**
 * Write model and effort back to the agent's source file.
 * Returns true if file was updated.
 */
export function syncAgentFile(root: string, agentId: string, model: string, effort: string): boolean {
  const safeModel = sanitizeFMValue(model);
  const safeEffort = sanitizeFMValue(effort);
  const AGENT_FILES = getAgentFiles(true);
  if (!AGENT_FILES) return false;
  const mapping = AGENT_FILES[agentId];
  if (!mapping) return false;

  // Priority: project-level > global > templates (read-only)
  const projectPath = resolve(root, mapping.base);
  const globalPath = resolve(homedir(), mapping.base);
  const templatesDir = resolveTemplatesDir();
  const templatePath = templatesDir ? resolve(templatesDir, mapping.base) : null;

  let filePath: string;
  if (existsSync(projectPath)) {
    filePath = projectPath;
  } else if (existsSync(globalPath)) {
    filePath = globalPath;
  } else if (templatePath && existsSync(templatePath)) {
    // Templates are read-only — do not write back
    return false;
  } else {
    return false;
  }

  let content = readFileSync(filePath, 'utf-8');
  let changed = false;

  if (mapping.type === 'md') {
    // YAML frontmatter: model: xxx / effort: xxx / reasoningEffort: xxx
    const hasModel = YAML_MODEL_RE.test(content);
    const hasEffort = YAML_EFFORT_RE.test(content);
    const hasReasoningEffort = YAML_REASON_RE.test(content);

    if (hasModel) {
      content = content.replace(YAML_MODEL_RE, `model: ${safeModel}`);
      changed = true;
    }
    if (hasEffort) {
      content = content.replace(YAML_EFFORT_RE, `effort: ${safeEffort}`);
      changed = true;
    }
    if (hasReasoningEffort) {
      content = content.replace(YAML_REASON_RE, `reasoningEffort: ${safeEffort}`);
      changed = true;
    }

    // 字段缺失时追加到 frontmatter 末尾（--- 闭标签前）
    if (!hasModel && !hasReasoningEffort && !hasEffort) {
      // 纯 description 型 frontmatter：在闭标签 --- 前插入
      content = content.replace(/^---\n/, `---\nmodel: ${safeModel}\neffort: ${safeEffort}\n`);
      changed = true;
    } else {
      // 部分字段存在：补缺失的
      if (!hasModel) {
        content = content.replace(/^(model|effort|reasoningEffort):/m, `model: ${safeModel}\n$&`);
        changed = true;
      }
      if (!hasEffort && !hasReasoningEffort) {
        // Claude 使用 effort，OpenCode 使用 reasoningEffort — 按现有字段判断
        content = content.replace(/^---\n/, `---\neffort: ${safeEffort}\n`);
        changed = true;
      }
    }
  } else if (mapping.type === 'toml') {
    // TOML: model = "xxx" / model_reasoning_effort = "xxx"
    const hasModel = TOML_MODEL_RE.test(content) || TOML_DESC_MODEL_RE.test(content);
    const hasEffort = TOML_EFFORT_RE.test(content);

    if (TOML_MODEL_RE.test(content)) {
      content = content.replace(TOML_MODEL_RE, `model = "${safeModel}"`);
      changed = true;
    } else if (TOML_DESC_MODEL_RE.test(content)) {
      content = content.replace(TOML_DESC_MODEL_RE, `model = "${safeModel}"`);
      changed = true;
    }
    if (hasEffort) {
      content = content.replace(TOML_EFFORT_RE, `model_reasoning_effort = "${safeEffort}"`);
      changed = true;
    }

    // 字段缺失时在 description 行后追加
    if (!hasModel) {
      content = content.replace(/^description\s*=.+\n/m, `$&model = "${safeModel}"\n`);
      changed = true;
    }
    if (!hasEffort) {
      content = content.replace(/^model\s*=.+\n/m, `$&model_reasoning_effort = "${safeEffort}"\n`);
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(filePath, content);
    return true;
  }
  return false;
}
