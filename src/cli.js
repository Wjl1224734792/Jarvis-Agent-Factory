import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { install } from './install.js';
import { doctor } from './doctor.js';
import { startEngine, stopEngine, engineStatus } from './engine/server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');
const PKG = JSON.parse(readFileSync(resolve(PKG_ROOT, 'package.json'), 'utf-8'));
const PKG_VERSION = PKG.version;
const PKG_NAME = PKG.name;

const PLATFORMS = {
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
  jarvis engine start [--dashboard] [--port=N]  Start MCP orchestration server
  jarvis engine stop                              Stop engine
  jarvis engine status                            Engine status
  jarvis doctor [path]                            Verify installation

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
  jarvis upgrade                  Upgrade all configs
  jarvis doctor                   Check current directory
`;

function showHelp() { console.log(HELP); }

function parseArgs(raw) {
  const opts = { yes: false, global: false };
  const positional = [];
  for (const a of raw) {
    if (a === '-y' || a === '--yes') opts.yes = true;
    else if (a === '-g' || a === '--global') opts.global = true;
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
    const scope = opts.global ? '~ (global)' : target;
    console.log(`\n🚀 Jarvis v${PKG_VERSION}\n`);
    console.log(`   Target: ${scope}\n`);
    for (const name of ALL_PLATFORMS) {
      await install({ platform: name, target, pkgRoot: PKG_ROOT, platforms: PLATFORMS, force: opts.yes, global: opts.global });
    }
    console.log(`\n✅ Done! \`jarvis doctor\` to verify.\n`);
    return;
  }

  switch (cmd) {
    case 'init': {
      const path = positional[1];
      const target = resolveTarget(path, opts.global);
      const scope = opts.global ? '~ (global)' : target;
      console.log(`\n🚀 Jarvis v${PKG_VERSION}\n`);
      console.log(`   Target: ${scope}\n`);
      for (const name of ALL_PLATFORMS) {
        await install({ platform: name, target, pkgRoot: PKG_ROOT, platforms: PLATFORMS, force: opts.yes, global: opts.global });
      }
      console.log(`\n✅ Done!\n`);
      break;
    }

    case 'add': {
      const platforms = [];
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
      const target = resolveTarget(path, opts.global);
      const scope = opts.global ? '~ (global)' : target;
      console.log(`\n📦 Adding to ${scope}\n`);
      for (const name of platforms) {
        await install({ platform: name, target, pkgRoot: PKG_ROOT, platforms: PLATFORMS, force: opts.yes, global: opts.global });
      }
      console.log(`\n✅ Done!\n`);
      break;
    }

    case 'remove':
    case 'rm': {
      const platforms = [];
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
      const target = resolveTarget(path, opts.global);
      const scope = opts.global ? '~ (global)' : target;
      for (const name of platforms) {
        const dir = opts.global ? (GLOBAL_ROOTS[name]) : resolve(target, PLATFORMS[name].dir);
        if (existsSync(dir)) {
          if (!opts.yes) {
            const ok = await confirm(`  Remove ${dir}? [y/N] `);
            if (!ok) { console.log(`  ⏭  Skipped ${name}`); continue; }
          }
          rmSync(dir, { recursive: true, force: true });
          console.log(`  - ${PLATFORMS[name].dir.padEnd(10)} removed`);
          // Also remove MCP config
          removeMcp(name, target, opts.global);
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
      const target = resolveTarget(path, opts.global);
      const scope = opts.global ? '~ (global)' : target;
      console.log(`🔄 Upgrading → ${scope}\n`);
      for (const name of ALL_PLATFORMS) {
        const dir = opts.global ? GLOBAL_ROOTS[name] : resolve(target, PLATFORMS[name].dir);
        if (existsSync(dir)) {
          await install({ platform: name, target, pkgRoot: PKG_ROOT, platforms: PLATFORMS, force: opts.yes, global: opts.global });
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
        const port = parseInt(positional.find(a => a.startsWith('--port='))?.split('=')[1] || '3456');
        const dashboard = positional.includes('--dashboard') || positional.includes('-d');
        await startEngine({ port, dashboard, projectRoot: positional.find(a => !a.startsWith('-') && a !== 'start' && a !== 'engine') || '.' });
      } else if (sub === 'stop') {
        stopEngine();
      } else if (sub === 'status') {
        engineStatus();
      } else {
        console.log('\nUsage: jarvis engine <start|stop|status> [--dashboard] [--port=<N>]\n');
      }
      break;
    }
    case 'doctor':
    case 'check': {
      const path = positional[1];
      const target = resolveTarget(path, opts.global);
      doctor({ target, platforms: PLATFORMS, pkgRoot: PKG_ROOT, global: opts.global });
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

async function confirm(q) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => { rl.question(q, a => { rl.close(); res(a.toLowerCase() === 'y' || a.toLowerCase() === 'yes'); }); });
}
