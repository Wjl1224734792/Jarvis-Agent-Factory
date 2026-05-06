import { resolve, join, dirname } from 'node:path';
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';

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
  const srcRoot = resolve(pkgRoot, info.dir);
  const destRoot = isGlobal ? globalTarget(platform) : resolve(target, info.dir);

  if (!existsSync(srcRoot)) {
    console.error(`  ⚠  Source not found: ${srcRoot}`);
    return;
  }

  const destExists = existsSync(destRoot);
  if (destExists && !force) {
    const scope = isGlobal ? 'global' : info.dir;
    const ok = await confirm(`  📁 ${scope}/ exists, merge agents/skills/commands? [y/N] `);
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
    console.log(`  ${tag} ${(isGlobal ? '~/' + info.dir : info.dir) + '/' + bucket.padEnd(8)} → ${stats.files} files`);
  }

  // Install MCP config
  installMcp(platform, isGlobal ? null : target, force);

  const status = destExists ? 'updated' : 'installed';
  const label = isGlobal ? `~/${info.dir}` : destRoot;
  console.log(`  ✅ ${platform.padEnd(10)} ${status} → ${label} (${totalFiles} files total)`);
}

function installMcp(platform, target, force) {
  const t = MCP_TEMPLATES[platform];
  if (!t) return;

  const src = resolve(dirname(fileURLToPath(import.meta.url)), 'templates', t.tmpl);
  if (!existsSync(src)) return;

  const dest = target ? resolve(target, t.file) : mcpGlobalDest(platform);

  if (t.append) {
    // Codex: append to existing config.toml
    const dir = dirname(dest);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    if (!existsSync(dest)) {
      copyFileSync(src, dest);
      console.log(`  + ${t.file.padEnd(18)} → ${dest}`);
      return;
    }

    const content = readFileSync(src, 'utf-8');
    const existing = readFileSync(dest, 'utf-8');
    if (existing.includes('[mcp_servers.playwright]')) {
      console.log(`  ~ ${t.file.padEnd(18)} playwright already configured`);
    } else {
      appendFileSync(dest, '\n' + content);
      console.log(`  ~ ${t.file.padEnd(18)} appended playwright MCP section`);
    }
  } else {
    // Claude/OpenCode: write standalone config
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

function fileURLToPath(url) { return url.replace('file:///', '').replace(/^\/(\w:)/, '$1/'); }

function mergeDir(src, dest) {
  let files = 0, dirs = 0;
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    if (SKIP_FILES.has(entry)) continue;
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const sp = join(src, entry), dp = join(dest, entry);
    if (statSync(sp).isDirectory()) { const d = mergeDir(sp, dp); files += d.files; dirs += d.dirs + 1; }
    else { copyFileSync(sp, dp); files++; }
  }
  return { files, dirs };
}

async function confirm(q) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => { rl.question(q, a => { rl.close(); res(a.toLowerCase() === 'y' || a.toLowerCase() === 'yes'); }); });
}
