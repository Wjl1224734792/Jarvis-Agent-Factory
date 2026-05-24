/**
 * 规范化媒体资源 URL——处理协议相对路径等边界情况。
 *
 * @param input - 原始 URL 字符串
 * @returns 规范化后的 URL；空输入返回空字符串
 */
export function normalizeMediaSrc(input: string): string {
  const value = (input ?? '').trim();
  if (!value) return '';
  return value.startsWith('//') ? `https:${value}` : value;
}
