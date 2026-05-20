import { readdirSync, statSync, readFileSync, existsSync, writeFileSync, realpathSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// =============================================================================
// TYPES
// =============================================================================

interface DirectoryEntry {
  readonly files: readonly string[];
}

interface DeepInitManifest {
  readonly version: 1;
  readonly generatedAt: string;
  readonly directories: Record<string, DirectoryEntry>;
}

type ChangeStatus = 'added' | 'deleted' | 'modified' | 'unchanged';

interface DiffEntry {
  readonly path: string;
  readonly status: ChangeStatus;
  readonly reason?: string;
}

interface DiffResult {
  readonly entries: readonly DiffEntry[];
  readonly summary: {
    readonly total: number;
    readonly added: number;
    readonly deleted: number;
    readonly modified: number;
    readonly unchanged: number;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MANIFEST_VERSION = 1;
const MAX_DEPTH = 50;
const MAX_DIRECTORIES = 10_000;

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '__pycache__',
  'coverage', '.next', '.nuxt', '.claude', '.codex',
  '.agents', '.jarvis', '.omc', '.idea', '.vscode',
  'design-system', '.git-rewrite', 'logs', '.cache', 'tmp',
]);

// =============================================================================
// MANIFEST SCAN (filesystem → manifest)
// =============================================================================

function isExcluded(name: string): boolean {
  return name.startsWith('.') || EXCLUDED_DIRS.has(name);
}

/**
 * Recursively scan a project directory and build a record of dir → sorted file list.
 * Mirrors OMC's scanDirectories with symlink protection and inode tracking.
 */
export function scanDirectories(projectRoot: string): Record<string, DirectoryEntry> {
  const result: Record<string, DirectoryEntry> = {};
  const visitedInodes = new Set<number>();

  let realProjectRoot: string;
  try { realProjectRoot = realpathSync(projectRoot); } catch { realProjectRoot = projectRoot; }

  let dirCount = 0;

  function walk(absDir: string, depth: number): void {
    if (depth > MAX_DEPTH || dirCount > MAX_DIRECTORIES) return;

    // Symlink containment
    try {
      const realDir = realpathSync(absDir);
      if (realDir !== realProjectRoot && !realDir.startsWith(realProjectRoot + sep)) return;
    } catch { return; }

    // Symlink loop protection
    try {
      const s = statSync(absDir);
      if (visitedInodes.has(s.ino)) return;
      visitedInodes.add(s.ino);
    } catch { return; }

    dirCount++;

    let entries;
    try { entries = readdirSync(absDir, { withFileTypes: true }); } catch { return; }

    const files: string[] = [];
    const subdirs: string[] = [];

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isFile()) { files.push(entry.name); }
      else if (entry.isDirectory() && !isExcluded(entry.name)) {
        subdirs.push(entry.name);
      }
    }

    if (files.length > 0) {
      const relPath = relative(projectRoot, absDir).split(sep).join('/') || '.';
      result[relPath] = { files: [...files].sort() };
    }

    for (const sub of subdirs) walk(join(absDir, sub), depth + 1);
  }

  walk(projectRoot, 0);
  return result;
}

// =============================================================================
// MANIFEST I/O
// =============================================================================

export function loadManifest(manifestPath: string): DeepInitManifest | null {
  if (!existsSync(manifestPath)) return null;
  try {
    const raw = readFileSync(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.version !== MANIFEST_VERSION) return null;
    if (typeof parsed.directories !== 'object' || !parsed.directories) return null;
    return parsed as unknown as DeepInitManifest;
  } catch { return null; }
}

export function saveManifest(manifestPath: string, directories: Record<string, DirectoryEntry>): void {
  const manifest: DeepInitManifest = {
    version: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    directories,
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}

// =============================================================================
// DIFF + ANCESTOR CASCADING
// =============================================================================

/**
 * Compute diff between saved manifest and current filesystem.
 * Applies ancestor cascading: when a child is added/deleted, all ancestors
 * are marked 'modified' so their Subdirectories tables get updated.
 */
export function computeDiff(
  previous: Record<string, DirectoryEntry> | null,
  current: Record<string, DirectoryEntry>,
): DiffResult {
  const entries = new Map<string, DiffEntry>();

  if (previous === null) {
    for (const path of Object.keys(current)) {
      entries.set(path, { path, status: 'added', reason: 'first run (no manifest)' });
    }
  } else {
    for (const [path, entry] of Object.entries(current)) {
      const prev = previous[path];
      if (!prev) {
        entries.set(path, { path, status: 'added', reason: 'new directory' });
      } else {
        const prevFiles = [...prev.files].sort();
        const currFiles = [...entry.files].sort();
        if (prevFiles.length !== currFiles.length || prevFiles.some((f, i) => f !== currFiles[i])) {
          const prevSet = new Set(prevFiles);
          const currSet = new Set(currFiles);
          const added = currFiles.filter(f => !prevSet.has(f));
          const removed = prevFiles.filter(f => !currSet.has(f));
          const parts: string[] = [];
          if (added.length > 0) parts.push(`files added: ${added.join(', ')}`);
          if (removed.length > 0) parts.push(`files removed: ${removed.join(', ')}`);
          entries.set(path, { path, status: 'modified', reason: parts.join('; ') });
        } else {
          entries.set(path, { path, status: 'unchanged' });
        }
      }
    }
    for (const path of Object.keys(previous)) {
      if (!(path in current)) {
        entries.set(path, { path, status: 'deleted', reason: 'directory no longer exists' });
      }
    }
  }

  // Ancestor cascading: mark parents of added/deleted dirs as modified
  for (const target of [...entries.values()].filter(e => e.status === 'added' || e.status === 'deleted')) {
    const parts = target.path.split('/');
    for (let i = parts.length - 1; i >= 0; i--) {
      const ancestor = i === 0 ? '.' : parts.slice(0, i).join('/');
      const existing = entries.get(ancestor);
      if (existing && existing.status === 'unchanged') {
        entries.set(ancestor, {
          path: ancestor,
          status: 'modified',
          reason: `child directory ${target.status}: ${target.path}`,
        });
      }
    }
  }

  const sorted = [...entries.values()].sort((a, b) => a.path.localeCompare(b.path));
  return {
    entries: sorted,
    summary: {
      total: sorted.length,
      added: sorted.filter(e => e.status === 'added').length,
      deleted: sorted.filter(e => e.status === 'deleted').length,
      modified: sorted.filter(e => e.status === 'modified').length,
      unchanged: sorted.filter(e => e.status === 'unchanged').length,
    },
  };
}

/**
 * Filter diff entries to only those needing regeneration.
 * Deleted entries are excluded (no directory to generate for).
 */
export function changedPaths(diff: DiffResult): string[] {
  return diff.entries
    .filter(e => e.status !== 'unchanged' && e.status !== 'deleted')
    .map(e => e.path);
}
