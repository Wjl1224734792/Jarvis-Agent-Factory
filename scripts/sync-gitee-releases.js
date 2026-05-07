#!/usr/bin/env node
/**
 * Gitee Release 批量同步脚本
 * 用法: GITEE_TOKEN=xxx node scripts/sync-gitee-releases.js [--dry-run]
 */

const token = process.env.GITEE_TOKEN;
if (!token) {
  console.error('❌ 请设置 GITEE_TOKEN 环境变量');
  console.error('   获取地址: https://gitee.com/profile/personal_access_tokens');
  console.error('   export GITEE_TOKEN=your_token_here');
  process.exit(1);
}

const REPO = 'wujl1124/JarvisAgentFactory';
const API = `https://gitee.com/api/v5/repos/${REPO}`;
const dryRun = process.argv.includes('--dry-run');

async function main() {
  // 获取本地 tags
  const { execSync } = await import('node:child_process');
  const tags = execSync('git tag --sort=-creatordate', { encoding: 'utf-8' })
    .trim().split('\n').filter(Boolean);

  // 获取 Gitee 已有 releases
  console.log('📡 获取 Gitee 已有 releases...');
  const existingRes = await fetch(`${API}/releases?page=1&per_page=100`, {
    headers: { 'User-Agent': 'jarvis-sync' }
  });
  const existing = await existingRes.json();
  const existingTags = new Set(existing.map(r => r.tag_name));
  console.log(`   Gitee 已有 ${existing.length} 个 release\n`);

  // 找出缺失的
  const missing = tags.filter(t => !existingTags.has(t));
  if (missing.length === 0) {
    console.log('✅ Gitee releases 已与本地 tags 完全同步');
    return;
  }

  console.log(`🔍 发现 ${missing.length} 个缺失 release:\n`);

  let created = 0, failed = 0;
  for (const tag of missing) {
    // 获取 tag 对应的 commit message
    let body = '';
    try {
      const msg = execSync(`git tag -l --format='%(contents)' ${tag}`, { encoding: 'utf-8' }).trim();
      body = msg || `Release ${tag}`;
    } catch {
      body = `Release ${tag}`;
    }

    const name = `${tag} — Jarvis Agent Factory`;

    if (dryRun) {
      console.log(`   [DRY RUN] 将创建: ${name}`);
      created++;
      continue;
    }

    process.stdout.write(`  创建 ${tag}... `);
    try {
      const res = await fetch(`${API}/releases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'jarvis-sync',
        },
        body: JSON.stringify({
          tag_name: tag,
          name,
          body: body.slice(0, 5000),
          target_commitish: 'main',
          prerelease: tag.includes('-rc') || tag.includes('-beta'),
        }),
      });

      // Gitee API uses query params for access_token
      const res2 = await fetch(`${API}/releases?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'jarvis-sync' },
        body: JSON.stringify({
          tag_name: tag,
          name,
          body: body.slice(0, 5000),
          target_commitish: 'main',
          prerelease: tag.includes('-rc') || tag.includes('-beta'),
        }),
      });

      if (res2.ok) {
        console.log('✅');
        created++;
      } else {
        const err = await res2.text();
        console.log(`❌ ${res2.status}: ${err.slice(0, 100)}`);
        failed++;
      }
    } catch (e) {
      console.log(`❌ ${e.message}`);
      failed++;
    }
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}完成: ${created} 创建, ${failed} 失败, ${missing.length} 总计`);
}

main().catch(e => { console.error(e); process.exit(1); });
