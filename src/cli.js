import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import { install } from './install.js';
import { doctor } from './doctor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');
const PKG = JSON.parse(readFileSync(resolve(PKG_ROOT, 'package.json'), 'utf-8'));
const PKG_VERSION = PKG.version;
const PKG_NAME = PKG.name;

const PLATFORMS = {
  claude:  { dir: '.claude',  desc: 'Claude Code — 47 agents + 15 commands + 27 skills' },
  opencode:{ dir: '.opencode',desc: 'OpenCode — 55 agents (智能体切换) + 27 skills' },
  codex:   { dir: '.codex',   desc: 'Codex — 45 agents + 42 skills (Skill触发)' },
};

const HELP = `
🧠 Jarvis Agent Factory v${PKG_VERSION}

Usage:
  jarvis init [path] [--yes|-y] [--global|-g]   初始化项目（含 Playwright MCP 配置）
  jarvis install <platform> [path] [--yes|-y] [--global|-g]  安装指定平台
  jarvis update [path] [--yes|-y]                更新已安装的平台配置
  jarvis doctor [path]                           健康检查
  jarvis version                                 查看版本 + 检查更新
  jarvis list                                    列出可用平台

Options:
  --yes, -y       跳过覆盖确认
  --global, -g    安装到用户全局目录（~/.claude/ etc）
  --help, -h      显示帮助

Platforms:
  claude     ${PLATFORMS.claude.desc}
  opencode   ${PLATFORMS.opencode.desc}
  codex      ${PLATFORMS.codex.desc}

Examples:
  jarvis init ./my-project         # 项目级安装（含 MCP）
  jarvis init --global -y          # 全局安装，跳过确认
  jarvis install claude --global   # 全局安装 Claude Code
  jarvis version                   # 查看版本
`;

function showHelp() { console.log(HELP); }

function parseFlags(args) {
  const flags = { yes: false, global: false };
  const cleaned = [];
  for (const a of args) {
    if (a === '--yes' || a === '-y') flags.yes = true;
    else if (a === '--global' || a === '-g') flags.global = true;
    else cleaned.push(a);
  }
  return { flags, args: cleaned };
}

function checkLatest() {
  try {
    return execSync(`npm view ${PKG_NAME} version`, {
      encoding: 'utf-8', timeout: 8000, stdio: ['ignore', 'pipe', 'ignore']
    }).trim() || null;
  } catch { return null; }
}

export async function run() {
  const rawArgs = process.argv.slice(2);
  const { flags, args } = parseFlags(rawArgs);
  const cmd = args[0];

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') { showHelp(); return; }

  switch (cmd) {
    case 'version':
    case '--version':
    case '-v': {
      console.log(`${PKG_NAME} v${PKG_VERSION}`);
      const latest = checkLatest();
      if (latest && latest !== PKG_VERSION) {
        console.log(`\n  ⚡ Update available: v${latest} (current: v${PKG_VERSION})`);
        console.log(`  Run: npm i -g ${PKG_NAME}@latest`);
      }
      break;
    }
    case 'update': {
      const latest = checkLatest();
      if (latest && latest !== PKG_VERSION) {
        console.log(`\n⬆️  CLI update: v${PKG_VERSION} → v${latest}`);
        console.log(`   Run: npm i -g ${PKG_NAME}@latest\n`);
      }
      const target = resolve(args[1] || '.');
      console.log(`🔄 Updating configs → ${target}\n`);
      for (const name of Object.keys(PLATFORMS)) {
        await install({ platform: name, target, pkgRoot: PKG_ROOT, platforms: PLATFORMS, force: flags.yes, global: flags.global });
      }
      console.log(`\n✅ Done!\n`);
      break;
    }
    case 'init': {
      const target = resolve(args[1] || '.');
      const scope = flags.global ? `~ (global)` : target;
      console.log(`\n🚀 Jarvis Agent Factory v${PKG_VERSION}\n`);
      console.log(`   Target: ${scope}\n`);
      for (const name of Object.keys(PLATFORMS)) {
        await install({ platform: name, target, pkgRoot: PKG_ROOT, platforms: PLATFORMS, force: flags.yes, global: flags.global });
      }
      console.log(`\n✅ Done! Run \`jarvis doctor\` to verify.\n`);
      break;
    }
    case 'install': {
      const platform = args[1];
      if (!platform || !PLATFORMS[platform]) {
        console.error(`\n❌ Unknown platform: ${platform || '(none)'}\n`);
        console.log(`Available: ${Object.keys(PLATFORMS).join(', ')}\n`);
        return;
      }
      const target = resolve(args[2] || '.');
      const scope = flags.global ? `~ (global)` : target;
      console.log(`\n📦 Installing ${platform} → ${scope}\n`);
      await install({ platform, target, pkgRoot: PKG_ROOT, platforms: PLATFORMS, force: flags.yes, global: flags.global });
      console.log(`\n✅ Done!\n`);
      break;
    }
    case 'doctor': {
      const target = resolve(args[1] || '.');
      doctor({ target, platforms: PLATFORMS, pkgRoot: PKG_ROOT });
      break;
    }
    case 'list': {
      console.log('\n📋 Available platforms:\n');
      for (const [name, info] of Object.entries(PLATFORMS)) {
        console.log(`  ${name.padEnd(10)} ${info.desc}`);
      }
      console.log('');
      break;
    }
    default: {
      console.error(`\n❌ Unknown command: ${cmd}\n`);
      showHelp();
    }
  }
}
