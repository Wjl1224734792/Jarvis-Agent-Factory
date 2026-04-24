import { removeAdminRichTextMediaReferenceFromHtml } from "../../components/admin-rich-text-editor-helpers";

export type OfficialArticleFormValues = {
  title: string;
  content: string;
  contentHtml?: string | null;
  contentCategoryId: string;
};

export function buildOfficialArticlePayload(
  values: OfficialArticleFormValues,
  imageIds: string[],
  videoIds: string[] = []
) {
  return {
    title: values.title.trim(),
    content: values.content.trim(),
    contentHtml: values.contentHtml?.trim() ? values.contentHtml.trim() : null,
    contentCategoryId: values.contentCategoryId,
    imageIds,
    videoIds
  };
}

export function removeMediaFromHtml(html: string, assetUrl: string) {
  return removeAdminRichTextMediaReferenceFromHtml(html, assetUrl);
}
