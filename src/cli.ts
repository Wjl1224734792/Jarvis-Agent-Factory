import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { install } from './install.js';
import { doctor } from './doctor.js';
import { startEngine, stopEngine, engineStatus, startWeb } from './engine/server.js';
import { hookCommand } from './hook.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..', '..');
const PKG = JSON.parse(readFileSync(resolve(PKG_ROOT, 'package.json'), 'utf-8'));
const PKG_VERSION = PKG.version;
const PKG_NAME = PKG.name;

const PLATFORMS: Record<string, { dir: string; desc: string }> = {
  claude:   { dir: '.claude',  desc: 'Claude Code — 47 agents + 15 commands + 27 skills' },
  opencode: { dir: '.opencode', desc: 'OpenCode — 55 agents + 27 skills (agent switching)' },
  codex:    { dir: '.codex',   desc: 'Codex — 45 agents + 42 skills (skill-triggered)' },
};

const ALL_PLATFORMS = Object.keys(PLATFORMS);

const HELP = `🧠 Jarvis Agent Factory v${PKG_VERSION}

  Bootstrap multi-agent AI coding assistant configs
  for Claude Code, OpenCode, and Codex.

Usage:
  jarvis [path]                  ≡ jarvis init [path]
  jarvis init [path]             Bootstrap project with all platforms + MCP
  jarvis add <p...> [path]       Add platform(s) to project
  jarvis remove <p...> [path]    Remove platform(s) from project
  jarvis upgrade [path]          Upgrade to latest config version
  jarvis diff [path]             Show what files would change on upgrade
  jarvis engine start [--port=N] Start MCP orchestration engine
  jarvis engine stop             Stop engine
  jarvis engine status           Engine status
  jarvis web [--port=N]          Start web dashboard (requires engine)
  jarvis doctor [path]           Verify installation

Options:
  -g, --global    Target user global directory instead of project
  -y, --yes       Skip confirmation prompts
  -h, --help      Show this help
  -v, --version   Show version

Platforms:
  claude     ${PLATFORMS.claude.desc}
  opencode   ${PLATFORMS.opencode.desc}
  codex      ${PLATFORMS.codex.desc}

Examples:
  jarvis                          Bootstrap current directory
  jarvis init my-app              Bootstrap new project
  jarvis add claude opencode      Add platforms to current directory
  jarvis add claude -g            Add Claude Code globally
  jarvis remove codex             Remove Codex from project
  jarvis engine start             Start MCP orchestration engine
  jarvis web                      Start web dashboard
  jarvis upgrade                  Upgrade all configs
  jarvis doctor                   Check current directory
`;

function showHelp() { console.log(HELP); }

function parseArgs(raw: string[]) {
  const opts: Record<string, boolean> = { yes: false, global: false, globalExplicit: false };
  const positional: string[] = [];
  for (const a of raw) {
    if (a === '-y' || a === '--yes') opts.yes = true;
    else if (a === '-g' || a === '--global') { opts.global = true; opts.globalExplicit = true; }
    else if (a === '-h' || a === '--help') { opts.help = true; return { opts, positional }; }
    else if (a === '-v' || a === '--version') { opts.version = true; return { opts, positional }; }
    else positional.push(a);
  }
  return { opts, positional };
}

function checkLatest() {
  try {
    return execSync(`npm view ${PKG_NAME} version`, {
      encoding: 'utf-8', timeout: 8000, stdio: ['ignore', 'pipe', 'ignore']
    }).trim() || null;
  } catch { return null; }
}

function resolveTarget(path, isGlobal) {
  return isGlobal ? resolve('.') : resolve(path || '.');
}

