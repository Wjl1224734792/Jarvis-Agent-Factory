const LOGO_MODULES: Record<string, { default: string }> = {
  ...import.meta.glob<{ default: string }>("../assets/logo.png", { eager: true }),
  ...import.meta.glob<{ default: string }>("../assets/logo.jpg", { eager: true }),
  ...import.meta.glob<{ default: string }>("../assets/logo.jpeg", { eager: true }),
  ...import.meta.glob<{ default: string }>("../assets/logo.webp", { eager: true }),
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
