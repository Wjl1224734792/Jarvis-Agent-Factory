import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import {
  scanDirectory, flattenTree, generateAll, generateAllParallel, generateAllSmart,
  writeDocs, generateIncremental, generateIncrementalParallel, validateHierarchy,
  scanDirectories, loadManifest, saveManifest, computeDiff, changedPaths,
} from '../../deepinit/index.js';
import type { CliOpts } from '../utils/args.js';

export async function execute(opts: CliOpts, positional: string[]): Promise<void> {
  const target = resolve(positional[1] || process.cwd());
  const force = opts.yes || false;
  const smart = opts.smart || false;
  const parallel = opts.parallel !== false; // Default: parallel on
  const jobs = typeof opts.jobs === 'number' ? opts.jobs : 0; // 0 = unlimited

  if (!existsSync(target)) {
    console.error(`\n❌  Target directory does not exist: ${target}`);
    process.exit(1);
  }

  const manifestPath = join(target, '.omc', 'deepinit-manifest.json');
  const prevManifest = loadManifest(manifestPath);
  const isFirstRun = !prevManifest;

  console.log(`\n🔍 Scanning project tree: ${target}`);
  const modeTags: string[] = [];
  if (smart) modeTags.push('smart dispatch');
  if (parallel && !smart) modeTags.push('parallel');
  if (!parallel && !smart) modeTags.push('sequential');
  if (isFirstRun) {
    console.log(`   (first run — full generation, ${modeTags.join(' + ')})\n`);
  } else {
    console.log(`   (incremental — manifest from ${prevManifest!.generatedAt}, ${modeTags.join(' + ')})\n`);
  }

  // 1. Scan directory tree
  const root = scanDirectory(target);
  if (!root) {
    console.error('❌  No files found in target directory.');
    process.exit(1);
  }
  const flat = flattenTree(root);

  // 2. Scan manifest-structured directories for diff
  const dirs = scanDirectories(target);
  const diff = computeDiff(prevManifest?.directories ?? null, dirs);
  const changed = new Set(changedPaths(diff));

  // 3. Generate (full or incremental, smart/parallel/sequential)
  let results;
  if (isFirstRun || force) {
    if (smart) {
      results = generateAllSmart(flat, target);
    } else if (parallel) {
      results = generateAllParallel(flat, target, jobs);
    } else {
      results = generateAll(flat, target);
    }
  } else {
    if (parallel) {
      results = generateIncrementalParallel(flat, changed, target, jobs);
    } else {
      results = generateIncremental(flat, changed, target);
    }
  }

  if (results.length === 0 && !isFirstRun) {
    console.log('   No directories changed since last run.');
    console.log(`\n✅ DeepInit complete (nothing to update).\n`);
    return;
  }

  // 4. Write
  const stats = writeDocs(results, { force });

  // 5. Validate
  const allDirs = flat.map(e => e.absPath);
  const validation = validateHierarchy(target, allDirs.map(d => {
    const rel = d.replace(target, '').replace(/^[/\\]/, '');
    return rel || '.';
  }));

  // 6. Save manifest for next run
  saveManifest(manifestPath, dirs);

  // 7. Report
  const dirCount = Object.keys(dirs).length;
  const changedCount = diff.summary.added + diff.summary.modified + diff.summary.deleted;
  console.log(`   Written:  ${stats.written} AGENTS.md${stats.skipped > 0 ? ` (${stats.skipped} skipped)` : ''}`);
  console.log(`   Manifest: ${dirCount} directories tracked`);
  console.log(`   Diff:     +${diff.summary.added} ~${diff.summary.modified} -${diff.summary.deleted} =${diff.summary.unchanged} unchanged (${changedCount} affected)`);
  if (smart) {
    console.log(`   Mode:     smart dispatch (deep file analysis + project type detection)`);
  } else if (parallel) {
    console.log(`   Mode:     parallel (by-depth grouping${jobs > 0 ? `, ${jobs} jobs` : ''})`);
  }
  if (!validation.valid) {
    console.log(`   ⚠  Validation: ${validation.issues.length} issues found`);
    for (const issue of validation.issues.slice(0, 5)) {
      console.log(`     - ${issue}`);
    }
  }
  console.log(`\n✅ DeepInit complete.\n`);
}
