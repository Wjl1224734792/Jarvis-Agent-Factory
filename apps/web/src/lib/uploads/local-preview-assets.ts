interface PersistedLocalPreviewAsset {
  url: string;
  file?: File;
  isLocal?: boolean;
}

export interface RestoredPreviewAsset<T extends PersistedLocalPreviewAsset> {
  asset: T;
  previousUrl: string | null;
}

/**
 * Blob URL does not survive a page reload, so persisted drafts need to recreate
 * a fresh preview URL from the stored File before binding the asset back to UI.
 */
export function restorePersistedPreviewAsset<T extends PersistedLocalPreviewAsset>(
  asset: T | null | undefined
): RestoredPreviewAsset<T> | null {
  if (!asset) {
    return null;
  }

  if (
    !asset.isLocal ||
    typeof File !== "function" ||
    !(asset.file instanceof File) ||
    typeof URL.createObjectURL !== "function"
  ) {
    return {
      asset,
      previousUrl: null
    };
  }

  return {
    asset: {
      ...asset,
      url: URL.createObjectURL(asset.file)
    },
    previousUrl: asset.url
  };
}

export function restorePersistedPreviewAssets<T extends PersistedLocalPreviewAsset>(
  assets: readonly T[] | null | undefined
): Array<RestoredPreviewAsset<T>> {
  return (assets ?? []).flatMap((asset) => {
    const restored = restorePersistedPreviewAsset(asset);
    return restored ? [restored] : [];
  });
}

/**
 * Rich text payloads may inline the blob URL directly; callers can patch stale
 * draft markup with this replacement map after restoring the preview assets.
 */
/**
 * 构建富文本草稿里旧 blob URL 到新 blob URL 的替换映射。
 *
 * @param restoredAssets 已完成还原的预览资源数组。
 * @returns 可用于修补草稿 HTML 的 URL 映射表。
 * @throws {never} 该函数只遍历数组生成映射，不会主动抛出异常。
 */
export function buildRestoredPreviewUrlMap<T extends PersistedLocalPreviewAsset>(
  restoredAssets: readonly RestoredPreviewAsset<T>[]
) {
  const mapping: Record<string, string> = {};

  for (const entry of restoredAssets) {
    if (entry.previousUrl && entry.previousUrl !== entry.asset.url) {
      mapping[entry.previousUrl] = entry.asset.url;
    }
  }

  return mapping;
}

/**
 * 释放单个本地预览资源对应的 blob URL。
 *
 * @param asset 需要释放的预览资源。
 * @returns 无返回值；非本地资源或非 blob URL 时静默跳过。
 * @throws {never} 浏览器不支持 `URL.revokeObjectURL` 时不会主动抛出异常。
 */
export function revokePreviewAsset(asset: PersistedLocalPreviewAsset | null | undefined) {
  if (
    !asset?.isLocal ||
    typeof URL.revokeObjectURL !== "function" ||
    !asset.url.startsWith("blob:")
  ) {
    return;
  }

  URL.revokeObjectURL(asset.url);
}

/**
 * 批量释放预览资源对应的 blob URL。
 *
 * @param assets 需要释放的预览资源数组。
 * @returns 无返回值；空数组时静默跳过。
 * @throws {never} 释放单项失败不会中断整个批次。
 */
export function revokePreviewAssets(
  assets: readonly PersistedLocalPreviewAsset[] | null | undefined
) {
  for (const asset of assets ?? []) {
    revokePreviewAsset(asset);
  }
}
