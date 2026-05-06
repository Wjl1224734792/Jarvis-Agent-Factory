import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
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
🧠 Jarvis Agent Factory v${PKG_VERSION} — 跨平台多智能体 AI 编程助手配置安装器

Usage:
  jarvis init [path] [--yes|-y]        初始化项目，安装全部三平台配置
  jarvis install <platform> [path]     安装指定平台配置到目标目录
  jarvis update [path]                 更新已安装的平台配置到最新版本
  jarvis doctor [path]                 检查已安装的配置版本和健康状态
  jarvis version                       显示当前版本
  jarvis list                          列出可用平台

Options:
  --yes, -y      跳过覆盖确认，直接覆盖
  --help, -h     显示帮助

Platforms:
  claude     ${PLATFORMS.claude.desc}
  opencode   ${PLATFORMS.opencode.desc}
  codex      ${PLATFORMS.codex.desc}

Examples:
  jarvis init ./my-project              # 新项目安装全部配置
  jarvis init -y                        # 当前目录，跳过确认
  jarvis install claude ./my-app        # 仅安装 Claude Code 配置
  jarvis update                         # 更新当前目录所有配置
  jarvis doctor                         # 检查当前目录
  jarvis version                        # 显示版本
  jarvis list                           # 列出可用平台
`;

function showHelp() { console.log(HELP); }

function parseFlags(args) {
  const flags = { yes: false };
  const cleaned = [];
  for (const a of args) {
    if (a === '--yes' || a === '-y') flags.yes = true;
    else cleaned.push(a);
  }
  return { flags, args: cleaned };
}

function checkLatest() {
  try {
    const result = execSync(`npm view ${PKG_NAME} version`, {
      encoding: 'utf-8', timeout: 8000, stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    return result || null;
  } catch { return null; }
}

export async function run() {
  const rawArgs = process.argv.slice(2);
  const { flags, args } = parseFlags(rawArgs);
  const cmd = args[0];

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    showHelp();
    return;
  }

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
      // Check for CLI self-update first
      const latest = checkLatest();
      if (latest && latest !== PKG_VERSION) {
        console.log(`\n⬆️  CLI update: v${PKG_VERSION} → v${latest}`);
        console.log(`   Run: npm i -g ${PKG_NAME}@latest\n`);
      }

      // Update platform configs in target directory
      const target = resolve(args[1] || '.');
      console.log(`🔄 Updating platform configs → ${target}\n`);
      for (const name of Object.keys(PLATFORMS)) {
        await install({ platform: name, target, pkgRoot: PKG_ROOT, platforms: PLATFORMS, force: flags.yes });
      }
      console.log(`\n✅ Update complete! Run \`jarvis doctor\` to verify.\n`);
      break;
    }
    case 'init': {
      const target = resolve(args[1] || '.');
      console.log(`\n🚀 Jarvis Agent Factory v${PKG_VERSION}\n`);
      console.log(`   Target: ${target}\n`);
      for (const name of Object.keys(PLATFORMS)) {
        await install({ platform: name, target, pkgRoot: PKG_ROOT, platforms: PLATFORMS, force: flags.yes });
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
      console.log(`\n📦 Installing ${platform} → ${target}\n`);
      await install({ platform, target, pkgRoot: PKG_ROOT, platforms: PLATFORMS, force: flags.yes });
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
