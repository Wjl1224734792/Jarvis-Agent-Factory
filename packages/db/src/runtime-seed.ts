import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { createClient } from "redis";

type RuntimeSeedSummary = {
  storage: { provider: string; bucket: string; objectCount: number } | { skipped: string };
  redis: { keyCount: number } | { skipped: string };
};

type RuntimeSeedAsset = {
  key: string;
  contentType: "image/png" | "video/mp4";
};

export const RUNTIME_SEED_ASSETS = {
  images: {
    officialLaunch: { key: "seed/articles/official-launch.png", contentType: "image/png" },
    officialGuide: { key: "seed/articles/official-guide.png", contentType: "image/png" },
    droneChecklist: { key: "seed/articles/drone-checklist.png", contentType: "image/png" },
    cityRoute: { key: "seed/articles/city-route.png", contentType: "image/png" },
    valleyFlight: { key: "seed/moments/valley-flight.png", contentType: "image/png" },
    coastPatrol: { key: "seed/moments/coast-patrol.png", contentType: "image/png" },
    rankingOfficial: { key: "seed/rankings/official-ranking-cover.png", contentType: "image/png" },
    rankingCommunity: { key: "seed/rankings/community-ranking-cover.png", contentType: "image/png" },
    rankingMini: { key: "seed/rankings/dji-mini-4-pro.png", contentType: "image/png" },
    rankingMavic: { key: "seed/rankings/dji-mavic-3-pro.png", contentType: "image/png" },
    rankingAutel: { key: "seed/rankings/autel-evo-lite-plus.png", contentType: "image/png" },
    submissionMini: { key: "seed/submissions/mini-4-pro-submission.png", contentType: "image/png" },
    submissionVtol: { key: "seed/submissions/vtol-proposal.png", contentType: "image/png" },
    hotCircleDawn: { key: "home/hot-circle/dawn-squad.png", contentType: "image/png" },
    hotCircleMavic: { key: "home/hot-circle/mavic-3-pro-review.png", contentType: "image/png" },
    hotCircleRanking: { key: "home/hot-circle/ranking-card.png", contentType: "image/png" },
    hotCircleNight: { key: "home/hot-circle/night-sky.png", contentType: "image/png" },
    hotCircleAutel: { key: "home/hot-circle/autel-lite.png", contentType: "image/png" },
    hotCircleEvtol: { key: "home/hot-circle/eVTOL-canyon.png", contentType: "image/png" },
    hotCircleVote: { key: "home/hot-circle/community-vote.png", contentType: "image/png" }
  },
  videos: {
    officialBriefing: { key: "seed/videos/official-briefing.mp4", contentType: "video/mp4" },
    hangarWalkthrough: { key: "seed/videos/hangar-walkthrough.mp4", contentType: "video/mp4" }
  }
} as const satisfies Record<string, Record<string, RuntimeSeedAsset>>;

const HOT_CIRCLE_TOPICS = [
  "dawn-low-altitude-training",
  "harbor-lighthouse-route",
  "mavic-3-pro-deep-review",
  "autel-canyon-performance",
  "official-endurance-board-update",
  "delta-flight-checkin",
  "grassland-evtol-log",
  "hot-ranking-3d-score",
  "mini-4-pro-rth-qa",
  "night-light-show",
  "custom-ranking-list",
  "joby-s4-quick-note"
] as const;

const DEMO_REDIS_KEYS = {
  hotCircle: "feed:hot-circle",
  hotModels: "feed:hot-models",
  hotRankings: "feed:hot-rankings",
  heroMedia: "feed:hero-media"
} as const;

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO1f4f8AAAAASUVORK5CYII=",
  "base64"
);

const TINY_MP4 = Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]);

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function resolveStorageProvider(): "minio" | "cos" | "oss" | "kodo" | null {
  const raw = process.env.STORAGE_PROVIDER?.toLowerCase().trim();
  if (!raw) {
    return "minio";
  }

  if (raw === "minio" || raw === "cos" || raw === "oss" || raw === "kodo") {
    return raw;
  }

  return null;
}

