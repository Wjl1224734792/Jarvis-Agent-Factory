import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

/**
 * Frontmatter 搜索行数上限。
 * 统一 readFrontmatter 与 setFrontmatterFields 使用，避免行为不对称。
 */
export const FM_SEARCH_LIMIT = 30;

/**
 * 读取 Markdown 文件 YAML frontmatter。
 * 只解析前 FM_SEARCH_LIMIT 行；缺少 version 字段时默认 "0.0.0"（REQ-006 向后兼容）。
 *
 * @param filePath 文件绝对路径
 * @returns frontmatter 键值对，至少包含 version 字段
 */
export function readFrontmatter(filePath: string): { version?: string; updated?: string; [key: string]: string | undefined } {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // 无 frontmatter（不以 --- 开头）
    if (lines.length === 0 || lines[0].trim() !== '---') {
      return { version: '0.0.0' };
    }

    // 查找闭合的 ---（限定前 FM_SEARCH_LIMIT 行）
    let closingIdx = -1;
    const searchLimit = Math.min(lines.length, FM_SEARCH_LIMIT);
    for (let i = 1; i < searchLimit; i++) {
      if (lines[i].trim() === '---') {
        closingIdx = i;
        break;
      }
    }

    if (closingIdx === -1) {
      return { version: '0.0.0' };
    }

    // 解析 key: value 对
    const result: Record<string, string | undefined> = {};
    for (let i = 1; i < closingIdx; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.substring(0, colonIdx).trim();
        let value = line.substring(colonIdx + 1).trim();
        // 去除首尾引号
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        result[key] = value;
      }
    }

    // 缺少 version 时默认 "0.0.0"
    if (!result.version) {
      result.version = '0.0.0';
    }

    return result;
  } catch {
    return { version: '0.0.0' };
  }
}

/**
 * 按 ## 二级标题分割 Markdown 内容。
 * frontmatter 块和第一个 ## 之前的内容作为独立 preamble（不计入 sections）。
 * 返回各 section 的标题、内容和 SHA256 hash。
 *
 * @param content 文件完整文本内容
 * @returns frontmatter 行数及各 section 信息
 */
export function splitMarkdownSections(content: string): {
  frontmatterLineCount: number;
  sections: { title: string; content: string; hash: string }[];
} {
  const lines = content.split('\n');

  // 空文件处理
  if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
    return { frontmatterLineCount: 0, sections: [] };
  }

  // 检测 frontmatter（--- ... ---）
  let frontmatterLineCount = 0;
  if (lines[0].trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        frontmatterLineCount = i + 1; // 含闭合 --- 行
        break;
      }
    }
  }

  // 按 ##  二级标题（非 ### 等更深级标题）分割
  const sections: { title: string; content: string; hash: string }[] = [];
  let i = frontmatterLineCount;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ') && line.charAt(3) !== '#') {
      const title = line.substring(3).trim();
      const sectionStart = i;
      i++;
      // 收集到下一个 ##  或文件末尾
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

/**
 * 计算 Markdown 文件的分段 SHA256 hash。
 * preamble 取自 frontmatter 之后、第一个 ## 之前的内容。
 *
 * @param filePath 文件绝对路径
 * @returns preamble hash 及各 section 的 title→hash 映射
 */
export function computeSectionHashes(filePath: string): {
  preamble: string;
  sections: Record<string, string>;
} {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const { frontmatterLineCount, sections } = splitMarkdownSections(content);

  // preamble: frontmatter 行之后、第一个 ## 标题之前的内容
  const preambleLines: string[] = [];
  for (let i = frontmatterLineCount; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ') && line.charAt(3) !== '#') {
      break;
    }
    preambleLines.push(line);
  }
  const preambleContent = preambleLines.join('\n');
  const preamble = createHash('sha256').update(preambleContent).digest('hex');

  // 构建 { title: hash } 映射
  const sectionsRecord: Record<string, string> = {};
  for (const section of sections) {
    sectionsRecord[section.title] = section.hash;
  }

  return { preamble, sections: sectionsRecord };
}

/**
 * 判断旧 hash 记录是否为 section 级格式（_v: 2）。
 *
 * @param record 待检查的 hash 记录值
 */
export function isSectionHashRecord(record: unknown): record is { _v: 2; preamble: string; sections: Record<string, string> } {
  return typeof record === 'object' && record !== null &&
    (record as Record<string, unknown>)._v === 2 &&
    typeof (record as Record<string, unknown>).preamble === 'string' &&
    typeof (record as Record<string, unknown>).sections === 'object';
}
