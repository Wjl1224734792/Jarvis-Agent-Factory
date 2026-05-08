/**
 * punycode 类型 stub。
 * 拦截 @types/node 对 node_modules/punycode/punycode.js 的解析，
 * 避免 checkJs 检查第三方 JS 文件。
 */
declare module 'punycode' {
  export function decode(input: string): string;
  export function encode(input: string): string;
  export function toASCII(input: string): string;
  export function toUnicode(input: string): string;
  export const version: string;
}
