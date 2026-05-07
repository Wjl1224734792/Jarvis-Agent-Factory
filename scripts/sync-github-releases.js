#!/usr/bin/env node
/**
 * GitHub Release 批量同步脚本
 *
 * Token 配置方式（按优先级）：
 *   1. 环境变量: GITHUB_TOKEN=xxx node scripts/sync-github-releases.js
 *   2. .env 文件: 在项目根目录或脚本同目录创建 .env，写入 GITHUB_TOKEN=xxx
 *   3. 命令行参数: node scripts/sync-github-releases.js --token=xxx
 *
 * 获取 Token: https://github.com/settings/tokens
 * 权限勾选: repo (repo:public_repo for public repos)
 *
 * 用法: node scripts/sync-github-releases.js [--dry-run] [--prerelease]
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
const token = tokenArg ? tokenArg.split('=')[1] : process.env.GITHUB_TOKEN;

if (!token) {
  console.error('❌ 未找到 GITHUB_TOKEN');
  console.error('');
  console.error('   三种配置方式（任选其一）：');
  console.error('   1. 环境变量:  export GITHUB_TOKEN=your_token    # Linux/macOS');
  console.error('                 $env:GITHUB_TOKEN="your_token"   # Windows PowerShell');
  console.error('   2. .env 文件: 在项目根目录创建 .env 文件，写入:');
  console.error('                 GITHUB_TOKEN=your_token');
  console.error('   3. 命令行参数: node scripts/sync-github-releases.js --token=your_token');
  console.error('');
  console.error('   Token 获取: https://github.com/settings/tokens');
  console.error('   权限: repo（私有仓库）或 public_repo（公开仓库）');
  process.exit(1);
}

const REPO = process.env.GITHUB_REPO || 'Wjl1224734792/Jarvis-Agent-Factory';
const API = `https://api.github.com/repos/${REPO}`;
const dryRun = process.argv.includes('--dry-run');

async function main() {
  // 获取本地 tags
  const { execSync } = await import('node:child_process');
  const tags = execSync('git tag --sort=-creatordate', { encoding: 'utf-8' })
    .trim().split('\n').filter(Boolean);

  // 获取 GitHub 已有 releases
  console.log('📡 获取 GitHub 已有 releases...');
  const existingRes = await fetch(`${API}/releases?per_page=100`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'jarvis-sync',
    },
  });
  const existing = await existingRes.json();
  const existingTags = new Set(Array.isArray(existing) ? existing.map(r => r.tag_name) : []);
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
    // 获取 tag 对应的 commit message
    let body = '';
    try {
      const msg = execSync(`git tag -l --format='%(contents)' ${tag}`, { encoding: 'utf-8' }).trim();
      body = msg || `Release ${tag}`;
    } catch {
      body = `Release ${tag}`;
    }

    const name = `${tag} — Jarvis Agent Factory`;
    const prerelease = tag.includes('-rc') || tag.includes('-beta') || tag.includes('-alpha');

    if (dryRun) {
      console.log(`   [DRY RUN] 将创建: ${name}${prerelease ? ' [pre-release]' : ''}`);
      created++;
      continue;
    }

    process.stdout.write(`  创建 ${tag}... `);
    try {
      const res = await fetch(`${API}/releases`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'jarvis-sync',
        },
        body: JSON.stringify({
          tag_name: tag,
          name,
          body: body.slice(0, 12000),
          target_commitish: 'main',
          prerelease,
          draft: false,
        }),
      });

      if (res.ok || res.status === 201) {
        console.log('✅');
        created++;
      } else {
        const err = await res.text();
        console.log(`❌ ${res.status}: ${err.slice(0, 100)}`);
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
