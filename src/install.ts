import { fileURLToPath } from 'node:url';
import { resolve, join, dirname } from 'node:path';
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';
import { getHashFilePath } from './hash-paths.js';
import { readMcpConfig, writeMcpConfig } from './shared/mcp-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = resolve(__dirname, 'templates');

const INSTALL_BUCKETS = ['agents', 'commands', 'skills', 'plugins'];
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
  installHooks(platform, target, isGlobal);

  const status = destExists ? 'updated' : 'installed';
  const label = isGlobal ? `~/${info.dir}` : destRoot;
  console.log(`  ✅ ${platform.padEnd(10)} ${status} → ${label} (${totalFiles} files total)`);
}

function installHooks(platform, target, isGlobal) {
  // ============================================================
  // 单一 hooks 配置源：settings.json
  // 不再使用 plugin 系统 —— hooks 覆盖全部需求：
  //   PostToolUse(Agent)        → gate-check
  //   PostToolUse(Write/Edit)   → gate-check --operation write_code
  //   SubagentStart/Stop        → agent-event 上报
  //   Stop                      → status
  // ============================================================
  const hookJson = {
    PostToolUse: [
      { matcher: 'Agent', hooks: [{ type: 'command', command: 'jarvis hook gate-check' }] },
      { matcher: 'Write', hooks: [{ type: 'command', command: 'jarvis hook gate-check --operation write_code' }] },
      { matcher: 'Edit', hooks: [{ type: 'command', command: 'jarvis hook gate-check --operation write_code' }] },
    ],
    SubagentStart: [{ hooks: [{ type: 'command', command: '.claude/hooks/scripts/agent-event.sh', env: { HOOK_EVENT_TYPE: 'start' } }] }],
    SubagentStop: [{ hooks: [{ type: 'command', command: '.claude/hooks/scripts/agent-event.sh', env: { HOOK_EVENT_TYPE: 'stop' } }] }],
    Stop: [{ hooks: [{ type: 'command', command: 'jarvis hook status' }] }],
  };

  if (platform === 'claude') {
    const claudeDir = isGlobal ? GLOBAL_ROOTS.claude : resolve(target, '.claude');
    if (!existsSync(claudeDir)) mkdirSync(claudeDir, { recursive: true });

    // 安装 agent-event 脚本
    const scriptsDir = resolve(claudeDir, 'hooks', 'scripts');
    if (!existsSync(scriptsDir)) mkdirSync(scriptsDir, { recursive: true });
    for (const script of ['agent-event.sh', 'agent-event.ps1']) {
      const src = resolve(TEMPLATES_DIR, 'scripts', script);
      if (existsSync(src)) {
        const dst = resolve(scriptsDir, script);
        if (!existsSync(dst) || fileHash(src) !== fileHash(dst)) {
          copyFileSync(src, dst);
        }
      }
    }

    const file = resolve(claudeDir, 'settings.json');
    let existing: Record<string, any> = {};
    if (existsSync(file)) { try { existing = JSON.parse(readFileSync(file, 'utf-8')); } catch {} }
    const snapshot = JSON.stringify(existing); // 变更前快照

    // 合并 permissions.allow —— 从模板读取，与现有列表去重合并（只新增不删除）
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

    // 合并 hooks —— 保留用户自定义，补充系统必需的
    let hookMerged = 0;
    if (!existing.hooks) {
      existing.hooks = hookJson;
      hookMerged = Object.keys(hookJson).length;
    } else {
      for (const [key, val] of Object.entries(hookJson)) {
        if (!existing.hooks[key]) { existing.hooks[key] = val; hookMerged++; }
      }
    }

    // 单次写入：只有当实际有变更时才写文件
    if (JSON.stringify(existing) !== snapshot) {
      writeFileSync(file, JSON.stringify(existing, null, 2));
      const parts: string[] = [];
      if (permAdded > 0) parts.push(`${permAdded} permissions`);
      if (hookMerged > 0) parts.push(`${hookMerged} hooks keys`);
      console.log(`  🔗 ${parts.join(' + ')} → .claude/settings.json`);
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
      const existingServers: Record<string, any> = (existingConfig as any)[eKey] || {};

      // 深度合并：已有 server 保留用户配置，缺失的从模板添加，用户自定义的绝不删除
      let added = 0;
      for (const [serverName, serverConfig] of Object.entries(nJson[nKey] || {})) {
        if (!existingServers[serverName]) {
          existingServers[serverName] = serverConfig;
          added++;
        }
      }

      if (added > 0) {
        (existingConfig as any)[eKey] = existingServers;
        writeMcpConfig(projectRoot, existingConfig);
        console.log(`  ~ ${t.file.padEnd(22)} merged ${added} new MCP server(s)`);
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

/** Write JSON MCP config; deep merge — add missing servers, keep existing user configs */
function writeMcpJson(dest, content, force, label) {
  const dir = dirname(dest);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  if (existsSync(dest) && !force) {
    const existing = readFileSync(dest, 'utf-8');
    try {
      const eJson = JSON.parse(existing);
      const nJson = JSON.parse(content);
      const eKey = eJson.mcpServers ? 'mcpServers' : 'mcp';
      const nKey = nJson.mcpServers ? 'mcpServers' : 'mcp';

      // 深度合并：逐个 server 检查，缺失则添加，已有则保留用户配置，用户自定义的绝不删除
      const existingServers: Record<string, any> = eJson[eKey] || {};
      let added = 0;
      for (const [serverName, serverConfig] of Object.entries(nJson[nKey] || {})) {
        if (!existingServers[serverName]) {
          existingServers[serverName] = serverConfig;
          added++;
        }
      }

      if (added > 0) {
        eJson[eKey] = existingServers;
        writeFileSync(dest, JSON.stringify(eJson, null, 2) + '\n');
        console.log(`  ~ ${label.padEnd(22)} merged ${added} new MCP server(s)`);
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
function saveHashes(hashes, hashFilePath) {
  const dir = dirname(hashFilePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(hashFilePath, JSON.stringify(hashes, null, 2));
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
          hashes[dp] = newHash;
          files++;
        } else {
          // 用户已修改目标文件 → 保留
          skipped++;
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
