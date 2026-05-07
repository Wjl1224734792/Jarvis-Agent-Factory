import { fileURLToPath } from 'node:url';
import { resolve, join, dirname } from 'node:path';
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = resolve(__dirname, 'templates');

const INSTALL_BUCKETS = ['agents', 'commands', 'skills'];
const SKIP_FILES = new Set(['settings.json', 'settings.local.json', 'node_modules', '.git']);

const MCP_TEMPLATES = {
  claude:   { file: '.mcp.json',        tmpl: 'mcp-claude.json' },
  opencode: { file: 'opencode.json',    tmpl: 'mcp-opencode.json' },
  codex:    { file: '.codex/config.toml', tmpl: 'mcp-codex.toml', append: true },
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
  const info = MCP_TEMPLATES[platform];
  if (platform === 'codex') return resolve(homedir(), '.codex', 'config.toml');
  return resolve(globalTarget(platform), info.file);
}

export async function install({ platform, target, pkgRoot, platforms, force, global: isGlobal }) {
  const info = platforms[platform];
  const srcRoot = resolve(pkgRoot, 'src', 'templates', 'platforms', platform);
  const destRoot = isGlobal ? globalTarget(platform) : resolve(target, info.dir);

  if (!existsSync(srcRoot)) {
    console.error(`  ⚠  Source not found: ${srcRoot}`);
    return;
  }

  const destExists = existsSync(destRoot);
  if (destExists && !force) {
    const scope = isGlobal ? 'global' : platform;
    const ok = await confirm(`  📁 ${info.dir}/ exists, merge agents/skills/commands? [y/N] `);
    if (!ok) { console.log(`  ⏭  Skipped ${platform}`); return; }
  }

  if (!destExists) mkdirSync(destRoot, { recursive: true });

  let totalFiles = 0, totalSkipped = 0;
  const hashRoot = isGlobal ? globalTarget(platform) : destRoot;
  for (const bucket of INSTALL_BUCKETS) {
    const srcDir = join(srcRoot, bucket);
    const destDir = join(destRoot, bucket);
    if (!existsSync(srcDir)) continue;
    const stats = mergeDir(srcDir, destDir, hashRoot);
    totalFiles += stats.files;
    totalSkipped += stats.skipped;
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
    PostToolUse: [{ matcher: 'Agent', hooks: [{ type: 'command', command: 'jarvis hook gate-check' }] }],
    Stop: [{ hooks: [{ type: 'command', command: 'jarvis hook status' }] }],
  };

  if (platform === 'claude' || platform === 'opencode') {
    // Both Claude Code and OpenCode read hooks from .claude/settings.json
    const claudeDir = resolve(target, '.claude');
    if (!existsSync(claudeDir)) mkdirSync(claudeDir, { recursive: true });
    const file = resolve(claudeDir, 'settings.json');
    let existing = {};
    if (existsSync(file)) { try { existing = JSON.parse(readFileSync(file, 'utf-8')); } catch {} }
    if (!existing.hooks) { existing.hooks = hookJson; writeFileSync(file, JSON.stringify(existing, null, 2)); console.log('  🔗 hooks → .claude/settings.json'); }
    else console.log('  ~ hooks already configured');
  }

  if (platform === 'codex') {
    // Codex hooks go into .codex/hooks.json (separate file, cleaner than config.toml merge)
    const hookFile = resolve(target, '.codex', 'hooks.json');
    if (!existsSync(hookFile)) {
      writeFileSync(hookFile, JSON.stringify({ hooks: { PostToolUse: hookJson.PostToolUse } }, null, 2));
      console.log('  🔗 hooks → .codex/hooks.json');
    } else console.log('  ~ hooks already configured');
  }
}