export async function run() {
  const { opts, positional } = parseArgs(process.argv.slice(2));

  if (opts.help) { showHelp(); return; }
  if (opts.version) {
    console.log(`${PKG_NAME} v${PKG_VERSION}`);
    const latest = checkLatest();
    if (latest && latest !== PKG_VERSION) {
      console.log(`\n  Update available: v${latest} → npm i -g ${PKG_NAME}@latest`);
    }
    return;
  }

  const cmd = positional[0];

  // jarvis (no args) ≡ jarvis init .
  if (!cmd) {
    const target = resolve('.');
    const isGlobal = await resolveScope(opts);
    const scope = isGlobal ? '~ (全局)' : target;
    console.log(`\n🚀 Jarvis v${PKG_VERSION}\n`);
    console.log(`   Target: ${scope}\n`);
    for (const name of ALL_PLATFORMS) {
      await install({ platform: name, target, pkgRoot: PKG_ROOT, platforms: PLATFORMS, force: opts.yes, global: isGlobal });
    }
    console.log(`\n✅ Done! \`jarvis doctor\` to verify.\n`);
    return;
  }

  switch (cmd) {
    case 'init': {
      const path = positional[1];
      const isGlobal = await resolveScope(opts);
      const target = resolveTarget(path, isGlobal);
      const scope = isGlobal ? '~ (全局)' : target;
      console.log(`\n🚀 Jarvis v${PKG_VERSION}\n`);
      console.log(`   Target: ${scope}\n`);
      for (const name of ALL_PLATFORMS) {
        await install({ platform: name, target, pkgRoot: PKG_ROOT, platforms: PLATFORMS, force: opts.yes, global: isGlobal });
      }
      console.log(`\n✅ Done!\n`);
      break;
    }

    case 'add': {
      const platforms: string[] = [];
      let path = '.';
      for (let i = 1; i < positional.length; i++) {
        const p = positional[i];
        if (PLATFORMS[p]) platforms.push(p);
        else if (!p.startsWith('-')) path = p;
      }
      if (platforms.length === 0) {
        console.error('\n❌  No valid platform specified.\n');
        console.log(`Valid platforms: ${ALL_PLATFORMS.join(', ')}\n`);
        return;
      }
      const isGlobal = await resolveScope(opts);
      const target = resolveTarget(path, isGlobal);
      const scope = isGlobal ? '~ (全局)' : target;
      console.log(`\n📦 Adding to ${scope}\n`);
      for (const name of platforms) {
        await install({ platform: name, target, pkgRoot: PKG_ROOT, platforms: PLATFORMS, force: opts.yes, global: isGlobal });
      }
      console.log(`\n✅ Done!\n`);
      break;
    }

    case 'remove':
    case 'rm': {
      const platforms: string[] = [];
      let path = '.';
      for (let i = 1; i < positional.length; i++) {
        const p = positional[i];
        if (PLATFORMS[p]) platforms.push(p);
        else if (!p.startsWith('-')) path = p;
      }
      if (platforms.length === 0) {
        console.error('\n❌  No valid platform specified.\n');
        console.log(`Valid platforms: ${ALL_PLATFORMS.join(', ')}\n`);
        return;
      }
      const isGlobal = await resolveScope(opts);
      const target = resolveTarget(path, isGlobal);
      const scope = isGlobal ? '~ (全局)' : target;
      for (const name of platforms) {
        const dir = isGlobal ? (GLOBAL_ROOTS[name]) : resolve(target, PLATFORMS[name].dir);
        if (existsSync(dir)) {
          if (!opts.yes) {
            const ok = await confirm(`  Remove ${dir}? [y/N] `);
            if (!ok) { console.log(`  ⏭  Skipped ${name}`); continue; }
          }
          rmSync(dir, { recursive: true, force: true });
          console.log(`  - ${PLATFORMS[name].dir.padEnd(10)} removed`);
          // Also remove MCP config
          removeMcp(name, target, isGlobal);
        } else {
          console.log(`  ⏭  ${PLATFORMS[name].dir.padEnd(10)} not found`);
        }
      }
      console.log(`\n✅ Done!\n`);
      break;
    }

    case 'upgrade':
    case 'update': {
      // Check CLI self-upgrade
      const latest = checkLatest();
      if (latest && latest !== PKG_VERSION) {
        console.log(`\n⬆️  CLI: v${PKG_VERSION} → v${latest}`);
        console.log(`   npm i -g ${PKG_NAME}@latest\n`);
      }
      const path = positional[1];
      const isGlobal = await resolveScope(opts);
      const target = resolveTarget(path, isGlobal);
      const scope = isGlobal ? '~ (全局)' : target;
      console.log(`🔄 Upgrading → ${scope}\n`);
      for (const name of ALL_PLATFORMS) {
        const dir = isGlobal ? GLOBAL_ROOTS[name] : resolve(target, PLATFORMS[name].dir);
        if (existsSync(dir)) {
          await install({ platform: name, target, pkgRoot: PKG_ROOT, platforms: PLATFORMS, force: opts.yes, global: isGlobal });
        } else {
          console.log(`  ⏭  ${PLATFORMS[name].dir} not installed, skipped`);
        }
      }
      console.log(`\n✅ Done!\n`);
      break;
    }

    case 'engine': {
      const sub = positional[1];
      if (sub === 'start') {
        const port = parseInt(positional.find(a => a.startsWith('--port='))?.split('=')[1] || process.env.PORT || '3456');
        const stdio = positional.includes('--stdio');
        await startEngine({ port, stdio, projectRoot: positional.find(a => !a.startsWith('-') && a !== 'start' && a !== 'engine' && a !== '--stdio') || '.' });
      } else if (sub === 'stop') {
        stopEngine();
      } else if (sub === 'status') {
        engineStatus();
      } else {
        console.log('\nUsage: jarvis engine <start|stop|status> [--port=<N>]\n');
      }
      break;
    }
    case 'web': {
      const port = parseInt(positional.find(a => a.startsWith('--port='))?.split('=')[1] || process.env.WEB_PORT || '3457');
      await startWeb({ port });
      break;
    }
    case 'hook': {
      await hookCommand(positional.slice(1));
      break;
    }
    case 'diff': {
      const path = positional[1];
      const isGlobal = await resolveScope(opts);
      const target = resolveTarget(path, isGlobal);
      console.log(`\n📋 检查变更预览 → ${isGlobal ? '~ (全局)' : target}\n`);
      for (const name of ALL_PLATFORMS) {
        await diffPlatform(name, target, isGlobal);
      }
      console.log(`\n💡 运行 \`jarvis upgrade\` 应用这些变更。\n`);
      break;
    }
    case 'doctor':
    case 'check': {
      const path = positional[1];
      const isGlobal = await resolveScope(opts);
      const target = resolveTarget(path, isGlobal);
      doctor({ target, platforms: PLATFORMS, pkgRoot: PKG_ROOT, global: isGlobal });
      break;
    }

    default: {
      console.error(`\n❌  Unknown command: ${cmd}\n`);
      showHelp();
    }
  }
}

