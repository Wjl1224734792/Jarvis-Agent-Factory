/**
 * TEST-009：敏感词移除后审核流程验证
 *
 * 验证 TASK-010（移除硬编码敏感词过滤）后：
 * 1. 源码中无残留引用
 * 2. 帖子创建/更新审核流程仍正常工作
 * 3. 路由层无敏感词相关错误分支
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// ============================================================
// 1. 残留引用扫描
// ============================================================

/**
 * 递归收集指定目录下所有 .ts/.tsx/.js/.jsx 源码文件路径（排除 node_modules、dist、tests）。
 *
 * @param dir 起始目录
 * @returns 源码文件绝对路径列表
 */
function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.git', 'tests', '__tests__'].includes(entry.name)) {
        continue;
      }
      results.push(...collectSourceFiles(fullPath));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

describe('TASK-010 残留引用检查', () => {
  const serverSrc = path.resolve(__dirname, '../src');
  const sourceFiles = collectSourceFiles(serverSrc);

  it('源码中不应存在 inspectPostWriteContent 引用', () => {
    const violations: string[] = [];
    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes('inspectPostWriteContent')) {
        violations.push(path.relative(serverSrc, filePath));
      }
    }
    expect(
      violations,
      `发现残留引用 inspectPostWriteContent: ${violations.join(', ')}`
    ).toHaveLength(0);
  });

  it('源码中不应存在 posts-sensitive-filter 的 import', () => {
    const violations: string[] = [];
    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes('posts-sensitive-filter')) {
        violations.push(path.relative(serverSrc, filePath));
      }
    }
    expect(
      violations,
      `发现残留 import posts-sensitive-filter: ${violations.join(', ')}`
    ).toHaveLength(0);
  });

  it('源码中不应存在 sensitive_content 错误码引用', () => {
    const violations: string[] = [];
    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes('sensitive_content')) {
        violations.push(path.relative(serverSrc, filePath));
      }
    }
    expect(
      violations,
      `发现残留引用 sensitive_content: ${violations.join(', ')}`
    ).toHaveLength(0);
  });

  it('源码中不应存在 PostWriteSensitiveIssue 类型引用', () => {
    const violations: string[] = [];
    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes('PostWriteSensitiveIssue')) {
        violations.push(path.relative(serverSrc, filePath));
      }
    }
    expect(
      violations,
      `发现残留引用 PostWriteSensitiveIssue: ${violations.join(', ')}`
    ).toHaveLength(0);
  });

  it('posts-sensitive-filter.ts 文件不应存在', () => {
    const filterFile = path.resolve(
      serverSrc,
      'modules/posts/posts-sensitive-filter.ts'
    );
    expect(fs.existsSync(filterFile)).toBe(false);
  });
});

// ============================================================
// 2. 审核流程单元测试 — evaluatePostWriteModeration
// ============================================================

describe('帖子审核流程 — evaluatePostWriteModeration', () => {
  it('审核模块导出 evaluatePostWriteModeration 函数', async () => {
    const mod = await import(
      '../src/modules/posts/posts-write-moderation'
    );
    expect(typeof mod.evaluatePostWriteModeration).toBe('function');
  });

  it('审核模块仅依赖 text-moderation 服务，不依赖敏感词过滤', () => {
    const moderationPath = path.resolve(
      __dirname,
      '../src/modules/posts/posts-write-moderation.ts'
    );
    const content = fs.readFileSync(moderationPath, 'utf-8');

    // 不应 import 敏感词过滤模块
    expect(content).not.toContain('sensitive-filter');
    expect(content).not.toContain('sensitiveFilter');
    expect(content).not.toContain('inspectPostWrite');

    // 应使用 text-moderation 服务
    expect(content).toContain('text-moderation.service');

    // 应使用 siteSettingsService 获取审核模式
    expect(content).toContain('site-settings.service');
  });

  it('evaluatePostWriteModeration 函数签名包含必要参数', () => {
    const moderationPath = path.resolve(
      __dirname,
      '../src/modules/posts/posts-write-moderation.ts'
    );
    const content = fs.readFileSync(moderationPath, 'utf-8');

    // 函数应接受 postType、entityId、title、content 参数
    expect(content).toContain('postType');
    expect(content).toContain('entityId');
    expect(content).toContain('title');
    expect(content).toContain('content');

    // 应将 title 和 content 拼接后传递给审核
    expect(content).toContain('`${input.title}\\n${input.content}`');
  });
});

