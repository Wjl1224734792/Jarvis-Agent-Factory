/**
 * 将站内 path（含 query）转为可分享的绝对 URL（仅浏览器环境有效）。
 */
export function toAbsoluteShareUrl(path: string): string {
  if (typeof window === "undefined") {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, window.location.origin).href;
}
