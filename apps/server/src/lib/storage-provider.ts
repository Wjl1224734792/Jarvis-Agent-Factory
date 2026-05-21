import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as qiniu from 'qiniu';
import { getEnvMode, isDevEnv } from './env-mode';
import {
  parseBooleanEnv,
  parseOptionalBooleanEnv
} from './env-flags';

export type StorageProvider = 'minio' | 'cos' | 'oss' | 'kodo';
type StorageProviderEnvValue = StorageProvider | 'qiniu';

interface EnvLike {
  [key: string]: string | undefined;
}

export interface StorageProviderConfig {
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
}

export type StorageUploadDescriptor =
  | {
      mode: 'presigned-put';
      url: string;
      headers?: Record<string, string>;
      expiresIn: number;
    }
  | {
      mode: 'qiniu-form';
      uploadUrl: string;
      fileFieldName: string;
      fields: Record<string, string>;
      expiresIn: number;
    };

export interface StorageObjectHead {
  exists: boolean;
  size?: number;
  etag?: string;
  contentType?: string;
}

const STORAGE_PROVIDER_SET = new Set<StorageProvider>([
  'minio',
  'cos',
  'oss',
  'kodo'
]);

function isStorageProvider(value: string): value is StorageProvider {
  return STORAGE_PROVIDER_SET.has(value as StorageProvider);
}

function normalizePrefix(input: string | undefined): string {
  return (input ?? '').trim().replace(/^\/+|\/+$/g, '');
}

