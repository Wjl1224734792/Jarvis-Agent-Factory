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

  return [policy.maxSize, globalMaxSize, mediaMaxSize]
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
