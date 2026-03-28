export type OfficialArticleFormValues = {
  title: string;
  content: string;
  contentHtml?: string | null;
  contentCategoryId: string;
};

export function buildOfficialArticlePayload(
  values: OfficialArticleFormValues,
  imageIds: string[]
) {
  return {
    title: values.title.trim(),
    content: values.content.trim(),
    contentHtml: values.contentHtml?.trim() ? values.contentHtml.trim() : null,
    contentCategoryId: values.contentCategoryId,
    imageIds
  };
}
