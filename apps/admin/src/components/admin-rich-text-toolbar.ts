export const adminRichTextToolbarConfig = {
  inline: [
    { key: "bold", label: "加粗", icon: "bold" },
    { key: "italic", label: "斜体", icon: "italic" },
    { key: "underline", label: "下划线", icon: "underline" },
    { key: "strike", label: "删除线", icon: "strikethrough" },
    { key: "highlight", label: "高亮", icon: "highlighter" },
    { key: "code", label: "行内代码", icon: "code" },
    { key: "codeBlock", label: "代码块", icon: "codeBlock" },
    { key: "heading2", label: "二级标题", icon: "heading2" },
    { key: "heading3", label: "三级标题", icon: "heading3" },
    { key: "bulletList", label: "无序列表", icon: "list" },
    { key: "orderedList", label: "有序列表", icon: "orderedList" },
    { key: "taskList", label: "任务列表", icon: "taskList" },
    { key: "blockquote", label: "引用", icon: "quote" },
    { key: "horizontalRule", label: "分隔线", icon: "separator" },
    { key: "alignLeft", label: "左对齐", icon: "alignLeft" },
    { key: "alignCenter", label: "居中", icon: "alignCenter" },
    { key: "alignRight", label: "右对齐", icon: "alignRight" },
    { key: "link", label: "插入链接", icon: "link" },
    { key: "unlink", label: "取消链接", icon: "unlink" },
    { key: "undo", label: "撤销", icon: "undo" },
    { key: "redo", label: "重做", icon: "redo" },
    { key: "textColor", label: "文字颜色", icon: "palette" },
    { key: "clearColor", label: "清除颜色", icon: "paletteOff" }
  ],
  table: [
    { key: "insertTable", label: "插入表格", icon: "table" },
    { key: "addRow", label: "加行", icon: "rowAdd" },
    { key: "deleteRow", label: "删行", icon: "rowDelete" },
    { key: "addColumn", label: "加列", icon: "columnAdd" },
    { key: "deleteColumn", label: "删列", icon: "columnDelete" },
    { key: "toggleHeader", label: "表头", icon: "headerRow" },
    { key: "image", label: "图片", icon: "image" },
    { key: "video", label: "视频", icon: "video" }
  ]
} as const;
