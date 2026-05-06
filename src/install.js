import { resolve, join } from 'node:path';
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const SKIP_FILES = new Set([
  'settings.json',
  'settings.local.json',
  'node_modules',
  '.git',
]);

/**
 * Copy a platform config directory from the package to the target.
 * Strategy: new files added, existing files overwritten (after confirmation).
 * Skips sensitive files.
 */
export async function install({ platform, target, pkgRoot, platforms, force }) {
  const info = platforms[platform];
  const srcDir = resolve(pkgRoot, info.dir);
  const destDir = resolve(target, info.dir);

  if (!existsSync(srcDir)) {
    console.error(`  ⚠  Source not found: ${srcDir}`);
    return;
  }

  // Check if target already has this platform
  const destExists = existsSync(destDir);
  if (destExists && !force) {
    const ok = await confirm(`  📁 ${info.dir}/ already exists. Overwrite? [y/N] `);
    if (!ok) {
      console.log(`  ⏭  Skipped ${platform} (directory exists)`);
      return;
    }
  }

  const stats = copyDir(srcDir, destDir);
  const status = destExists ? 'updated' : 'installed';
  console.log(`  ✅ ${platform.padEnd(10)} ${status} → ${destDir}  (${stats.files} files, ${stats.dirs} dirs${stats.skipped > 0 ? `, ${stats.skipped} skipped` : ''})`);
}

function copyDir(src, dest) {
  let files = 0;
  let dirs = 0;
  let skipped = 0;

  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  for (const entry of readdirSync(src)) {
    if (SKIP_FILES.has(entry)) continue;
    // Skip hidden files except platform dirs and .mcp.json
    if (entry.startsWith('.')) {
      if (entry !== '.mcp.json' &&
          !entry.startsWith('.claude') &&
          !entry.startsWith('.opencode') &&
          !entry.startsWith('.codex')) continue;
    }

    const srcPath = join(src, entry);
    const destPath = join(dest, entry);

    if (statSync(srcPath).isDirectory()) {
      const d = copyDir(srcPath, destPath);
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

async function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}
