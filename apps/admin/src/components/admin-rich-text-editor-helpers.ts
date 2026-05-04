import {
  extractPlainTextFromHtml,
  type UploadedMediaAsset,
} from "@feijia/rich-text-editor/helpers";

export { extractPlainTextFromHtml, type UploadedMediaAsset };

/** @deprecated 请使用 `getRichTextMediaInsertions`（来自 @feijia/rich-text-editor） */
export { getRichTextMediaInsertions as getAdminRichTextMediaInsertions } from "@feijia/rich-text-editor/helpers";

interface OfficialArticleDocument {
  summary: string;
  contentHtml: string;
  plainText: string;
}

const OFFICIAL_ARTICLE_SUMMARY_ATTRIBUTE = "data-official-article-summary";

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decodeHtml(input: string) {
  return input
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

function stripSummaryPrefixFromHtml(html: string) {
  const summaryPattern =
    /^<p\s+data-official-article-summary="true">\s*<strong>(.*?)<\/strong>\s*<\/p>/i;
  const match = html.match(summaryPattern);

  if (!match) {
    return {
      summary: "",
      contentHtml: html,
    };
  }

  return {
    summary: decodeHtml(match[1] ?? "").trim(),
    contentHtml: html.replace(summaryPattern, "").trim(),
  };
}

function removeMatchingMediaNodes(documentNode: Document, assetUrl: string) {
  const selectors = [
    `img[src="${assetUrl}"]`,
    `video[src="${assetUrl}"]`,
    `source[src="${assetUrl}"]`,
  ];

  for (const selector of selectors) {
    for (const node of Array.from(
      documentNode.body.querySelectorAll(selector)
    )) {
      const figure =
        node.closest("figure[data-video-block]") ?? node.closest("figure");
      const video = node.closest("video");

      if (figure) {
        figure.remove();
        continue;
      }

      if (node.tagName === "SOURCE" && video) {
        video.remove();
        continue;
      }

      node.remove();
    }
  }
}

/**
 * 构造带摘要前缀的官方文章文档内容。
 * @param summary 官方文章摘要文本。
 * @param contentHtml 正文 HTML 内容。
 * @returns 包含最终 `contentHtml` 和 `plainText` 的文档结果。
 */
export function buildOfficialArticleDocument(
  summary: string,
  contentHtml: string
): Pick<OfficialArticleDocument, "contentHtml" | "plainText"> {
  const trimmedSummary = summary.trim();
  const trimmedContentHtml = contentHtml.trim();
  const summaryBlock = trimmedSummary
    ? `<p ${OFFICIAL_ARTICLE_SUMMARY_ATTRIBUTE}="true"><strong>${escapeHtml(trimmedSummary)}</strong></p>`
    : "";

  return {
    contentHtml: [summaryBlock, trimmedContentHtml].filter(Boolean).join(""),
    plainText: [trimmedSummary, extractPlainTextFromHtml(trimmedContentHtml)]
      .filter(Boolean)
      .join("\n\n"),
  };
}

/**
 * 解析官方文章文档，拆分摘要、正文和纯文本。
 * @param contentHtml 待解析的文章 HTML，可为空。
 * @returns 统一的官方文章文档结构。
 */
export function parseOfficialArticleDocument(
  contentHtml: string | null | undefined
): OfficialArticleDocument {
  const trimmedContentHtml = contentHtml?.trim() ?? "";

  if (!trimmedContentHtml) {
    return {
      summary: "",
      contentHtml: "",
      plainText: "",
    };
  }

  if (typeof DOMParser !== "undefined") {
    const documentNode = new DOMParser().parseFromString(
      trimmedContentHtml,
      "text/html"
    );
    const summaryNode = documentNode.body.querySelector(
      `p[${OFFICIAL_ARTICLE_SUMMARY_ATTRIBUTE}="true"]`
    );

    let summary = "";
    if (summaryNode?.parentElement === documentNode.body) {
      summary = summaryNode.textContent?.trim() ?? "";
      summaryNode.remove();
    }

    const nextContentHtml = documentNode.body.innerHTML.trim();

    return {
      summary,
      contentHtml: nextContentHtml,
      plainText: extractPlainTextFromHtml(nextContentHtml),
    };
  }

  const stripped = stripSummaryPrefixFromHtml(trimmedContentHtml);
  return {
    summary: stripped.summary,
    contentHtml: stripped.contentHtml,
    plainText: extractPlainTextFromHtml(stripped.contentHtml),
  };
}

/**
 * 从文章 HTML 中移除指定媒体资源引用。
 * @param html 原始文章 HTML。
 * @param assetUrl 需要移除的媒体地址。
 * @returns 删除匹配媒体节点后的 HTML。
 */
export function removeAdminRichTextMediaReferenceFromHtml(
  html: string,
  assetUrl: string
) {
  if (!html.trim() || !assetUrl) {
    return html;
  }

  if (typeof DOMParser !== "undefined") {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    removeMatchingMediaNodes(documentNode, assetUrl);
    return documentNode.body.innerHTML.trim();
  }

  const escapedUrl = assetUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html
    .replace(
      new RegExp(
        `<figure[^>]*data-video-block="true"[^>]*>\\s*<video[^>]*>\\s*<source[^>]*src="${escapedUrl}"[^>]*>\\s*<\\/video>\\s*<\\/figure>`,
        "gi"
      ),
      ""
    )
    .replace(
      new RegExp(
        `<figure[^>]*>\\s*<img[^>]*src="${escapedUrl}"[^>]*>\\s*<\\/figure>`,
        "gi"
      ),
      ""
    )
    .replace(
      new RegExp(
        `<figure[^>]*>\\s*<video[^>]*src="${escapedUrl}"[^>]*>[\\s\\S]*?<\\/video>\\s*<\\/figure>`,
        "gi"
      ),
      ""
    )
    .replace(
      new RegExp(
        `<video[^>]*src="${escapedUrl}"[^>]*>[\\s\\S]*?<\\/video>`,
        "gi"
      ),
      ""
    )
    .replace(new RegExp(`<img[^>]*src="${escapedUrl}"[^>]*>`, "gi"), "")
    .replace(new RegExp(`<source[^>]*src="${escapedUrl}"[^>]*>`, "gi"), "")
    .trim();
}
