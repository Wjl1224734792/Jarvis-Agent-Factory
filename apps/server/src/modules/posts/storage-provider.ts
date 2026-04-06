import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
  autoCreateBucket: boolean;
};

export type StorageUploadDescriptor = {
  mode: "presigned-put";
  url: string;
  headers?: Record<string, string>;
  expiresIn: number;
};

export type StorageObjectHead = {
  exists: boolean;
  size?: number;
  etag?: string;
  contentType?: string;
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

export function buildStorageObjectUrl(config: StorageProviderConfig, objectKey: string) {
  const resolvedKey = resolveObjectKey(config, objectKey);
  return `${config.publicBaseUrl}/${resolvedKey}`;
}

function createS3Client(config: StorageProviderConfig) {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
}

function resolveObjectKey(config: StorageProviderConfig, inputKey: string) {
  return config.keyPrefix ? `${config.keyPrefix}/${inputKey}` : inputKey;
}

async function ensureBucketExists(client: S3Client, config: StorageProviderConfig) {
  if (!config.autoCreateBucket) {
    return;
  }

  try {
    await client.send(
      new HeadBucketCommand({
        Bucket: config.bucket
      })
    );
  } catch {
    await client.send(
      new CreateBucketCommand({
        Bucket: config.bucket
      })
    );
  }
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
    autoCreateBucket: parseBoolean(env.STORAGE_AUTO_CREATE_BUCKET, false),
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
  const client = createS3Client(config);

  return {
    async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
      const resolvedKey = resolveObjectKey(config, input.key);
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

export function createStorageProvider(config: StorageProviderConfig) {
  const client = createS3Client(config);

  return {
    async initUpload(input: {
      objectKey: string;
      contentType: string;
      size: number;
      visibility: "public" | "private";
    }): Promise<StorageUploadDescriptor> {
      await ensureBucketExists(client, config);
      const resolvedKey = resolveObjectKey(config, input.objectKey);
      const url = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: resolvedKey,
          ContentType: input.contentType,
          ContentLength: input.size
        }),
        { expiresIn: 900 }
      );

      return {
        mode: "presigned-put",
        url,
        headers: {
          "Content-Type": input.contentType
        },
        expiresIn: 900
      };
    },
    async headObject(input: { objectKey: string }): Promise<StorageObjectHead> {
      const resolvedKey = resolveObjectKey(config, input.objectKey);

      try {
        const result = await client.send(
          new HeadObjectCommand({
            Bucket: config.bucket,
            Key: resolvedKey
          })
        );

        return {
          exists: true,
          size: result.ContentLength,
          etag: result.ETag?.replaceAll('"', ""),
          contentType: result.ContentType
        };
      } catch {
        return { exists: false };
      }
    },
    async getDownloadUrl(input: {
      objectKey: string;
      expiresIn: number;
      filename?: string;
    }) {
      const resolvedKey = resolveObjectKey(config, input.objectKey);
      return getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: resolvedKey,
          ResponseContentDisposition: input.filename
            ? `attachment; filename="${input.filename}"`
            : undefined
        }),
        { expiresIn: input.expiresIn }
      );
    }
  };
}
