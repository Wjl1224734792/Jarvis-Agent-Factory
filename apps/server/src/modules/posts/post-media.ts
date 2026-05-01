import { uploadsRepo } from "../uploads/upload.repo";
import {
  resolvePublicUploadedFileUrlMap,
  resolveUploadedFileUrlMap
} from "../uploads/uploads.helpers";
import { uploadsService } from "../uploads/upload.service";
import type { postsRepo } from "./posts.repo";

type FileAudience = "public" | "internal";

type PostCoverRecord = {
  id: string;
  coverImageFileId: string | null;
};

function serializeImage(image: Awaited<ReturnType<typeof postsRepo.getImageUploadById>>) {
  if (!image) {
    return null;
  }

  const serialized = uploadsService.serializeFileItem(image);
  return {
    id: serialized.id,
    url: serialized.url,
    fileName: serialized.fileName,
    mimeType: serialized.mimeType,
    byteSize: serialized.byteSize
  };
}

function serializeVideo(video: Awaited<ReturnType<typeof postsRepo.getVideoUploadById>>) {
  if (!video) {
    return null;
  }

  const serialized = uploadsService.serializeFileItem(video);
  return {
    id: serialized.id,
    url: serialized.url,
    fileName: serialized.fileName,
    mimeType: serialized.mimeType,
    byteSize: serialized.byteSize
  };
}

export async function buildImagesByPostId(
  images: Awaited<ReturnType<typeof postsRepo.listPostImages>>,
  audience: FileAudience = "public"
) {
  type Row = { postId: string; serialized: NonNullable<ReturnType<typeof serializeImage>> };
  const rows: Row[] = [];

  for (const image of images) {
    if (!image.postId) {
      continue;
    }

    const serialized = serializeImage(image);
    if (!serialized) {
      continue;
    }

    rows.push({ postId: image.postId, serialized });
  }

  const resolvedUrlMap =
    audience === "public"
      ? await resolvePublicUploadedFileUrlMap(rows.map((row) => row.serialized.id))
      : await resolveUploadedFileUrlMap(rows.map((row) => row.serialized.id));
  const imagesByPostId = new Map<string, NonNullable<ReturnType<typeof serializeImage>>[]>();
  for (const row of rows) {
    const { postId, serialized } = row;
    const resolved = resolvedUrlMap.get(serialized.id) ?? null;
    if (audience === "public" && !resolved) {
      continue;
    }
    const item = { ...serialized, url: resolved ?? serialized.url };
    const bucket = imagesByPostId.get(postId) ?? [];
    bucket.push(item);
    imagesByPostId.set(postId, bucket);
  }

  return imagesByPostId;
}

export async function buildVideosByPostId(
  videos: Awaited<ReturnType<typeof postsRepo.listPostVideos>>,
  audience: FileAudience = "public"
) {
  type Row = { postId: string; serialized: NonNullable<ReturnType<typeof serializeVideo>> };
  const rows: Row[] = [];

  for (const video of videos) {
    if (!video.postId) {
      continue;
    }

    const serialized = serializeVideo(video);
    if (!serialized) {
      continue;
    }

    rows.push({ postId: video.postId, serialized });
  }

  const resolvedUrlMap =
    audience === "public"
      ? await resolvePublicUploadedFileUrlMap(rows.map((row) => row.serialized.id))
      : await resolveUploadedFileUrlMap(rows.map((row) => row.serialized.id));
  const videosByPostId = new Map<string, NonNullable<ReturnType<typeof serializeVideo>>[]>();
  for (const row of rows) {
    const { postId, serialized } = row;
    const resolved = resolvedUrlMap.get(serialized.id) ?? null;
    if (audience === "public" && !resolved) {
      continue;
    }
    const item = { ...serialized, url: resolved ?? serialized.url };
    const bucket = videosByPostId.get(postId) ?? [];
    bucket.push(item);
    videosByPostId.set(postId, bucket);
  }

  return videosByPostId;
}

export async function buildCoversByPostId(
  items: PostCoverRecord[],
  audience: FileAudience = "public"
) {
  type Row = { postId: string; serialized: NonNullable<ReturnType<typeof serializeImage>> };
  const rows: Row[] = [];
  const uniqueCoverFileIds = Array.from(
    new Set(
      items
        .map((item) => item?.coverImageFileId ?? null)
        .filter((fileId): fileId is string => typeof fileId === "string" && fileId.length > 0)
    )
  );
  const coverFiles = await uploadsRepo.listFilesByIds(uniqueCoverFileIds);
  const coverFileById = new Map(
    coverFiles
      .filter((file) => file.mediaKind === "image")
      .map((file) => [file.id, file])
  );

  for (const item of items) {
    if (!item?.id || !item.coverImageFileId) {
      continue;
    }
    const image = coverFileById.get(item.coverImageFileId) ?? null;
    const serialized = serializeImage(image);
    if (!serialized) {
      continue;
    }
    rows.push({ postId: item.id, serialized });
  }

  const resolvedUrlMap =
    audience === "public"
      ? await resolvePublicUploadedFileUrlMap(rows.map((row) => row.serialized.id))
      : await resolveUploadedFileUrlMap(rows.map((row) => row.serialized.id));
  const coversByPostId = new Map<string, NonNullable<ReturnType<typeof serializeImage>>>();
  for (const row of rows) {
    const { postId, serialized } = row;
    const resolved = resolvedUrlMap.get(serialized.id) ?? null;
    if (audience === "public" && !resolved) {
      continue;
    }
    coversByPostId.set(postId, { ...serialized, url: resolved ?? serialized.url });
  }

  return coversByPostId;
}
