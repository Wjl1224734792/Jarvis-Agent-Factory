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
  if (!html.trim()) {
    return html;
  }

  if (typeof DOMParser !== "undefined") {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    for (const node of Array.from(documentNode.body.querySelectorAll("img, video"))) {
      if (node.getAttribute("src") !== assetUrl) {
        continue;
      }

      const container = node.closest("figure") ?? node;
      container.remove();
    }

    return documentNode.body.innerHTML;
  }

  const escapedUrl = assetUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html
    .replace(new RegExp(`<figure[^>]*>\\s*<img[^>]*src="${escapedUrl}"[^>]*>\\s*</figure>`, "g"), "")
    .replace(new RegExp(`<figure[^>]*>\\s*<video[^>]*src="${escapedUrl}"[^>]*>.*?</video>\\s*</figure>`, "g"), "")
    .replace(new RegExp(`<img[^>]*src="${escapedUrl}"[^>]*>`, "g"), "")
    .replace(new RegExp(`<video[^>]*src="${escapedUrl}"[^>]*>.*?</video>`, "g"), "");
}
