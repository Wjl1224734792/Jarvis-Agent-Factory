export function resolveUserAvatarSrc(value: string | null | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}
