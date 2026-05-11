import { fileURLToPath } from 'node:url';
import { resolve, join, dirname } from 'node:path';
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';

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

  let totalFiles = 0;
  for (const bucket of INSTALL_BUCKETS) {
    const srcDir = join(srcRoot, bucket);
    const destDir = join(destRoot, bucket);
    if (!existsSync(srcDir)) continue;
    const stats = mergeDir(srcDir, destDir);
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
    // Claude Code: hooks 配置在 .claude/settings.json，脚本在 .claude/hooks/scripts/
    const claudeDir = isGlobal ? GLOBAL_ROOTS.claude : resolve(target, '.claude');
    if (!existsSync(claudeDir)) mkdirSync(claudeDir, { recursive: true });

    // 安装 agent-event hook 脚本到简化路径
    const scriptsDir = resolve(claudeDir, 'hooks', 'scripts');
    if (!existsSync(scriptsDir)) mkdirSync(scriptsDir, { recursive: true });
    for (const script of ['agent-event.sh', 'agent-event.ps1']) {
      const src = resolve(TEMPLATES_DIR, 'scripts', script);
      const dst = resolve(scriptsDir, script);
      if (existsSync(src) && !existsSync(dst)) {
        try { copyFileSync(src, dst); } catch {}
      }
    }

    const file = resolve(claudeDir, 'settings.json');
    let existing: Record<string, any> = {};
    if (existsSync(file)) { try { existing = JSON.parse(readFileSync(file, 'utf-8')); } catch {} }
    if (!existing.hooks) { existing.hooks = hookJson; writeFileSync(file, JSON.stringify(existing, null, 2)); console.log('  🔗 hooks → .claude/settings.json'); }
    else console.log('  ~ hooks already configured');
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
    // Codex: hooks in .codex/hooks.json
    const codexDir = isGlobal ? GLOBAL_ROOTS.codex : resolve(target, '.codex');
    if (!existsSync(codexDir)) mkdirSync(codexDir, { recursive: true });
    const hookFile = resolve(codexDir, 'hooks.json');
    if (!existsSync(hookFile)) {
      writeFileSync(hookFile, JSON.stringify({ hooks: { PostToolUse: hookJson.PostToolUse } }, null, 2));
      console.log('  🔗 hooks → .codex/hooks.json');
    } else console.log('  ~ hooks already configured');
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
    // Claude JSON: .mcp.json at project root
    const dest = target ? resolve(target, t.file) : mcpGlobalDest(platform);
    writeMcpJson(dest, content, force, t.file);
  }
}

/** Write JSON MCP config; skip if exists and !force */
function writeMcpJson(dest, content, force, label) {
  const dir = dirname(dest);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  if (existsSync(dest) && !force) {
    // Check if content is different
    const existing = readFileSync(dest, 'utf-8');
    try {
      const eJson = JSON.parse(existing);
      const nJson = JSON.parse(content);
      const eKey = eJson.mcpServers ? 'mcpServers' : 'mcp';
      const nKey = nJson.mcpServers ? 'mcpServers' : 'mcp';

      // Check if jarvis-engine already exists in existing config
      if (eJson[eKey] && eJson[eKey]['jarvis-engine']) {
        console.log(`  ~ ${label.padEnd(22)} already configured`);
        return;
      }
      // Merge: add jarvis-engine to existing
      if (!eJson[eKey]) eJson[eKey] = {};
      eJson[eKey]['jarvis-engine'] = nJson[nKey]['jarvis-engine'];
      writeFileSync(dest, JSON.stringify(eJson, null, 2) + '\n');
      console.log(`  ~ ${label.padEnd(22)} merged jarvis-engine`);
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

/** 加载/保存文件 hash 记录，统一存储在 ~/.jarvis/file-hashes.json */
function loadHashes() {
  const f = resolve(homedir(), '.jarvis', 'file-hashes.json');
  try { return existsSync(f) ? JSON.parse(readFileSync(f, 'utf-8')) : {}; }
  catch { return {}; }
}
function saveHashes(hashes) {
  const dir = resolve(homedir(), '.jarvis');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'file-hashes.json'), JSON.stringify(hashes, null, 2));
}

/**
 * 智能合并目录：
 * - 新文件 → 直接安装
 * - 源文件 hash vs 记录 hash → 相同跳过，不同比较目标 hash
 *   - 目标 hash == 旧源 hash → 用户未修改，安全覆盖
 *   - 目标 hash != 旧源 hash → 用户已修改，跳过
 */
function mergeDir(src, dest) {
  let files = 0, dirs = 0, skipped = 0;
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });

  const hashes = loadHashes();

  for (const entry of readdirSync(src)) {
    if (SKIP_FILES.has(entry)) continue;
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const sp = join(src, entry), dp = join(dest, entry);
    if (statSync(sp).isDirectory()) {
      const d = mergeDir(sp, dp);
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

  saveHashes(hashes);
  return { files, dirs, skipped };
}

async function confirm(q) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => { rl.question(q, a => { rl.close(); res(a.toLowerCase() === 'y' || a.toLowerCase() === 'yes'); }); });
}
