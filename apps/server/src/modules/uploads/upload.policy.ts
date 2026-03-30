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

export function getUploadPolicy(bizType: FileBizType): UploadPolicy {
  return uploadPolicies[bizType];
}

export function isAllowedUploadMime(policy: UploadPolicy, contentType: string) {
  return policy.mimePrefixes.some(prefix => contentType.startsWith(prefix));
}
