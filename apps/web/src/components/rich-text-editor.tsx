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
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  Code2Icon,
  EraserIcon,
  FileCode2Icon,
  Heading2Icon,
  Heading3Icon,
  HighlighterIcon,
  ImageIcon,
  ItalicIcon,
  Link2Icon,
  ListChecksIcon,
  ListIcon,
  ListOrderedIcon,
  Loader2Icon,
  MinusIcon,
  PaletteIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  Table2Icon,
  UnderlineIcon,
  Undo2Icon,
  Unlink2Icon,
  VideoIcon
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getToolbarControlLabel } from "./rich-text-toolbar-config";
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

function ToolbarIconButton(props: {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={props.label}
      className={cn(props.active && "border-primary/25 bg-primary/8 text-primary")}
      disabled={props.disabled}
      onClick={props.onClick}
      size="icon-sm"
      title={props.label}
      type="button"
      variant="outline"
    >
      {props.icon}
    </Button>
  );
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
  const stateFor = (key: string) => toolbarState.find((item) => item.key === key);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <ToolbarIconButton
            active={stateFor("bold")?.active}
            disabled={!editor}
            icon={<BoldIcon />}
            label={getToolbarControlLabel("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          />
          <ToolbarIconButton
            active={stateFor("italic")?.active}
            disabled={!editor}
            icon={<ItalicIcon />}
            label={getToolbarControlLabel("italic")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          />
          <ToolbarIconButton
            active={stateFor("underline")?.active}
            disabled={!editor}
            icon={<UnderlineIcon />}
            label={getToolbarControlLabel("underline")}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          />
          <ToolbarIconButton
            active={stateFor("strike")?.active}
            disabled={!editor}
            icon={<StrikethroughIcon />}
            label={getToolbarControlLabel("strike")}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          />
          <ToolbarIconButton
            active={stateFor("highlight")?.active}
            disabled={!editor}
            icon={<HighlighterIcon />}
            label={getToolbarControlLabel("highlight")}
            onClick={() => editor?.chain().focus().toggleHighlight().run()}
          />
          <ToolbarIconButton
            active={stateFor("code")?.active}
            disabled={!editor}
            icon={<Code2Icon />}
            label={getToolbarControlLabel("code")}
            onClick={() => editor?.chain().focus().toggleCode().run()}
          />
          <ToolbarIconButton
            active={stateFor("codeBlock")?.active}
            disabled={!editor}
            icon={<FileCode2Icon />}
            label={getToolbarControlLabel("codeBlock")}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          />
          <ToolbarIconButton
            active={stateFor("heading2")?.active}
            disabled={!editor}
            icon={<Heading2Icon />}
            label={getToolbarControlLabel("heading2")}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolbarIconButton
            active={stateFor("heading3")?.active}
            disabled={!editor}
            icon={<Heading3Icon />}
            label={getToolbarControlLabel("heading3")}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          />
          <ToolbarIconButton
            active={stateFor("bulletList")?.active}
            disabled={!editor}
            icon={<ListIcon />}
            label={getToolbarControlLabel("bulletList")}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          />
          <ToolbarIconButton
            active={stateFor("orderedList")?.active}
            disabled={!editor}
            icon={<ListOrderedIcon />}
            label={getToolbarControlLabel("orderedList")}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarIconButton
            active={stateFor("taskList")?.active}
            disabled={!editor}
            icon={<ListChecksIcon />}
            label={getToolbarControlLabel("taskList")}
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
          />
          <ToolbarIconButton
            active={stateFor("blockquote")?.active}
            disabled={!editor}
            icon={<QuoteIcon />}
            label={getToolbarControlLabel("blockquote")}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          />
          <ToolbarIconButton
            disabled={!editor}
            icon={<MinusIcon />}
            label={getToolbarControlLabel("horizontalRule")}
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          />
          <ToolbarIconButton
            active={stateFor("alignLeft")?.active}
            disabled={!editor}
            icon={<AlignLeftIcon />}
            label={getToolbarControlLabel("alignLeft")}
            onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          />
          <ToolbarIconButton
            active={stateFor("alignCenter")?.active}
            disabled={!editor}
            icon={<AlignCenterIcon />}
            label={getToolbarControlLabel("alignCenter")}
            onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          />
          <ToolbarIconButton
            active={stateFor("alignRight")?.active}
            disabled={!editor}
            icon={<AlignRightIcon />}
            label={getToolbarControlLabel("alignRight")}
            onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          />
          <ToolbarIconButton
            active={stateFor("link")?.active}
            disabled={!editor}
            icon={<Link2Icon />}
            label={getToolbarControlLabel("link")}
            onClick={() => insertLink(editor)}
          />
          <ToolbarIconButton
            disabled={stateFor("unlink")?.disabled}
            icon={<Unlink2Icon />}
            label={getToolbarControlLabel("unlink")}
            onClick={() => editor?.chain().focus().unsetLink().run()}
          />
          <ToolbarIconButton
            disabled={stateFor("undo")?.disabled}
            icon={<Undo2Icon />}
            label={getToolbarControlLabel("undo")}
            onClick={() => editor?.chain().focus().undo().run()}
          />
          <ToolbarIconButton
            disabled={stateFor("redo")?.disabled}
            icon={<Redo2Icon />}
            label={getToolbarControlLabel("redo")}
            onClick={() => editor?.chain().focus().redo().run()}
          />
          <ToolbarIconButton
            disabled={!editor}
            icon={<PaletteIcon />}
            label={getToolbarControlLabel("textColor")}
            onClick={() => colorInputRef.current?.click()}
          />
          <ToolbarIconButton
            disabled={!editor}
            icon={<EraserIcon />}
            label={getToolbarControlLabel("clearColor")}
            onClick={() => editor?.chain().focus().unsetColor().run()}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToolbarIconButton
            active={stateFor("table")?.active}
            disabled={!editor}
            icon={<Table2Icon />}
            label={getToolbarControlLabel("insertTable")}
            onClick={() =>
              editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
          />
          <ToolbarIconButton
            disabled={!editor}
            icon={<Table2Icon />}
            label={getToolbarControlLabel("addRow")}
            onClick={() => editor?.chain().focus().addRowAfter().run()}
          />
          <ToolbarIconButton
            disabled={!editor}
            icon={<MinusIcon />}
            label={getToolbarControlLabel("deleteRow")}
            onClick={() => editor?.chain().focus().deleteRow().run()}
          />
          <ToolbarIconButton
            disabled={!editor}
            icon={<Table2Icon />}
            label={getToolbarControlLabel("addColumn")}
            onClick={() => editor?.chain().focus().addColumnAfter().run()}
          />
          <ToolbarIconButton
            disabled={!editor}
            icon={<MinusIcon />}
            label={getToolbarControlLabel("deleteColumn")}
            onClick={() => editor?.chain().focus().deleteColumn().run()}
          />
          <ToolbarIconButton
            disabled={!editor}
            icon={<Table2Icon />}
            label={getToolbarControlLabel("toggleHeader")}
            onClick={() => editor?.chain().focus().toggleHeaderRow().run()}
          />
          <ToolbarIconButton
            disabled={!editor}
            icon={isUploadingImage ? <Loader2Icon className="animate-spin" /> : <ImageIcon />}
            label={getToolbarControlLabel("image")}
            onClick={() => imageInputRef.current?.click()}
          />
          <ToolbarIconButton
            disabled={!editor}
            icon={isUploadingVideo ? <Loader2Icon className="animate-spin" /> : <VideoIcon />}
            label={getToolbarControlLabel("video")}
            onClick={() => videoInputRef.current?.click()}
          />
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
