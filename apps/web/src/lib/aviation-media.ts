type PowerType = "electric" | "fuel" | "hybrid" | "other";

/** 使用 picsum.photos 作为兜底图片源（Unsplash 国内可能不可用） */
const fallbackFlightPhoto =
  "https://picsum.photos/seed/aviation-flight/800/600";

const modelMediaPools: Record<PowerType, string[]> = {
  electric: [
    "https://picsum.photos/seed/drone-electric-1/800/600",
    "https://picsum.photos/seed/drone-electric-2/800/600",
    "https://picsum.photos/seed/drone-electric-3/800/600",
    "https://picsum.photos/seed/drone-electric-4/800/600"
  ],
  fuel: [
    fallbackFlightPhoto,
    "https://picsum.photos/seed/helicopter-fuel-1/800/600",
    "https://picsum.photos/seed/helicopter-fuel-2/800/600",
    "https://picsum.photos/seed/jet-fuel-1/800/600"
  ],
  hybrid: [
    "https://picsum.photos/seed/drone-electric-1/800/600",
    "https://picsum.photos/seed/evtol-hybrid-1/800/600",
    "https://picsum.photos/seed/drone-electric-4/800/600",
    fallbackFlightPhoto
  ],
  other: [
    "https://picsum.photos/seed/drone-electric-4/800/600",
    "https://picsum.photos/seed/drone-electric-2/800/600",
    "https://picsum.photos/seed/evtol-hybrid-1/800/600",
    fallbackFlightPhoto
  ]
};

const editorialMediaPool = [
  "https://picsum.photos/seed/editorial-tech-1/800/600",
  "https://picsum.photos/seed/editorial-drone-1/800/600",
  "https://picsum.photos/seed/editorial-city-1/800/600",
  "https://picsum.photos/seed/editorial-evtol-1/800/600",
  fallbackFlightPhoto,
  "https://picsum.photos/seed/editorial-drone-2/800/600"
];

const profileBannerPool = [
  "https://picsum.photos/seed/profile-banner-1/1200/400",
  "https://picsum.photos/seed/profile-banner-2/1200/400",
  "https://picsum.photos/seed/profile-banner-3/1200/400"
];

const avatarPool = [
  "https://picsum.photos/seed/avatar-person-1/200/200",
  "https://picsum.photos/seed/avatar-person-2/200/200",
  "https://picsum.photos/seed/avatar-person-3/200/200",
  "https://picsum.photos/seed/avatar-person-4/200/200"
];

function hashSeed(seed: string): number {
  return Array.from(seed).reduce((value, char) => value + char.charCodeAt(0), 0);
}

function pickFromPool(pool: string[], seed: string, offset = 0): string {
  const index = (hashSeed(seed) + offset) % pool.length;
  return pool[index];
}

export function getModelImage(seed: string, powerType: PowerType, offset = 0): string {
  return pickFromPool(modelMediaPools[powerType], seed, offset);
}

export function getModelGallery(seed: string, powerType: PowerType, count = 4): string[] {
  return Array.from({ length: count }, (_, index) => getModelImage(seed, powerType, index));
}

export function getEditorialImage(seed: string, offset = 0): string {
  return pickFromPool(editorialMediaPool, seed, offset);
}

export function getProfileBanner(seed: string): string {
  return pickFromPool(profileBannerPool, seed);
}

export function getAvatarImage(seed: string): string {
  return pickFromPool(avatarPool, seed);
}
