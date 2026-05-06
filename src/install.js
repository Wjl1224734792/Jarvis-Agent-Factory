import { resolve, join, basename } from 'node:path';
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

// Only these subdirectories are installed — everything else in the platform dir is left untouched
const INSTALL_BUCKETS = ['agents', 'commands', 'skills'];

const SKIP_FILES = new Set([
  'settings.json',
  'settings.local.json',
  'node_modules',
  '.git',
]);

/**
 * Install platform config: only agents/ commands/ skills/ subdirectories.
 * File-level merge: new files added, same-name overwritten, extra files in target preserved.
 */
export async function install({ platform, target, pkgRoot, platforms, force }) {
  const info = platforms[platform];
  const srcRoot = resolve(pkgRoot, info.dir);
  const destRoot = resolve(target, info.dir);

  if (!existsSync(srcRoot)) {
    console.error(`  ⚠  Source not found: ${srcRoot}`);
    return;
  }

  const destExists = existsSync(destRoot);

  // Only confirm if target already has this platform
  if (destExists && !force) {
    const ok = await confirm(`  📁 ${info.dir}/ exists, merge agents/skills/commands? [y/N] `);
    if (!ok) {
      console.log(`  ⏭  Skipped ${platform}`);
      return;
    }
  }

  // Ensure platform root exists
  if (!destExists) {
    mkdirSync(destRoot, { recursive: true });
  }

  let totalFiles = 0;
  let totalDirs = 0;

  for (const bucket of INSTALL_BUCKETS) {
    const srcDir = join(srcRoot, bucket);
    const destDir = join(destRoot, bucket);

    if (!existsSync(srcDir)) continue;

    const stats = mergeDir(srcDir, destDir);
    totalFiles += stats.files;
    totalDirs += stats.dirs;

    const existed = existsSync(destDir) && stats.files > 0;
    const tag = existed ? '~' : '+';
    console.log(`  ${tag} ${info.dir}/${bucket.padEnd(8)} → ${stats.files} files`);
  }

  const status = destExists ? 'updated' : 'installed';
  console.log(`  ✅ ${platform.padEnd(10)} ${status} (${totalFiles} files total)`);
}

/**
 * Merge files from src into dest.
 * - New files: added
 * - Same-name files: overwritten
 * - Extra files in dest: PRESERVED
 */
function mergeDir(src, dest) {
  let files = 0;
  let dirs = 0;

  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  for (const entry of readdirSync(src)) {
    if (SKIP_FILES.has(entry)) continue;
    if (entry.startsWith('.') || entry === 'node_modules') continue;

    const srcPath = join(src, entry);
    const destPath = join(dest, entry);

    if (statSync(srcPath).isDirectory()) {
      const d = mergeDir(srcPath, destPath);
      files += d.files;
      dirs += d.dirs + 1;
    } else {
      copyFileSync(srcPath, destPath);
      files++;
    }
  }

  return { files, dirs };
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
