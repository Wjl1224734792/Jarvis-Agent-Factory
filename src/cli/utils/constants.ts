import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';

/**
 * 向上查找 package.json 确定真正的 PKG_ROOT。
 * 兼容从源码运行（tsx）和从编译产物运行（dist）两种场景。
 */
const __dirname = dirname(fileURLToPath(import.meta.url));

function findPkgRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    try {
      const pkg = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf-8'));
      // 真正的项目根有 .git/ 目录；dist/ 下的 package.json 副本没有
      if (pkg.name === 'jarvis-agent-factory' && existsSync(resolve(dir, '.git'))) {
        return dir;
      }
    } catch { /* continue */ }
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  // 回退：从 __dirname 向上 4 级（dist 场景下的绝对路径兜底）
  return resolve(__dirname, '..', '..', '..', '..');
}

export const PKG_ROOT = findPkgRoot(__dirname);

const PKG = JSON.parse(readFileSync(resolve(PKG_ROOT, 'package.json'), 'utf-8'));
export const PKG_VERSION: string = PKG.version;
export const PKG_NAME: string = PKG.name;

/**
 * 支持的平台定义
 * key: 命令行中使用的平台简称
 * dir: 项目内安装的目标子目录名
 * desc: 平台描述
 */
export const PLATFORMS: Record<string, { dir: string; desc: string }> = {
  claude:   { dir: '.claude',  desc: 'Claude Code — 72 agents + 35 commands + 35 skills' },
  opencode: { dir: '.opencode', desc: 'OpenCode — 55 agents + 27 skills (agent switching)' },
  codex:    { dir: '.codex',   desc: 'Codex — 45 agents + 42 skills (skill-triggered)' },
};

export const ALL_PLATFORMS = Object.keys(PLATFORMS);

/**
 * 帮助文本：每次 CLI 运行时动态生成，包含当前版本号
 */
export function getHelpText(): string {
  return `🧠 Jarvis Agent Factory v${PKG_VERSION}

  Bootstrap multi-agent AI coding assistant configs
  for Claude Code (主力维护). OpenCode/Codex 配置保留但已冻结不更新.

Usage:
  jarvis [path]                      ≡ jarvis init [path]
  jarvis init [path]                 Bootstrap project with all platforms + MCP
  jarvis add <p...> [path]           Add platform(s) to project
  jarvis remove [p...] [path]        Fine-grained remove (hash-aware, only jarvis-installed files)
  jarvis upgrade [path]              Upgrade to latest config version
  jarvis diff [path]                 Show what files would change on upgrade
  jarvis engine start [--port=N]     Start MCP orchestration engine
  jarvis engine stop                 Stop engine
  jarvis engine status               Engine status
  jarvis web [--port=N]              Start web dashboard (≡ engine start)
  jarvis hook <subcommand>           Engine hook integration (gate-check/gate-advance/status/report-status/agent-config)
  jarvis doctor [path]               Verify installation
  jarvis resolve [path]              Resolve jarvis paths and configuration

Options:
  -g, --global    Target user global directory instead of project
  -y, --yes       Skip confirmation prompts
  -h, --help      Show this help
  -v, --version   Show version

Remove flags:
  --dry-run       Preview what would be removed (no changes made)
  --list          List all jarvis-tracked files
  --engine        Also clean .jarvis/ engine data (DB + artifacts + archives)
  --force         Skip confirmation prompt (required with --engine)
  --global        Clean user global ~ directory configs

Platforms:
  claude     ${PLATFORMS.claude.desc}
  opencode   ${PLATFORMS.opencode.desc} (⛔ 已冻结)
  codex      ${PLATFORMS.codex.desc} (⛔ 已冻结)

Examples:
  jarvis                              Bootstrap current directory
  jarvis init my-app                  Bootstrap new project
  jarvis add claude                   Add Claude Code to current directory
  jarvis add claude -g                Add Claude Code globally
  jarvis remove claude                Fine-grained remove configs only
  jarvis remove claude --dry-run      Preview what would be removed
  jarvis remove claude --list         List jarvis-tracked files
  jarvis remove claude --engine --force   Remove configs + engine data
  jarvis remove claude -g --engine --force  Remove global configs + engine data
  jarvis engine start                 Start MCP orchestration engine
  jarvis web                          Start web dashboard (≡ engine start)
  jarvis upgrade                      Upgrade all configs
  jarvis doctor                       Check current directory
  jarvis hook gate-check write_code   Check if write_code is allowed at current gate
`;
}

/**
 * 全局安装根目录映射
 */
export const GLOBAL_ROOTS: Record<string, string> = {
  claude:   resolve(homedir(), '.claude'),
  opencode: resolve(homedir(), '.config', 'opencode'),
  codex:    resolve(homedir(), '.codex'),
};
