import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import * as qiniu from "qiniu";

export type SeedStorageProvider = "minio" | "cos" | "oss" | "kodo";
type SeedStorageProviderEnvValue = SeedStorageProvider | "qiniu";
type EnvLike = Record<string, string | undefined>;

export type SeedStorageConfig = {
  provider: SeedStorageProvider;
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  keyPrefix: string;
  forcePathStyle: boolean;
  autoCreateBucket: boolean;
  kodoRegionId?: string;
};

export type SeedStorageObject = {
  key: string;
  body: Uint8Array;
  contentType: "image/png" | "video/mp4";
};

function parseBoolean(input: string | undefined, fallback: boolean) {
  if (input === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(input.toLowerCase());
}

function normalizePrefix(input: string | undefined) {
  return (input ?? "").trim().replace(/^\/+|\/+$/g, "");
}

function normalizeProvider(input: string | undefined): SeedStorageProvider {
  const raw = (input?.trim() || "minio").toLowerCase() as SeedStorageProviderEnvValue;
  const provider = raw === "qiniu" ? "kodo" : raw;

  if (provider === "minio" || provider === "cos" || provider === "oss" || provider === "kodo") {
    return provider;
  }

  throw new Error("Invalid STORAGE_PROVIDER. Expected minio|cos|oss|kodo|qiniu.");
}

function requireSeedStorageValue(name: string, value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Missing storage configuration: ${name}.`);
  }

  return trimmed;
}

/**
 * Resolves the mock/test-data storage target from the current environment.
 *
 * The seed command must honor the caller's STORAGE_* variables because it may be
 * intentionally pointed at a remote DB/Redis/object-storage stack.
 */
export function resolveSeedStorageConfig(env: EnvLike = process.env): SeedStorageConfig {
  const provider = normalizeProvider(env.STORAGE_PROVIDER);
  const endpoint =
    env.STORAGE_ENDPOINT?.trim() || (provider === "minio" ? "http://localhost:9000" : undefined);
  const accessKeyId =
    env.STORAGE_ACCESS_KEY_ID?.trim() || (provider === "minio" ? "minioadmin" : undefined);
  const secretAccessKey =
    env.STORAGE_SECRET_ACCESS_KEY?.trim() ||
    (provider === "minio" ? "minioadmin123" : undefined);

  return {
    provider,
    endpoint: requireSeedStorageValue("STORAGE_ENDPOINT", endpoint),
    bucket: requireSeedStorageValue("STORAGE_BUCKET", env.STORAGE_BUCKET?.trim() || "feijia-media"),
    region: env.STORAGE_REGION?.trim() || "us-east-1",
    accessKeyId: requireSeedStorageValue("STORAGE_ACCESS_KEY_ID", accessKeyId),
    secretAccessKey: requireSeedStorageValue("STORAGE_SECRET_ACCESS_KEY", secretAccessKey),
    keyPrefix: normalizePrefix(env.STORAGE_KEY_PREFIX),
    forcePathStyle:
      provider === "kodo"
        ? false
        : parseBoolean(env.STORAGE_FORCE_PATH_STYLE, provider === "minio"),
    autoCreateBucket: parseBoolean(env.STORAGE_AUTO_CREATE_BUCKET, provider === "minio"),
    kodoRegionId: env.KODO_REGION_ID?.trim() || undefined
  };
}

export function resolveSeedStorageObjectKey(config: SeedStorageConfig, key: string) {
  return config.keyPrefix ? `${config.keyPrefix}/${key}` : key;
}

/**
 * Builds the file-table storage fields while keeping objectKey unprefixed.
 *
 * Runtime server helpers apply STORAGE_KEY_PREFIX when accessing objects, so the
 * database record must store the business object key, not the physical key.
 */
export function buildSeedStorageRecord(config: SeedStorageConfig, key: string) {
  return {
    provider: config.provider,
    bucket: config.bucket,
    region: config.region,
    objectKey: key
  };
}

function createS3Client(config: SeedStorageConfig) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    },
    forcePathStyle: config.forcePathStyle
  });
}

async function ensureS3BucketExists(client: S3Client, config: SeedStorageConfig) {
  if (!config.autoCreateBucket) {
    return;
  }

  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: config.bucket }));
  }
}

function createQiniuConfig(config: SeedStorageConfig) {
  const qiniuConfig = new qiniu.conf.Config({
    useHttpsDomain: config.endpoint.startsWith("https://"),
    accelerateUploading: false
  });

  if (config.kodoRegionId) {
    qiniuConfig.regionsProvider = qiniu.httpc.Region.fromRegionId(config.kodoRegionId);
  }

  return qiniuConfig;
}

function createKodoUploadToken(config: SeedStorageConfig, object: SeedStorageObject) {
  const resolvedKey = resolveSeedStorageObjectKey(config, object.key);
  const putPolicy = new qiniu.rs.PutPolicy({
    scope: `${config.bucket}:${resolvedKey}`,
    expires: 900,
    fsizeLimit: object.body.byteLength,
    mimeLimit: object.contentType
  });
  const mac = new qiniu.auth.digest.Mac(config.accessKeyId, config.secretAccessKey);

  return putPolicy.uploadToken(mac);
}

async function uploadKodoSeedObjects(config: SeedStorageConfig, objects: SeedStorageObject[]) {
  const uploader = new qiniu.form_up.FormUploader(createQiniuConfig(config));

  for (const object of objects) {
    const resolvedKey = resolveSeedStorageObjectKey(config, object.key);
    const token = createKodoUploadToken(config, object);
    const putExtra = new qiniu.form_up.PutExtra(undefined, undefined, object.contentType);
    const result = await uploader.put(token, resolvedKey, Buffer.from(object.body), putExtra);

    if (!result.ok()) {
      throw new Error(`Kodo seed upload failed with status ${result.resp.statusCode ?? "unknown"}.`);
    }
  }
}

async function uploadS3SeedObjects(config: SeedStorageConfig, objects: SeedStorageObject[]) {
  const client = createS3Client(config);
  await ensureS3BucketExists(client, config);

  for (const object of objects) {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: resolveSeedStorageObjectKey(config, object.key),
        Body: object.body,
        ContentType: object.contentType,
        CacheControl: "public, max-age=86400",
        Metadata: { seed: "test-data" }
      })
    );
  }
}

export async function uploadSeedStorageObjects(
  config: SeedStorageConfig,
  objects: SeedStorageObject[]
) {
  if (config.provider === "kodo") {
    await uploadKodoSeedObjects(config, objects);
    return;
  }

  await uploadS3SeedObjects(config, objects);
}
