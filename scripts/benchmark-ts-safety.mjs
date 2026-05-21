/**
 * TypeScript Type Safety Benchmark for apps/web
 *
 * Measures a composite ts-type-safety-score (lower is better) across 3 dimensions:
 *   1. tsc --noEmit type errors count
 *   2. 'any' type usage occurrences in apps/web/src/
 *   3. ESLint TypeScript-related rule violations
 *
 * Usage: bun run scripts/benchmark-ts-safety.mjs
 * Output: JSON on stdout (last line)
 */

import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const WEB_DIR = join(ROOT, "apps", "web");
const WEB_SRC = join(WEB_DIR, "src");

// ─── helpers ───────────────────────────────────────────────────────────────

/** Recursively walk a directory, returning file paths matching predicate. */
function walk(dir, predicate) {
  const files = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walk(full, predicate));
      } else if (entry.isFile() && predicate(full)) {
        files.push(full);
      }
    }
  } catch {
    // skip inaccessible directories
  }
  return files;
}

/** Normalize path separators to forward slash for consistent matching. */
function normalize(filePath) {
  return filePath.replace(/\\/g, "/");
}

// ─── dimension 1: tsc type errors ──────────────────────────────────────────

/**
 * Run `tsc -p tsconfig.json` in apps/web and count error lines.
 * Each tsc error has the format: `file(line,col): error TS####: message`
 */
function countTscErrors() {
  console.error("[benchmark] Running tsc typecheck on apps/web...");

  const result = spawnSync("bun", ["run", "typecheck"], {
    cwd: WEB_DIR,
    stdio: "pipe",
    timeout: 180_000,
    encoding: "utf-8",
    shell: true,
  });

  const output = (result.stdout || "") + "\n" + (result.stderr || "");
  const lines = output.split("\n");

  // tsc format: src/file.ts(10,5): error TS2322: ...
  const errorLines = lines.filter((l) => /error TS\d+:/i.test(l));
  return errorLines.length;
}

// ─── dimension 2: any type usage count ─────────────────────────────────────

/**
 * Walk apps/web/src/**\/*.{ts,tsx} (excluding test/spec/e2e files) and count
 * lines containing unambiguous 'any' type usages.
 *
 * Patterns detected (per line, counted once even if multiple match on a line):
 *   `: any`   — explicit type annotation
 *   `as any`  — type assertion
 *   `<any`    — generic type argument (e.g. Record<string, any>, Promise<any>)
 */
function countAnyUsage() {
  console.error("[benchmark] Counting 'any' type usages in apps/web/src...");

  const tsFiles = walk(WEB_SRC, (f) => {
    const ext = extname(f);
    if (ext !== ".ts" && ext !== ".tsx") return false;

    // Exclude test, spec, and e2e files
    const n = normalize(f);
    if (n.includes(".test.") || n.includes(".spec.")) return false;
    if (n.includes("/tests/") || n.includes("/e2e/")) return false;

    return true;
  });

  let count = 0;
  for (const file of tsFiles) {
    try {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (const line of lines) {
        // Count a line once if it has ANY any-type usage pattern
        if (
          /:\s*any\b/.test(line) ||
          /\bas\s+any\b/.test(line) ||
          /<any[>\s,]/i.test(line)
        ) {
          count++;
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  return count;
}

// ─── dimension 3: ESLint TS rule violations ────────────────────────────────

/**
 * Run `eslint src/` in apps/web and count lines containing
 * `@typescript-eslint/` rule violations (both errors and warnings).
 */
function countEslintViolations() {
  console.error("[benchmark] Running ESLint on apps/web...");

  const result = spawnSync("bun", ["run", "lint"], {
    cwd: WEB_DIR,
    stdio: "pipe",
    timeout: 180_000,
    encoding: "utf-8",
    shell: true,
  });

  const output = (result.stdout || "") + "\n" + (result.stderr || "");
  const lines = output.split("\n");

  // ESLint stylish format:
  //   10:5  error  Message  @typescript-eslint/no-explicit-any
  // Count lines that mention a @typescript-eslint/ rule with error or warning
  const violations = lines.filter(
    (l) => /@typescript-eslint\//.test(l) && /\b(error|warning)\b/.test(l)
  );

  return violations.length;
}

// ─── main ──────────────────────────────────────────────────────────────────

function main() {
  let tscErrors;
  let anyCount;
  let eslintViolations;

  try {
    tscErrors = countTscErrors();
  } catch (err) {
    console.error("[benchmark] tsc check failed:", err.message);
    tscErrors = -1;
  }

  try {
    anyCount = countAnyUsage();
  } catch (err) {
    console.error("[benchmark] any-count failed:", err.message);
    anyCount = -1;
  }

  try {
    eslintViolations = countEslintViolations();
  } catch (err) {
    console.error("[benchmark] ESLint check failed:", err.message);
    eslintViolations = -1;
  }

  // Composite score: simple sum (all dimensions are counts, lower is better)
  const primary =
    Math.max(0, tscErrors) +
    Math.max(0, anyCount) +
    Math.max(0, eslintViolations);

  const result = {
    primary,
    sub_scores: {
      tsc_errors: tscErrors,
      any_count: anyCount,
      eslint_violations: eslintViolations,
    },
  };

  // Output JSON as the last (and only) line of stdout
  console.log(JSON.stringify(result));
}

main();
