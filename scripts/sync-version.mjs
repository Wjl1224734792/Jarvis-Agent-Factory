import { readFileSync, writeFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
const version = pkg.version; // e.g. "4.7.21"
const v = `v${version}`;     // e.g. "v4.7.21"

// Files and their version patterns to replace
const targets = [
  {
    path: 'QUICKSTART.md',
    pattern: /v4\.\d+\.\d+/g,
    replacement: v,
  },
  {
    path: 'web/public/guide.html',
    pattern: /v4\.\d+\.\d+/g,
    replacement: v,
  },
  {
    path: 'src/templates/platforms/claude/skills/concurrency-policy/SKILL.md',
    pattern: /version:\s*"[^"]*"/,
    replacement: `version: "${version}"`,
  },
];

let changed = 0;
for (const { path, pattern, replacement } of targets) {
  const old = readFileSync(path, 'utf-8');
  const updated = old.replace(pattern, replacement);
  if (updated !== old) {
    writeFileSync(path, updated);
    console.log(`  ✓ ${path}`);
    changed++;
  } else {
    console.log(`  - ${path} (no change)`);
  }
}

console.log(`\nSynced ${changed} file(s) → ${v}`);
