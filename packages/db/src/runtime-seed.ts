export const RUNTIME_SEED_ASSETS: Record<string, Record<string, any>> = new Proxy({}, {
  get: (_target, prop: string) => new Proxy({}, {
    get: (_t, key: string) => ({ key, url: `https://example.com/seed-${String(prop)}-${key}.jpg` })
  })
});

export function resolveRuntimeSeedAssetUrl(asset: { key?: string; url?: string } | string | undefined): string | null {
  if (!asset) return null;
  if (typeof asset === "string") return asset;
  return asset.url ?? null;
}

export async function seedRuntimeArtifacts() {
  console.log("[db] seedRuntimeArtifacts stub — no-op");
}