function resolveCacheKey(key: string) {
  const prefix = process.env.CACHE_KEY_PREFIX?.trim().replace(/:+$/g, "");
  return prefix ? `${prefix}:${key}` : key;
}

function normalizeBaseUrl(
  endpoint: string,
  bucket: string,
  forcePathStyle: boolean,
  explicitPublicBaseUrl?: string
) {
  if (explicitPublicBaseUrl?.trim()) {
    return explicitPublicBaseUrl.trim().replace(/\/+$/g, "");
  }

  const normalizedEndpoint = endpoint.replace(/\/+$/g, "");
  const url = new URL(normalizedEndpoint);

  if (forcePathStyle) {
    const pathname = url.pathname.replace(/\/+$/g, "");
    return `${url.origin}${pathname}/${bucket}`.replace(/\/+$/g, "");
  }

  const pathname = url.pathname.replace(/\/+$/g, "");
  if (pathname && pathname !== "/") {
    return `${url.origin}${pathname}/${bucket}`.replace(/\/+$/g, "");
  }

  return `${url.protocol}//${bucket}.${url.host}`;
}

function resolveStorageBaseUrl() {
  const provider = resolveStorageProvider();
  if (!provider) {
    throw new Error("Unsupported STORAGE_PROVIDER. Expected minio|cos|oss|kodo.");
  }

  const endpoint = process.env.STORAGE_ENDPOINT?.trim() || "http://localhost:9000";
  const bucket = process.env.STORAGE_BUCKET?.trim() || "feijia-media";
  const forcePathStyle = parseBoolean(process.env.STORAGE_FORCE_PATH_STYLE, provider === "minio");

  return normalizeBaseUrl(endpoint, bucket, forcePathStyle, process.env.STORAGE_PUBLIC_BASE_URL);
}

function resolveStorageKeyPrefix() {
  return process.env.STORAGE_KEY_PREFIX?.trim().replace(/^\/+|\/+$/g, "") || "";
}

function listRuntimeSeedRedisKeys() {
  const rawKeys = Object.values(DEMO_REDIS_KEYS);
  const resolvedKeys = rawKeys.map((key) => resolveCacheKey(key));

  return Array.from(new Set([...rawKeys, ...resolvedKeys]));
}

function listRuntimeSeedAssets() {
  return [
    ...Object.values(RUNTIME_SEED_ASSETS.images),
    ...Object.values(RUNTIME_SEED_ASSETS.videos)
  ];
}

export function resolveRuntimeSeedObjectKey(key: string) {
  const prefix = resolveStorageKeyPrefix();
  return prefix ? `${prefix}/${key}` : key;
}

export function resolveRuntimeSeedAssetUrl(key: string) {
  return `${resolveStorageBaseUrl()}/${resolveRuntimeSeedObjectKey(key)}`;
}

