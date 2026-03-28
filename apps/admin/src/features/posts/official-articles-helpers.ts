export type OfficialArticleFormValues = {
  title: string;
  content: string;
  contentCategoryId: string;
};

export function buildOfficialArticlePayload(
  values: OfficialArticleFormValues,
  imageIds: string[]
) {
  return {
    title: values.title.trim(),
    content: values.content.trim(),
    contentCategoryId: values.contentCategoryId,
    imageIds
  };
}
