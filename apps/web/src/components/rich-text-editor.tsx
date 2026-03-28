import { Node } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  BoldIcon,
  Heading2Icon,
  ImageIcon,
  ItalicIcon,
  Link2Icon,
  ListIcon,
  ListOrderedIcon,
  Loader2Icon,
  QuoteIcon,
  VideoIcon
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type UploadedMediaAsset = {
  id: string;
  url: string;
  fileName?: string;
  mimeType?: string;
};

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

function insertLink(editor: ReturnType<typeof useEditor>) {
  if (!editor) {
    return;
  }

  const previousUrl = editor.getAttributes("link").href;
  const url = window.prompt("输入链接地址", previousUrl ?? "https://");

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
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2]
        }
      }),
      Image.configure({
        inline: false
      }),
      Link.configure({
        openOnClick: false,
        autolink: true
      }),
      Placeholder.configure({
        placeholder: props.placeholder ?? "开始输入正文..."
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
          "min-h-[360px] px-4 py-4 text-[1rem] leading-7 text-foreground outline-none [&_blockquote]:border-l-4 [&_blockquote]:border-primary/35 [&_blockquote]:pl-4 [&_blockquote]:text-foreground/76 [&_figure]:my-4 [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-[1.45rem] [&_h2]:font-semibold [&_img]:w-full [&_img]:rounded-[0.95rem] [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6"
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

    if (editor.getHTML() !== props.value) {
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
      for (const asset of assets) {
        editor.chain().focus().setImage({ src: asset.url, alt: asset.fileName ?? "图片" }).run();
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
      for (const asset of assets) {
        editor.chain().focus().insertContent({
          type: "videoBlock",
          attrs: {
            src: asset.url,
            poster: null
          }
        }).run();
      }
    } finally {
      setIsUploadingVideo(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
    }
  }

  const toolbarItems = [
    {
      icon: BoldIcon,
      label: "加粗",
      active: editor?.isActive("bold") ?? false,
      onClick: () => editor?.chain().focus().toggleBold().run()
    },
    {
      icon: ItalicIcon,
      label: "斜体",
      active: editor?.isActive("italic") ?? false,
      onClick: () => editor?.chain().focus().toggleItalic().run()
    },
    {
      icon: Heading2Icon,
      label: "二级标题",
      active: editor?.isActive("heading", { level: 2 }) ?? false,
      onClick: () => editor?.chain().focus().toggleHeading({ level: 2 }).run()
    },
    {
      icon: ListIcon,
      label: "无序列表",
      active: editor?.isActive("bulletList") ?? false,
      onClick: () => editor?.chain().focus().toggleBulletList().run()
    },
    {
      icon: ListOrderedIcon,
      label: "有序列表",
      active: editor?.isActive("orderedList") ?? false,
      onClick: () => editor?.chain().focus().toggleOrderedList().run()
    },
    {
      icon: QuoteIcon,
      label: "引用",
      active: editor?.isActive("blockquote") ?? false,
      onClick: () => editor?.chain().focus().toggleBlockquote().run()
    },
    {
      icon: Link2Icon,
      label: "链接",
      active: editor?.isActive("link") ?? false,
      onClick: () => {
        if (!editor) {
          return;
        }

        insertLink(editor);
      }
    }
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {toolbarItems.map((item) => {
            const Icon = item.icon;

            return (
              <Button
                className={cn(item.active && "border-primary/25 bg-primary/8 text-primary")}
                key={item.label}
                onClick={item.onClick}
                size="sm"
                type="button"
                variant="outline"
              >
                <Icon className="size-4" />
                <span className="sr-only">{item.label}</span>
              </Button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => imageInputRef.current?.click()}
            size="sm"
            type="button"
            variant="outline"
          >
            {isUploadingImage ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <ImageIcon className="size-4" />
            )}
            插入图片
          </Button>
          <Button
            onClick={() => videoInputRef.current?.click()}
            size="sm"
            type="button"
            variant="outline"
          >
            {isUploadingVideo ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <VideoIcon className="size-4" />
            )}
            插入视频
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
    </div>
  );
}
