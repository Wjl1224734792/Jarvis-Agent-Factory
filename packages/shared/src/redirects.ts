/**
 * 登录重定向辅助函数 stub。
 * 实际实现待后续开发。
 */
export function buildLoginRedirectUrl(_target: string): string {
  return _target;
}

export function buildRedirectTarget(_path: string): string {
  return _path;
}

export function resolveSafeRedirectPath(input: string | null | undefined): string {
  if (!input) return "/";
  return input.startsWith("/") && !input.startsWith("//") ? input : "/";
}
