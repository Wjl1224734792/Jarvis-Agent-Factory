export type DeferredArticleEditorView = "fallback" | "loading" | "editor";

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
