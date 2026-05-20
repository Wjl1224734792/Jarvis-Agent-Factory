import { spawnSync } from "node:child_process";
import { statSync, readdirSync } from "node:fs";
import { join, extname, basename } from "node:path";

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SKIP_BUILD = process.argv.includes("--skip-build");
const DIST_DIRS = [
  "apps/web/dist",
  "apps/admin/dist",
  "apps/server/dist",
];

/**
 * Recursively collect all files in a directory.
 */
function walk(dir, files = []) {
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, files);
      } else {
        files.push(full);
      }
    }
  } catch {
    // directory doesn't exist — skip
  }
  return files;
}

/**
 * Score deduction categories (higher = more important).
 */
function scoreBuild() {
  const allFiles = [];
  for (const d of DIST_DIRS) {
    walk(join(ROOT, d), allFiles);
  }

  if (allFiles.length === 0) {
    return { score: 0, details: { error: "No build output found" } };
  }

  let score = 100;
  const issues = [];
  const counts = { test: 0, doc: 0, temp: 0, sourcemap: 0, largeAsset: 0 };

  const TEST_PATTERNS = /\.(test|spec)\.(js|ts|jsx|tsx|mjs|cjs)$/;
  const DOC_PATTERNS = /\.(md|txt|pdf|rst)$/;
  const TEMP_PATTERNS = /\.(tmp|cache|bak|swp)$|\.DS_Store|Thumbs\.db/;
  const LARGE_THRESHOLD = 500 * 1024; // 500KB

  for (const f of allFiles) {
    const name = basename(f);
    const ext = extname(f).toLowerCase();
    const fullName = f.replace(/\\/g, "/");
    const rel = fullName.replace(ROOT.replace(/\\/g, "/") + "/", "");

    // Check test files
    if (TEST_PATTERNS.test(name) || fullName.includes("/__tests__/")) {
      counts.test++;
      issues.push(`test_file: ${rel}`);
    }

    // Check doc files
    if (DOC_PATTERNS.test(ext) && !name.startsWith(".")) {
      counts.doc++;
      issues.push(`doc_file: ${rel}`);
    }

    // Check temp files
    if (TEMP_PATTERNS.test(name) || fullName.includes("/.cache/") || fullName.includes("/.tmp/")) {
      counts.temp++;
      issues.push(`temp_file: ${rel}`);
    }

    // Check source maps (only if uploaded to prod)
    if (ext === ".map") {
      counts.sourcemap++;
      issues.push(`sourcemap: ${rel}`);
    }

    // Check large assets (excluding known large vendor bundles)
    try {
      const size = statSync(f).size;
      // Check large assets (only for client-side bundles)
      if (size > LARGE_THRESHOLD && !name.includes("vendor") && !name.includes("antd") && !name.includes("charts") && !rel.startsWith("apps/server/")) {
        counts.largeAsset++;
        issues.push(`large_asset(${(size / 1024).toFixed(0)}KB): ${rel}`);
      }
    } catch {
      // can't stat
    }
  }

  // Weighted deductions
  score -= counts.test * 35;
  score -= counts.doc * 20;
  score -= counts.temp * 15;
  score -= counts.sourcemap * 15;
  score -= counts.largeAsset * 15;

  const finalScore = Math.max(0, score);

  return {
    primary: finalScore,
    sub_scores: {
      test_clean: counts.test === 0,
      doc_clean: counts.doc === 0,
      temp_clean: counts.temp === 0,
      sourcemap_clean: counts.sourcemap === 0,
      large_asset_clean: counts.largeAsset === 0,
    },
    details: {
      total_files: allFiles.length,
      issues,
      counts,
      file_types: allFiles.reduce((acc, f) => {
        const e = extname(f).toLowerCase() || "(none)";
        acc[e] = (acc[e] || 0) + 1;
        return acc;
      }, {}),
    },
  };
}

// Main
if (!SKIP_BUILD) {
  console.log("[benchmark] Building project...");
  const result = spawnSync("bun", ["run", "build"], {
    cwd: ROOT,
    stdio: "pipe",
    timeout: 120_000,
    shell: true,
    encoding: "utf-8",
  });
  if (result.error || result.status !== 0) {
    console.error("[benchmark] Build failed:", result.error?.message || result.stderr?.slice(-500));
    console.log("[benchmark] Using existing dist output for scoring...");
  }
} else {
  console.log("[benchmark] Skipping build, using existing dist...");
}

console.log("[benchmark] Scoring build cleanliness...");
const result = scoreBuild();
console.log(JSON.stringify(result, null, 2));

// Exit with score for machine parsing
process.exit(0);
