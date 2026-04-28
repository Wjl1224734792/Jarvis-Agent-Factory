/**
 * 归一化用户头像地址，空值统一交给上层 fallback 组件处理。
 *
 * @param value 原始头像地址。
 * @returns 去掉空白后的有效地址；空值返回 `undefined`。
 * @throws {never} 该函数只做字符串归一化，不会主动抛出异常。
 */
export function resolveUserAvatarSrc(
  value: string | null | undefined
): string | undefined {
  const next = value?.trim();

  return next ? next : undefined;
}
