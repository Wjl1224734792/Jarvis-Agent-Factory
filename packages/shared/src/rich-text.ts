const URL_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;
const BARE_DOMAIN_PATTERN = /^[^/\s]+\.[^/\s]+(?:[/?#].*)?$/i;
const LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const MEDIA_PROTOCOLS = new Set(["http:", "https:", "blob:"]);

function hasWhitespace(value: string) {
  return /\s/.test(value);
}

function normalizeProtocolRelativeUrl(value: string) {
  return value.startsWith("//") ? `https:${value}` : value;
}

function normalizeBareDomain(value: string) {
  if (value.startsWith("www.") || BARE_DOMAIN_PATTERN.test(value)) {
    return `https://${value}`;
  }

  return value;
}

function hasAllowedProtocol(value: string, protocols: Set<string>) {
  try {
    return protocols.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

function normalizeExternalUrl(input: string) {
  const value = input.trim();
  if (!value || hasWhitespace(value)) {
    return "";
  }

  if (URL_SCHEME_PATTERN.test(value)) {
    return value;
  }

  return normalizeBareDomain(normalizeProtocolRelativeUrl(value));
}

function extractIframeSrc(iframeHtml: string) {
  const quoted = iframeHtml.match(/\ssrc\s*=\s*(["'])(.*?)\1/i);
  if (quoted?.[2]) {
    return quoted[2].trim();
  }

  const unquoted = iframeHtml.match(/\ssrc\s*=\s*([^\s>]+)/i);
  return unquoted?.[1]?.trim() ?? "";
}

/**
 * Normalize user-entered rich text links while rejecting unsafe protocols.
 */
export function normalizeRichTextLinkHref(input: string) {
  const value = normalizeExternalUrl(input);
  if (!value) {
    return "";
  }

  if (URL_SCHEME_PATTERN.test(value)) {
    return hasAllowedProtocol(value, LINK_PROTOCOLS) ? value : "";
  }

  return value;
}

/**
 * Normalize image/video URLs entered through the editor URL dialogs or
 * generated as local blob previews before the final upload URL is available.
 */
export function normalizeRichTextMediaUrl(input: string) {
  const value = normalizeExternalUrl(input);
  if (!value || !URL_SCHEME_PATTERN.test(value)) {
    return "";
  }

  return hasAllowedProtocol(value, MEDIA_PROTOCOLS) ? value : "";
}

/**
 * wangEditor video inserts accept either a video URL or third-party iframe HTML.
 */
export function normalizeRichTextVideoSource(input: string) {
  const value = input.trim();
  if (!value) {
    return "";
  }

  if (/^<iframe\b/i.test(value)) {
    return normalizeRichTextMediaUrl(extractIframeSrc(value)) ? value : "";
  }

  return normalizeRichTextMediaUrl(value);
}
