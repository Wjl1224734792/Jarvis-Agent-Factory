// SVG logo 优先，体积 <1KB，无需回退到大体积位图
const LOGO_MODULES = import.meta.glob<{ default: string }>(
  "../../../../packages/shared/assets/logo/logo.svg",
  { eager: true }
);

function pickLogoUrl(): string {
  for (const mod of Object.values(LOGO_MODULES)) {
    if (mod?.default) return mod.default;
  }
  return "";
}

export const logoUrl: string = pickLogoUrl();
