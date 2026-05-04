export interface UploadedMediaAsset {
  id: string;
  url: string;
  fileName?: string;
  mimeType?: string;
}

export { normalizeRichTextLinkHref } from "@feijia/shared";

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

export interface RichTextToolbarEditor {
  isActive: (
    nameOrAttributes: string | Record<string, unknown>,
    attributes?: Record<string, unknown>
  ) => boolean;
  can: () => {
    chain: () => {
      focus: () => {
        undo: () => RunnableBoolean;
        redo: () => RunnableBoolean;
      };
    };
  };
}

export interface RichTextToolbarStateItem {
  key: RichTextToolbarKey;
  active: boolean;
  disabled: boolean;
}

function resolveRunnableBoolean(value: RunnableBoolean) {
  return typeof value === "boolean" ? value : value.run();
}

function isAlignmentActive(
  editor: RichTextToolbarEditor | null,
  alignment: "left" | "center" | "right"
) {
  if (!editor) {
    return false;
  }

  if (alignment === "left") {
    return (
      !editor.isActive({ textAlign: "center" }) &&
      !editor.isActive({ textAlign: "right" })
    );
  }

  return editor.isActive({ textAlign: alignment });
}

/**
 * 构建富文本编辑器工具栏按钮状态快照。
 * @param editor 当前富文本编辑器实例；为空时返回禁用态按钮集合。
 * @returns 按钮 key、激活态和禁用态组成的状态列表。
 */
export function buildRichTextToolbarState(
  editor: RichTextToolbarEditor | null
): RichTextToolbarStateItem[] {
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
    { key: "redo", active: false, disabled: !canRedo },
  ];
}

/**
 * 将媒体资源转换为富文本编辑器可插入节点。
 * @param kind 待插入媒体类型。
 * @param assets 已上传完成的媒体资源列表。
 * @returns 可直接传给编辑器的插入节点描述。
 */
export function getRichTextMediaInsertions(
  kind: "image" | "video",
  assets: UploadedMediaAsset[]
) {
  if (kind === "image") {
    return assets.map((asset) => ({
      type: "image" as const,
      attrs: {
        src: asset.url,
        alt: asset.fileName ?? "image",
      },
    }));
  }

  return assets.map((asset) => ({
    type: "videoBlock" as const,
    attrs: {
      src: asset.url,
      poster: null as string | null,
    },
  }));
}

/**
 * 判断外部 HTML 值是否需要同步回编辑器。
 * @param currentHtml 当前编辑器内的 HTML。
 * @param nextValue 外部最新 HTML 值。
 * @returns 两者不一致时返回 `true`。
 */
export function shouldSyncRichTextValue(
  currentHtml: string,
  nextValue: string
) {
  return currentHtml !== nextValue;
}

/**
 * 从 HTML 中提取纯文本内容。
 * @param html 待提取的 HTML 字符串。
 * @returns 清理标签和多余空白后的纯文本。
 */
export function extractPlainTextFromHtml(html: string) {
  if (!html.trim()) {
    return "";
  }

  if (typeof DOMParser !== "undefined") {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    return (
      documentNode.body.textContent?.replace(/\s+\n/g, "\n").trim() ?? ""
    );
  }

  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
