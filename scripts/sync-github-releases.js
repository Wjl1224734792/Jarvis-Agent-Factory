#!/usr/bin/env node
/**
 * GitHub Release 批量同步脚本
 *
 * 使用 gh CLI（需已登录: gh auth login）代替 curl + GITHUB_TOKEN。
 *
 * 用法: node scripts/sync-github-releases.js [--dry-run]
 */

import { execSync } from 'node:child_process';

const dryRun = process.argv.includes('--dry-run');

/** 执行 shell 命令，返回 stdout */
function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

async function main() {
  // 获取本地 tags
  const tags = execSync('git tag --sort=-creatordate', { encoding: 'utf-8' })
    .trim().split('\n').filter(Boolean);

  // 获取 GitHub 已有 releases
  console.log('📡 获取 GitHub 已有 releases...');
  const existingJson = sh('gh release list --limit 100 --json tagName');
  const existing = existingJson ? JSON.parse(existingJson) : [];
  const existingTags = new Set(existing.map(r => r.tagName));
  console.log(`   GitHub 已有 ${existingTags.size} 个 release\n`);

  // 找出缺失的
  const missing = tags.filter(t => !existingTags.has(t));
  if (missing.length === 0) {
    console.log('✅ GitHub releases 已与本地 tags 完全同步');
    return;
  }

  console.log(`🔍 发现 ${missing.length} 个缺失 release:\n`);

  let created = 0, failed = 0;
  for (const tag of missing) {
    const prerelease = tag.includes('-rc') || tag.includes('-beta') || tag.includes('-alpha');
    const prereleaseFlag = prerelease ? ' --prerelease' : '';

    if (dryRun) {
      console.log(`   [DRY RUN] 将创建: ${tag}${prerelease ? ' [pre-release]' : ''}`);
      created++;
      continue;
    }

    process.stdout.write(`  创建 ${tag}... `);
    try {
      const result = sh(`gh release create ${tag} --title "${tag}" --generate-notes${prereleaseFlag}`);
      if (result) {
        console.log('✅');
        created++;
      } else {
        console.log('❌');
        failed++;
      }
    } catch {
      console.log('❌');
      failed++;
    }
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}完成: ${created} 创建, ${failed} 失败, ${missing.length} 总计`);
}

main().catch(e => { console.error(e); process.exit(1); });
