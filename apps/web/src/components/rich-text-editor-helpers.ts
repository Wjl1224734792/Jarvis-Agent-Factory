export type UploadedMediaAsset = {
  id: string;
  url: string;
  fileName?: string;
  mimeType?: string;
};

export type RichTextToolbarKey =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "highlight"
  | "code"
  | "codeBlock"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "blockquote"
  | "horizontalRule"
  | "table"
  | "alignLeft"
  | "alignCenter"
  | "alignRight"
  | "link"
  | "unlink"
  | "undo"
  | "redo";

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
  key: RichTextToolbarKey;
  active: boolean;
  disabled: boolean;
};

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

export function buildRichTextToolbarState(editor: RichTextToolbarEditor | null): RichTextToolbarStateItem[] {
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

export function getRichTextMediaInsertions(kind: "image" | "video", assets: UploadedMediaAsset[]) {
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

export function shouldSyncRichTextValue(currentHtml: string, nextValue: string) {
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

export function normalizeRichTextLinkHref(input: string) {
  const value = input.trim();
  if (!value) {
    return "";
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
    return value;
  }

  if (/\s/.test(value)) {
    return "";
  }

  if (value.startsWith("www.") || /^[^/]+\.[^/]+/.test(value)) {
    return `https://${value}`;
  }

  return value;
}
