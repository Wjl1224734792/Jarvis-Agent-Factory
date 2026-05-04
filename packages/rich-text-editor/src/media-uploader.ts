import type { UploadedMediaAsset } from "./rich-text-editor-helpers";

// ============================================================
// 常量
// ============================================================

/** 匹配 HTML 属性值中的 blob: URL 的正则 */
const BLOB_URL_RE = /blob:[^\s"']+/g;

// ============================================================
// collectBlobUrls
// ============================================================

/**
 * 从 HTML 中提取所有 blob: URL。
 * 扫描 `<img src>`、`<video src>`、`<video poster>`、`<source src>` 属性。
 * 自动去重。
 *
 * @param html 待扫描的 HTML 字符串
 * @returns 去重后的 blob URL 列表
 */
export function collectBlobUrls(html: string): string[] {
  const trimmed = html.trim();
  if (!trimmed) {
    return [];
  }

  const matches = trimmed.match(BLOB_URL_RE);
  if (!matches) {
    return [];
  }

  // 使用 Set 去重，保持首次出现顺序
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of matches) {
    if (!seen.has(url)) {
      seen.add(url);
      result.push(url);
    }
  }

  return result;
}

// ============================================================
// uploadMediaBatch
// ============================================================

/** 批量上传结果 */
export interface MediaBatchResult {
  /** blob URL → 真实 URL 的映射（仅包含上传成功的文件） */
  urlMapping: Map<string, string>;
  /** 成功上传的图片资源 ID 列表 */
  imageIds: string[];
  /** 成功上传的视频资源 ID 列表 */
  videoIds: string[];
  /** 上传失败的文件信息 */
  errors: Array<{ blobUrl: string; message: string }>;
}

/**
 * 批量上传媒体文件，并行执行，单文件失败不阻塞其他文件。
 *
 * @param files blob URL → File 的映射
 * @param uploadImageFn 单张图片上传函数
 * @param uploadVideoFn 单个视频上传函数
 * @returns 上传结果，包含 urlMapping、imageIds、videoIds 和 errors
 */
export async function uploadMediaBatch(
  files: Map<string, File>,
  uploadImageFn: (file: File) => Promise<UploadedMediaAsset>,
  uploadVideoFn: (file: File) => Promise<UploadedMediaAsset>
): Promise<MediaBatchResult> {
  const urlMapping = new Map<string, string>();
  const imageIds: string[] = [];
  const videoIds: string[] = [];
  const errors: Array<{ blobUrl: string; message: string }> = [];

  if (files.size === 0) {
    return { urlMapping, imageIds, videoIds, errors };
  }

  // 构建所有上传任务
  const tasks = Array.from(files, ([blobUrl, file]) => {
    const isVideo = file.type.startsWith("video/");
    const uploadFn = isVideo ? uploadVideoFn : uploadImageFn;
    return { blobUrl, file, isVideo, uploadFn };
  });

  // 并行上传全部文件
  const settled = await Promise.allSettled(
    tasks.map(({ file, uploadFn }) => uploadFn(file))
  );

  // 分类处理上传结果
  for (let i = 0; i < tasks.length; i++) {
    const { blobUrl, isVideo } = tasks[i];
    const outcome = settled[i];

    if (outcome.status === "fulfilled") {
      const asset = outcome.value;
      urlMapping.set(blobUrl, asset.url);
      if (isVideo) {
        videoIds.push(asset.id);
      } else {
        imageIds.push(asset.id);
      }
    } else {
      const message =
        outcome.reason instanceof Error
          ? outcome.reason.message
          : String(outcome.reason);
      errors.push({ blobUrl, message });
    }
  }

  return { urlMapping, imageIds, videoIds, errors };
}

// ============================================================
// replaceBlobUrls
// ============================================================

/**
 * 用上传后的真实 URL 替换 HTML 中的 blob URL。
 * 优先使用 DOMParser 精确替换属性值，回退为正则字符串替换。
 * 未在映射中找到的 blob URL 保持不变。
 *
 * @param html 包含 blob URL 的原始 HTML
 * @param urlMapping blob URL → 真实 URL 的映射
 * @returns 替换后的 HTML 字符串
 */
export function replaceBlobUrls(
  html: string,
  urlMapping: Map<string, string>
): string {
  if (urlMapping.size === 0 || !html) {
    return html;
  }

  // 优先使用 DOMParser 精确替换属性值
  if (typeof DOMParser !== "undefined") {
    try {
      return replaceViaDOMParser(html, urlMapping);
    } catch {
      // DOMParser 解析失败时回退到正则替换
    }
  }

  // 回退：正则字符串替换
  return replaceViaRegex(html, urlMapping);
}

/**
 * 使用 DOMParser 精确替换 HTML 属性中的 blob URL。
 */
function replaceViaDOMParser(
  html: string,
  urlMapping: Map<string, string>
): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // 精确替换已知属性中的 blob URL
  const blobAttributes = [
    { selector: "img", attr: "src" },
    { selector: "video", attr: "src" },
    { selector: "video", attr: "poster" },
    { selector: "source", attr: "src" },
  ];

  for (const { selector, attr } of blobAttributes) {
    const elements = doc.querySelectorAll(selector);
    for (const el of elements) {
      const currentValue = el.getAttribute(attr);
      if (!currentValue) {
        continue;
      }
      const mapped = urlMapping.get(currentValue);
      if (mapped) {
        el.setAttribute(attr, mapped);
      }
    }
  }

  return doc.body.innerHTML;
}

/**
 * 使用正则表达式进行字符串级别的 blob URL 替换。
 */
function replaceViaRegex(
  html: string,
  urlMapping: Map<string, string>
): string {
  let result = html;
  for (const [blobUrl, realUrl] of urlMapping) {
    // 转义正则特殊字符后替换
    const escapedBlob = blobUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escapedBlob, "g"), realUrl);
  }
  return result;
}
