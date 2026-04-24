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
import UnderlineExtension from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor, type Editor as TiptapEditor } from "@tiptap/react";
import {
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Columns3,
  Eraser,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  LoaderCircle,
  Minus,
  Paintbrush,
  Quote,
  Redo2,
  Rows3,
  Strikethrough,
  Table2,
  TextAlignCenter,
  Underline,
  Undo2,
  Unlink2,
  Video
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  buildRichTextToolbarState,
  extractPlainTextFromHtml,
  getRichTextMediaInsertions,
  normalizeRichTextLinkHref,
  shouldSyncRichTextValue,
  type RichTextToolbarEditor,
  type UploadedMediaAsset
} from "./rich-text-editor-helpers";
import {
  getToolbarControlLabel,
  RICH_TEXT_COLOR_SWATCHES,
  RICH_TEXT_TOOLBAR_GROUPS,
  type RichTextToolbarControl
} from "./rich-text-toolbar-config";

type RichTextEditorProps = {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onUploadImage?: (files: File[]) => Promise<UploadedMediaAsset[]>;
  onUploadVideo?: (files: File[]) => Promise<UploadedMediaAsset[]>;
};

type ToolbarAction = {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  onClick: () => void;
};

const VideoBlock = Node.create({
  name: "videoBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => {
          if (element instanceof HTMLVideoElement) {
            return element.getAttribute("src");
          }

          return element.querySelector("video")?.getAttribute("src") ?? null;
        }
      },
      poster: {
        default: null,
        parseHTML: (element) => {
          if (element instanceof HTMLVideoElement) {
            return element.getAttribute("poster");
          }

          return element.querySelector("video")?.getAttribute("poster") ?? null;
        }
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-video-block]"
      },
      {
        tag: "video"
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const src = typeof HTMLAttributes.src === "string" ? HTMLAttributes.src : null;
    const poster = typeof HTMLAttributes.poster === "string" ? HTMLAttributes.poster : null;

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
          ...(src ? { src } : {}),
          ...(poster ? { poster } : {})
        }
      ]
    ];
  }
});

function insertLink(editor: TiptapEditor | null) {
  if (!editor) {
    return;
  }

  const linkAttributes = editor.getAttributes("link") as Record<string, unknown>;
  const previousHref = typeof linkAttributes.href === "string" ? linkAttributes.href : "";
  const nextHref = window.prompt("请输入链接地址", previousHref || "https://");
  if (nextHref === null) {
    return;
  }

  const normalizedHref = normalizeRichTextLinkHref(nextHref);
  if (!normalizedHref) {
    editor.chain().focus().unsetLink().run();
    return;
  }

  editor.chain().focus().extendMarkRange("link").setLink({ href: normalizedHref }).run();
}

