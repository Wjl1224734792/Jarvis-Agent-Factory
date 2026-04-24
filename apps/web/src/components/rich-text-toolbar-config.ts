import type { RichTextToolbarKey } from "./rich-text-editor-helpers";

export type RichTextToolbarControl = {
  key:
    | RichTextToolbarKey
    | "insertTable"
    | "addRow"
    | "deleteRow"
    | "addColumn"
    | "deleteColumn"
    | "toggleHeader"
    | "textColor"
    | "clearColor"
    | "image"
    | "video";
  label: string;
};

export type RichTextToolbarGroup = {
  key: "inline" | "structure" | "insert" | "history";
  label: string;
  controls: RichTextToolbarControl["key"][];
};

export type RichTextColorSwatch = {
  label: string;
  value: string;
};

export const RICH_TEXT_TOOLBAR_CONTROLS: RichTextToolbarControl[] = [
  { key: "bold", label: "加粗" },
  { key: "italic", label: "斜体" },
  { key: "underline", label: "下划线" },
  { key: "strike", label: "删除线" },
  { key: "highlight", label: "高亮" },
  { key: "code", label: "行内代码" },
  { key: "codeBlock", label: "代码块" },
  { key: "heading2", label: "二级标题" },
  { key: "heading3", label: "三级标题" },
  { key: "bulletList", label: "无序列表" },
  { key: "orderedList", label: "有序列表" },
  { key: "taskList", label: "任务列表" },
  { key: "blockquote", label: "引用" },
  { key: "horizontalRule", label: "分隔线" },
  { key: "alignLeft", label: "左对齐" },
  { key: "alignCenter", label: "居中" },
  { key: "alignRight", label: "右对齐" },
  { key: "link", label: "链接" },
  { key: "unlink", label: "取消链接" },
  { key: "undo", label: "撤销" },
  { key: "redo", label: "重做" },
  { key: "textColor", label: "文字颜色" },
  { key: "clearColor", label: "清除颜色" },
  { key: "insertTable", label: "插入表格" },
  { key: "addRow", label: "加行" },
  { key: "deleteRow", label: "删行" },
  { key: "addColumn", label: "加列" },
  { key: "deleteColumn", label: "删列" },
  { key: "toggleHeader", label: "表头" },
  { key: "image", label: "图片" },
  { key: "video", label: "视频" }
];

export const RICH_TEXT_TOOLBAR_GROUPS: RichTextToolbarGroup[] = [
  {
    key: "inline",
    label: "文本",
    controls: ["bold", "italic", "underline", "strike", "highlight", "code", "textColor", "clearColor"]
  },
  {
    key: "structure",
    label: "结构",
    controls: [
      "heading2",
      "heading3",
      "bulletList",
      "orderedList",
      "taskList",
      "blockquote",
      "horizontalRule",
      "alignLeft",
      "alignCenter",
      "alignRight",
      "link",
      "unlink"
    ]
  },
  {
    key: "insert",
    label: "插入",
    controls: ["insertTable", "addRow", "deleteRow", "addColumn", "deleteColumn", "toggleHeader", "image", "video"]
  },
  {
    key: "history",
    label: "操作",
    controls: ["undo", "redo"]
  }
];

export const RICH_TEXT_COLOR_SWATCHES: RichTextColorSwatch[] = [
  { label: "石墨黑", value: "#111827" },
  { label: "青灰", value: "#334155" },
  { label: "品红", value: "#be123c" },
  { label: "琉璃紫", value: "#7c3aed" },
  { label: "景蓝", value: "#2563eb" },
  { label: "翡翠绿", value: "#059669" }
];

export function getToolbarControlLabel(key: RichTextToolbarControl["key"]) {
  return RICH_TEXT_TOOLBAR_CONTROLS.find((item) => item.key === key)?.label ?? key;
}
