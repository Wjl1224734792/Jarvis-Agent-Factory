import { removeAdminRichTextMediaReferenceFromHtml } from "../../components/admin-rich-text-editor-helpers";

export interface OfficialArticleFormValues {
  title: string;
  content: string;
  contentHtml?: string | null;
  contentCategoryId: string;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  declaration?: string;
}

function normalizeSourceLabel(value: string | null | undefined) {
  const label = value?.trim();
  return label ? label : null;
}

/**
 * 构造官方文章创建或更新接口载荷。
 * @param values 文章表单值。
 * @param imageIds 关联图片文件 ID 列表。
 * @param videoIds 关联视频文件 ID 列表。
 * @returns 去空白并收敛来源字段后的提交数据。
 * @throws 本函数不主动抛出异常。
 */
export function buildOfficialArticlePayload(
  values: OfficialArticleFormValues,
  imageIds: string[],
  videoIds: string[] = []
) {
  const sourceLabel = normalizeSourceLabel(values.sourceLabel);
  const sourceUrl = sourceLabel && values.sourceUrl?.trim() ? values.sourceUrl.trim() : null;

  return {
    title: values.title.trim(),
    content: values.content.trim(),
    contentHtml: values.contentHtml?.trim() ? values.contentHtml.trim() : null,
    contentCategoryId: values.contentCategoryId,
    sourceLabel,
    sourceUrl,
    declaration: values.declaration ?? '',
    imageIds,
    videoIds
  };
}

/**
 * 从富文本 HTML 中移除指定媒体引用。
 * @param html 原始文章 HTML。
 * @param assetUrl 需要移除的媒体地址。
 * @returns 删除媒体引用后的 HTML。
 * @throws 本函数不主动抛出异常；底层字符串或 DOM 处理异常会由调用链决定是否透传。
 */
export function removeMediaFromHtml(html: string, assetUrl: string) {
  return removeAdminRichTextMediaReferenceFromHtml(html, assetUrl);
}
