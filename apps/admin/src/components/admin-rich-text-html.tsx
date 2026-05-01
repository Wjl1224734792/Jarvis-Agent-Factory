import { useMemo } from "react";

const TRUSTED_IFRAME_HOSTS = [
  "youtube.com",
  "youtu.be",
  "bilibili.com",
  "player.bilibili.com"
];
const URL_ATTRS = new Set(["href", "poster", "src"]);
const LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const MEDIA_PROTOCOLS = new Set(["http:", "https:", "blob:"]);
const ALLOWED_STYLE_PROPERTIES = new Set([
  "background-color",
  "color",
  "text-align"
]);
const SAFE_COLOR_VALUE_PATTERN =
  /^(?:#[0-9a-f]{3,8}|rgba?\([\d\s,.%]+\)|hsla?\([\d\s,.%]+\)|[a-z]+)$/i;
const SAFE_TEXT_ALIGN_VALUES = new Set([
  "center",
  "end",
  "justify",
  "left",
  "right",
  "start"
]);

type AdminRichTextHtmlProps = {
  className?: string;
  fallbackHtml?: string;
  html: string | null | undefined;
};

function normalizeProtocolRelativeUrl(value: string) {
  return value.startsWith("//") ? `https:${value}` : value;
}

function extractIframeSrc(iframeHtml: string) {
  const quoted = iframeHtml.match(/\ssrc\s*=\s*(["'])(.*?)\1/i);
  if (quoted?.[2]) {
    return quoted[2].trim();
  }

  const unquoted = iframeHtml.match(/\ssrc\s*=\s*([^\s>]+)/i);
  return unquoted?.[1]?.trim() ?? "";
}

function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getSafeUrl(value: string, attrName: string) {
  const normalized = normalizeProtocolRelativeUrl(value.trim());
  if (!normalized) {
    return null;
  }

  if (/^(?:javascript|data|vbscript|file):/i.test(normalized)) {
    return null;
  }

  if (/^(?:\/|#)/.test(normalized)) {
    return normalized;
  }

  try {
    const url = new URL(normalized);
    const allowedProtocols = attrName === "href" ? LINK_PROTOCOLS : MEDIA_PROTOCOLS;
    return allowedProtocols.has(url.protocol) ? normalized : null;
  } catch {
    return null;
  }
}

function isTrustedIframeSrc(src: string) {
  const safeSrc = getSafeUrl(src, "src");
  if (!safeSrc) {
    return false;
  }

  try {
    const url = new URL(safeSrc);
    return TRUSTED_IFRAME_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

function sanitizeStyleDeclaration(property: string, value: string) {
  const normalizedProperty = property.trim().toLowerCase();
  const normalizedValue = value.trim().replace(/\s+/g, " ");

  if (!ALLOWED_STYLE_PROPERTIES.has(normalizedProperty) || !normalizedValue) {
    return null;
  }

  if (/url\s*\(|expression\s*\(|javascript\s*:|data\s*:/i.test(normalizedValue)) {
    return null;
  }

  if (
    (normalizedProperty === "color" || normalizedProperty === "background-color") &&
    !SAFE_COLOR_VALUE_PATTERN.test(normalizedValue)
  ) {
    return null;
  }

  if (
    normalizedProperty === "text-align" &&
    !SAFE_TEXT_ALIGN_VALUES.has(normalizedValue.toLowerCase())
  ) {
    return null;
  }

  return `${normalizedProperty}: ${normalizedValue}`;
}

function sanitizeStyleAttribute(style: string) {
  return style
    .split(";")
    .map((declaration) => {
      const separatorIndex = declaration.indexOf(":");
      if (separatorIndex === -1) {
        return null;
      }

      return sanitizeStyleDeclaration(
        declaration.slice(0, separatorIndex),
        declaration.slice(separatorIndex + 1)
      );
    })
    .filter((declaration): declaration is string => Boolean(declaration))
    .join("; ");
}

function sanitizeWithDomParser(dirty: string) {
  const documentNode = new DOMParser().parseFromString(dirty, "text/html");

  documentNode
    .querySelectorAll("script, object, embed, form")
    .forEach((node) => node.remove());

  documentNode.querySelectorAll("iframe").forEach((iframeNode) => {
    const src = iframeNode.getAttribute("src")?.trim() ?? "";
    const safeSrc = getSafeUrl(src, "src");
    if (!safeSrc || !isTrustedIframeSrc(safeSrc)) {
      iframeNode.remove();
      return;
    }

    for (const attr of Array.from(iframeNode.attributes)) {
      iframeNode.removeAttribute(attr.name);
    }
    iframeNode.setAttribute("src", safeSrc);
    iframeNode.setAttribute("loading", "lazy");
    iframeNode.setAttribute("referrerpolicy", "no-referrer");
    iframeNode.setAttribute("allowfullscreen", "true");
  });

  documentNode.querySelectorAll("*").forEach((node) => {
    for (const attr of Array.from(node.attributes)) {
      const attrName = attr.name.toLowerCase();
      if (attrName.startsWith("on")) {
        node.removeAttribute(attr.name);
        continue;
      }

      if (URL_ATTRS.has(attrName)) {
        const safeUrl = getSafeUrl(attr.value, attrName);
        if (safeUrl) {
          node.setAttribute(attr.name, safeUrl);
        } else {
          node.removeAttribute(attr.name);
        }
        continue;
      }

      if (attrName === "style") {
        const nextStyle = sanitizeStyleAttribute(attr.value);
        if (nextStyle) {
          node.setAttribute("style", nextStyle);
        } else {
          node.removeAttribute("style");
        }
      }
    }
  });

  return documentNode.body.innerHTML;
}

function sanitizeIframesFallback(dirty: string) {
  return dirty.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, (iframeHtml) => {
    const src = extractIframeSrc(iframeHtml);
    const safeSrc = getSafeUrl(src, "src");
    if (!safeSrc || !isTrustedIframeSrc(safeSrc)) {
      return "";
    }

    return `<iframe src="${escapeAttribute(safeSrc)}" loading="lazy" referrerpolicy="no-referrer" allowfullscreen="true"></iframe>`;
  });
}

function sanitizeStylesFallback(dirty: string) {
  return dirty
    .replace(/\sstyle\s*=\s*(["'])(.*?)\1/gi, (_full, quote: string, value: string) => {
      const nextStyle = sanitizeStyleAttribute(value);
      return nextStyle ? ` style=${quote}${nextStyle}${quote}` : "";
    })
    .replace(/\sstyle\s*=\s*([^"'\s>][^\s>]*)/gi, (_full, value: string) => {
      const nextStyle = sanitizeStyleAttribute(value);
      return nextStyle ? ` style="${nextStyle}"` : "";
    });
}

function sanitizeUrlsFallback(dirty: string) {
  return dirty.replace(
    /\s(href|poster|src)\s*=\s*(?:(["'])(.*?)\2|([^\s>]+))/gi,
    (_full, attrName: string, quote: string | undefined, quotedValue: string | undefined, unquotedValue: string | undefined) => {
      const safeUrl = getSafeUrl(quotedValue ?? unquotedValue ?? "", attrName.toLowerCase());
      if (!safeUrl) {
        return "";
      }

      return ` ${attrName.toLowerCase()}=${quote ?? '"'}${escapeAttribute(safeUrl)}${quote ?? '"'}`;
    }
  );
}

function sanitizeWithFallback(dirty: string) {
  return sanitizeUrlsFallback(
    sanitizeStylesFallback(
      sanitizeIframesFallback(
        dirty
          .replace(/<script\b[\s\S]*?<\/script>/gi, "")
          .replace(/<object\b[\s\S]*?<\/object>/gi, "")
          .replace(/<embed\b[\s\S]*?<\/embed>/gi, "")
          .replace(/<form\b[\s\S]*?<\/form>/gi, "")
          .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      )
    )
  );
}

export function sanitizeAdminRichTextHtml(dirty: string | null | undefined) {
  if (!dirty?.trim()) {
    return "";
  }

  return typeof DOMParser === "undefined"
    ? sanitizeWithFallback(dirty)
    : sanitizeWithDomParser(dirty);
}

export function AdminRichTextHtml(props: AdminRichTextHtmlProps) {
  const sanitizedHtml = useMemo(
    () => sanitizeAdminRichTextHtml(props.html || props.fallbackHtml || ""),
    [props.fallbackHtml, props.html]
  );

  return (
    <div
      className={props.className}
      dangerouslySetInnerHTML={{
        __html: sanitizedHtml
      }}
    />
  );
}
