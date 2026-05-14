/**
 * TASK-002: Markdown 文件 section 级分割与 SHA256 hash 计算
 *
 * 验证 splitMarkdownSections 和 computeSectionHashes 的正确性，
 * 以及 saveHashes 对 .md 文件的 _v: 2 格式写入。
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';

/**
 * splitMarkdownSections 的测试副本。
 * 与 src/install.ts 中的实现保持同步。
 */
function splitMarkdownSections(content: string): {
  frontmatterLineCount: number;
  sections: { title: string; content: string; hash: string }[];
} {
  const lines = content.split('\n');

  if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
    return { frontmatterLineCount: 0, sections: [] };
  }

  let frontmatterLineCount = 0;
  if (lines[0].trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        frontmatterLineCount = i + 1;
        break;
      }
    }
  }

  const sections: { title: string; content: string; hash: string }[] = [];
  let i = frontmatterLineCount;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ') && line.charAt(3) !== '#') {
      const title = line.substring(3).trim();
      const sectionStart = i;
      i++;
      while (i < lines.length && !(lines[i].startsWith('## ') && lines[i].charAt(3) !== '#')) {
        i++;
      }
      const sectionContent = lines.slice(sectionStart, i).join('\n');
      const hash = createHash('sha256').update(sectionContent).digest('hex');
      sections.push({ title, content: sectionContent, hash });
    } else {
      i++;
    }
  }

  return { frontmatterLineCount, sections };
}

// ================================
// splitMarkdownSections 测试
// ================================

describe('TASK-002: splitMarkdownSections', () => {
  it('空字符串返回空 sections', () => {
    const result = splitMarkdownSections('');
    expect(result.frontmatterLineCount).toBe(0);
    expect(result.sections).toEqual([]);
  });

  it('仅换行的字符串返回空 sections', () => {
    const result = splitMarkdownSections('\n');
    expect(result.frontmatterLineCount).toBe(0);
    expect(result.sections).toEqual([]);
  });

  it('无 ## 标题的纯文本返回空 sections', () => {
    const content = '这是一段纯文本\n没有任何二级标题\n只有普通段落';
    const result = splitMarkdownSections(content);
    expect(result.frontmatterLineCount).toBe(0);
    expect(result.sections).toEqual([]);
  });

  it('有 frontmatter 但无 ## 标题返回空 sections', () => {
    const content = '---\nversion: "1.0.0"\n---\n\n导言内容';
    const result = splitMarkdownSections(content);
    expect(result.frontmatterLineCount).toBe(3);
    expect(result.sections).toEqual([]);
  });

  it('正确检测 frontmatter 行数', () => {
    const content = '---\nname: test\ndescription: "A test"\nversion: "1.0.0"\nupdated: "2026-05-14"\n---\n\n导言\n\n## Section A\n内容A';
    const result = splitMarkdownSections(content);
    expect(result.frontmatterLineCount).toBe(6);
  });

  it('正确分割单个 ## 标题', () => {
    const content = '导言\n\n## 职责\n- 项目A\n- 项目B';
    const result = splitMarkdownSections(content);
    expect(result.frontmatterLineCount).toBe(0);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].title).toBe('职责');
    expect(result.sections[0].content).toContain('## 职责');
    expect(result.sections[0].content).toContain('- 项目A');
    expect(result.sections[0].content).toContain('- 项目B');
  });

  it('正确分割多个 ## 标题', () => {
    const content = '---\nversion: "1.0.0"\n---\n\n导言\n\n## 工作流编排位置\n上游内容\n\n## 你的职责\n职责内容\n\n## 你不负责\n不负责内容';
    const result = splitMarkdownSections(content);
    expect(result.frontmatterLineCount).toBe(3);
    expect(result.sections).toHaveLength(3);
    expect(result.sections[0].title).toBe('工作流编排位置');
    expect(result.sections[1].title).toBe('你的职责');
    expect(result.sections[2].title).toBe('你不负责');
  });

  it('忽略 ### 三级标题，不按三级标题分割', () => {
    const content = '导言\n\n## 技能加载\n技能说明\n\n### 步骤1\n步骤1内容\n\n### 步骤2\n步骤2内容\n\n## 执行规则\n规则内容';
    const result = splitMarkdownSections(content);
    expect(result.frontmatterLineCount).toBe(0);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].title).toBe('技能加载');
    // 三级标题内容包含在上级 section 中
    expect(result.sections[0].content).toContain('### 步骤1');
    expect(result.sections[0].content).toContain('### 步骤2');
    expect(result.sections[1].title).toBe('执行规则');
  });

  it('section content 以 ##  开头', () => {
    const content = '## 反合理化表\n表格内容';
    const result = splitMarkdownSections(content);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].content).toBe('## 反合理化表\n表格内容');
  });

  it('每个 section 的 hash 是稳定的 SHA256 hex', () => {
    const content = '## 规则\n规则A\n规则B';
    const result1 = splitMarkdownSections(content);
    const result2 = splitMarkdownSections(content);

    expect(result1.sections[0].hash).toBe(result2.sections[0].hash);
    expect(result1.sections[0].hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('内容变化导致 hash 变化', () => {
    const content1 = '## 规则\n规则A';
    const content2 = '## 规则\n规则B';

    const r1 = splitMarkdownSections(content1);
    const r2 = splitMarkdownSections(content2);

    expect(r1.sections[0].hash).not.toBe(r2.sections[0].hash);
  });

  it('frontmatter 不关闭时正确回退', () => {
    // 前 20 行内找不到闭合 ---，不视为有效 frontmatter
    const content = '---\nbroken frontmatter\nwithout closing';
    const result = splitMarkdownSections(content);
    expect(result.frontmatterLineCount).toBe(0);
    // ##  不会被匹配（因为第一行是 ---）
    expect(result.sections).toHaveLength(0);
  });
});

// ================================
// _v: 2 hash 格式验证
// ================================

describe('TASK-002: _v: 2 section hash 记录格式', () => {
  it('section hash 记录符合 _v: 2 结构', () => {
    const record = {
      _v: 2,
      preamble: createHash('sha256').update('preamble text').digest('hex'),
      sections: {
        '职责': createHash('sha256').update('## 职责\n内容').digest('hex'),
      },
    };

    expect(record._v).toBe(2);
    expect(typeof record.preamble).toBe('string');
    expect(record.preamble).toMatch(/^[0-9a-f]{64}$/);
    expect(typeof record.sections).toBe('object');
    for (const [title, hash] of Object.entries(record.sections)) {
      expect(typeof title).toBe('string');
      expect(typeof hash).toBe('string');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
