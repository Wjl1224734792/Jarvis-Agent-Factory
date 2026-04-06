import type { FileBizType, FileMediaKind, FileVisibility } from "@feijia/schemas";

export type UploadPolicy = {
  bizType: FileBizType;
  mediaKind: FileMediaKind;
  visibility: FileVisibility;
  maxSize: number;
  mimePrefixes: string[];
};

const MB = 1024 * 1024;

const uploadPolicies = {
  "avatar-image": {
    bizType: "avatar-image",
    mediaKind: "image",
    visibility: "public",
    maxSize: 5 * MB,
    mimePrefixes: ["image/"]
  },
  "post-image": {
    bizType: "post-image",
    mediaKind: "image",
    visibility: "public",
    maxSize: 10 * MB,
    mimePrefixes: ["image/"]
  },
  "post-video": {
    bizType: "post-video",
    mediaKind: "video",
    visibility: "public",
    maxSize: 100 * MB,
    mimePrefixes: ["video/"]
  },
  "aircraft-cover-image": {
    bizType: "aircraft-cover-image",
    mediaKind: "image",
    visibility: "public",
    maxSize: 10 * MB,
    mimePrefixes: ["image/"]
  },
  "aircraft-video": {
    bizType: "aircraft-video",
    mediaKind: "video",
    visibility: "public",
    maxSize: 200 * MB,
    mimePrefixes: ["video/"]
  },
  "ranking-cover-image": {
    bizType: "ranking-cover-image",
    mediaKind: "image",
    visibility: "public",
    maxSize: 10 * MB,
    mimePrefixes: ["image/"]
  },
  "ranking-item-image": {
    bizType: "ranking-item-image",
    mediaKind: "image",
    visibility: "public",
    maxSize: 10 * MB,
    mimePrefixes: ["image/"]
  },
  "report-image": {
    bizType: "report-image",
    mediaKind: "image",
    visibility: "public",
    maxSize: 10 * MB,
    mimePrefixes: ["image/"]
  }
} satisfies Record<FileBizType, UploadPolicy>;

const uploadBizTypeEnvKeys = {
  "avatar-image": "UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB",
  "post-image": "UPLOAD_MAX_POST_IMAGE_SIZE_MB",
  "post-video": "UPLOAD_MAX_POST_VIDEO_SIZE_MB",
  "aircraft-cover-image": "UPLOAD_MAX_AIRCRAFT_COVER_IMAGE_SIZE_MB",
  "aircraft-video": "UPLOAD_MAX_AIRCRAFT_VIDEO_SIZE_MB",
  "ranking-cover-image": "UPLOAD_MAX_RANKING_COVER_IMAGE_SIZE_MB",
  "ranking-item-image": "UPLOAD_MAX_RANKING_ITEM_IMAGE_SIZE_MB",
  "report-image": "UPLOAD_MAX_REPORT_IMAGE_SIZE_MB"
} satisfies Record<FileBizType, string>;

function parseSizeLimitMb(value: string | undefined) {
  if (!value?.trim()) {
    return undefined;
  }

  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.floor(parsed * MB);
}

function resolvePolicyMaxSize(policy: UploadPolicy) {
  const globalMaxSize = parseSizeLimitMb(process.env.UPLOAD_MAX_FILE_SIZE_MB);
  const mediaMaxSize =
    policy.mediaKind === "image"
      ? parseSizeLimitMb(process.env.UPLOAD_MAX_IMAGE_SIZE_MB)
      : parseSizeLimitMb(process.env.UPLOAD_MAX_VIDEO_SIZE_MB);
  const bizTypeMaxSize = parseSizeLimitMb(
    process.env[uploadBizTypeEnvKeys[policy.bizType]]
  );

  return [policy.maxSize, globalMaxSize, mediaMaxSize, bizTypeMaxSize]
    .filter((value): value is number => value !== undefined)
    .reduce((current, candidate) => Math.min(current, candidate), policy.maxSize);
}

export function getUploadPolicy(bizType: FileBizType): UploadPolicy {
  const policy = uploadPolicies[bizType];

  return {
    ...policy,
    maxSize: resolvePolicyMaxSize(policy)
  };
}

export function isAllowedUploadMime(policy: UploadPolicy, contentType: string) {
  return policy.mimePrefixes.some(prefix => contentType.startsWith(prefix));
}
