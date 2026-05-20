import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import {
  scanDirectory, flattenTree, generateAll, writeDocs,
  generateIncremental, validateHierarchy,
  scanDirectories, loadManifest, saveManifest, computeDiff, changedPaths,
} from '../../deepinit/index.js';
import type { CliOpts } from '../utils/args.js';

export async function execute(opts: CliOpts, positional: string[]): Promise<void> {
  const target = resolve(positional[1] || process.cwd());
  const force = opts.yes || false;

  if (!existsSync(target)) {
    console.error(`\n❌  Target directory does not exist: ${target}`);
    process.exit(1);
  }

  const manifestPath = join(target, '.omc', 'deepinit-manifest.json');
  const prevManifest = loadManifest(manifestPath);
  const isFirstRun = !prevManifest;

  console.log(`\n🔍 Scanning project tree: ${target}`);
  if (isFirstRun) {
    console.log('   (first run — full generation)\n');
  } else {
    console.log(`   (incremental — manifest from ${prevManifest!.generatedAt})\n`);
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

  // 3. Generate (full or incremental)
  const results = isFirstRun || force
    ? generateAll(flat, target)
    : generateIncremental(flat, changed, target);

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
    // Convert absPath back to relative for validation
    const rel = d.replace(target, '').replace(/^[/\\]/, '');
    return rel || '.';
  }));

  // 6. Save manifest for next run
  saveManifest(manifestPath, dirs);

  // 7. Report
  console.log(`   Written:  ${stats.written} AGENTS.md${stats.skipped > 0 ? ` (${stats.skipped} skipped)` : ''}`);
  console.log(`   Manifest: ${Object.keys(dirs).length} directories tracked`);
  if (!validation.valid) {
    console.log(`   ⚠  Validation: ${validation.issues.length} issues found`);
    for (const issue of validation.issues.slice(0, 5)) {
      console.log(`     - ${issue}`);
    }
  }
  console.log(`\n✅ DeepInit complete.\n`);
}