function ToolbarButton(props: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      aria-label={props.label}
      aria-pressed={props.active}
      className={cn(
        "border border-transparent text-foreground/72 shadow-none hover:border-border/80 hover:bg-accent/72 hover:text-foreground",
        props.active && "border-primary/20 bg-primary/10 text-primary hover:border-primary/25 hover:bg-primary/12",
        props.className
      )}
      disabled={props.disabled}
      onClick={props.onClick}
      size="icon-xs"
      title={props.label}
      type="button"
      variant="ghost"
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
      UnderlineExtension,
      Highlight.configure({
        multicolor: true
      }),
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
        autolink: true,
        openOnClick: false
      }),
      Placeholder.configure({
        placeholder: props.placeholder ?? "开始写作"
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
        class: "article-editor__content"
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

  const toolbarStateMap = useMemo(() => {
    return new Map(
      buildRichTextToolbarState(editor as RichTextToolbarEditor | null).map((item) => [item.key, item] as const)
    );
  }, [editor]);
  const isTableActive = editor?.isActive("table") ?? false;
  const plainText = useMemo(() => extractPlainTextFromHtml(props.value), [props.value]);
  const characterCount = plainText.replace(/\s+/g, "").length;

  async function handleImageUpload(files: FileList | null) {
    if (!editor || !props.onUploadImage || !files?.length) {
      return;
    }

    setIsUploadingImage(true);
    try {
      const assets = await props.onUploadImage(Array.from(files));
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
      const assets = await props.onUploadVideo(Array.from(files));
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

  const actions: Partial<Record<RichTextToolbarControl["key"], ToolbarAction>> = {
    bold: {
      active: toolbarStateMap.get("bold")?.active,
      disabled: toolbarStateMap.get("bold")?.disabled,
      icon: <Bold className="size-3.5" />,
      onClick: () => editor?.chain().focus().toggleBold().run()
    },
    italic: {
      active: toolbarStateMap.get("italic")?.active,
      disabled: toolbarStateMap.get("italic")?.disabled,
      icon: <Italic className="size-3.5" />,
      onClick: () => editor?.chain().focus().toggleItalic().run()
    },
    underline: {
      active: toolbarStateMap.get("underline")?.active,
      disabled: toolbarStateMap.get("underline")?.disabled,
      icon: <Underline className="size-3.5" />,
      onClick: () => editor?.chain().focus().toggleUnderline().run()
    },
    strike: {
      active: toolbarStateMap.get("strike")?.active,
      disabled: toolbarStateMap.get("strike")?.disabled,
      icon: <Strikethrough className="size-3.5" />,
      onClick: () => editor?.chain().focus().toggleStrike().run()
    },
    highlight: {
      active: toolbarStateMap.get("highlight")?.active,
      disabled: toolbarStateMap.get("highlight")?.disabled,
      icon: <Highlighter className="size-3.5" />,
      onClick: () => editor?.chain().focus().toggleHighlight().run()
    },
    code: {
      active: toolbarStateMap.get("code")?.active,
      disabled: toolbarStateMap.get("code")?.disabled,
      icon: <Code className="size-3.5" />,
      onClick: () => editor?.chain().focus().toggleCode().run()
    },
    codeBlock: {
      active: toolbarStateMap.get("codeBlock")?.active,
      disabled: toolbarStateMap.get("codeBlock")?.disabled,
      icon: <Code className="size-3.5" />,
      onClick: () => editor?.chain().focus().toggleCodeBlock().run()
    },
    heading2: {
      active: toolbarStateMap.get("heading2")?.active,
      disabled: toolbarStateMap.get("heading2")?.disabled,
      icon: <Heading2 className="size-3.5" />,
      onClick: () => editor?.chain().focus().toggleHeading({ level: 2 }).run()
    },
    heading3: {
      active: toolbarStateMap.get("heading3")?.active,
      disabled: toolbarStateMap.get("heading3")?.disabled,
      icon: <Heading3 className="size-3.5" />,
      onClick: () => editor?.chain().focus().toggleHeading({ level: 3 }).run()
    },
    bulletList: {
      active: toolbarStateMap.get("bulletList")?.active,
      disabled: toolbarStateMap.get("bulletList")?.disabled,
      icon: <List className="size-3.5" />,
      onClick: () => editor?.chain().focus().toggleBulletList().run()
    },
    orderedList: {
      active: toolbarStateMap.get("orderedList")?.active,
      disabled: toolbarStateMap.get("orderedList")?.disabled,
      icon: <ListOrdered className="size-3.5" />,
      onClick: () => editor?.chain().focus().toggleOrderedList().run()
    },
    taskList: {
      active: toolbarStateMap.get("taskList")?.active,
      disabled: toolbarStateMap.get("taskList")?.disabled,
      icon: <ListTodo className="size-3.5" />,
      onClick: () => editor?.chain().focus().toggleTaskList().run()
    },
    blockquote: {
      active: toolbarStateMap.get("blockquote")?.active,
      disabled: toolbarStateMap.get("blockquote")?.disabled,
      icon: <Quote className="size-3.5" />,
      onClick: () => editor?.chain().focus().toggleBlockquote().run()
    },
    horizontalRule: {
      disabled: toolbarStateMap.get("horizontalRule")?.disabled,
      icon: <Minus className="size-3.5" />,
      onClick: () => editor?.chain().focus().setHorizontalRule().run()
    },
    alignLeft: {
      active: toolbarStateMap.get("alignLeft")?.active,
      disabled: toolbarStateMap.get("alignLeft")?.disabled,
      icon: <AlignLeft className="size-3.5" />,
      onClick: () => editor?.chain().focus().setTextAlign("left").run()
    },
    alignCenter: {
      active: toolbarStateMap.get("alignCenter")?.active,
      disabled: toolbarStateMap.get("alignCenter")?.disabled,
      icon: <TextAlignCenter className="size-3.5" />,
      onClick: () => editor?.chain().focus().setTextAlign("center").run()
    },
    alignRight: {
      active: toolbarStateMap.get("alignRight")?.active,
      disabled: toolbarStateMap.get("alignRight")?.disabled,
      icon: <AlignRight className="size-3.5" />,
      onClick: () => editor?.chain().focus().setTextAlign("right").run()
    },
    link: {
      active: toolbarStateMap.get("link")?.active,
      disabled: toolbarStateMap.get("link")?.disabled,
      icon: <Link2 className="size-3.5" />,
      onClick: () => insertLink(editor)
    },
    unlink: {
      disabled: toolbarStateMap.get("unlink")?.disabled,
      icon: <Unlink2 className="size-3.5" />,
      onClick: () => editor?.chain().focus().unsetLink().run()
    },
    undo: {
      disabled: toolbarStateMap.get("undo")?.disabled,
      icon: <Undo2 className="size-3.5" />,
      onClick: () => editor?.chain().focus().undo().run()
    },
    redo: {
      disabled: toolbarStateMap.get("redo")?.disabled,
      icon: <Redo2 className="size-3.5" />,
      onClick: () => editor?.chain().focus().redo().run()
    },
    insertTable: {
      active: toolbarStateMap.get("table")?.active,
      disabled: !editor,
      icon: <Table2 className="size-3.5" />,
      onClick: () => {
        if (!editor) {
          return;
        }

        for (const insertion of getRichTextMediaInsertions("table", [])) {
          editor.chain().focus().insertContent(insertion).run();
        }
      }
    },
    addRow: {
      disabled: !editor || !isTableActive,
      icon: <Rows3 className="size-3.5" />,
      onClick: () => editor?.chain().focus().addRowAfter().run()
    },
    deleteRow: {
      disabled: !editor || !isTableActive,
      icon: <Rows3 className="size-3.5" />,
      onClick: () => editor?.chain().focus().deleteRow().run()
    },
    addColumn: {
      disabled: !editor || !isTableActive,
      icon: <Columns3 className="size-3.5" />,
      onClick: () => editor?.chain().focus().addColumnAfter().run()
    },
    deleteColumn: {
      disabled: !editor || !isTableActive,
      icon: <Columns3 className="size-3.5" />,
      onClick: () => editor?.chain().focus().deleteColumn().run()
    },
    toggleHeader: {
      disabled: !editor || !isTableActive,
      icon: <Table2 className="size-3.5" />,
      onClick: () => editor?.chain().focus().toggleHeaderRow().run()
    },
    image: {
      disabled: !editor || !props.onUploadImage || isUploadingImage,
      icon: isUploadingImage ? <LoaderCircle className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />,
      onClick: () => imageInputRef.current?.click()
    },
    video: {
      disabled: !editor || !props.onUploadVideo || isUploadingVideo,
      icon: isUploadingVideo ? <LoaderCircle className="size-3.5 animate-spin" /> : <Video className="size-3.5" />,
      onClick: () => videoInputRef.current?.click()
    },
    textColor: {
      disabled: !editor,
      icon: <Paintbrush className="size-3.5" />,
      onClick: () => colorInputRef.current?.click()
    },
    clearColor: {
      disabled: !editor,
      icon: <Eraser className="size-3.5" />,
      onClick: () => editor?.chain().focus().unsetColor().run()
    }
  };

  return (
    <div className="overflow-hidden rounded-[0.9rem] border border-border/70 bg-white">
      <style>{`
        .article-editor__content p.is-editor-empty:first-child::before {
          color: color-mix(in srgb, var(--muted-foreground) 92%, transparent);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
      <div className="flex flex-wrap items-start gap-3 border-b border-border/70 px-3 py-3">
        {RICH_TEXT_TOOLBAR_GROUPS.map((group) => (
          <div
            className="flex min-h-8 flex-wrap items-center gap-1.5 border-r border-border/60 pr-3 last:border-r-0 last:pr-0"
            key={group.key}
          >
            {group.controls.map((key) => {
              const action = actions[key];
              if (!action) {
                return null;
              }

              return (
                <ToolbarButton
                  active={action.active}
                  disabled={action.disabled}
                  icon={action.icon}
                  key={key}
                  label={getToolbarControlLabel(key)}
                  onClick={action.onClick}
                />
              );
            })}
            {group.key === "inline" ? (
              <div className="ml-1 flex items-center gap-1">
                {RICH_TEXT_COLOR_SWATCHES.map((swatch) => (
                  <button
                    aria-label={swatch.label}
                    className="size-5 rounded-full border border-white/80 shadow-sm transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    disabled={!editor}
                    key={swatch.value}
                    onClick={() => editor?.chain().focus().setColor(swatch.value).run()}
                    style={{ backgroundColor: swatch.value }}
                    title={swatch.label}
                    type="button"
                  />
                ))}
              </div>
            ) : null}
          </div>
        ))}
        <div className="ml-auto inline-flex items-center rounded-full bg-surface-1 px-2.5 py-1 text-xs text-muted-foreground">
          {characterCount} 字
        </div>
      </div>

      <div
        className={cn(
          "px-4 py-4",
          "[&_.article-editor__content]:min-h-[320px] [&_.article-editor__content]:text-[0.95rem] [&_.article-editor__content]:leading-7 [&_.article-editor__content]:text-foreground",
          "[&_.article-editor__content]:outline-none [&_.article-editor__content_h2]:mt-7 [&_.article-editor__content_h2]:mb-3 [&_.article-editor__content_h2]:text-[1.38rem] [&_.article-editor__content_h2]:font-semibold",
          "[&_.article-editor__content_h3]:mt-5 [&_.article-editor__content_h3]:mb-2 [&_.article-editor__content_h3]:text-[1.08rem] [&_.article-editor__content_h3]:font-semibold",
          "[&_.article-editor__content_p]:mb-3 [&_.article-editor__content_blockquote]:my-5 [&_.article-editor__content_blockquote]:border-l-4 [&_.article-editor__content_blockquote]:border-primary/30 [&_.article-editor__content_blockquote]:pl-4 [&_.article-editor__content_blockquote]:text-foreground/78",
          "[&_.article-editor__content_ul]:mb-4 [&_.article-editor__content_ul]:list-disc [&_.article-editor__content_ul]:pl-5 [&_.article-editor__content_ol]:mb-4 [&_.article-editor__content_ol]:list-decimal [&_.article-editor__content_ol]:pl-5",
          "[&_.article-editor__content_ul[data-type='taskList']]:list-none [&_.article-editor__content_ul[data-type='taskList']]:pl-0",
          "[&_.article-editor__content_pre]:my-5 [&_.article-editor__content_pre]:overflow-x-auto [&_.article-editor__content_pre]:rounded-[0.8rem] [&_.article-editor__content_pre]:bg-slate-950 [&_.article-editor__content_pre]:p-4 [&_.article-editor__content_pre]:text-slate-100",
          "[&_.article-editor__content_code]:rounded [&_.article-editor__content_code]:bg-slate-100 [&_.article-editor__content_code]:px-1 [&_.article-editor__content_code]:py-0.5 [&_.article-editor__content_pre_code]:bg-transparent [&_.article-editor__content_pre_code]:px-0 [&_.article-editor__content_pre_code]:py-0",
          "[&_.article-editor__content_hr]:my-6 [&_.article-editor__content_hr]:border-dashed [&_.article-editor__content_hr]:border-border/80",
          "[&_.article-editor__content_img]:my-5 [&_.article-editor__content_img]:w-full [&_.article-editor__content_img]:rounded-[0.9rem]",
          "[&_.article-editor__content_figure[data-video-block]]:my-5 [&_.article-editor__content_figure[data-video-block]_video]:w-full [&_.article-editor__content_figure[data-video-block]_video]:rounded-[0.9rem]",
          "[&_.article-editor__content_table]:my-5 [&_.article-editor__content_table]:w-full [&_.article-editor__content_table]:border-collapse [&_.article-editor__content_td]:border [&_.article-editor__content_td]:border-border [&_.article-editor__content_td]:px-3 [&_.article-editor__content_td]:py-2 [&_.article-editor__content_th]:border [&_.article-editor__content_th]:border-border [&_.article-editor__content_th]:bg-slate-100 [&_.article-editor__content_th]:px-3 [&_.article-editor__content_th]:py-2"
        )}
      >
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
        hidden
        onChange={(event) => {
          if (event.target.value) {
            editor?.chain().focus().setColor(event.target.value).run();
          }
        }}
        ref={colorInputRef}
        type="color"
      />
    </div>
  );
}
