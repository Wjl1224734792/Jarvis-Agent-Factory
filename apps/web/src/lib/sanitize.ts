import DOMPurify from "dompurify";
import type { Config } from "dompurify";

const ALLOWED_TAGS: Config["ALLOWED_TAGS"] = [
  "a",
  "img",
  "source",
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
  "iframe",
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
  "type",
  "allow",
  "allowfullscreen",
  "frameborder",
  "loading",
  "referrerpolicy",
  "colspan",
  "rowspan",
  "style",
  "data-video-block",
  "data-type"
];

const ALLOWED_URI_REGEXP =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|blob):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i;

const TRUSTED_IFRAME_HOSTS = ["youtube.com", "youtu.be", "bilibili.com", "player.bilibili.com"];

const SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOWED_URI_REGEXP,
  ADD_ATTR: ["target", "rel"],
  ADD_DATA_URI_TAGS: ["img"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
  FORBID_TAGS: ["script", "object", "embed", "form"],
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_TRUSTED_TYPE: false
};

function normalizeUrl(input: string) {
  if (input.startsWith("//")) {
    return `https:${input}`;
  }
  return input;
}

function isTrustedIframeSrc(src: string) {
  const value = src.trim();
  if (!value) {
    return false;
  }

  try {
    const url = new URL(normalizeUrl(value));
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return false;
    }
    return TRUSTED_IFRAME_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

function extractIframeSrc(iframeHtml: string) {
  const quoted = iframeHtml.match(/\ssrc\s*=\s*(["'])(.*?)\1/i);
  if (quoted?.[2]) {
    return quoted[2].trim();
  }
  const unquoted = iframeHtml.match(/\ssrc\s*=\s*([^\s>]+)/i);
  return unquoted?.[1]?.trim() ?? "";
}

function sanitizeIframes(dirty: string) {
  if (!dirty.includes("<iframe")) {
    return dirty;
  }

  if (typeof DOMParser !== "undefined" && typeof XMLSerializer !== "undefined") {
    const documentNode = new DOMParser().parseFromString(dirty, "text/html");
    const iframeNodes = Array.from(documentNode.querySelectorAll("iframe"));
    for (const iframeNode of iframeNodes) {
      const src = iframeNode.getAttribute("src")?.trim() ?? "";
      if (!isTrustedIframeSrc(src)) {
        iframeNode.remove();
        continue;
      }

      iframeNode.setAttribute("src", normalizeUrl(src));
      iframeNode.setAttribute("loading", "lazy");
      iframeNode.setAttribute("referrerpolicy", "no-referrer");
      iframeNode.setAttribute("allowfullscreen", "true");
      const allowValue = iframeNode.getAttribute("allow");
      if (!allowValue) {
        iframeNode.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
      }
    }
    return documentNode.body.innerHTML;
  }

  return dirty.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, (iframeHtml) => {
    const src = extractIframeSrc(iframeHtml);
    return isTrustedIframeSrc(src) ? iframeHtml : "";
  });
}

function sanitizeAnchors(dirty: string) {
  if (!dirty.includes("<a")) {
    return dirty;
  }

  if (typeof DOMParser !== "undefined") {
    const documentNode = new DOMParser().parseFromString(dirty, "text/html");
    const anchorNodes = Array.from(documentNode.querySelectorAll("a"));
    for (const anchorNode of anchorNodes) {
      const href = anchorNode.getAttribute("href")?.trim() ?? "";
      if (!href) {
        anchorNode.removeAttribute("target");
        anchorNode.removeAttribute("rel");
        continue;
      }
      if (/^blob:/i.test(href)) {
        anchorNode.removeAttribute("href");
        anchorNode.removeAttribute("target");
        anchorNode.removeAttribute("rel");
        continue;
      }
      const isHttpLink = /^https?:\/\//i.test(href) || href.startsWith("//");
      if (isHttpLink) {
        anchorNode.setAttribute("target", "_blank");
        anchorNode.setAttribute("rel", "noopener noreferrer nofollow");
      }
    }
    return documentNode.body.innerHTML;
  }

  return dirty.replace(/<a\b([^>]*)>/gi, (full, attrs: string) => {
    const quotedHref = attrs.match(/\bhref\s*=\s*(['"])(.*?)\1/i);
    const unquotedHref = attrs.match(/\bhref\s*=\s*([^\s>]+)/i);
    const href = quotedHref?.[2] ?? unquotedHref?.[1] ?? "";
    if (/^blob:/i.test(href.trim())) {
      const nextAttrs = attrs
        .replace(/\shref\s*=\s*(['"]).*?\1/gi, "")
        .replace(/\shref\s*=\s*[^\s>]+/gi, "")
        .replace(/\starget\s*=\s*(['"]).*?\1/gi, "")
        .replace(/\srel\s*=\s*(['"]).*?\1/gi, "");
      return `<a${nextAttrs}>`;
    }
    if (!/\bhref\s*=\s*(['"])(https?:\/\/|\/\/)/i.test(attrs)) {
      return `<a${attrs}>`;
    }
    const nextAttrs = attrs
      .replace(/\starget\s*=\s*(['"]).*?\1/gi, "")
      .replace(/\srel\s*=\s*(['"]).*?\1/gi, "");
    return `<a${nextAttrs} target="_blank" rel="noopener noreferrer nofollow">`;
  });
}

function ssrSanitize(dirty: string): string {
  const sanitized = String(dirty)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?<\/embed>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/\shref\s*=\s*(["'])\s*data:[\s\S]*?\1/gi, "")
    .replace(/\shref\s*=\s*data:[^\s>]+/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/on\w+\s*=\s*\S+/gi, "")
    .replace(/javascript\s*:/gi, "");
  return sanitizeAnchors(sanitizeIframes(sanitized));
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

  return sanitizeAnchors(sanitizeIframes(String(sanitize(dirty, SANITIZE_CONFIG))));
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
