type PowerType = "electric" | "fuel" | "hybrid" | "other";

const modelMediaPools: Record<PowerType, string[]> = {
  electric: [
    "https://images.unsplash.com/photo-1529078155058-5d716f45d604?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1508444845599-5c89863b1c44?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=1400&q=80"
  ],
  fuel: [
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1521727857535-28d2047314ac?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1518991791750-7499f803d71c?auto=format&fit=crop&w=1400&q=80"
  ],
  hybrid: [
    "https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1544016768-982d1554f0b9?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=80"
  ],
  other: [
    "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1529078155058-5d716f45d604?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1544016768-982d1554f0b9?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1400&q=80"
  ]
};

const editorialMediaPool = [
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1519638399535-1b036603ac77?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1544016768-982d1554f0b9?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1529078155058-5d716f45d604?auto=format&fit=crop&w=1400&q=80"
];

const profileBannerPool = [
  "https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1800&q=80"
];

const avatarPool = [
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=320&q=80",
  "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=320&q=80"
];

function hashSeed(seed: string): number {
  return Array.from(seed).reduce((value, char) => value + char.charCodeAt(0), 0);
}

function pickFromPool(pool: string[], seed: string, offset = 0): string {
  const index = (hashSeed(seed) + offset) % pool.length;
  return pool[index]!;
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