function normalizeBaseUrl(
  endpoint: string,
  bucket: string,
  forcePathStyle: boolean,
  explicitPublicBaseUrl?: string
) {
  if (explicitPublicBaseUrl?.trim()) {
    return explicitPublicBaseUrl.trim().replace(/\/+$/g, '');
  }

  const normalizedEndpoint = endpoint.replace(/\/+$/g, '');
  const url = new URL(normalizedEndpoint);

  if (forcePathStyle) {
    const pathname = url.pathname.replace(/\/+$/g, '');
    return `${url.origin}${pathname}/${bucket}`.replace(/\/+$/g, '');
  }

  const pathname = url.pathname.replace(/\/+$/g, '');
  if (pathname && pathname !== '/') {
    return `${url.origin}${pathname}/${bucket}`.replace(/\/+$/g, '');
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
  return new qiniu.auth.digest.Mac(
    config.accessKeyId,
    config.secretAccessKey
  );
}

function createQiniuConfig(config: StorageProviderConfig) {
  const qiniuConfig = new qiniu.conf.Config({
    useHttpsDomain: config.endpoint.startsWith('https://'),
    accelerateUploading: false
  });

  if (config.kodoRegionId) {
    qiniuConfig.regionsProvider = qiniu.httpc.Region.fromRegionId(
      config.kodoRegionId
    );
  }

  return qiniuConfig;
}

function createQiniuBucketManager(config: StorageProviderConfig) {
  return new qiniu.rs.BucketManager(
    createQiniuMac(config),
    createQiniuConfig(config)
  );
}

function createKodoUploadToken(
  config: StorageProviderConfig,
  input: {
    objectKey: string;
    contentType: string;
    size: number;
  }
) {
  const putPolicy = new qiniu.rs.PutPolicy({
    scope: `${config.bucket}:${input.objectKey}`,
    expires: 900,
    fsizeLimit: input.size,
    mimeLimit: input.contentType
  });

  return putPolicy.uploadToken(createQiniuMac(config));
}

function isLocalhostStorageEndpoint(endpoint: string) {
  return endpoint.includes('localhost') || endpoint.includes('127.0.0.1');
}

/**
 * 判断当前存储配置下读取文件时是否应强制走签名 URL。
 *
 * @param config 已解析的存储 provider 配置。
 * @param env 需要参考的环境变量集合，默认读取 `process.env`。
 * @returns 当环境变量显式指定、provider 为 `kodo` 或本地开发需要签名时返回 `true`。
 * @throws {never} 该函数只做配置判断，不会主动抛出异常。
 */
export function shouldUseSignedReadUrl(
  config: StorageProviderConfig,
  env: EnvLike = process.env
) {
  const explicitPresignReadUrls = parseOptionalBooleanEnv(
    env.STORAGE_PRESIGN_READ_URLS
  );
  if (explicitPresignReadUrls !== undefined) {
    return explicitPresignReadUrls;
  }

  if (config.provider === 'kodo') {
    return true;
  }

  if (!isLocalhostStorageEndpoint(config.endpoint)) {
    return false;
  }

  return isDevEnv() || parseBooleanEnv(env.STORAGE_PRESIGN_READ_URLS, false);
}

async function ensureBucketExists(
  client: S3Client,
  config: StorageProviderConfig
) {
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

/**
 * 根据 provider 公网基地址与对象 key 构建可访问 URL。
 *
 * @param config 已解析的存储 provider 配置。
 * @param objectKey 业务层对象 key。
 * @returns 拼接完成的对象访问地址。
 * @throws {never} 该函数只做字符串拼接，不会主动抛出异常。
 */
export function buildStorageObjectUrl(
  config: StorageProviderConfig,
  objectKey: string
) {
  const resolvedKey = resolveObjectKey(config, objectKey);
  return `${config.publicBaseUrl}/${resolvedKey}`;
}

/**
 * 判断调用方是否显式配置了存储 provider 相关核心参数。
 *
 * @param env 需要检测的环境变量集合，默认读取 `process.env`。
 * @returns 任一核心存储配置存在有效值时返回 `true`。
 * @throws {never} 该函数只做字符串存在性判断，不会主动抛出异常。
 */
export function isStorageProviderExplicitlyConfigured(
  env: EnvLike = process.env
) {
  return [
    env.STORAGE_PROVIDER,
    env.STORAGE_ENDPOINT,
    env.STORAGE_BUCKET,
    env.STORAGE_ACCESS_KEY_ID,
    env.STORAGE_SECRET_ACCESS_KEY
  ].some(value => Boolean(value?.trim()));
}

/**
 * 解析存储 provider 配置，并在测试环境注入本地默认值。
 *
 * @param env 需要解析的环境变量集合，默认读取 `process.env`。
 * @returns 标准化后的存储 provider 配置。
 * @throws {Error} 当 provider 非法或缺少关键存储凭证时抛出异常。
 */
export function resolveStorageProviderConfig(
  env: EnvLike = process.env
): StorageProviderConfig {
  // 只有开发环境才默认使用 MinIO；测试/生产环境需显式配置存储
  const dev = isDevEnv();
  const providerRaw = (
    env.STORAGE_PROVIDER
      ? env.STORAGE_PROVIDER
      : (env.TEST_STORAGE_PROVIDER ?? (dev ? 'minio' : undefined))
  )
    ?.toLowerCase()
    .trim() as StorageProviderEnvValue | undefined;

  if (!providerRaw) {
    throw new Error(
      'Missing STORAGE_PROVIDER. Non-development environments must set STORAGE_PROVIDER (minio|cos|oss|kodo|qiniu).'
    );
  }

  const normalizedProvider =
    providerRaw === 'qiniu' ? 'kodo' : providerRaw;
  if (!isStorageProvider(normalizedProvider)) {
    throw new Error(
      'Invalid STORAGE_PROVIDER. Expected minio|cos|oss|kodo|qiniu.'
    );
  }

  const resolveString = (
    key: string,
    testKey: string | undefined,
    minioDefault?: string
  ) => {
    const val = env[key]?.trim() || testKey?.trim();
    if (val) return val;
    if (normalizedProvider === 'minio' && dev) return minioDefault;
    return undefined;
  };

  const endpoint = resolveString('STORAGE_ENDPOINT', env.TEST_STORAGE_ENDPOINT, 'http://localhost:9000');
  const bucket = resolveString('STORAGE_BUCKET', env.TEST_STORAGE_BUCKET, 'feijia-media');
  const accessKeyId = resolveString('STORAGE_ACCESS_KEY_ID', env.TEST_STORAGE_ACCESS_KEY_ID, 'minioadmin');
  const secretAccessKey = resolveString('STORAGE_SECRET_ACCESS_KEY', env.TEST_STORAGE_SECRET_ACCESS_KEY, 'minioadmin123');

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing storage credentials. Required: STORAGE_ENDPOINT / STORAGE_BUCKET / STORAGE_ACCESS_KEY_ID / STORAGE_SECRET_ACCESS_KEY.'
    );
  }

  const provider: StorageProvider = normalizedProvider;

  // 非开发环境使用 MinIO 时发出警告
  if (!dev && provider === 'minio') {
    console.warn(
      `[storage] NODE_ENV=${getEnvMode() || '<unset>'} but using MinIO. ` +
      'Set STORAGE_PROVIDER=kodo and configure Kodo credentials for non-dev environments.'
    );
  }

  const forcePathStyle = parseBooleanEnv(
    env.STORAGE_FORCE_PATH_STYLE ?? env.TEST_STORAGE_FORCE_PATH_STYLE,
    provider === 'minio'
  );
  const publicBaseUrlIsExplicit = Boolean(
    env.STORAGE_PUBLIC_BASE_URL?.trim()
  );

  return {
    provider,
    endpoint,
    bucket,
    region:
      env.STORAGE_REGION?.trim() ||
      env.TEST_STORAGE_REGION?.trim() ||
      'us-east-1',
    accessKeyId,
    secretAccessKey,
    keyPrefix: normalizePrefix(env.STORAGE_KEY_PREFIX),
    forcePathStyle,
    autoCreateBucket: parseBooleanEnv(env.STORAGE_AUTO_CREATE_BUCKET, false),
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

export interface StorageUploadInput {
  key: string;
  contentType: string;
  body: Uint8Array;
}

export interface StorageUploadResult {
  key: string;
  url: string;
}

/**
 * 创建统一的对象上传器，屏蔽 Kodo 表单上传与 S3 PutObject 差异。
 *
 * @param config 已解析的存储 provider 配置。
 * @returns 暴露统一 `upload` 方法的上传器实例。
 * @throws {Error} 当底层 provider 上传失败时会继续向上抛出异常。
 */
export function createStorageUploader(config: StorageProviderConfig) {
  if (config.provider === 'kodo') {
    const uploader = new qiniu.form_up.FormUploader(createQiniuConfig(config));

    return {
      async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
        const resolvedKey = resolveObjectKey(config, input.key);
        const uploadToken = createKodoUploadToken(config, {
          objectKey: resolvedKey,
          contentType: input.contentType,
          size: input.body.byteLength
        });

        const putExtra = new qiniu.form_up.PutExtra(
          undefined,
          undefined,
          input.contentType
        );
        const result = await uploader.put(
          uploadToken,
          resolvedKey,
          Buffer.from(input.body),
          putExtra
        );
        if (!result.ok()) {
          throw new Error(
            `Kodo upload failed with status ${
              result.resp.statusCode ?? 'unknown'
            }.`
          );
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

/**
 * 创建统一的存储 provider 访问器。
 *
 * @param config 已解析的存储 provider 配置。
 * @returns 覆盖初始化上传、对象探测与下载地址生成的统一访问器。
 * @throws {Error} 当底层 provider 初始化或对象访问失败时会继续向上抛出异常。
 */
export function createStorageProvider(config: StorageProviderConfig) {
  if (config.provider === 'kodo') {
    const bucketManager = createQiniuBucketManager(config);

    return {
      async initUpload(input: {
        objectKey: string;
        contentType: string;
        size: number;
        visibility: 'public' | 'private';
      }): Promise<StorageUploadDescriptor> {
        const resolvedKey = resolveObjectKey(config, input.objectKey);
        const uploadToken = createKodoUploadToken(config, {
          objectKey: resolvedKey,
          contentType: input.contentType,
          size: input.size
        });

        return {
          mode: 'qiniu-form',
          uploadUrl: config.endpoint,
          fileFieldName: 'file',
          fields: {
            token: uploadToken,
            key: resolvedKey
          },
          expiresIn: 900
        };
      },
      async headObject(input: {
        objectKey: string;
      }): Promise<StorageObjectHead> {
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
        return bucketManager.privateDownloadUrl(
          config.publicBaseUrl,
          resolvedKey,
          deadline
        );
      }
    };
  }

  const client = createS3Client(config);

  return {
    async initUpload(input: {
      objectKey: string;
      contentType: string;
      size: number;
      visibility: 'public' | 'private';
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
        mode: 'presigned-put',
        url,
        headers: {
          'Content-Type': input.contentType
        },
        expiresIn: 900
      };
    },
    async headObject(input: {
      objectKey: string;
    }): Promise<StorageObjectHead> {
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
          etag: result.ETag?.replaceAll('"', ''),
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
