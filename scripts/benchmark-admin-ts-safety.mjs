import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ADMIN_DIR = join(ROOT, "apps", "admin");
const ADMIN_SRC = join(ADMIN_DIR, "src");

/**
 * Recursively collect all .ts/.tsx files in a directory, excluding tests.
 * @param {string} dir
 * @param {string[]} [files]
 * @returns {string[]}
 */
function collectFiles(dir, files = []) {
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip test directories and node_modules
        if (entry.name === "tests" || entry.name === "__tests__" || entry.name === "node_modules") {
          continue;
        }
        collectFiles(full, files);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        // Skip test files by naming convention
        if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
          continue;
        }
        files.push(full);
      }
    }
  } catch {
    // directory doesn't exist — skip
  }
  return files;
}

/**
 * Count `any` type usages in source files.
 * Matches: `: any`, `as any`, `<any` patterns.
 * @param {string[]} files
 * @returns {{ count: number, matches: string[] }}
 */
function countAnyUsages(files) {
  let count = 0;
  const matches = [];

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match `: any`, `as any`, `<any` but skip comments and strings
        const cleaned = line
          .replace(/\/\/.*$/, "")          // strip single-line comments
          .replace(/\/\*[\s\S]*?\*\//g, "") // strip multi-line comments
          .replace(/'[^']*'/g, "")          // strip single-quoted strings
          .replace(/"[^"]*"/g, "");         // strip double-quoted strings

        if (/\b: any\b/.test(cleaned) || /\bas any\b/.test(cleaned) || /<any\b/.test(cleaned)) {
          count++;
          const rel = relative(ROOT, file).replace(/\\/g, "/");
          matches.push(`${rel}:${i + 1}`);
        }
      }
    } catch {
      // can't read file — skip
    }
  }

  return { count, matches };
}

/**
 * Run tsc --noEmit in apps/admin and count error lines.
 * @returns {{ count: number, errors: string[] }}
 */
function countTscErrors() {
  const result = spawnSync("bun", ["run", "typecheck"], {
    cwd: ADMIN_DIR,
    stdio: "pipe",
    encoding: "utf-8",
    timeout: 120_000,
    shell: true,
  });

  const output = ((result.stdout || "") + "\n" + (result.stderr || "")).trim();

  if (result.status === 0 || !output) {
    return { count: 0, errors: [] };
  }

  // Count lines that look like TS errors: file(line,col): error TSXXXX:
  const lines = output.split("\n");
  const errorLines = lines.filter(
    (line) => /error TS\d+:/.test(line) && line.includes(ADMIN_SRC.replace(/\\/g, "/"))
  );

  return { count: errorLines.length, errors: errorLines.slice(0, 20) };
}

/**
 * Run eslint in apps/admin and count @typescript-eslint/ violations.
 * @returns {{ count: number, violations: string[] }}
 */
function countEslintViolations() {
  const result = spawnSync("bun", ["run", "lint", "--format", "json"], {
    cwd: ADMIN_DIR,
    stdio: "pipe",
    encoding: "utf-8",
    timeout: 120_000,
    shell: true,
  });

  const output = (result.stdout || "").trim();

  if (!output) {
    // eslint may have output on stderr but not stdout
    const stderrOutput = (result.stderr || "").trim();
    // If there's no parseable JSON, run eslint without --format json to count
    if (stderrOutput) {
      // Try running with default format and count violations manually
      return countEslintViolationsFallback();
    }
    return { count: 0, violations: [] };
  }

  try {
    const results = JSON.parse(output);
    let count = 0;
    const violations = [];

    for (const fileResult of results) {
      // Filter for @typescript-eslint/ rules
      const tsViolations = (fileResult.messages || []).filter(
        (msg) => msg.ruleId && msg.ruleId.startsWith("@typescript-eslint/")
      );

      // Count both errors and warnings
      count += tsViolations.length;

      for (const v of tsViolations) {
        const rel = relative(ROOT, fileResult.filePath).replace(/\\/g, "/");
        const severity = v.severity === 2 ? "error" : "warning";
        violations.push(`${rel}:${v.line}:${v.column} [${severity}] ${v.ruleId}: ${v.message}`);
      }
    }

    return { count, violations: violations.slice(0, 30) };
  } catch {
    return countEslintViolationsFallback();
  }
}

/**
 * Fallback: count eslint violations by parsing default output format.
 */
function countEslintViolationsFallback() {
  const result = spawnSync("bun", ["run", "lint"], {
    cwd: ADMIN_DIR,
    stdio: "pipe",
    encoding: "utf-8",
    timeout: 120_000,
    shell: true,
  });

  const output = (result.stdout || "") + "\n" + (result.stderr || "");
  const lines = output.split("\n");

  // Count lines that contain @typescript-eslint/ rule references
  let count = 0;
  const violations = [];

  for (const line of lines) {
    if (line.includes("@typescript-eslint/")) {
      // Format: /path/to/file  line:col  error/warning  message  ruleId
      const match = line.match(/(\S+)\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(@typescript-eslint\/\S+)/);
      if (match) {
        count++;
        if (violations.length < 30) {
          violations.push(line.trim());
        }
      } else if (line.includes("@typescript-eslint/")) {
        // Just count it even if parsing fails
        count++;
        if (violations.length < 30) {
          violations.push(line.trim());
        }
      }
    }
  }

  return { count, violations };
}

// --- Main ---
console.log("[benchmark-admin-ts-safety] Running TypeScript type safety benchmark for apps/admin...\n");

// 1. Collect source files (excluding tests)
console.log("[1/3] Collecting source files...");
const sourceFiles = collectFiles(ADMIN_SRC);
console.log(`  Found ${sourceFiles.length} source files (.ts/.tsx, excluding tests)\n`);

// 2. Count tsc errors
console.log("[2/3] Counting tsc errors...");
const tscResult = countTscErrors();
console.log(`  tsc errors: ${tscResult.count}`);

// 3. Count any usages
console.log("[3/3] Counting any usages and eslint violations...");
const anyResult = countAnyUsages(sourceFiles);
console.log(`  any usages: ${anyResult.count}`);

// 4. Count eslint violations
const eslintResult = countEslintViolations();
console.log(`  eslint violations: ${eslintResult.count}\n`);

// Compute composite score
const composite = tscResult.count + anyResult.count + eslintResult.count;

const output = {
  primary: composite,
  sub_scores: {
    tsc_errors: tscResult.count,
    any_count: anyResult.count,
    eslint_violations: eslintResult.count,
  },
  details: {
    total_files: sourceFiles.length,
    tsc_error_samples: tscResult.errors,
    any_usages: anyResult.matches.slice(0, 30),
    eslint_violations_list: eslintResult.violations,
  },
};

console.log(JSON.stringify(output));
process.exit(0);
