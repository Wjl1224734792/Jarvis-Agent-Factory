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
  Code2Icon,
  FileCode2Icon,
  Heading2Icon,
  Heading3Icon,
  HighlighterIcon,
  ImageIcon,
  Link2Icon,
  ListChecksIcon,
  ListIcon,
  ListOrderedIcon,
  Loader2Icon,
  MinusIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  Table2Icon,
  Undo2Icon,
  Unlink2Icon,
  VideoIcon
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  buildRichTextToolbarState,
  getRichTextMediaInsertions,
  shouldSyncRichTextValue,
  type RichTextToolbarEditor,
  type UploadedMediaAsset
} from "./rich-text-editor-helpers";

type RichTextEditorProps = {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onUploadImage?: (files: FileList | null) => Promise<UploadedMediaAsset[]>;
  onUploadVideo?: (files: FileList | null) => Promise<UploadedMediaAsset[]>;
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
          poster: HTMLAttributes.poster,
          style: "width:100%;border-radius:16px;background:#0f172a"
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
  const url = window.prompt("请输入链接地址", previousUrl ?? "https://");

  if (url === null) {
    return;
  }

  if (url.trim().length === 0) {
    editor.chain().focus().unsetLink().run();
    return;
  }

  editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
}

export function RichTextEditor(props: RichTextEditorProps) {
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
      TaskItem.configure({
        nested: true
      }),
      Table.configure({
        resizable: true
      }),
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
        placeholder: props.placeholder ?? "从这里开始写正文..."
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
        class:
          "min-h-[360px] px-4 py-4 text-[1rem] leading-7 text-foreground outline-none [&_.selectedCell]:bg-primary/10 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/35 [&_blockquote]:pl-4 [&_blockquote]:text-foreground/76 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_figure]:my-4 [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-[1.45rem] [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:mb-3 [&_h3]:text-[1.18rem] [&_h3]:font-semibold [&_img]:w-full [&_img]:rounded-[0.95rem] [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100 [&_p]:mb-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border [&_th]:bg-slate-100 [&_th]:px-3 [&_th]:py-2 [&_ul[data-type='taskList']]:list-none [&_ul]:list-disc [&_ul]:pl-6"
      }
    },
    onUpdate({ editor: currentEditor }) {
      props.onChange(currentEditor.getHTML());
    }
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (shouldSyncRichTextValue(editor.getHTML(), props.value)) {
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
      for (const insertion of getRichTextMediaInsertions("image", assets)) {
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
      for (const insertion of getRichTextMediaInsertions("video", assets)) {
        editor.chain().focus().insertContent(insertion).run();
      }
    } finally {
      setIsUploadingVideo(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
    }
  }

  const toolbarState = buildRichTextToolbarState(editor as RichTextToolbarEditor | null);

  const toolbarItems = [
    { key: "bold", label: "加粗", active: toolbarState.find((item) => item.key === "bold")?.active ?? false, disabled: !editor, onClick: () => editor?.chain().focus().toggleBold().run() },
    { key: "italic", label: "斜体", active: toolbarState.find((item) => item.key === "italic")?.active ?? false, disabled: !editor, onClick: () => editor?.chain().focus().toggleItalic().run() },
    { key: "underline", label: "下划线", active: toolbarState.find((item) => item.key === "underline")?.active ?? false, disabled: !editor, onClick: () => editor?.chain().focus().toggleUnderline().run() },
    { key: "strike", label: "删除线", active: toolbarState.find((item) => item.key === "strike")?.active ?? false, disabled: !editor, onClick: () => editor?.chain().focus().toggleStrike().run() },
    { key: "highlight", label: "高亮", active: toolbarState.find((item) => item.key === "highlight")?.active ?? false, disabled: !editor, onClick: () => editor?.chain().focus().toggleHighlight().run() },
    { key: "code", label: "行内代码", active: toolbarState.find((item) => item.key === "code")?.active ?? false, disabled: !editor, onClick: () => editor?.chain().focus().toggleCode().run() },
    { key: "codeBlock", label: "代码块", active: toolbarState.find((item) => item.key === "codeBlock")?.active ?? false, disabled: !editor, onClick: () => editor?.chain().focus().toggleCodeBlock().run() },
    { key: "heading2", label: "H2", active: toolbarState.find((item) => item.key === "heading2")?.active ?? false, disabled: !editor, onClick: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { key: "heading3", label: "H3", active: toolbarState.find((item) => item.key === "heading3")?.active ?? false, disabled: !editor, onClick: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
    { key: "bulletList", label: "无序列表", active: toolbarState.find((item) => item.key === "bulletList")?.active ?? false, disabled: !editor, onClick: () => editor?.chain().focus().toggleBulletList().run() },
    { key: "orderedList", label: "有序列表", active: toolbarState.find((item) => item.key === "orderedList")?.active ?? false, disabled: !editor, onClick: () => editor?.chain().focus().toggleOrderedList().run() },
    { key: "taskList", label: "任务列表", active: toolbarState.find((item) => item.key === "taskList")?.active ?? false, disabled: !editor, onClick: () => editor?.chain().focus().toggleTaskList().run() },
    { key: "blockquote", label: "引用", active: toolbarState.find((item) => item.key === "blockquote")?.active ?? false, disabled: !editor, onClick: () => editor?.chain().focus().toggleBlockquote().run() },
    { key: "horizontalRule", label: "分隔线", active: false, disabled: !editor, onClick: () => editor?.chain().focus().setHorizontalRule().run() },
    { key: "alignLeft", label: "左对齐", active: toolbarState.find((item) => item.key === "alignLeft")?.active ?? false, disabled: !editor, onClick: () => editor?.chain().focus().setTextAlign("left").run() },
    { key: "alignCenter", label: "居中", active: toolbarState.find((item) => item.key === "alignCenter")?.active ?? false, disabled: !editor, onClick: () => editor?.chain().focus().setTextAlign("center").run() },
    { key: "alignRight", label: "右对齐", active: toolbarState.find((item) => item.key === "alignRight")?.active ?? false, disabled: !editor, onClick: () => editor?.chain().focus().setTextAlign("right").run() },
    { key: "link", label: "链接", active: toolbarState.find((item) => item.key === "link")?.active ?? false, disabled: !editor, onClick: () => insertLink(editor) },
    { key: "unlink", label: "取消链接", active: false, disabled: toolbarState.find((item) => item.key === "unlink")?.disabled ?? true, onClick: () => editor?.chain().focus().unsetLink().run() },
    { key: "undo", label: "撤销", active: false, disabled: toolbarState.find((item) => item.key === "undo")?.disabled ?? true, onClick: () => editor?.chain().focus().undo().run() },
    { key: "redo", label: "重做", active: false, disabled: toolbarState.find((item) => item.key === "redo")?.disabled ?? true, onClick: () => editor?.chain().focus().redo().run() }
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
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {toolbarItems.map((item) => (
            <Button
              className={cn(item.active && "border-primary/25 bg-primary/8 text-primary")}
              disabled={item.disabled}
              key={item.key}
              onClick={item.onClick}
              size="sm"
              type="button"
              variant="outline"
            >
              {item.label}
            </Button>
          ))}
          <Button
            onClick={() => {
              colorInputRef.current?.click();
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <HighlighterIcon className="mr-1 size-4" />
            文字颜色
          </Button>
          <Button
            onClick={() => editor?.chain().focus().unsetColor().run()}
            size="sm"
            type="button"
            variant="outline"
          >
            清除颜色
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tableActions.map((item) => (
            <Button key={item.key} onClick={item.onClick} size="sm" type="button" variant="outline">
              {item.label}
            </Button>
          ))}
          <Button onClick={() => imageInputRef.current?.click()} size="sm" type="button" variant="outline">
            {isUploadingImage ? <Loader2Icon className="mr-1 size-4 animate-spin" /> : <ImageIcon className="mr-1 size-4" />}
            图片
          </Button>
          <Button onClick={() => videoInputRef.current?.click()} size="sm" type="button" variant="outline">
            {isUploadingVideo ? <Loader2Icon className="mr-1 size-4 animate-spin" /> : <VideoIcon className="mr-1 size-4" />}
            视频
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[0.9rem] border border-border/70 bg-white">
        <EditorContent editor={editor} />
      </div>

      <Input
        accept="image/*"
        className="hidden"
        multiple
        onChange={(event) => {
          void handleImageUpload(event.target.files);
        }}
        ref={imageInputRef}
        type="file"
      />
      <Input
        accept="video/*"
        className="hidden"
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
