import { fileURLToPath } from 'node:url';
import { resolve, join, dirname } from 'node:path';
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';
import { getHashFilePath } from './hash-paths.js';
import { readMcpConfig, writeMcpConfig } from './shared/mcp-config.js';
import { FM_SEARCH_LIMIT, readFrontmatter, splitMarkdownSections, computeSectionHashes, isSectionHashRecord } from './shared/markdown-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = resolve(__dirname, 'templates');

const INSTALL_BUCKETS = ['agents', 'commands', 'skills', 'plugins'];

/** MCP server 白名单：永不被删除 */
const MCP_SERVER_WHITELIST = new Set(['jarvis-engine']);

/** 系统管理的 hook key 记录字段名（存储于 settings.json 顶层） */
const MANAGED_HOOKS_KEY = '_jarvisManagedHooks';

/**
 * 检查值是否为纯对象（非数组、非 null）。
 * @param val 待检查的值
 * @returns 是纯对象则返回 true
 */
function isPlainObject(val: unknown): boolean {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * 深度合并单个字段值：数组去重合并，对象递归合并，标量覆盖。
 * 模板值为权威源——标量字段以模板为准。
 *
 * @param templateVal 模板值（优先级更高）
 * @param existingVal 目标现有值
 * @returns 合并后的值
 */
function deepMergeValue(templateVal: unknown, existingVal: unknown): unknown {
  // 双方都是数组 → 合并去重（模板元素在前）
  if (Array.isArray(templateVal) && Array.isArray(existingVal)) {
    const merged = [...templateVal];
    for (const item of existingVal) {
      if (!merged.includes(item)) {
        merged.push(item);
      }
    }
    return merged;
  }

  // 双方都是纯对象 → 递归深度合并
  if (isPlainObject(templateVal) && isPlainObject(existingVal)) {
    const result: Record<string, unknown> = { ...(existingVal as Record<string, unknown>) };
    for (const [key, val] of Object.entries(templateVal as Record<string, unknown>)) {
      if (key in result) {
        result[key] = deepMergeValue(val, result[key]);
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  // 其余情况（标量、类型不匹配等）：模板值覆盖
  return templateVal;
}

/**
 * 合并 MCP servers 映射：新增、删除（白名单保护）、深度修改。
 *
 * @param templateServers 模板定义的 servers
 * @param existingServers 目标文件中的 servers
 * @returns 合并结果及变更统计
 */
function mergeMcpServers(
  templateServers: Record<string, unknown>,
  existingServers: Record<string, unknown>,
): { merged: Record<string, unknown>; added: number; removed: number; updated: number } {
  const result: Record<string, unknown> = {};
  let added = 0;
  let updated = 0;
  let removed = 0;

  // 模板中的 server：新增或深度合并
  for (const [name, tplConfig] of Object.entries(templateServers)) {
    if (name in existingServers) {
      // 同名存在 → 深度合并修改
      const merged = deepMergeValue(tplConfig, existingServers[name]);
      if (JSON.stringify(merged) !== JSON.stringify(existingServers[name])) {
        updated++;
      }
      result[name] = merged;
    } else {
      // 模板有、目标无 → 新增
      result[name] = tplConfig;
      added++;
    }
  }

  // 目标独有的 server：不在白名单中则删除
  for (const [name, config] of Object.entries(existingServers)) {
    if (!(name in templateServers)) {
      if (MCP_SERVER_WHITELIST.has(name)) {
        // 白名单保护：永不删除
        result[name] = config;
      } else {
        removed++;
      }
    }
  }

  return { merged: result, added, removed, updated };
}
const SKIP_FILES = new Set(['settings.json', 'settings.local.json', 'node_modules', '.git']);

const MCP_TEMPLATES = {
  claude:   { file: '.mcp.json',                  tmpl: 'mcp-claude.json' },
  opencode: { file: '.opencode/opencode.json',     tmpl: 'mcp-opencode.json' },
  codex:    { file: '.codex/config.toml',          tmpl: 'mcp-codex.toml', append: true },
};

// Global install roots
const GLOBAL_ROOTS = {
  claude:   resolve(homedir(), '.claude'),
  opencode: resolve(homedir(), '.config', 'opencode'),
  codex:    resolve(homedir(), '.codex'),
};

function globalTarget(platform) {
  return GLOBAL_ROOTS[platform] || resolve(homedir(), `.${platform}`);
}

function mcpGlobalDest(platform) {
  if (platform === 'codex') return resolve(homedir(), '.codex', 'config.toml');
  if (platform === 'opencode') return resolve(homedir(), '.config', 'opencode', 'opencode.json');
  return resolve(globalTarget(platform), '.mcp.json');
}

export async function install({ platform, target, pkgRoot, platforms, force, global: isGlobal }) {
  const info = platforms[platform];
  const srcRoot = resolve(pkgRoot, 'dist/src', 'templates', 'platforms', platform);
  const destRoot = isGlobal ? globalTarget(platform) : resolve(target, info.dir);

  if (!existsSync(srcRoot)) {
    console.error(`  ⚠  Source not found: ${srcRoot}`);
    return;
  }

  const destExists = existsSync(destRoot);
  if (destExists && !force) {
    const ok = await confirm(`  📁 ${info.dir}/ exists, merge agents/skills/commands? [y/N] `);
    if (!ok) { console.log(`  ⏭  Skipped ${platform}`); return; }
  }

  if (!destExists) mkdirSync(destRoot, { recursive: true });

  const hashFilePath = getHashFilePath(target, isGlobal);

  let totalFiles = 0;
  for (const bucket of INSTALL_BUCKETS) {
    const srcDir = join(srcRoot, bucket);
    const destDir = join(destRoot, bucket);
    if (!existsSync(srcDir)) continue;
    const stats = mergeDir(srcDir, destDir, hashFilePath);
    totalFiles += stats.files;
    const tag = existsSync(destDir) && stats.files > 0 ? '~' : '+';
    console.log(`  ${tag} ${(isGlobal ? '~/' + info.dir : info.dir) + '/' + bucket.padEnd(8)} → ${stats.files} files${stats.skipped ? ` (${stats.skipped} unchanged skipped)` : ''}`);
  }

  // Install MCP config
  installMcp(platform, isGlobal ? null : target, force);

  // Install hook configs (platform-native hooks drive gate enforcement)
  installHooks(platform, target, isGlobal, force);

  const status = destExists ? 'updated' : 'installed';
  const label = isGlobal ? `~/${info.dir}` : destRoot;
  console.log(`  ✅ ${platform.padEnd(10)} ${status} → ${label} (${totalFiles} files total)`);
}

function installHooks(platform: string, target: string, isGlobal: boolean, force: boolean) {
  // ============================================================
  // 单一 hooks 配置源：settings.json
  // 不再使用 plugin 系统 —— hooks 覆盖全部需求：
  //   PostToolUse(Agent)        → gate-check --operation spawn_impl
  //   PostToolUse(Write/Edit)   → gate-check --operation write_code
  //   Stop                      → status
  // ============================================================
  const hookJson = {
    PostToolUse: [
      { matcher: 'Agent', hooks: [{ type: 'command', command: 'jarvis hook gate-check --operation spawn_impl' }] },
      { matcher: 'Write', hooks: [{ type: 'command', command: 'jarvis hook gate-check --operation write_code' }] },
      { matcher: 'Edit', hooks: [{ type: 'command', command: 'jarvis hook gate-check --operation write_code' }] },
    ],
    Stop: [{ hooks: [{ type: 'command', command: 'jarvis hook status' }] }],
  };

  if (platform === 'claude') {
    const claudeDir = isGlobal ? GLOBAL_ROOTS.claude : resolve(target, '.claude');
    if (!existsSync(claudeDir)) mkdirSync(claudeDir, { recursive: true });

    const file = resolve(claudeDir, 'settings.json');
    let existing: Record<string, any> = {};
    if (existsSync(file)) { try { existing = JSON.parse(readFileSync(file, 'utf-8')); } catch {} }
    const snapshot = JSON.stringify(existing); // 变更前快照

    // 合并 permissions.allow —— 从模板读取，与现有列表去重合并（只新增不删除，白名单保护）
    const tmplSettingsPath = resolve(TEMPLATES_DIR, 'platforms', 'claude', 'settings.json');
    let permAdded = 0;
    if (existsSync(tmplSettingsPath)) {
      try {
        const tmplSettings = JSON.parse(readFileSync(tmplSettingsPath, 'utf-8'));
        if (tmplSettings.permissions?.allow && Array.isArray(tmplSettings.permissions.allow)) {
          if (!existing.permissions) existing.permissions = {};
          if (!existing.permissions.allow) existing.permissions.allow = [];
          const existingSet = new Set(existing.permissions.allow);
          for (const entry of tmplSettings.permissions.allow) {
            if (!existingSet.has(entry)) {
              existing.permissions.allow.push(entry);
              permAdded++;
            }
          }
        }
      } catch { /* 模板解析失败不影响主流程 */ }
    }

    // 合并 hooks —— 增删改全支持
    const systemHookKeys = Object.keys(hookJson);
    const systemHookKeySet = new Set(systemHookKeys);
    const previousManagedHooks: string[] = Array.isArray(existing[MANAGED_HOOKS_KEY]) ? existing[MANAGED_HOOKS_KEY] : [];
    let hooksAdded = 0;
    let hooksUpdated = 0;
    let hooksRemoved = 0;

    // 确保 hooks 对象存在
    if (!existing.hooks) {
      existing.hooks = {};
    }

    if (force) {
      // force 模式：完全替换 hooks（但不删除 permissions.allow）
      const existingHookKeys = Object.keys(existing.hooks);
      // 计算变更：新增的 hook keys
      for (const key of systemHookKeys) {
        if (!(key in existing.hooks)) {
          hooksAdded++;
        } else if (JSON.stringify(existing.hooks[key]) !== JSON.stringify(hookJson[key])) {
          hooksUpdated++;
        }
      }
      // 被删除的 hook keys（用户自定义 + 之前系统管理的）
      for (const key of existingHookKeys) {
        if (!systemHookKeySet.has(key)) {
          hooksRemoved++;
        }
      }
      existing.hooks = hookJson;
    } else {
      // 正常模式：系统 hook keys 覆盖，用户自定义保留，模板移除的删除
      // 设置/覆盖系统 hook keys
      for (const [key, val] of Object.entries(hookJson)) {
        if (!(key in existing.hooks)) {
          existing.hooks[key] = val;
          hooksAdded++;
        } else if (JSON.stringify(existing.hooks[key]) !== JSON.stringify(val)) {
          existing.hooks[key] = val;
          hooksUpdated++;
        }
      }

      // 删除之前系统管理但当前模板已移除的 hooks
      for (const prevKey of previousManagedHooks) {
        if (!systemHookKeySet.has(prevKey) && prevKey in existing.hooks) {
          delete existing.hooks[prevKey];
          hooksRemoved++;
        }
      }
    }

    // 记录当前系统管理的 hook keys
    existing[MANAGED_HOOKS_KEY] = systemHookKeys;

    // 单次写入：只有当实际有变更时才写文件
    if (JSON.stringify(existing) !== snapshot) {
      writeFileSync(file, JSON.stringify(existing, null, 2));
      const parts: string[] = [];
      if (permAdded > 0) parts.push(`${permAdded} permissions`);
      if (hooksAdded > 0) parts.push(`+${hooksAdded} hooks`);
      if (hooksUpdated > 0) parts.push(`~${hooksUpdated} hooks`);
      if (hooksRemoved > 0) parts.push(`-${hooksRemoved} hooks`);
      console.log(`  🔗 ${parts.join(' ')} → .claude/settings.json`);
    } else {
      console.log('  ~ hooks & permissions already configured');
    }
  }

  if (platform === 'opencode') {
    // OpenCode: 原生插件系统（.opencode/plugins/*.ts），由 mergeDir 自动安装
    // 清理旧版 hooks.json（v3.16.1 之前的错误实现）
    const oldHookFile = resolve(target, '.opencode', 'hooks.json');
    if (existsSync(oldHookFile)) {
      try { unlinkSync(oldHookFile); console.log('  🧹 cleaned old .opencode/hooks.json (replaced by plugins)'); } catch {}
    }
    console.log('  🔌 plugins → .opencode/plugins/ (原生事件钩子)');
  }

  if (platform === 'codex') {
    const codexDir = isGlobal ? GLOBAL_ROOTS.codex : resolve(target, '.codex');
    if (!existsSync(codexDir)) mkdirSync(codexDir, { recursive: true });
    const hookFile = resolve(codexDir, 'hooks.json');
    writeFileSync(hookFile, JSON.stringify({ hooks: { PostToolUse: hookJson.PostToolUse } }, null, 2));
    console.log('  🔗 hooks → .codex/hooks.json');
  }
}

/**
 * 按各平台 MCP 规范安装配置：
 * - Claude: .mcp.json (type=stdio/http, key=mcpServers)
 * - OpenCode: opencode.json + .opencode/opencode.json (type=local/remote, key=mcp)
 * - Codex: .codex/config.toml (mcp_servers TOML table)
 */
function installMcp(platform, target, force) {
  const t = MCP_TEMPLATES[platform];
  if (!t) return;

  const src = resolve(TEMPLATES_DIR, t.tmpl);
  if (!existsSync(src)) return;

  const content = readFileSync(src, 'utf-8');

  if (platform === 'codex') {
    // Codex TOML: smart append — only add sections if not present
    const dest = target ? resolve(target, t.file) : mcpGlobalDest(platform);
    const dir = dirname(dest);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    if (!existsSync(dest)) {
      writeFileSync(dest, content);
      console.log(`  + ${t.file.padEnd(18)} → ${dest}`);
      return;
    }

    const existing = readFileSync(dest, 'utf-8');
    let updated = existing;
    let additions = 0;

    if (!existing.includes('[mcp_servers.playwright]')) {
      updated += '\n[mcp_servers.playwright]\ncommand = "npx"\nargs = ["-y", "@playwright/mcp@latest"]\nenabled = true\n';
      additions++;
    }
    if (!existing.includes('[mcp_servers.jarvis-engine]')) {
      updated += '\n[mcp_servers.jarvis-engine]\nurl = "http://localhost:3456/mcp"\nenabled = true\n';
      additions++;
    }

    if (additions > 0) {
      writeFileSync(dest, updated);
      console.log(`  ~ ${t.file.padEnd(18)} added ${additions} MCP server(s)`);
    } else {
      console.log(`  ~ ${t.file.padEnd(18)} already configured`);
    }
  } else if (platform === 'opencode') {
    // OpenCode JSON: 只写 .opencode/opencode.json（不写根目录避免混乱）
    const dest = target ? resolve(target, t.file) : mcpGlobalDest(platform);
    writeMcpJson(dest, content, force, t.file);
  } else {
    // Claude JSON: .mcp.json at project root — 深度合并所有 MCP server
    const dest = target ? resolve(target, t.file) : mcpGlobalDest(platform);
    const projectRoot = dirname(dest);
    if (!existsSync(projectRoot)) mkdirSync(projectRoot, { recursive: true });

    const nJson = JSON.parse(content);
    const nKey = nJson.mcpServers ? 'mcpServers' : 'mcp';
    const existingConfig = readMcpConfig(projectRoot);

    if (existingConfig && !force) {
      const eKey = existingConfig.mcpServers ? 'mcpServers' : 'mcp';
      const existingServers: Record<string, unknown> = (existingConfig as Record<string, unknown>)[eKey] as Record<string, unknown> || {};

      // 深度合并：新增、删除（白名单保护）、修改（按类型递归合并）
      const { merged, added, removed, updated } = mergeMcpServers(
        (nJson[nKey] || {}) as Record<string, unknown>,
        existingServers,
      );

      if (added > 0 || removed > 0 || updated > 0) {
        (existingConfig as Record<string, unknown>)[eKey] = merged;
        writeMcpConfig(projectRoot, existingConfig);
        const parts: string[] = [];
        if (added > 0) parts.push(`+${added}`);
        if (removed > 0) parts.push(`-${removed}`);
        if (updated > 0) parts.push(`~${updated}`);
        console.log(`  ~ ${t.file.padEnd(22)} MCP servers: ${parts.join(' ')}`);
      } else {
        console.log(`  ~ ${t.file.padEnd(22)} already configured`);
      }
    } else {
      // 新安装、force 覆盖、或原有文件 JSON 无效
      writeMcpConfig(projectRoot, nJson);
      console.log(`  + ${t.file.padEnd(22)} → ${dest}`);
    }
  }
}

/**
 * 写入 JSON MCP 配置文件并进行深度合并。
 * 新增、删除（白名单保护）、修改（按类型递归合并）全支持。
 *
 * @param dest 目标文件路径
 * @param content 模板文件内容（JSON 字符串）
 * @param force 是否强制覆盖
 * @param label 日志显示标签
 */
function writeMcpJson(dest: string, content: string, force: boolean, label: string): void {
  const dir = dirname(dest);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  if (existsSync(dest) && !force) {
    const existing = readFileSync(dest, 'utf-8');
    try {
      const eJson = JSON.parse(existing);
      const nJson = JSON.parse(content);
      const eKey = eJson.mcpServers ? 'mcpServers' : 'mcp';
      const nKey = nJson.mcpServers ? 'mcpServers' : 'mcp';

      const existingServers: Record<string, unknown> = eJson[eKey] || {};

      // 深度合并：新增、删除（白名单保护）、修改（按类型递归合并）
      const { merged, added, removed, updated } = mergeMcpServers(
        (nJson[nKey] || {}) as Record<string, unknown>,
        existingServers,
      );

      if (added > 0 || removed > 0 || updated > 0) {
        eJson[eKey] = merged;
        writeFileSync(dest, JSON.stringify(eJson, null, 2) + '\n');
        const parts: string[] = [];
        if (added > 0) parts.push(`+${added}`);
        if (removed > 0) parts.push(`-${removed}`);
        if (updated > 0) parts.push(`~${updated}`);
        console.log(`  ~ ${label.padEnd(22)} MCP servers: ${parts.join(' ')}`);
      } else {
        console.log(`  ~ ${label.padEnd(22)} already configured`);
      }
      return;
    } catch {
      // Invalid JSON — overwrite
    }
  }

  writeFileSync(dest, content);
  console.log(`  + ${label.padEnd(22)} → ${dest}`);
}

/** 计算文件 SHA256 hash */
function fileHash(filePath) {
  try { return createHash('sha256').update(readFileSync(filePath)).digest('hex'); }
  catch { return null; }
}

/**
 * 更新 Markdown 文件 frontmatter 中的指定字段。
 * 字段已存在则替换值，不存在则在闭合 --- 前插入。
 *
 * @param filePath 文件绝对路径
 * @param fields 要设置的字段键值对
 */
function setFrontmatterFields(filePath: string, fields: Record<string, string>): void {
  const content = readFileSync(filePath, 'utf-8');
  let lines = content.split('\n');

  if (lines[0]?.trim() !== '---') return; // 无 frontmatter，不处理

  let closingIdx = -1;
  for (let i = 1; i < Math.min(lines.length, FM_SEARCH_LIMIT); i++) {
    if (lines[i].trim() === '---') { closingIdx = i; break; }
  }
  if (closingIdx === -1) return;

  // 更新或插入字段
  for (const [key, value] of Object.entries(fields)) {
    let found = false;
    for (let i = 1; i < closingIdx; i++) {
      const line = lines[i].trim();
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0 && line.substring(0, colonIdx).trim() === key) {
        lines[i] = `${key}: "${value}"`;
        found = true;
        break;
      }
    }
    if (!found) {
      lines = [...lines.slice(0, closingIdx), `${key}: "${value}"`, ...lines.slice(closingIdx)];
      closingIdx++;
    }
  }

  writeFileSync(filePath, lines.join('\n'));
}

/**
 * 加载文件 hash 记录。
 * @param hashFilePath hash 文件绝对路径（由 getHashFilePath 生成）
 */
function loadHashes(hashFilePath) {
  try { return existsSync(hashFilePath) ? JSON.parse(readFileSync(hashFilePath, 'utf-8')) : {}; }
  catch { return {}; }
}

/**
 * 保存文件 hash 记录。
 * @param hashes 键值对（键为文件绝对路径，值为 SHA256 hash）
 * @param hashFilePath hash 文件绝对路径
 */
function saveHashes(hashes: Record<string, string>, hashFilePath: string) {
  const dir = dirname(hashFilePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  // 对 .md 文件自动转换为 section 级 hash 格式（_v: 2）
  const converted: Record<string, unknown> = {};
  for (const [filePath, value] of Object.entries(hashes)) {
    if (filePath.endsWith('.md') && existsSync(filePath)) {
      try {
        const sectionInfo = computeSectionHashes(filePath);
        converted[filePath] = {
          _v: 2,
          preamble: sectionInfo.preamble,
          sections: sectionInfo.sections,
        };
      } catch {
        // 计算 section hash 失败时回退到原始字符串 hash
        converted[filePath] = value;
      }
    } else {
      converted[filePath] = value;
    }
  }

  writeFileSync(hashFilePath, JSON.stringify(converted, null, 2));
}

/**
 * 提取 preamble 主体内容——frontmatter 之后、第一个 ## 标题之前的文本。
 */
function extractPreambleBody(content: string, frontmatterLineCount: number): string {
  const lines = content.split('\n');
  const bodyLines: string[] = [];
  for (let i = frontmatterLineCount; i < lines.length; i++) {
    if (lines[i].startsWith('## ') && lines[i].charAt(3) !== '#') break;
    bodyLines.push(lines[i]);
  }
  return bodyLines.join('\n');
}

/** 构建 section 冲突标记 */
function buildSectionConflictMarker(
  userContent: string,
  templateContent: string,
  userDate: string,
  templateVersion: string,
): string {
  return `<<<<<<< user (${userDate})
${userContent}
=======
${templateContent}
>>>>>>> template v${templateVersion}`;
}

/** 构建 preamble 冲突标记 */
function buildPreambleConflictMarker(
  userPreamble: string,
  templatePreamble: string,
  userDate: string,
  templateVersion: string,
): string {
  return `<<<<<<< user (${userDate})
${userPreamble}
=======
${templatePreamble}
>>>>>>> template v${templateVersion}`;
}

/**
 * 重建合并后的文件内容。
 * @param frontmatter 前端元数据键值对（不含 --- 分隔符）
 * @param preambleBody preamble 主体文本（已按合并规则选择正确版本）
 * @param sections section 内容列表（每个元素含 ## 标题行及内容，已含冲突标记）
 * @param hasFrontmatter 源文件是否有 frontmatter 块
 */
function buildMergedFile(
  frontmatter: Record<string, string>,
  preambleBody: string,
  sections: string[],
  hasFrontmatter: boolean,
): string {
  const parts: string[] = [];

  if (hasFrontmatter) {
    parts.push('---');
    for (const [key, value] of Object.entries(frontmatter)) {
      parts.push(`${key}: "${value}"`);
    }
    parts.push('---');
  }

  // preamble 主体可能以空行开头，保持原始格式
  if (preambleBody) {
    parts.push(preambleBody);
  }

  for (const section of sections) {
    parts.push(section);
  }

  return parts.join('\n');
}

/**
 * Section 级合并 Markdown 文件。
 * 比较源模板与已安装目标文件，依据旧 hash 记录决定每 section 合并策略。
 *
 * 三规则合并（旧记录为 _v: 2 section 格式时）：
 * 1. 源 section hash == 旧记录 section hash → 保留目标 section（源未变）
 * 2. 目标 section hash == 旧记录 section hash → 新源覆盖（用户未修改）
 * 3. 两者都变 → 写入冲突标记，用户内容在前
 *
 * 旧记录为字符串格式（旧版整文件 hash）时 fallback：
 *   - 逐 section 对比：相同保留，不同标冲突
 *
 * @param srcPath 新模板文件绝对路径
 * @param destPath 目标（已安装）文件绝对路径
 * @param oldHashRecord 旧的 hash 记录（loadHashes 返回值）
 * @returns 写入状态及冲突 section 标题列表
 */
function mergeMarkdownSections(
  srcPath: string,
  destPath: string,
  oldHashRecord: unknown,
): { written: boolean; conflicts: string[] } {
  const srcContent = readFileSync(srcPath, 'utf-8');
  const destContent = readFileSync(destPath, 'utf-8');

  // 若目标文件已含未解决冲突标记，跳过（避免嵌套标记）
  if (destContent.includes('<<<<<<< user')) {
    return { written: false, conflicts: [] };
  }

  const srcSplit = splitMarkdownSections(srcContent);
  const destSplit = splitMarkdownSections(destContent);

  const srcHashes = computeSectionHashes(srcPath);
  const destHashes = computeSectionHashes(destPath);

  const isV2 = isSectionHashRecord(oldHashRecord);
  const oldSectionHashes: Record<string, string> = isV2
    ? (oldHashRecord as { sections: Record<string, string> }).sections
    : {};

  const conflicts: string[] = [];
  let changed = false;

  // 冲突标记元数据
  const userDate = readFrontmatter(destPath).updated || new Date().toISOString().slice(0, 10);
  const templateVersion = readFrontmatter(srcPath).version || '0.0.0';

  // 构建目标 section 内容映射（title → content）
  const destSectionMap = new Map<string, string>();
  for (const s of destSplit.sections) {
    destSectionMap.set(s.title, s.content);
  }

  // ── 处理各 section ──
  const mergedSectionContents: string[] = [];
  const processedTitles = new Set<string>();

  for (const srcSection of srcSplit.sections) {
    const title = srcSection.title;
    processedTitles.add(title);

    const destSectionContent = destSectionMap.get(title);
    const destHash = destHashes.sections[title];
    const srcHash = srcHashes.sections[title];

    if (isV2) {
      const oldHash = oldSectionHashes[title];

      if (oldHash && srcHash === oldHash) {
        // 场景一：源 section 未变 → 保留目标 section
        if (destSectionContent) {
          mergedSectionContents.push(destSectionContent);
        } else {
          // 目标中不存在此 section（被用户删除）→ 用源覆盖
          mergedSectionContents.push(srcSection.content);
          changed = true;
        }
      } else if (!oldHash || (destSectionContent && destHash === oldHash)) {
        // 场景二：新 section 或用户未修改 → 用源覆盖
        mergedSectionContents.push(srcSection.content);
        changed = true;
      } else {
        // 场景三：用户改 + 源也变 → 冲突标记
        const userContent = destSectionContent || '';
        mergedSectionContents.push(
          buildSectionConflictMarker(userContent, srcSection.content, userDate, templateVersion),
        );
        conflicts.push(title);
        changed = true;
      }
    } else {
      // 旧字符串格式 fallback：逐 section 对比
      if (destSectionContent && destHash === srcHash) {
        mergedSectionContents.push(destSectionContent);
      } else if (!destSectionContent) {
        mergedSectionContents.push(srcSection.content);
        changed = true;
      } else {
        mergedSectionContents.push(
          buildSectionConflictMarker(destSectionContent, srcSection.content, userDate, templateVersion),
        );
        conflicts.push(title);
        changed = true;
      }
    }
  }

  // 追加 dest-only section（用户自创 section，不在源模板中）
  for (const destSection of destSplit.sections) {
    if (!processedTitles.has(destSection.title)) {
      mergedSectionContents.push(destSection.content);
    }
  }

  // ── 处理 preamble（frontmatter 之后、第一个 ## 之前的导言）──
  const srcPreambleBody = extractPreambleBody(srcContent, srcSplit.frontmatterLineCount);
  const destPreambleBody = extractPreambleBody(destContent, destSplit.frontmatterLineCount);
  const srcPreambleHash = srcHashes.preamble;
  const destPreambleHash = destHashes.preamble;

  let preambleToWrite: string;

  if (isV2) {
    const oldPreambleHash = (oldHashRecord as { preamble: string }).preamble;

    if (oldPreambleHash && srcPreambleHash === oldPreambleHash) {
      // 场景一：源 preamble 未变 → 保留目标
      preambleToWrite = destPreambleBody;
    } else if (!oldPreambleHash || destPreambleHash === oldPreambleHash) {
      // 场景二：新安装或目标未变 → 用源覆盖
      preambleToWrite = srcPreambleBody;
      if (srcPreambleBody !== destPreambleBody) changed = true;
    } else {
      // 场景三：冲突
      preambleToWrite = buildPreambleConflictMarker(
        destPreambleBody, srcPreambleBody, userDate, templateVersion,
      );
      conflicts.push('(preamble)');
      changed = true;
    }
  } else {
    // 旧格式：逐字节对比
    if (srcPreambleBody === destPreambleBody) {
      preambleToWrite = destPreambleBody;
    } else {
      preambleToWrite = buildPreambleConflictMarker(
        destPreambleBody, srcPreambleBody, userDate, templateVersion,
      );
      conflicts.push('(preamble)');
      changed = true;
    }
  }

  // ── 构建 frontmatter ──
  const srcFm = readFrontmatter(srcPath);
  const today = new Date().toISOString().slice(0, 10);
  const hasSrcFrontmatter = srcSplit.frontmatterLineCount > 0;

  // 使用源模板 frontmatter，updated 设为今天
  const mergedFrontmatter: Record<string, string> = {};
  for (const [key, value] of Object.entries(srcFm)) {
    if (value !== undefined) {
      mergedFrontmatter[key] = value;
    }
  }
  mergedFrontmatter.updated = today;

  // ── 生成最终文件 ──
  const output = buildMergedFile(
    mergedFrontmatter,
    preambleToWrite,
    mergedSectionContents,
    hasSrcFrontmatter,
  );

  if (changed) {
    writeFileSync(destPath, output);
  }

  return { written: changed, conflicts };
}

/**
 * 智能合并目录：
 * - 新文件 → 直接安装
 * - 源文件 hash vs 记录 hash → 相同跳过，不同比较目标 hash
 *   - 目标 hash == 旧源 hash → 用户未修改，安全覆盖
 *   - 目标 hash != 旧源 hash → 用户已修改，跳过
 *
 * @param src 源目录（模板文件）
 * @param dest 目标目录（安装位置）
 * @param hashFilePath hash 文件绝对路径
 */
function mergeDir(src, dest, hashFilePath) {
  let files = 0, dirs = 0, skipped = 0;
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });

  const hashes = loadHashes(hashFilePath);

  for (const entry of readdirSync(src)) {
    if (SKIP_FILES.has(entry)) continue;
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const sp = join(src, entry), dp = join(dest, entry);
    if (statSync(sp).isDirectory()) {
      const d = mergeDir(sp, dp, hashFilePath);
      files += d.files; dirs += d.dirs + 1; skipped += d.skipped;
    } else {
      const newHash = fileHash(sp);

      if (!existsSync(dp)) {
        // 新文件
        copyFileSync(sp, dp);
        hashes[dp] = newHash;
        files++;
      } else {
        const oldHash = hashes[dp];
        const destHash = fileHash(dp);

        if (newHash === oldHash) {
          // 源文件未变 → 跳过
          skipped++;
        } else if (!oldHash || destHash === oldHash) {
          // 新安装或用户未修改 → 安全覆盖
          copyFileSync(sp, dp);
          // 更新 frontmatter：version 取源模板值，updated 设为当前日期
          try {
            const srcFm = readFrontmatter(sp);
            const today = new Date().toISOString().slice(0, 10);
            setFrontmatterFields(dp, { version: srcFm.version ?? '0.0.0', updated: today });
          } catch { /* 更新 frontmatter 失败不阻塞安装流程 */ }
          // 以实际写入内容（含 frontmatter 更新）的 hash 为准
          hashes[dp] = fileHash(dp) || newHash;
          files++;
        } else {
          // 用户已修改目标文件
          if (entry.endsWith('.md')) {
            const result = mergeMarkdownSections(sp, dp, hashes[dp]);
            if (result.conflicts.length > 0) {
              console.warn(`  ⚠ ${entry}: ${result.conflicts.length} section conflict(s)，跳过`);
            } else if (result.written) {
              // 安全合并：更新 hash 为 section 格式
              try {
                const newSectionInfo = computeSectionHashes(dp);
                hashes[dp] = {
                  _v: 2,
                  preamble: newSectionInfo.preamble,
                  sections: newSectionInfo.sections,
                };
              } catch {
                hashes[dp] = fileHash(dp) || newHash;
              }
              files++;
            } else {
              skipped++;
            }
          } else {
            // 非 Markdown 文件：保持原有整文件跳过行为
            skipped++;
          }
        }
      }
    }
  }

  saveHashes(hashes, hashFilePath);
  return { files, dirs, skipped };
}

async function confirm(q) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => { rl.question(q, a => { rl.close(); res(a.toLowerCase() === 'y' || a.toLowerCase() === 'yes'); }); });
}
