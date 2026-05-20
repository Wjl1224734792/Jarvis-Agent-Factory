import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { scanDirectory, flattenTree, generateAll, writeDocs } from '../../deepinit/index.js';
import type { CliOpts } from '../utils/args.js';

export async function execute(opts: CliOpts, positional: string[]): Promise<void> {
  const target = resolve(positional[1] || process.cwd());
  const force = opts.yes || false;

  if (!existsSync(target)) {
    console.error(`\n❌  Target directory does not exist: ${target}`);
    process.exit(1);
  }

  console.log(`\n🔍 Scanning project tree: ${target}\n`);

  // 1. Scan
  const root = scanDirectory(target);
  if (!root) {
    console.error('❌  No files found in target directory.');
    process.exit(1);
  }

  // 2. Flatten
  const flat = flattenTree(root);
  console.log(`   Found ${flat.length} directories to document.\n`);

  // 3. Generate
  const results = generateAll(flat, target);
  const stats = writeDocs(results, { force });

  // 4. Report
  console.log(`   Generated: ${stats.written} AGENTS.md files`);
  if (stats.skipped > 0) {
    console.log(`   Skipped:   ${stats.skipped} (already exist, use --force to overwrite)`);
  }
  console.log(`\n✅ DeepInit complete.\n`);
}