// ============================================================
// 3. posts-write-service 审核集成验证
// ============================================================

describe('帖子写入服务 — 审核流程集成', () => {
  it('posts-write-service.ts 中不引用敏感词过滤模块', () => {
    const servicePath = path.resolve(
      __dirname,
      '../src/modules/posts/posts-write-service.ts'
    );
    const content = fs.readFileSync(servicePath, 'utf-8');

    expect(content).not.toContain('sensitive-filter');
    expect(content).not.toContain('inspectPostWriteContent');
    expect(content).not.toContain('sensitive_content');
  });

  it('posts-write-service.ts 正确导入并调用 evaluatePostWriteModeration', () => {
    const servicePath = path.resolve(
      __dirname,
      '../src/modules/posts/posts-write-service.ts'
    );
    const content = fs.readFileSync(servicePath, 'utf-8');

    // 应导入审核模块
    expect(content).toContain("from './posts-write-moderation'");
    expect(content).toContain('evaluatePostWriteModeration');
  });

  it('createPost 中调用审核后根据 action 决定状态流转', () => {
    const servicePath = path.resolve(
      __dirname,
      '../src/modules/posts/posts-write-service.ts'
    );
    const content = fs.readFileSync(servicePath, 'utf-8');

    // createPost 方法应包含审核决策逻辑
    expect(content).toContain("moderation.action === 'approve'");
    expect(content).toContain("moderation.action === 'reject'");
    // 默认状态应为 pending
    expect(content).toContain("const status: PostStatus = 'pending'");
  });

  it('updatePost 中调用审核后根据 action 决定状态流转', () => {
    const servicePath = path.resolve(
      __dirname,
      '../src/modules/posts/posts-write-service.ts'
    );
    const content = fs.readFileSync(servicePath, 'utf-8');

    // updatePost 方法应包含审核决策逻辑
    // 应有两处 moderation.action 判断（createPost + updatePost）
    const approveMatches = content.match(/moderation\.action === 'approve'/g);
    const rejectMatches = content.match(/moderation\.action === 'reject'/g);
    expect(approveMatches?.length).toBeGreaterThanOrEqual(2);
    expect(rejectMatches?.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// 4. 路由层验证
// ============================================================

describe('路由层 — posts.route.ts', () => {
  it('路由文件不引用敏感词过滤相关代码', () => {
    const routePath = path.resolve(
      __dirname,
      '../src/modules/posts/posts.route.ts'
    );
    const content = fs.readFileSync(routePath, 'utf-8');

    expect(content).not.toContain('sensitive_content');
    expect(content).not.toContain('sensitive-filter');
    expect(content).not.toContain('inspectPostWriteContent');
  });

  it('创建帖子路由不包含 sensitive_content 错误响应分支', () => {
    const routePath = path.resolve(
      __dirname,
      '../src/modules/posts/posts.route.ts'
    );
    const content = fs.readFileSync(routePath, 'utf-8');

    // 不应存在 sensitive_content 相关的 JSON 响应
    expect(content).not.toMatch(/sensitive_content/);
    expect(content).not.toMatch(/blocked words/i);
  });

  it('更新帖子路由不包含 sensitive_content 错误响应分支', () => {
    const routePath = path.resolve(
      __dirname,
      '../src/modules/posts/posts.route.ts'
    );
    const content = fs.readFileSync(routePath, 'utf-8');

    // 更新路由（PUT detail）区域不应有敏感词相关分支
    expect(content).not.toMatch(/sensitive_content/);
  });
});
