import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as qiniu from "qiniu";

export type StorageProvider = "minio" | "cos" | "oss" | "kodo";
type StorageProviderEnvValue = StorageProvider | "qiniu";

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
  publicBaseUrlIsExplicit: boolean;
  autoCreateBucket: boolean;
  kodoRegionId?: string;
};

export type StorageUploadDescriptor =
  | {
      mode: "presigned-put";
      url: string;
      headers?: Record<string, string>;
      expiresIn: number;
    }
  | {
      mode: "qiniu-form";
      uploadUrl: string;
      fileFieldName: string;
      fields: Record<string, string>;
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

function parseOptionalBoolean(input: string | undefined) {
  if (input === undefined) {
    return undefined;
  }

  const normalized = input.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return undefined;
}

function normalizePrefix(input: string | undefined): string {
  return (input ?? "").trim().replace(/^\/+|\/+$/g, "");
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

function resolveObjectKey(config: StorageProviderConfig, inputKey: string) {
  return config.keyPrefix ? `${config.keyPrefix}/${inputKey}` : inputKey;
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

function createQiniuMac(config: StorageProviderConfig) {
  return new qiniu.auth.digest.Mac(config.accessKeyId, config.secretAccessKey);
}

function createQiniuConfig(config: StorageProviderConfig) {
  const qiniuConfig = new qiniu.conf.Config({
    useHttpsDomain: config.endpoint.startsWith("https://"),
    accelerateUploading: false
  });

  if (config.kodoRegionId) {
    qiniuConfig.regionsProvider = qiniu.httpc.Region.fromRegionId(config.kodoRegionId);
  }

  return qiniuConfig;
}

function createQiniuBucketManager(config: StorageProviderConfig) {
  return new qiniu.rs.BucketManager(createQiniuMac(config), createQiniuConfig(config));
}

function createKodoUploadToken(config: StorageProviderConfig, input: {
  objectKey: string;
  contentType: string;
  size: number;
}) {
  const putPolicy = new qiniu.rs.PutPolicy({
    scope: `${config.bucket}:${input.objectKey}`,
    expires: 900,
    fsizeLimit: input.size,
    mimeLimit: input.contentType
  });

  return putPolicy.uploadToken(createQiniuMac(config));
}

function isLocalhostStorageEndpoint(endpoint: string) {
  return endpoint.includes("localhost") || endpoint.includes("127.0.0.1");
}

export function shouldUseSignedReadUrl(config: StorageProviderConfig, env: EnvLike = process.env) {
  const explicitPresignReadUrls = parseOptionalBoolean(env.STORAGE_PRESIGN_READ_URLS);
  if (explicitPresignReadUrls !== undefined) {
    return explicitPresignReadUrls;
  }

  if (config.provider === "kodo") {
    return true;
  }

  if (!isLocalhostStorageEndpoint(config.endpoint)) {
    return false;
  }

  const nonProduction = env.NODE_ENV !== "production";
  return nonProduction || parseBoolean(env.STORAGE_PRESIGN_READ_URLS, false);
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

export function buildStorageObjectUrl(config: StorageProviderConfig, objectKey: string) {
  const resolvedKey = resolveObjectKey(config, objectKey);
  return `${config.publicBaseUrl}/${resolvedKey}`;
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
  const isTestEnv = env.NODE_ENV === "test";
  const providerRaw = (isTestEnv ? "minio" : env.STORAGE_PROVIDER ?? "minio")
    .toLowerCase()
    .trim() as StorageProviderEnvValue;
  const normalizedProvider = providerRaw === "qiniu" ? "kodo" : providerRaw;
  if (!["minio", "cos", "oss", "kodo"].includes(normalizedProvider)) {
    throw new Error("Invalid STORAGE_PROVIDER. Expected minio|cos|oss|kodo|qiniu.");
  }

  const endpoint = isTestEnv
    ? env.TEST_STORAGE_ENDPOINT?.trim() || "http://localhost:9000"
    : env.STORAGE_ENDPOINT?.trim();
  const bucket = isTestEnv
    ? env.TEST_STORAGE_BUCKET?.trim() || "feijia-media"
    : env.STORAGE_BUCKET?.trim();
  const accessKeyId = isTestEnv
    ? env.TEST_STORAGE_ACCESS_KEY_ID?.trim() || "minioadmin"
    : env.STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = isTestEnv
    ? env.TEST_STORAGE_SECRET_ACCESS_KEY?.trim() || "minioadmin123"
    : env.STORAGE_SECRET_ACCESS_KEY?.trim();

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing storage credentials. Required: STORAGE_ENDPOINT/STORAGE_BUCKET/STORAGE_ACCESS_KEY_ID/STORAGE_SECRET_ACCESS_KEY."
    );
  }

  const provider: StorageProvider = normalizedProvider;
  const forcePathStyle = parseBoolean(
    isTestEnv ? env.TEST_STORAGE_FORCE_PATH_STYLE : env.STORAGE_FORCE_PATH_STYLE,
    provider === "minio"
  );
  const publicBaseUrlIsExplicit = Boolean(env.STORAGE_PUBLIC_BASE_URL?.trim());

  return {
    provider,
    endpoint,
    bucket,
    region: (isTestEnv ? env.TEST_STORAGE_REGION : env.STORAGE_REGION)?.trim() || "us-east-1",
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
    ),
    publicBaseUrlIsExplicit,
    kodoRegionId: env.KODO_REGION_ID?.trim() || undefined
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
  if (config.provider === "kodo") {
    const uploader = new qiniu.form_up.FormUploader(createQiniuConfig(config));

    return {
      async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
        const resolvedKey = resolveObjectKey(config, input.key);
        const uploadToken = createKodoUploadToken(config, {
          objectKey: resolvedKey,
          contentType: input.contentType,
          size: input.body.byteLength
        });

        const putExtra = new qiniu.form_up.PutExtra(undefined, undefined, input.contentType);
        const result = await uploader.put(uploadToken, resolvedKey, Buffer.from(input.body), putExtra);
        if (!result.ok()) {
          throw new Error(`Kodo upload failed with status ${result.resp.statusCode ?? "unknown"}.`);
        }

        return {
          key: resolvedKey,
          url: buildStorageObjectUrl(config, input.key)
        };
      }
    };
  }

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
        url: buildStorageObjectUrl(config, input.key)
      };
    }
  };
}

