import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { install, installRootFiles } from './install.js';
import { doctor } from './doctor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

const PKG_VERSION = JSON.parse(readFileSync(resolve(PKG_ROOT, 'package.json'), 'utf-8')).version;

const PLATFORMS = {
  claude:  { dir: '.claude',  desc: 'Claude Code — 47 agents + 15 commands + 27 skills' },
  opencode:{ dir: '.opencode',desc: 'OpenCode — 55 agents (智能体切换) + 27 skills' },
  codex:   { dir: '.codex',   desc: 'Codex — 45 agents + 42 skills (Skill触发)' },
};

const HELP = `
🧠 Jarvis Agent Factory v${PKG_VERSION}

Usage:
  jarvis init [path]                 初始化项目，安装全部三平台配置
  jarvis install <platform> [path]   安装指定平台配置到目标目录
  jarvis doctor [path]               检查已安装的配置版本和健康状态
  jarvis list                        列出可用平台

Platforms:
  claude     ${PLATFORMS.claude.desc}
  opencode   ${PLATFORMS.opencode.desc}
  codex      ${PLATFORMS.codex.desc}

Examples:
  jarvis init ./my-project           # 新项目安装全部配置
  jarvis install claude ./my-app     # 仅安装 Claude Code 配置
  jarvis install opencode            # 安装到当前目录
  jarvis doctor                      # 检查当前目录
  jarvis list                        # 列出可用平台
`;

function showHelp() { console.log(HELP); }

export function run() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    showHelp();
    return;
  }

  switch (cmd) {
    case 'init': {
      const target = resolve(args[1] || '.');
      console.log(`\n🚀 Initializing Jarvis Agent Factory v${PKG_VERSION}...\n`);
      for (const name of Object.keys(PLATFORMS)) {
        install({ platform: name, target, pkgRoot: PKG_ROOT, platforms: PLATFORMS });
      }
      installRootFiles({ target, pkgRoot: PKG_ROOT });
      console.log('\n✅ Done! Run `jarvis doctor` to verify.\n');
      break;
    }
    case 'install': {
      const platform = args[1];
      if (!platform || !PLATFORMS[platform]) {
        console.error(`\n❌ Unknown platform: ${platform}\n`);
        console.log(`Available: ${Object.keys(PLATFORMS).join(', ')}\n`);
        return;
      }
      const target = resolve(args[2] || '.');
      console.log(`\n📦 Installing ${platform} config...\n`);
      install({ platform, target, pkgRoot: PKG_ROOT, platforms: PLATFORMS });
      console.log(`\n✅ ${platform} installed to ${target}\n`);
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
