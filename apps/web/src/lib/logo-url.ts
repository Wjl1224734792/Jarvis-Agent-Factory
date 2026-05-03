const LOGO_MODULES: Record<string, { default: string }> = {
  ...import.meta.glob<{ default: string }>(
    "../../../../packages/shared/assets/logo/logo.png",
    { eager: true }
  ),
  ...import.meta.glob<{ default: string }>(
    "../../../../packages/shared/assets/logo/logo.jpg",
    { eager: true }
  ),
  ...import.meta.glob<{ default: string }>(
    "../../../../packages/shared/assets/logo/logo.jpeg",
    { eager: true }
  ),
  ...import.meta.glob<{ default: string }>(
    "../../../../packages/shared/assets/logo/logo.webp",
    { eager: true }
  ),
};

const PRIORITY = [".webp", ".png", ".jpg", ".jpeg"] as const;

function pickLogoUrl(): string {
  const entries = Object.entries(LOGO_MODULES);
  for (const ext of PRIORITY) {
    const match = entries.find(([path]) => path.toLowerCase().endsWith(ext));
    if (match?.[1]?.default) return match[1].default;
  }
  return "";
}

export const logoUrl: string = pickLogoUrl();
