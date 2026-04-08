import DOMPurify from "dompurify";
import type { Config } from "dompurify";

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
  "s"
];

const ALLOWED_ATTR: Config["ALLOWED_ATTR"] = [
  "href",
  "src",
  "alt",
  "title",
  "class",
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
  "data-type"
];

const ALLOWED_URI_REGEXP =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i;

const SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOWED_URI_REGEXP,
  ADD_ATTR: ["target", "rel"],
  ADD_DATA_URI_TAGS: ["img"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_TRUSTED_TYPE: false
};

function ssrSanitize(dirty: string): string {
  return String(dirty)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/\shref\s*=\s*(["'])\s*data:[\s\S]*?\1/gi, "")
    .replace(/\shref\s*=\s*data:[^\s>]+/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/on\w+\s*=\s*\S+/gi, "")
    .replace(/javascript\s*:/gi, "");
}

type DomPurifySanitizer = (dirty: string, config?: Config) => string;

function getDomPurifySanitizer() {
  const candidate = DOMPurify as unknown;

  if (
    candidate &&
    typeof candidate === "object" &&
    typeof (candidate as { sanitize?: unknown }).sanitize === "function"
  ) {
    return (candidate as { sanitize: DomPurifySanitizer }).sanitize.bind(candidate);
  }

  if (typeof window !== "undefined" && typeof candidate === "function") {
    const purifier = (
      candidate as (root: Window) => { sanitize?: DomPurifySanitizer }
    )(window);

    if (purifier && typeof purifier.sanitize === "function") {
      return purifier.sanitize.bind(purifier);
    }
  }

  return null;
}

export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== "string") {
    return "";
  }

  const sanitize = getDomPurifySanitizer();

  if (typeof window === "undefined" || !sanitize) {
    return ssrSanitize(dirty);
  }

  return String(sanitize(dirty, SANITIZE_CONFIG));
}

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
    "/": "&#x2F;"
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char] ?? char);
}
