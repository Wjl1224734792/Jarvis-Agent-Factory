#!/usr/bin/env node
/**
 * Gitee Release 批量同步脚本
 *
 * Token 配置方式（按优先级）：
 *   1. 环境变量: GITEE_TOKEN=xxx node scripts/sync-gitee-releases.js
 *   2. .env 文件: 在项目根目录或脚本同目录创建 .env，写入 GITEE_TOKEN=xxx
 *   3. 命令行参数: node scripts/sync-gitee-releases.js --token=xxx
 *
 * 获取 Token: https://gitee.com/profile/personal_access_tokens
 * 权限勾选: projects（读仓库信息）+ 不勾选任何写权限（Release 只需要 token 鉴权）
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 尝试从 .env 文件加载
function loadEnv() {
  const candidates = [
    resolve(__dirname, '.env'),
    resolve(__dirname, '..', '.env'),
    resolve(process.cwd(), '.env'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      const lines = readFileSync(p, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

// 命令行 --token=xxx
const tokenArg = process.argv.find(a => a.startsWith('--token='));
const token = tokenArg ? tokenArg.split('=')[1] : process.env.GITEE_TOKEN;

if (!token) {
  console.error('❌ 未找到 GITEE_TOKEN');
  console.error('');
  console.error('   三种配置方式（任选其一）：');
  console.error('   1. 环境变量:  export GITEE_TOKEN=your_token    # Linux/macOS');
  console.error('                 $env:GITEE_TOKEN="your_token"   # Windows PowerShell');
  console.error('   2. .env 文件: 在项目根目录创建 .env 文件，写入:');
  console.error('                 GITEE_TOKEN=your_token');
  console.error('   3. 命令行参数: node scripts/sync-gitee-releases.js --token=your_token');
  console.error('');
  console.error('   Token 获取: https://gitee.com/profile/personal_access_tokens');
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
