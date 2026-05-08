import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';

/**
 * Check the health of installed Jarvis configurations.
 */
export function doctor({ target, platforms, pkgRoot, ..._rest }) {
  console.log(`\n🔍 Jarvis Doctor — checking ${target}\n`);

  // Read source package version
  let version = '?.?.?';
  try {
    version = JSON.parse(readFileSync(resolve(pkgRoot, 'package.json'), 'utf-8')).version;
  } catch {}

  console.log(`  CLI version: ${version}\n`);

  let allOk = true;

  for (const [name, info] of Object.entries(platforms)) {
    const dir = resolve(target, info.dir);
    const exists = existsSync(dir);

    if (!exists) {
      console.log(`  ❌ ${name.padEnd(10)} not installed (missing ${info.dir}/)`);
      allOk = false;
      continue;
    }

    const agentsDir = join(dir, 'agents');
    const skillsDir = join(dir, 'skills');
    const commandsDir = join(dir, 'commands');

    const agentCount = existsSync(agentsDir) ? readdirSync(agentsDir).filter(f => f.endsWith('.md') || f.endsWith('.toml')).length : 0;
    const skillCount = existsSync(skillsDir) ? readdirSync(skillsDir).filter(f => statSync(join(skillsDir, f)).isDirectory()).length : 0;
    const cmdCount = existsSync(commandsDir) ? readdirSync(commandsDir).filter(f => f.endsWith('.md')).length : 0;

    const expected = getExpected(name);
    let status = '✅';
    if (agentCount < expected.agents * 0.8) { status = '⚠️'; allOk = false; }
    if (skillCount < expected.skills * 0.8) { status = '⚠️'; allOk = false; }

    console.log(`  ${status} ${name.padEnd(10)} ${agentCount} agents, ${cmdCount} commands, ${skillCount} skills`);
  }

  // Check root files
  for (const f of ['CLAUDE.md', 'AGENTS.md']) {
    const p = resolve(target, f);
    if (existsSync(p)) {
      console.log(`  ✅ ${f.padEnd(12)} present`);
    }
  }

  console.log('');
  // Check engine status (sync — check PID file)
  const pidFile = resolve(homedir(), '.jarvis', 'engine.pid');
  let engineRunning = false;
  if (existsSync(pidFile)) {
    try { const pid = Number(readFileSync(pidFile, 'utf-8').trim()); process.kill(pid, 0); engineRunning = true; } catch {}
  }
  if (!engineRunning) {
    console.log('\n  ⚠️  Engine not running. Gate enforcement is INACTIVE.');
    console.log('  Start it: jarvis engine start [--dashboard]\n');
    allOk = false;
  }

  if (allOk) {
    console.log('  ✅ All platforms OK, engine running\n');
  } else {
    if (!engineRunning) console.log('  ⚠️  Start the engine to enable gate enforcement.\n');
    else console.log('  ⚠️  Some platforms need attention. Run `jarvis add <platform>` to fix.\n');
  }
}

function getExpected(name) {
  switch (name) {
    case 'claude':   return { agents: 47, commands: 15, skills: 27 };
    case 'opencode': return { agents: 55, commands: 0, skills: 27 };
    case 'codex':    return { agents: 45, commands: 0, skills: 42 };
    default:         return { agents: 40, commands: 0, skills: 27 };
  }
}
