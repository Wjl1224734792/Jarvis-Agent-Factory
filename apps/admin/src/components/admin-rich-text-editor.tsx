import { Node } from "@tiptap/core";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  PictureOutlined,
  VideoCameraOutlined
} from "@ant-design/icons";
import { HighlighterIcon, Loader2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "antd";
import {
  buildAdminRichTextToolbarState,
  extractPlainTextFromHtml,
  getAdminRichTextMediaInsertions,
  shouldSyncAdminRichTextValue,
  type RichTextToolbarEditor,
  type UploadedMediaAsset
} from "./admin-rich-text-editor-helpers";

type EditorChange = {
  html: string;
  plainText: string;
};

const VideoBlock = Node.create({
  name: "videoBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      poster: { default: null }
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-video-block]"
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      {
        "data-video-block": "true"
      },
      [
        "video",
        {
          controls: "true",
          preload: "metadata",
          src: HTMLAttributes.src,
          poster: HTMLAttributes.poster
        }
      ]
    ];
  }
});

function insertLink(editor: ReturnType<typeof useEditor> | null) {
  if (!editor) {
    return;
  }

  const previousUrl = editor.getAttributes("link").href;
  const next = window.prompt("请输入链接地址", previousUrl ?? "https://");
  if (next === null) {
    return;
  }

  if (next.trim().length === 0) {
    editor.chain().focus().unsetLink().run();
    return;
  }

  editor.chain().focus().extendMarkRange("link").setLink({ href: next.trim() }).run();
}

