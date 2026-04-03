import DOMPurify from "dompurify";
import type { Config } from "dompurify";

/**
 * 共享 HTML 清理工具 — 基于 DOMPurify。
 *
 * 用于在 dangerouslySetInnerHTML 渲染前清理用户提交的富文本 HTML，
 * 防止 XSS 攻击。
 */

// 允许的 HTML 标签（保留富文本编辑器常用标签）
const ALLOWED_TAGS: Config["ALLOWED_TAGS"] = [
  "a",
  "img",
  "strong",
  "em",
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "code",
  "pre",
  // TipTap 编辑器额外需要的标签
  "figure",
  "figcaption",
  "video",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "span",
  "div",
  "hr",
  "mark",
  "del",
  "ins",
  "sub",
  "sup",
  "u",
  "s",
];

// 允许的 HTML 属性
const ALLOWED_ATTR: Config["ALLOWED_ATTR"] = [
  "href",
  "src",
  "alt",
  "title",
  "class",
  // 额外需要的属性
  "target",
  "rel",
  "width",
  "height",
  "controls",
  "preload",
  "poster",
  "colspan",
  "rowspan",
  "style",
  "data-video-block",
  "data-type",
];

// 允许的 URL 协议
const ALLOWED_URI_REGEXP =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i;

/**
 * DOMPurify 清理配置。
 */
const SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOWED_URI_REGEXP,
  ADD_ATTR: ["target", "rel"],
  ADD_DATA_URI_TAGS: ["a", "img"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_TRUSTED_TYPE: false,
};

/**
 * SSR 环境下的简易清理函数。
 * 在服务端无 window/document 时做最基本的标签剥离，防止注入。
 */
function ssrSanitize(dirty: string): string {
  return String(dirty)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/on\w+\s*=\s*\S+/gi, "")
    .replace(/javascript\s*:/gi, "");
}

/**
 * 清理 HTML 字符串，返回安全的 HTML。
 *
 * @param dirty - 待清理的 HTML 字符串
 * @returns 清理后的安全 HTML
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== "string") {
    return "";
  }

  // SSR 兼容：服务端无 window 时使用简易清理
  if (typeof window === "undefined") {
    return ssrSanitize(dirty);
  }

  return DOMPurify.sanitize(dirty, SANITIZE_CONFIG);
}

/**
 * 将纯文本转义为安全的 HTML 实体。
 *
 * 用于将用户输入的 displayName、bio 等纯文本安全地嵌入 HTML。
 *
 * @param text - 待转义的纯文本
 * @returns 转义后的 HTML 安全字符串
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char] ?? char);
}
