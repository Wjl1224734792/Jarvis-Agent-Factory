type PersistedLocalPreviewAsset = {
  url: string;
  file?: File;
  isLocal?: boolean;
};

export type RestoredPreviewAsset<T extends PersistedLocalPreviewAsset> = {
  asset: T;
  previousUrl: string | null;
};

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

export function revokePreviewAssets(
  assets: readonly PersistedLocalPreviewAsset[] | null | undefined
) {
  for (const asset of assets ?? []) {
    revokePreviewAsset(asset);
  }
}
