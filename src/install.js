import { resolve, join, relative, dirname } from 'node:path';
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync } from 'node:fs';

/**
 * Copy a platform config directory from the package to the target.
 * Strategy: directory-level overwrite — new files added, existing files overwritten.
 * Skips settings.local.json and other sensitive files that shouldn't be distributed.
 */
export function install({ platform, target, pkgRoot, platforms }) {
  const info = platforms[platform];
  const srcDir = resolve(pkgRoot, info.dir);
  const destDir = resolve(target, info.dir);

  if (!existsSync(srcDir)) {
    console.error(`  ⚠ Source not found: ${srcDir}`);
    return;
  }

  const stats = copyDir(srcDir, destDir, platform);
  console.log(`  ${platform.padEnd(10)} → ${destDir}  (${stats.files} files, ${stats.dirs} dirs${stats.skipped > 0 ? `, ${stats.skipped} skipped` : ''})`);
}

/**
 * Copy CLAUDE.md and AGENTS.md to target if they don't exist.
 */
export function installRootFiles({ target, pkgRoot }) {
  const files = ['CLAUDE.md', 'AGENTS.md'];
  for (const f of files) {
    const src = resolve(pkgRoot, f);
    const dest = resolve(target, f);
    if (existsSync(src)) {
      if (!existsSync(dest)) {
        copyFileSync(src, dest);
        console.log(`  root       → ${dest} (new)`);
      } else {
        console.log(`  root       → ${dest} (exists, skipped — use --force to overwrite)`);
      }
    }
  }
}

function copyDir(src, dest, label) {
  let files = 0;
  let dirs = 0;
  let skipped = 0;

  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);

    // Skip package-internal and sensitive files
    if (entry === 'node_modules' || entry === '.git') continue;
    if (entry === 'settings.local.json') continue;
    if (entry.startsWith('.') && entry !== '.claude' && entry !== '.opencode' && entry !== '.codex' && entry !== '.mcp.json') {
      // Keep .mcp.json and platform dirs, skip other dotfiles
      if (!entry.startsWith('.claude') && !entry.startsWith('.opencode') && !entry.startsWith('.codex')) continue;
    }

    if (statSync(srcPath).isDirectory()) {
      const d = copyDir(srcPath, destPath, label);
      files += d.files;
      dirs += d.dirs + 1;
      skipped += d.skipped;
    } else {
      copyFileSync(srcPath, destPath);
      files++;
    }
  }

  return { files, dirs, skipped };
}
