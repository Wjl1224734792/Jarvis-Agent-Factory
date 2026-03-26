import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { createClient } from "redis";

type RuntimeSeedSummary = {
  storage: { provider: string; bucket: string; objectCount: number } | { skipped: string };
  redis: { keyCount: number } | { skipped: string };
};

const HOT_CIRCLE_MEDIA_KEYS = [
  "home/hot-circle/dawn-squad.png",
  "home/hot-circle/mavic-3-pro-review.png",
  "home/hot-circle/ranking-card.png",
  "home/hot-circle/night-sky.png",
  "home/hot-circle/autel-lite.png",
  "home/hot-circle/eVTOL-canyon.png",
  "home/hot-circle/community-vote.png"
] as const;

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

function listRuntimeSeedRedisKeys() {
  const rawKeys = Object.values(DEMO_REDIS_KEYS);
  const resolvedKeys = rawKeys.map((key) => resolveCacheKey(key));

  return Array.from(new Set([...rawKeys, ...resolvedKeys]));
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

  const keyPrefix = process.env.STORAGE_KEY_PREFIX?.trim().replace(/^\/+|\/+$/g, "");
  const forcePathStyle = parseBoolean(process.env.STORAGE_FORCE_PATH_STYLE, provider === "minio");
  const autoCreateBucket = parseBoolean(process.env.STORAGE_AUTO_CREATE_BUCKET, true);
  const resolvedKeys = HOT_CIRCLE_MEDIA_KEYS.map((key) => (keyPrefix ? `${keyPrefix}/${key}` : key));

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

  for (const key of resolvedKeys) {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: ONE_PIXEL_PNG,
        ContentType: "image/png",
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
    objectCount: resolvedKeys.length
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
    const circlePayload = HOT_CIRCLE_TOPICS.slice(0, 7).map((topic, index) => ({
      id: `circle-${index + 1}`,
      title: topic,
      mediaPath: HOT_CIRCLE_MEDIA_KEYS[index],
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

    const heroMediaPayload = HOT_CIRCLE_MEDIA_KEYS.slice(0, 4).map((path, index) => ({
      id: `hero-${index + 1}`,
      path
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