export function createStorageProvider(config: StorageProviderConfig) {
  if (config.provider === "kodo") {
    const bucketManager = createQiniuBucketManager(config);

    return {
      async initUpload(input: {
        objectKey: string;
        contentType: string;
        size: number;
        visibility: "public" | "private";
      }): Promise<StorageUploadDescriptor> {
        const resolvedKey = resolveObjectKey(config, input.objectKey);
        const uploadToken = createKodoUploadToken(config, {
          objectKey: resolvedKey,
          contentType: input.contentType,
          size: input.size
        });

        return {
          mode: "qiniu-form",
          uploadUrl: config.endpoint,
          fileFieldName: "file",
          fields: {
            token: uploadToken,
            key: resolvedKey
          },
          expiresIn: 900
        };
      },
      async headObject(input: { objectKey: string }): Promise<StorageObjectHead> {
        const resolvedKey = resolveObjectKey(config, input.objectKey);

        try {
          const result = await bucketManager.stat(config.bucket, resolvedKey);
          if (!result.ok()) {
            const statusCode = result.resp.statusCode ?? 500;
            if (statusCode === 404 || statusCode === 612) {
              return { exists: false };
            }

            throw new Error(`Kodo stat failed with status ${statusCode}.`);
          }

          return {
            exists: true,
            size: result.data.fsize,
            etag: result.data.md5 ?? result.data.hash,
            contentType: result.data.mimeType
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
        const deadline = Math.floor(Date.now() / 1000) + input.expiresIn;
        return bucketManager.privateDownloadUrl(config.publicBaseUrl, resolvedKey, deadline);
      }
    };
  }

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
