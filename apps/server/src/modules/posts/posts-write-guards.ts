type PostType = 'article' | 'moment';

type MediaOwnershipValidationResult =
  | {
      kind: 'ok';
      imageIds: string[];
      videoIds: string[];
    }
  | {
      kind: 'invalid_images';
    }
  | {
      kind: 'invalid_videos';
    };

type MomentCoverResolutionResult =
  | {
      kind: 'ok';
      coverImageId: string | null;
    }
  | {
      kind: 'invalid_cover';
    };

/**
 * 对封面图 ID 做统一归一化。
 *
 * @param coverImageId 原始封面图 ID。
 * @returns 去空白后的封面图 ID；空值时返回 `null`。
 * @throws {never} 该函数只做字符串归一化，不会主动抛出异常。
 */
export function normalizeCoverImageId(
  coverImageId: string | null | undefined
) {
  const normalized = coverImageId?.trim();

  return normalized ? normalized : null;
}

/**
 * 归一化并去重写入时的图片/视频 ID 列表。
 *
 * @param input 原始图片与视频 ID 列表。
 * @returns 去重后的图片与视频 ID 列表。
 * @throws {never} 该函数只做数组去重，不会主动抛出异常。
 */
export function normalizePostMediaIds(input: {
  imageIds: string[];
  videoIds: string[];
}) {
  return {
    imageIds: Array.from(new Set(input.imageIds)),
    videoIds: Array.from(new Set(input.videoIds))
  };
}

/**
 * 校验帖子写入时的媒体归属/可附加性。
 *
 * @param input 去重前的媒体 ID 列表与外部查询器。
 * @returns 校验通过时返回去重后的媒体 ID；失败时返回对应错误种类。
 * @throws {Error} 当外部媒体查询器抛错时透传异常。
 */
export async function validatePostMediaOwnership(input: {
  imageIds: string[];
  videoIds: string[];
  listImageRecords: (imageIds: string[]) => Promise<unknown[]>;
  listVideoRecords: (videoIds: string[]) => Promise<unknown[]>;
}): Promise<MediaOwnershipValidationResult> {
  const { imageIds, videoIds } = normalizePostMediaIds({
    imageIds: input.imageIds,
    videoIds: input.videoIds
  });
  const [images, videos] = await Promise.all([
    input.listImageRecords(imageIds),
    input.listVideoRecords(videoIds)
  ]);

  if (images.length !== imageIds.length) {
    return { kind: 'invalid_images' };
  }

  if (videos.length !== videoIds.length) {
    return { kind: 'invalid_videos' };
  }

  return {
    kind: 'ok',
    imageIds,
    videoIds
  };
}

/**
 * 判断动态帖子媒体组合是否非法。
 *
 * @param postType 帖子类型。
 * @param imageIds 图片 ID 列表。
 * @param videoIds 视频 ID 列表。
 * @returns `moment` 同时挂图和视频，或视频超过 1 条时返回 `true`。
 * @throws {never} 该函数只做组合判断，不会主动抛出异常。
 */
export function hasInvalidMomentMediaSelection(
  postType: PostType,
  imageIds: string[],
  videoIds: string[]
) {
  if (postType !== 'moment') {
    return false;
  }

  return (imageIds.length > 0 && videoIds.length > 0) || videoIds.length > 1;
}

/**
 * 解析 `moment` 类型帖子最终应使用的封面图。
 *
 * @param input 帖子类型、图片列表、原始封面图以及 detached cover 校验器。
 * @returns 合法时返回解析后的封面图 ID；不合法时返回 `invalid_cover`。
 * @throws {Error} 当外部 detached cover 校验器抛错时透传异常。
 */
export async function resolveMomentCoverImageId(input: {
  postType: PostType;
  imageIds: string[];
  coverImageId: string | null | undefined;
  validateDetachedCoverImageId?: (coverImageId: string) => Promise<boolean>;
}): Promise<MomentCoverResolutionResult> {
  if (input.postType !== 'moment') {
    return {
      kind: 'ok',
      coverImageId: null
    };
  }

  const requestedCoverImageId = normalizeCoverImageId(input.coverImageId);
  let resolvedCoverImageId = requestedCoverImageId;

  if (input.imageIds.length > 0) {
    if (
      requestedCoverImageId &&
      !input.imageIds.includes(requestedCoverImageId)
    ) {
      return { kind: 'invalid_cover' };
    }

    resolvedCoverImageId =
      requestedCoverImageId ?? input.imageIds[0] ?? null;
  }

  if (
    resolvedCoverImageId &&
    input.imageIds.length === 0 &&
    input.validateDetachedCoverImageId
  ) {
    const isDetachedCoverValid = await input.validateDetachedCoverImageId(
      resolvedCoverImageId
    );
    if (!isDetachedCoverValid) {
      return { kind: 'invalid_cover' };
    }
  }

  return {
    kind: 'ok',
    coverImageId: resolvedCoverImageId
  };
}

/**
 * 判断文章帖子是否缺少必填分类。
 *
 * @param postType 帖子类型。
 * @param contentCategoryId 内容分类 ID。
 * @returns 文章缺少分类时返回 `true`。
 * @throws {never} 该函数只做空值判断，不会主动抛出异常。
 */
export function isArticleCategoryMissing(
  postType: PostType,
  contentCategoryId: string | null
) {
  return postType === 'article' && !contentCategoryId;
}
