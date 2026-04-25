import "@wangeditor/editor/dist/css/style.css";
import {
  normalizeRichTextLinkHref,
  normalizeRichTextMediaUrl,
  normalizeRichTextVideoSource
} from "@feijia/shared";
import { i18nChangeLanguage, type IDomEditor, type IEditorConfig, type IToolbarConfig } from "@wangeditor/editor";
import { Editor, Toolbar } from "@wangeditor/editor-for-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractPlainTextFromHtml, type UploadedMediaAsset } from "./admin-rich-text-editor-helpers";

type EditorChange = {
  html: string;
  plainText: string;
};

type AdminRichTextEditorProps = {
  value: string;
  placeholder?: string;
  onChange: (value: EditorChange) => void;
  onUploadImage?: (files: FileList | File[] | null) => Promise<UploadedMediaAsset[]>;
  onUploadVideo?: (files: FileList | File[] | null) => Promise<UploadedMediaAsset[]>;
};

type ImageInsertFn = (src: string, alt: string, href: string) => void;
type VideoInsertFn = (src: string, poster: string) => void;

i18nChangeLanguage("zh-CN");

function getErrorMessage(value: unknown, fallback: string) {
  return value instanceof Error ? value.message : fallback;
}

function checkImageUrl(src: string) {
  return normalizeRichTextMediaUrl(src) ? true : "请输入有效的图片链接";
}

function checkVideoUrl(src: string) {
  return normalizeRichTextVideoSource(src) ? true : "请输入有效的视频链接";
}

function checkLinkUrl(_text: string, url: string) {
  return normalizeRichTextLinkHref(url) ? true : "请输入有效的链接";
}

export function AdminRichTextEditor(props: AdminRichTextEditorProps) {
  const { onChange, onUploadImage, onUploadVideo, placeholder, value } = props;
  const editorRef = useRef<IDomEditor | null>(null);
  const [editor, setEditor] = useState<IDomEditor | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const isUploading = uploadingCount > 0;
  const emitEditorChange = useCallback(
    (currentEditor: IDomEditor) => {
      const html = currentEditor.getHtml();
      onChange({
        html,
        plainText: extractPlainTextFromHtml(html)
      });
    },
    [onChange]
  );
  const syncCurrentEditorChange = useCallback(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor || currentEditor.isDestroyed) {
      return;
    }

    emitEditorChange(currentEditor);
  }, [emitEditorChange]);

  const editorConfig = useMemo<Partial<IEditorConfig>>(
    () => ({
      autoFocus: false,
      placeholder: placeholder ?? "请输入正文内容",
      customAlert(info, type) {
        if (type === "error" || type === "warning") {
          setUploadError(info);
        }
      },
      MENU_CONF: {
        insertImage: {
          checkImage: checkImageUrl,
          parseImageSrc: normalizeRichTextMediaUrl
        },
        editImage: {
          checkImage: checkImageUrl,
          parseImageSrc: normalizeRichTextMediaUrl
        },
        insertLink: {
          checkLink: checkLinkUrl,
          parseLinkUrl: normalizeRichTextLinkHref
        },
        editLink: {
          checkLink: checkLinkUrl,
          parseLinkUrl: normalizeRichTextLinkHref
        },
        insertVideo: {
          checkVideo: checkVideoUrl,
          parseVideoSrc: normalizeRichTextVideoSource
        },
        uploadImage: {
          allowedFileTypes: ["image/*"],
          async customUpload(file: File, insertFn: ImageInsertFn) {
            if (!onUploadImage) {
              setUploadError("图片上传不可用");
              return;
            }

            setUploadError(null);
            setUploadingCount((count) => count + 1);
            try {
              const assets = await onUploadImage([file]);
              for (const asset of assets) {
                const src = normalizeRichTextMediaUrl(asset.url);
                if (!src) {
                  throw new Error("Uploaded image URL is invalid.");
                }
                insertFn(src, asset.fileName ?? file.name, "");
              }
              queueMicrotask(syncCurrentEditorChange);
            } catch (reason) {
              const message = getErrorMessage(reason, "图片上传失败");
              setUploadError(message);
              editorRef.current?.alert(message, "error");
            } finally {
              setUploadingCount((count) => Math.max(0, count - 1));
            }
          }
        },
        uploadVideo: {
          allowedFileTypes: ["video/*"],
          async customUpload(file: File, insertFn: VideoInsertFn) {
            if (!onUploadVideo) {
              setUploadError("视频上传不可用");
              return;
            }

            setUploadError(null);
            setUploadingCount((count) => count + 1);
            try {
              const assets = await onUploadVideo([file]);
              for (const asset of assets) {
                const src = normalizeRichTextVideoSource(asset.url);
                if (!src) {
                  throw new Error("Uploaded video URL is invalid.");
                }
                insertFn(src, "");
              }
              queueMicrotask(syncCurrentEditorChange);
            } catch (reason) {
              const message = getErrorMessage(reason, "视频上传失败");
              setUploadError(message);
              editorRef.current?.alert(message, "error");
            } finally {
              setUploadingCount((count) => Math.max(0, count - 1));
            }
          }
        }
      }
    }),
    [onUploadImage, onUploadVideo, placeholder, syncCurrentEditorChange]
  );

  const toolbarConfig = useMemo<Partial<IToolbarConfig>>(
    () => ({
      excludeKeys: ["fullScreen"]
    }),
    []
  );

  useEffect(() => {
    editorRef.current = editor;

    return () => {
      if (editor && !editor.isDestroyed) {
        editor.destroy();
      }
    };
  }, [editor]);

  return (
    <div className="admin-editor wang-editor-shell">
      <Toolbar
        className="admin-editor__toolbar"
        defaultConfig={toolbarConfig}
        editor={editor}
        mode="default"
      />
      <Editor
        className="admin-editor__surface"
        defaultConfig={editorConfig}
        mode="default"
        onChange={emitEditorChange}
        onCreated={(currentEditor) => {
          editorRef.current = currentEditor;
          setEditor(currentEditor);
        }}
        style={{ minHeight: 420 }}
        value={value}
      />
      <div className="admin-editor__footer">
        <span>{uploadError ?? (isUploading ? "媒体上传中..." : "")}</span>
      </div>
    </div>
  );
}
