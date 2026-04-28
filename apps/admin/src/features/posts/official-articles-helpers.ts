import { removeAdminRichTextMediaReferenceFromHtml } from "../../components/admin-rich-text-editor-helpers";

export type OfficialArticleFormValues = {
  title: string;
  content: string;
  contentHtml?: string | null;
  contentCategoryId: string;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
};

function normalizeSourceLabel(value: string | null | undefined) {
  const label = value?.trim();
  return label ? label : null;
}

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
    imageIds,
    videoIds
  };
}

export function removeMediaFromHtml(html: string, assetUrl: string) {
  return removeAdminRichTextMediaReferenceFromHtml(html, assetUrl);
}
