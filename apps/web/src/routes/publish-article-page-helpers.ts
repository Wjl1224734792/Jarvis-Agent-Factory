export type DeferredArticleEditorView = "fallback" | "loading" | "editor";

type ArticleMediaReplacementResult = {
  html: string;
  unresolvedMediaUrls: string[];
};

const RICH_TEXT_MEDIA_ATTRIBUTES = ["src", "poster"] as const;

function isLocalMediaUrl(value: string | null | undefined) {
  return Boolean(value?.trim().match(/^blob:/i));
}

/**
 * Separates module preloading from editor mount so user intent can warm the
 * bundle without paying the full editor initialization cost yet.
 */
export function resolveDeferredArticleEditorView(options: {
  hasEditorComponent: boolean;
  isEditorActivated: boolean;
  isEditorLoading: boolean;
}): DeferredArticleEditorView {
  if (options.hasEditorComponent && options.isEditorActivated) {
    return "editor";
  }

  if (!options.hasEditorComponent && options.isEditorActivated && options.isEditorLoading) {
    return "loading";
  }

  return "fallback";
}

/**
 * Keeps blank create flows cheap while preserving the seamless editor
 * experience when the user is resuming an existing article session.
 */
export function shouldAutoActivateDeferredArticleEditor(options: {
  hasRestoredDraft: boolean;
  isEditingExistingArticle: boolean;
}) {
  return options.hasRestoredDraft || options.isEditingExistingArticle;
}

/**
 * Presents article media as a neutral inventory summary without implying a
 * fixed cap so the publish UI stays aligned with backend validation.
 */
export function formatArticleMediaSummary(options: {
  imageCount: number;
  videoCount: number;
}) {
  const segments: string[] = [];

  if (options.imageCount > 0) {
    segments.push(`${options.imageCount} 张图片`);
  }

  if (options.videoCount > 0) {
    segments.push(`${options.videoCount} 个视频`);
  }

  return segments.length > 0 ? segments.join(" · ") : "未插入媒体";
}

/**
 * Rewrites local preview URLs inside persisted rich text media attributes.
 * Returning unresolved blob URLs lets the submit flow fail before it stores
 * browser-local references that would break outside the current tab.
 */
export function replaceArticleLocalMediaUrls(
  html: string,
  mapping: Record<string, string>
): ArticleMediaReplacementResult {
  if (!html.trim()) {
    return {
      html,
      unresolvedMediaUrls: []
    };
  }

  if (typeof DOMParser !== "undefined") {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const unresolvedMediaUrls = new Set<string>();

    documentNode.querySelectorAll("img, video, source").forEach((node) => {
      for (const attributeName of RICH_TEXT_MEDIA_ATTRIBUTES) {
        const value = node.getAttribute(attributeName);
        if (!isLocalMediaUrl(value)) {
          continue;
        }

        const replacement = mapping[value ?? ""];
        if (replacement) {
          node.setAttribute(attributeName, replacement);
          continue;
        }

        unresolvedMediaUrls.add(value ?? "");
      }
    });

    return {
      html: documentNode.body.innerHTML.trim(),
      unresolvedMediaUrls: Array.from(unresolvedMediaUrls)
    };
  }

  const replaced = Object.entries(mapping).reduce(
    (current, [from, to]) => current.split(from).join(to),
    html
  );
  const unresolvedMediaUrls = Array.from(
    new Set(
      Array.from(
        replaced.matchAll(/\b(?:src|poster)\s*=\s*(["'])(blob:[\s\S]*?)\1/gi),
        (match) => match[2] ?? ""
      ).filter(Boolean)
    )
  );

  return {
    html: replaced,
    unresolvedMediaUrls
  };
}