async function seedStorageArtifacts(): Promise<RuntimeSeedSummary["storage"]> {
  const provider = resolveStorageProvider();
  if (!provider) {
    return { skipped: "Unsupported STORAGE_PROVIDER. Expected minio|cos|oss|kodo." };
  }

  const bucket = process.env.STORAGE_BUCKET?.trim() || "feijia-media";
  const endpoint = process.env.STORAGE_ENDPOINT?.trim() || "http://localhost:9000";
  const region = process.env.STORAGE_REGION?.trim() || "us-east-1";
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID?.trim() || "minioadmin";
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY?.trim() || "minioadmin123";
  const autoCreateBucket = parseBoolean(process.env.STORAGE_AUTO_CREATE_BUCKET, true);
  const forcePathStyle = parseBoolean(process.env.STORAGE_FORCE_PATH_STYLE, provider === "minio");

  const client = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey
    },
    forcePathStyle
  });

  if (autoCreateBucket) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  }

  if (provider === "minio") {
    await client.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Sid: "PublicReadSeedAssets",
              Effect: "Allow",
              Principal: "*",
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${bucket}/*`]
            }
          ]
        })
      })
    );
  }

  for (const asset of listRuntimeSeedAssets()) {
    const key = resolveRuntimeSeedObjectKey(asset.key);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: asset.contentType === "image/png" ? ONE_PIXEL_PNG : TINY_MP4,
        ContentType: asset.contentType,
        CacheControl: "public, max-age=86400",
        Metadata: {
          seed: "true"
        }
      })
    );
  }

  return {
    provider,
    bucket,
    objectCount: listRuntimeSeedAssets().length
  };
}

async function seedRedisArtifacts(): Promise<RuntimeSeedSummary["redis"]> {
  const cacheProvider = process.env.CACHE_PROVIDER?.toLowerCase().trim() ?? "redis";
  if (cacheProvider !== "redis") {
    return { skipped: "CACHE_PROVIDER is not redis." };
  }

  const redisUrl = process.env.REDIS_URL?.trim() || "redis://:qwertyuiop@localhost:6379/0";
  const client = createClient({ url: redisUrl });

  await client.connect();
  try {
    const circleImages = [
      RUNTIME_SEED_ASSETS.images.hotCircleDawn.key,
      RUNTIME_SEED_ASSETS.images.hotCircleMavic.key,
      RUNTIME_SEED_ASSETS.images.hotCircleRanking.key,
      RUNTIME_SEED_ASSETS.images.hotCircleNight.key,
      RUNTIME_SEED_ASSETS.images.hotCircleAutel.key,
      RUNTIME_SEED_ASSETS.images.hotCircleEvtol.key,
      RUNTIME_SEED_ASSETS.images.hotCircleVote.key
    ];

    const circlePayload = HOT_CIRCLE_TOPICS.slice(0, 7).map((topic, index) => ({
      id: `circle-${index + 1}`,
      title: topic,
      mediaPath: circleImages[index],
      mediaUrl: resolveRuntimeSeedAssetUrl(circleImages[index]),
      heat: 100 - index * 8
    }));

    const hotModelsPayload = [
      { slug: "mini-4-pro", name: "DJI Mini 4 Pro", heat: 98 },
      { slug: "mavic-3-pro", name: "DJI Mavic 3 Pro", heat: 95 },
      { slug: "evo-lite-plus", name: "Autel EVO Lite+", heat: 90 }
    ];

    const hotRankingsPayload = [
      { id: "official-endurance", title: "endurance-king", heat: 96 },
      { id: "official-value", title: "value-pick", heat: 91 },
      { id: "official-utility", title: "utility-first", heat: 88 }
    ];

    const heroMediaPayload = circleImages.slice(0, 4).map((path, index) => ({
      id: `hero-${index + 1}`,
      path,
      url: resolveRuntimeSeedAssetUrl(path)
    }));

    await client.del(listRuntimeSeedRedisKeys());

    await client
      .multi()
      .set(resolveCacheKey(DEMO_REDIS_KEYS.hotCircle), JSON.stringify(circlePayload))
      .set(resolveCacheKey(DEMO_REDIS_KEYS.hotModels), JSON.stringify(hotModelsPayload))
      .set(resolveCacheKey(DEMO_REDIS_KEYS.hotRankings), JSON.stringify(hotRankingsPayload))
      .set(resolveCacheKey(DEMO_REDIS_KEYS.heroMedia), JSON.stringify(heroMediaPayload))
      .exec();
  } finally {
    await client.disconnect();
  }

  return {
    keyCount: Object.keys(DEMO_REDIS_KEYS).length
  };
}

export async function seedRuntimeArtifacts(): Promise<RuntimeSeedSummary> {
  const [storage, redis] = await Promise.all([seedStorageArtifacts(), seedRedisArtifacts()]);
  return { storage, redis };
}