function installMcp(platform, target, force) {
  const t = MCP_TEMPLATES[platform];
  if (!t) return;

  const src = resolve(TEMPLATES_DIR, t.tmpl);
  if (!existsSync(src)) return;

  const dest = target ? resolve(target, t.file) : mcpGlobalDest(platform);
  const content = readFileSync(src, 'utf-8');

  if (t.append) {
    // Codex: append to existing config.toml
    const dir = dirname(dest);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    if (!existsSync(dest)) {
      copyFileSync(src, dest);
      console.log(`  + ${t.file.padEnd(18)} → ${dest}`);
      return;
    }

    const existing = readFileSync(dest, 'utf-8');
    if (existing.includes('[mcp_servers.jarvis-engine]')) {
      console.log(`  ~ ${t.file.padEnd(18)} jarvis-engine already configured`);
    } else {
      appendFileSync(dest, '\n[mcp_servers.jarvis-engine]\nurl = "http://localhost:3456/mcp"\n');
      console.log(`  ~ ${t.file.padEnd(18)} appended jarvis-engine MCP`);
    }
  } else if (platform === 'opencode') {
    // OpenCode: write to BOTH root opencode.json AND .opencode/opencode.json
    const dir = dirname(dest);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeIfChanged(dest, content, force, t.file);

    // Also write to .opencode/opencode.json (OpenCode alt location)
    const altDest = target ? resolve(target, '.opencode', 'opencode.json') : resolve(globalTarget(platform), 'opencode.json');
    const altDir = dirname(altDest);
    if (!existsSync(altDir)) mkdirSync(altDir, { recursive: true });
    writeIfChanged(altDest, content, force, '.opencode/opencode.json');
  } else {
    // Claude: write standalone config
    if (existsSync(dest) && !force) {
      console.log(`  ⏭  ${t.file.padEnd(18)} exists, skipped (use --yes to overwrite)`);
      return;
    }
    const dir = dirname(dest);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    copyFileSync(src, dest);
    console.log(`  + ${t.file.padEnd(18)} → ${dest}`);
  }
}

/** Write to dest only if content differs (or force=true) */
function writeIfChanged(dest, content, force, label) {
  if (existsSync(dest) && !force) {
    const existing = readFileSync(dest, 'utf-8');
    if (existing === content) { console.log(`  ~ ${label.padEnd(18)} already up to date`); return; }
  }
  writeFileSync(dest, content);
  console.log(`  + ${label.padEnd(18)} → ${dest}`);
}

/** 计算文件 SHA256 hash */
function fileHash(filePath) {
  try { return createHash('sha256').update(readFileSync(filePath)).digest('hex'); }
  catch { return null; }
}

/** 加载/保存文件 hash 记录 */
function loadHashes(root) {
  const f = join(root, '.jarvis', 'file-hashes.json');
  try { return existsSync(f) ? JSON.parse(readFileSync(f, 'utf-8')) : {}; }
  catch { return {}; }
}
function saveHashes(root, hashes) {
  const dir = join(root, '.jarvis');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'file-hashes.json'), JSON.stringify(hashes, null, 2));
}

/**
 * 智能合并目录：
 * - 新文件 → 直接安装
 * - 源文件 hash vs 记录 hash → 相同跳过，不同比较目标 hash
 *   - 目标 hash == 旧源 hash → 用户未修改，安全覆盖
 *   - 目标 hash != 旧源 hash → 用户已修改，跳过
 */
function mergeDir(src, dest, root) {
  let files = 0, dirs = 0, skipped = 0;
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });

  const hashes = root ? loadHashes(root) : {};

  for (const entry of readdirSync(src)) {
    if (SKIP_FILES.has(entry)) continue;
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const sp = join(src, entry), dp = join(dest, entry);
    if (statSync(sp).isDirectory()) {
      const d = mergeDir(sp, dp, root);
      files += d.files; dirs += d.dirs + 1; skipped += d.skipped;
    } else {
      const relPath = dp.replace(dest, '').replace(/\\/g, '/');
      const newHash = fileHash(sp);

      if (!existsSync(dp)) {
        // 新文件
        copyFileSync(sp, dp);
        hashes[relPath] = newHash;
        files++;
      } else {
        const oldHash = hashes[relPath];
        const destHash = fileHash(dp);

        if (newHash === oldHash) {
          // 源文件未变 → 跳过
          skipped++;
        } else if (!oldHash || destHash === oldHash) {
          // 新安装或用户未修改 → 安全覆盖
          copyFileSync(sp, dp);
          hashes[relPath] = newHash;
          files++;
        } else {
          // 用户已修改目标文件 → 保留
          skipped++;
        }
      }
    }
  }

  if (root) saveHashes(root, hashes);
  return { files, dirs, skipped };
}

async function confirm(q) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => { rl.question(q, a => { rl.close(); res(a.toLowerCase() === 'y' || a.toLowerCase() === 'yes'); }); });
}