const GLOBAL_ROOTS = {
  claude:   resolve(homedir(), '.claude'),
  opencode: resolve(homedir(), '.config', 'opencode'),
  codex:    resolve(homedir(), '.codex'),
};

function removeMcp(platform, target, isGlobal) {
  const files = {
    claude:   '.mcp.json',
    opencode: 'opencode.json',
    codex:    '.codex/config.toml',
  };
  const f = files[platform];
  if (!f) return;
  const dest = isGlobal ? resolve(homedir(), f) : resolve(target, f);
  if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
    console.log(`  - ${f.padEnd(18)} removed`);
  }
}

async function diffPlatform(platform, target, isGlobal) {
  const { join } = await import('node:path');
  const { existsSync, readdirSync, statSync, readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const srcRoot = resolve(PKG_ROOT, 'src', 'templates', 'platforms', platform);
  const destRoot = isGlobal
    ? (platform === 'opencode' ? resolve(homedir(), '.config', 'opencode') : resolve(homedir(), `.${platform}`))
    : resolve(target, PLATFORMS[platform].dir);
  if (!existsSync(srcRoot)) return;

  const hashFile = join((isGlobal ? destRoot : target), '.jarvis', 'file-hashes.json');
  const hashes = existsSync(hashFile) ? JSON.parse(readFileSync(hashFile, 'utf-8')) : {};
  const hash = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');

  let changed = 0;
  for (const bucket of ['agents', 'commands', 'skills']) {
    const sd = join(srcRoot, bucket), dd = join(destRoot, bucket);
    if (!existsSync(sd) || !existsSync(dd)) continue;
    for (const entry of readdirSync(sd)) {
      const sp = join(sd, entry), dp = join(dd, entry);
      if (statSync(sp).isDirectory()) continue;
      const rel = `${bucket}/${entry}`;
      const newHash = hash(sp);
      if (!existsSync(dp)) { if (changed < 20) console.log(`  + ${rel.padEnd(30)} (new)`); changed++; continue; }
      const oldHash = hashes[`/${rel}`] || hashes[rel];
      if (newHash !== oldHash) {
        if (changed < 20) {
          const destHash = hash(dp);
          const status = (!oldHash || destHash === oldHash) ? 'update' : 'skip (modified by user)';
          console.log(`  ~ ${rel.padEnd(30)} ${status}`);
        }
        changed++;
      }
    }
  }
  if (changed === 0) console.log(`  ✅ ${platform.padEnd(10)} up to date`);
  else if (changed > 20) console.log(`  ... and ${changed - 20} more files`);
}

async function confirm(q) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => { rl.question(q, a => { rl.close(); res(a.toLowerCase() === 'y' || a.toLowerCase() === 'yes'); }); });
}

async function question(q) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => { rl.question(q, a => { rl.close(); res(a.trim()); }); });
}

/** 当用户未通过 -g 显式指定安装范围时，交互式选择全局 / 项目级别 */
async function promptScope() {
  console.log('\n📋 请选择安装范围:');
  console.log('  [1] 项目级别 — 安装到当前项目目录（推荐）');
  console.log('  [2] 全局级别 — 安装到用户目录，所有项目共享');
  const answer = await question('  请输入 1 或 2（默认: 1）: ');
  return answer === '2';
}

/** 解析安装范围：显式 -g 用全局，否则交互提示 */
async function resolveScope(opts) {
  if (opts.globalExplicit) return opts.global;
  return promptScope();
}
