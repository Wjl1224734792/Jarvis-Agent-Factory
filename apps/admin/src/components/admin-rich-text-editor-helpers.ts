export type UploadedMediaAsset = {
  id: string;
  url: string;
  fileName?: string;
};

type RunnableBoolean = boolean | { run: () => boolean };

export type RichTextToolbarEditor = {
  isActive: (nameOrAttributes: string | Record<string, unknown>, attributes?: Record<string, unknown>) => boolean;
  can: () => {
    chain: () => {
      focus: () => {
        undo: () => RunnableBoolean;
        redo: () => RunnableBoolean;
      };
    };
  };
};

export type RichTextToolbarStateItem = {
  key: string;
  active: boolean;
  disabled: boolean;
};

type OfficialArticleDocument = {
  summary: string;
  contentHtml: string;
  plainText: string;
};

const OFFICIAL_ARTICLE_SUMMARY_ATTRIBUTE = "data-official-article-summary";

function resolveRunnableBoolean(value: RunnableBoolean) {
  return typeof value === "boolean" ? value : value.run();
}

function isAlignmentActive(editor: RichTextToolbarEditor | null, alignment: "left" | "center" | "right") {
  if (!editor) {
    return false;
  }

  if (alignment === "left") {
    return !editor.isActive({ textAlign: "center" }) && !editor.isActive({ textAlign: "right" });
  }

  return editor.isActive({ textAlign: alignment });
}

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
      contentHtml: html
    };
  }

  return {
    summary: decodeHtml(match[1] ?? "").trim(),
    contentHtml: html.replace(summaryPattern, "").trim()
  };
}

function removeMatchingMediaNodes(documentNode: Document, assetUrl: string) {
  const selectors = [`img[src="${assetUrl}"]`, `video[src="${assetUrl}"]`, `source[src="${assetUrl}"]`];

  for (const selector of selectors) {
    for (const node of Array.from(documentNode.body.querySelectorAll(selector))) {
      const figure = node.closest("figure[data-video-block]") ?? node.closest("figure");
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

export function buildAdminRichTextToolbarState(editor: RichTextToolbarEditor | null): RichTextToolbarStateItem[] {
  const focusChain = editor?.can().chain().focus();
  const canUndo = focusChain ? resolveRunnableBoolean(focusChain.undo()) : false;
  const canRedo = focusChain ? resolveRunnableBoolean(focusChain.redo()) : false;

  return [
    { key: "bold", active: editor?.isActive("bold") ?? false, disabled: !editor },
    { key: "italic", active: editor?.isActive("italic") ?? false, disabled: !editor },
    { key: "underline", active: editor?.isActive("underline") ?? false, disabled: !editor },
    { key: "strike", active: editor?.isActive("strike") ?? false, disabled: !editor },
    { key: "highlight", active: editor?.isActive("highlight") ?? false, disabled: !editor },
    { key: "code", active: editor?.isActive("code") ?? false, disabled: !editor },
    { key: "codeBlock", active: editor?.isActive("codeBlock") ?? false, disabled: !editor },
    { key: "heading2", active: editor?.isActive("heading", { level: 2 }) ?? false, disabled: !editor },
    { key: "heading3", active: editor?.isActive("heading", { level: 3 }) ?? false, disabled: !editor },
    { key: "bulletList", active: editor?.isActive("bulletList") ?? false, disabled: !editor },
    { key: "orderedList", active: editor?.isActive("orderedList") ?? false, disabled: !editor },
    { key: "taskList", active: editor?.isActive("taskList") ?? false, disabled: !editor },
    { key: "blockquote", active: editor?.isActive("blockquote") ?? false, disabled: !editor },
    { key: "horizontalRule", active: false, disabled: !editor },
    { key: "table", active: editor?.isActive("table") ?? false, disabled: !editor },
    { key: "alignLeft", active: isAlignmentActive(editor, "left"), disabled: !editor },
    { key: "alignCenter", active: isAlignmentActive(editor, "center"), disabled: !editor },
    { key: "alignRight", active: isAlignmentActive(editor, "right"), disabled: !editor },
    { key: "link", active: editor?.isActive("link") ?? false, disabled: !editor },
    { key: "unlink", active: false, disabled: !(editor?.isActive("link") ?? false) },
    { key: "undo", active: false, disabled: !canUndo },
    { key: "redo", active: false, disabled: !canRedo }
  ];
}

export function getAdminRichTextMediaInsertions(kind: "image" | "video", assets: UploadedMediaAsset[]) {
  if (kind === "image") {
    return assets.map((asset) => ({
      type: "image" as const,
      attrs: {
        src: asset.url,
        alt: asset.fileName ?? "image"
      }
    }));
  }

  return assets.map((asset) => ({
    type: "videoBlock" as const,
    attrs: {
      src: asset.url,
      poster: null
    }
  }));
}

export function shouldSyncAdminRichTextValue(currentHtml: string, nextValue: string) {
  return currentHtml !== nextValue;
}

export function extractPlainTextFromHtml(html: string) {
  if (!html.trim()) {
    return "";
  }

  if (typeof DOMParser !== "undefined") {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    return documentNode.body.textContent?.replace(/\s+\n/g, "\n").trim() ?? "";
  }

  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function buildOfficialArticleDocument(summary: string, contentHtml: string): Pick<OfficialArticleDocument, "contentHtml" | "plainText"> {
  const trimmedSummary = summary.trim();
  const trimmedContentHtml = contentHtml.trim();
  const summaryBlock = trimmedSummary
    ? `<p ${OFFICIAL_ARTICLE_SUMMARY_ATTRIBUTE}="true"><strong>${escapeHtml(trimmedSummary)}</strong></p>`
    : "";

  return {
    contentHtml: [summaryBlock, trimmedContentHtml].filter(Boolean).join(""),
    plainText: [trimmedSummary, extractPlainTextFromHtml(trimmedContentHtml)].filter(Boolean).join("\n\n")
  };
}

export function parseOfficialArticleDocument(contentHtml: string | null | undefined): OfficialArticleDocument {
  const trimmedContentHtml = contentHtml?.trim() ?? "";

  if (!trimmedContentHtml) {
    return {
      summary: "",
      contentHtml: "",
      plainText: ""
    };
  }

  if (typeof DOMParser !== "undefined") {
    const documentNode = new DOMParser().parseFromString(trimmedContentHtml, "text/html");
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
      plainText: extractPlainTextFromHtml(nextContentHtml)
    };
  }

  const stripped = stripSummaryPrefixFromHtml(trimmedContentHtml);
  return {
    summary: stripped.summary,
    contentHtml: stripped.contentHtml,
    plainText: extractPlainTextFromHtml(stripped.contentHtml)
  };
}

export function removeAdminRichTextMediaReferenceFromHtml(html: string, assetUrl: string) {
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
      new RegExp(`<figure[^>]*>\\s*<img[^>]*src="${escapedUrl}"[^>]*>\\s*<\\/figure>`, "gi"),
      ""
    )
    .replace(
      new RegExp(`<figure[^>]*>\\s*<video[^>]*src="${escapedUrl}"[^>]*>[\\s\\S]*?<\\/video>\\s*<\\/figure>`, "gi"),
      ""
    )
    .replace(new RegExp(`<video[^>]*src="${escapedUrl}"[^>]*>[\\s\\S]*?<\\/video>`, "gi"), "")
    .replace(new RegExp(`<img[^>]*src="${escapedUrl}"[^>]*>`, "gi"), "")
    .replace(new RegExp(`<source[^>]*src="${escapedUrl}"[^>]*>`, "gi"), "")
    .trim();
}
