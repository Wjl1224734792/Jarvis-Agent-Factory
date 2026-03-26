import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type StorageProvider = "minio" | "cos" | "oss" | "kodo";

type EnvLike = Record<string, string | undefined>;

export type StorageProviderConfig = {
  provider: StorageProvider;
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  keyPrefix: string;
  forcePathStyle: boolean;
  publicBaseUrl: string;
};

function parseBoolean(input: string | undefined, fallback: boolean) {
  if (input === undefined) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(input.toLowerCase());
}

function normalizePrefix(input: string | undefined): string {
  return (input ?? "").trim().replace(/^\/+|\/+$/g, "");
}

function normalizeBaseUrl(
  endpoint: string,
  bucket: string,
  forcePathStyle: boolean,
  explicitPublicBaseUrl?: string
): string {
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

export function isStorageProviderExplicitlyConfigured(env: EnvLike = process.env) {
  return [
    env.STORAGE_PROVIDER,
    env.STORAGE_ENDPOINT,
    env.STORAGE_BUCKET,
    env.STORAGE_ACCESS_KEY_ID,
    env.STORAGE_SECRET_ACCESS_KEY
  ].some((value) => Boolean(value?.trim()));
}

export function resolveStorageProviderConfig(env: EnvLike = process.env): StorageProviderConfig {
  const providerRaw = (env.STORAGE_PROVIDER ?? "minio").toLowerCase().trim();
  if (!["minio", "cos", "oss", "kodo"].includes(providerRaw)) {
    throw new Error("Invalid STORAGE_PROVIDER. Expected minio|cos|oss|kodo.");
  }

  const endpoint = env.STORAGE_ENDPOINT?.trim();
  const bucket = env.STORAGE_BUCKET?.trim();
  const accessKeyId = env.STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.STORAGE_SECRET_ACCESS_KEY?.trim();

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing storage credentials. Required: STORAGE_ENDPOINT/STORAGE_BUCKET/STORAGE_ACCESS_KEY_ID/STORAGE_SECRET_ACCESS_KEY."
    );
  }

  const provider = providerRaw as StorageProvider;
  const forcePathStyle = parseBoolean(env.STORAGE_FORCE_PATH_STYLE, provider === "minio");

  return {
    provider,
    endpoint,
    bucket,
    region: env.STORAGE_REGION?.trim() || "us-east-1",
    accessKeyId,
    secretAccessKey,
    keyPrefix: normalizePrefix(env.STORAGE_KEY_PREFIX),
    forcePathStyle,
    publicBaseUrl: normalizeBaseUrl(
      endpoint,
      bucket,
      forcePathStyle,
      env.STORAGE_PUBLIC_BASE_URL
    )
  };
}

export type StorageUploadInput = {
  key: string;
  contentType: string;
  body: Uint8Array;
};

export type StorageUploadResult = {
  key: string;
  url: string;
};

export function createStorageUploader(config: StorageProviderConfig) {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });

  return {
    async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
      const resolvedKey = config.keyPrefix ? `${config.keyPrefix}/${input.key}` : input.key;
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: resolvedKey,
          Body: input.body,
          ContentType: input.contentType
        })
      );

      return {
        key: resolvedKey,
        url: `${config.publicBaseUrl}/${resolvedKey}`
      };
    }
  };
}