export function AdminRichTextEditor(props: {
  value: string;
  placeholder?: string;
  onChange: (value: EditorChange) => void;
  onUploadImage?: (files: FileList | null) => Promise<UploadedMediaAsset[]>;
  onUploadVideo?: (files: FileList | null) => Promise<UploadedMediaAsset[]>;
}) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3]
        }
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        inline: false
      }),
      Link.configure({
        openOnClick: false,
        autolink: true
      }),
      Placeholder.configure({
        placeholder: props.placeholder ?? "请输入正文内容..."
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"]
      }),
      VideoBlock
    ],
    content: props.value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "admin-editor__content"
      }
    },
    onUpdate({ editor: currentEditor }) {
      const html = currentEditor.getHTML();
      props.onChange({
        html,
        plainText: extractPlainTextFromHtml(html)
      });
    }
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (shouldSyncAdminRichTextValue(editor.getHTML(), props.value)) {
      editor.commands.setContent(props.value, {
        emitUpdate: false
      });
    }
  }, [editor, props.value]);

  async function handleImageUpload(files: FileList | null) {
    if (!editor || !props.onUploadImage || !files?.length) {
      return;
    }

    setIsUploadingImage(true);
    try {
      const assets = await props.onUploadImage(files);
      for (const insertion of getAdminRichTextMediaInsertions("image", assets)) {
        editor.chain().focus().insertContent(insertion).run();
      }
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  async function handleVideoUpload(files: FileList | null) {
    if (!editor || !props.onUploadVideo || !files?.length) {
      return;
    }

    setIsUploadingVideo(true);
    try {
      const assets = await props.onUploadVideo(files);
      for (const insertion of getAdminRichTextMediaInsertions("video", assets)) {
        editor.chain().focus().insertContent(insertion).run();
      }
    } finally {
      setIsUploadingVideo(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
    }
  }

  const toolbarState = buildAdminRichTextToolbarState(editor as RichTextToolbarEditor | null);
  const toolbar = [
    { key: "bold", label: "加粗", disabled: !editor, active: toolbarState.find((item) => item.key === "bold")?.active ?? false, onClick: () => editor?.chain().focus().toggleBold().run() },
    { key: "italic", label: "斜体", disabled: !editor, active: toolbarState.find((item) => item.key === "italic")?.active ?? false, onClick: () => editor?.chain().focus().toggleItalic().run() },
    { key: "underline", label: "下划线", disabled: !editor, active: toolbarState.find((item) => item.key === "underline")?.active ?? false, onClick: () => editor?.chain().focus().toggleUnderline().run() },
    { key: "strike", label: "删除线", disabled: !editor, active: toolbarState.find((item) => item.key === "strike")?.active ?? false, onClick: () => editor?.chain().focus().toggleStrike().run() },
    { key: "highlight", label: "高亮", disabled: !editor, active: toolbarState.find((item) => item.key === "highlight")?.active ?? false, onClick: () => editor?.chain().focus().toggleHighlight().run() },
    { key: "code", label: "行内代码", disabled: !editor, active: toolbarState.find((item) => item.key === "code")?.active ?? false, onClick: () => editor?.chain().focus().toggleCode().run() },
    { key: "codeBlock", label: "代码块", disabled: !editor, active: toolbarState.find((item) => item.key === "codeBlock")?.active ?? false, onClick: () => editor?.chain().focus().toggleCodeBlock().run() },
    { key: "heading2", label: "H2", disabled: !editor, active: toolbarState.find((item) => item.key === "heading2")?.active ?? false, onClick: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { key: "heading3", label: "H3", disabled: !editor, active: toolbarState.find((item) => item.key === "heading3")?.active ?? false, onClick: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
    { key: "bulletList", label: "无序列表", disabled: !editor, active: toolbarState.find((item) => item.key === "bulletList")?.active ?? false, onClick: () => editor?.chain().focus().toggleBulletList().run() },
    { key: "orderedList", label: "有序列表", disabled: !editor, active: toolbarState.find((item) => item.key === "orderedList")?.active ?? false, onClick: () => editor?.chain().focus().toggleOrderedList().run() },
    { key: "taskList", label: "任务列表", disabled: !editor, active: toolbarState.find((item) => item.key === "taskList")?.active ?? false, onClick: () => editor?.chain().focus().toggleTaskList().run() },
    { key: "blockquote", label: "引用", disabled: !editor, active: toolbarState.find((item) => item.key === "blockquote")?.active ?? false, onClick: () => editor?.chain().focus().toggleBlockquote().run() },
    { key: "horizontalRule", label: "分隔线", disabled: !editor, active: false, onClick: () => editor?.chain().focus().setHorizontalRule().run() },
    { key: "alignLeft", label: "左对齐", disabled: !editor, active: toolbarState.find((item) => item.key === "alignLeft")?.active ?? false, onClick: () => editor?.chain().focus().setTextAlign("left").run() },
    { key: "alignCenter", label: "居中", disabled: !editor, active: toolbarState.find((item) => item.key === "alignCenter")?.active ?? false, onClick: () => editor?.chain().focus().setTextAlign("center").run() },
    { key: "alignRight", label: "右对齐", disabled: !editor, active: toolbarState.find((item) => item.key === "alignRight")?.active ?? false, onClick: () => editor?.chain().focus().setTextAlign("right").run() },
    { key: "link", label: "链接", disabled: !editor, active: toolbarState.find((item) => item.key === "link")?.active ?? false, onClick: () => insertLink(editor) },
    { key: "unlink", label: "取消链接", disabled: toolbarState.find((item) => item.key === "unlink")?.disabled ?? true, active: false, onClick: () => editor?.chain().focus().unsetLink().run() },
    { key: "undo", label: "撤销", disabled: toolbarState.find((item) => item.key === "undo")?.disabled ?? true, active: false, onClick: () => editor?.chain().focus().undo().run() },
    { key: "redo", label: "重做", disabled: toolbarState.find((item) => item.key === "redo")?.disabled ?? true, active: false, onClick: () => editor?.chain().focus().redo().run() }
  ];

  const tableActions = [
    { key: "insertTable", label: "插入表格", onClick: () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { key: "addRow", label: "加行", onClick: () => editor?.chain().focus().addRowAfter().run() },
    { key: "deleteRow", label: "删行", onClick: () => editor?.chain().focus().deleteRow().run() },
    { key: "addColumn", label: "加列", onClick: () => editor?.chain().focus().addColumnAfter().run() },
    { key: "deleteColumn", label: "删列", onClick: () => editor?.chain().focus().deleteColumn().run() },
    { key: "toggleHeader", label: "表头", onClick: () => editor?.chain().focus().toggleHeaderRow().run() }
  ];

  return (
    <div className="admin-editor">
      <div className="admin-editor__toolbar">
        <div className="admin-editor__toolbar-group">
          {toolbar.map((item) => (
            <Button
              className={`admin-editor__tool${item.active ? " is-active" : ""}`}
              disabled={item.disabled}
              key={item.key}
              onClick={item.onClick}
              type="default"
            >
              {item.label}
            </Button>
          ))}
          <Button
            icon={<HighlighterIcon className="size-4" />}
            onClick={() => colorInputRef.current?.click()}
            type="default"
          >
            文字颜色
          </Button>
          <Button onClick={() => editor?.chain().focus().unsetColor().run()} type="default">
            清除颜色
          </Button>
        </div>
        <div className="admin-editor__toolbar-group">
          {tableActions.map((item) => (
            <Button key={item.key} onClick={item.onClick} type="default">
              {item.label}
            </Button>
          ))}
          <Button
            icon={isUploadingImage ? <Loader2Icon className="size-4 animate-spin" /> : <PictureOutlined />}
            loading={isUploadingImage}
            onClick={() => imageInputRef.current?.click()}
            type="default"
          >
            图片
          </Button>
          <Button
            icon={isUploadingVideo ? <Loader2Icon className="size-4 animate-spin" /> : <VideoCameraOutlined />}
            loading={isUploadingVideo}
            onClick={() => videoInputRef.current?.click()}
            type="default"
          >
            视频
          </Button>
        </div>
      </div>
      <div className="admin-editor__surface">
        <EditorContent editor={editor} />
      </div>
      <input
        accept="image/*"
        hidden
        multiple
        onChange={(event) => {
          void handleImageUpload(event.target.files);
        }}
        ref={imageInputRef}
        type="file"
      />
      <input
        accept="video/*"
        hidden
        multiple
        onChange={(event) => {
          void handleVideoUpload(event.target.files);
        }}
        ref={videoInputRef}
        type="file"
      />
      <input
        className="hidden"
        onChange={(event) => {
          const value = event.target.value;
          if (value) {
            editor?.chain().focus().setColor(value).run();
          }
        }}
        ref={colorInputRef}
        type="color"
      />
    </div>
  );
}
