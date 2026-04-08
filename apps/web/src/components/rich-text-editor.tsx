import { useEffect, useMemo, useState } from "react";
import { Editor, Toolbar } from "@wangeditor/editor-for-react";
import type { IDomEditor, IEditorConfig, IToolbarConfig } from "@wangeditor/editor";
import "@wangeditor/editor/dist/css/style.css";

type UploadedMediaAsset = {
  id: string;
  url: string;
  fileName?: string;
};

type RichTextEditorProps = {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onUploadImage?: (files: File[]) => Promise<UploadedMediaAsset[]>;
  onUploadVideo?: (files: File[]) => Promise<UploadedMediaAsset[]>;
};

type InsertImageFn = (url: string, alt: string, href: string) => void;
type InsertVideoFn = (url: string, poster?: string) => void;

function buildToolbarConfig(props: RichTextEditorProps): Partial<IToolbarConfig> {
  const excludedKeys = ["fullScreen"];

  if (!props.onUploadImage) {
    excludedKeys.push("uploadImage");
  }
  if (!props.onUploadVideo) {
    excludedKeys.push("uploadVideo");
  }

  return {
    excludeKeys: excludedKeys
  };
}

function buildEditorConfig(props: RichTextEditorProps): Partial<IEditorConfig> {
  return {
    placeholder: props.placeholder ?? "从这里开始写正文...",
    scroll: false,
    MENU_CONF: {
      uploadImage: {
        async customUpload(file: File, insertFn: InsertImageFn) {
          if (!props.onUploadImage) {
            return;
          }

          const assets = await props.onUploadImage([file]);
          for (const asset of assets) {
            insertFn(asset.url, asset.fileName ?? "", "");
          }
        }
      },
      uploadVideo: {
        async customUpload(file: File, insertFn: InsertVideoFn) {
          if (!props.onUploadVideo) {
            return;
          }

          const assets = await props.onUploadVideo([file]);
          for (const asset of assets) {
            insertFn(asset.url, "");
          }
        }
      }
    }
  };
}

export function RichTextEditor(props: RichTextEditorProps) {
  const [editor, setEditor] = useState<IDomEditor | null>(null);
  const toolbarConfig = useMemo(() => buildToolbarConfig(props), [props]);
  const editorConfig = useMemo(() => buildEditorConfig(props), [props]);

  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  return (
    <div className="wang-editor-shell overflow-hidden rounded-[0.9rem] border border-border/70 bg-white">
      <Toolbar
        defaultConfig={toolbarConfig}
        editor={editor}
        mode="default"
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "0.5rem 0.75rem"
        }}
      />
      <Editor
        defaultConfig={editorConfig}
        mode="default"
        onChange={(currentEditor) => {
          props.onChange(currentEditor.getHtml());
        }}
        onCreated={setEditor}
        value={props.value}
      />
    </div>
  );
}
