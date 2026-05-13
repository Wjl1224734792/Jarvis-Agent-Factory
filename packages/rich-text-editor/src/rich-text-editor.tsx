/**
 * RichTextEditor — 共享 WangEditor 封装
 *
 * 通过 variant prop 同时支持 Web 端 (wang-editor-shell) 和
 * Admin 端 (admin-editor) 两套样式体系。
 *
 * 上传策略：延迟上传（blob URL 即时预览），
 * 文件经 mediaManager.register() 暂存，提交时统一上传。
 *
 * 依赖：
 * - @wangeditor/editor 5.1.23
 * - @wangeditor/editor-for-react 1.0.6
 * - @wangeditor/video-module 1.1.4
 */

import "@wangeditor/editor/dist/css/style.css";
import {
  normalizeRichTextLinkHref,
  normalizeRichTextMediaUrl,
  normalizeRichTextVideoSource,
} from "@feijia/shared";
import {
  Boot,
  i18nChangeLanguage,
  type IDomEditor,
  type IEditorConfig,
  type IToolbarConfig,
} from "@wangeditor/editor";
import { Editor, Toolbar } from "@wangeditor/editor-for-react";
import videoModule from "@wangeditor/video-module";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractPlainTextFromHtml } from "./rich-text-editor-helpers";
import type { MediaManager } from "./media-manager";

// HMR 热更新时模块重新执行但 Boot 单例未重置，重复注册会抛 Duplicated key 异常。
try {
  Boot.registerModule(videoModule);
} catch {
  // video module already registered by a previous HMR cycle
}

export interface RichTextEditorProps {
  /** 编辑器 HTML 内容（受控） */
  value: string;
  /** 占位文本，默认"开始写正文" */
  placeholder?: string;
  /** 内容变化回调，统一传递 { html, plainText } */
  onChange: (value: { html: string; plainText: string }) => void;
  /** 样式变体：web 使用 wang-editor-shell，admin 使用 admin-editor */
  variant?: "web" | "admin";
  /** 编辑器最小高度（px），默认 420 */
  minHeight?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** MediaManager 实例，由页面层注入 */
  mediaManager: MediaManager;
  /** 编辑器创建完成回调，用于外部获取 editor 实例 */
  onCreated?: (editor: IDomEditor) => void;
}

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

export function RichTextEditor(props: RichTextEditorProps) {
  const {
    value,
    placeholder,
    onChange,
    variant = "web",
    minHeight = 420,
    disabled = false,
    mediaManager,
    onCreated: onCreatedCallback,
  } = props;

  const editorRef = useRef<IDomEditor | null>(null);
  const [editor, setEditor] = useState<IDomEditor | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const characterCount = useMemo(
    () => extractPlainTextFromHtml(value).replace(/\s+/g, "").length,
    [value]
  );

  const emitEditorChange = useCallback(
    (currentEditor: IDomEditor) => {
      // 过滤粘贴内容中的 file:// 本地路径（WPS/Word 粘贴残留），清理空 src 属性
      const html = currentEditor
        .getHtml()
        .replace(/\b(file:\/\/\/)[^\s"'>]+/gi, "")
        .replace(/\s*src\s*=\s*["']\s*["']\s*/gi, "");
      onChange({
        html,
        plainText: extractPlainTextFromHtml(html),
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
      placeholder: placeholder ?? "开始写正文",
      customAlert(info: string, type: string) {
        if (type === "error" || type === "warning") {
          setUploadError(info);
        }
      },
      MENU_CONF: {
        insertImage: {
          checkImage: checkImageUrl,
          parseImageSrc: normalizeRichTextMediaUrl,
        },
        editImage: {
          checkImage: checkImageUrl,
          parseImageSrc: normalizeRichTextMediaUrl,
        },
        insertLink: {
          checkLink: checkLinkUrl,
          parseLinkUrl: normalizeRichTextLinkHref,
        },
        editLink: {
          checkLink: checkLinkUrl,
          parseLinkUrl: normalizeRichTextLinkHref,
        },
        insertVideo: {
          checkVideo: checkVideoUrl,
          parseVideoSrc: normalizeRichTextVideoSource,
        },
        uploadImage: {
          allowedFileTypes: ["image/*"],
          customUpload(file: File, insertFn: ImageInsertFn) {
            setUploadError(null);
            try {
              // 延迟上传：只生成 blob URL，不调用上传 API
              const { blobUrl } = mediaManager.register(file);
              insertFn(blobUrl, file.name, "");
              // 确保 insertFn 后 onChange 被触发
              queueMicrotask(syncCurrentEditorChange);
            } catch (reason) {
              const message = getErrorMessage(reason, "图片上传失败");
              setUploadError(message);
              editorRef.current?.alert(message, "error");
            }
          },
        },
        uploadVideo: {
          allowedFileTypes: ["video/*"],
          customUpload(file: File, insertFn: VideoInsertFn) {
            setUploadError(null);
            try {
              // 延迟上传 + 同步 insertFn 修复视频插入时序 Bug
              const { blobUrl } = mediaManager.register(file);
              insertFn(blobUrl, "");
              queueMicrotask(syncCurrentEditorChange);
            } catch (reason) {
              const message = getErrorMessage(reason, "视频上传失败");
              setUploadError(message);
              editorRef.current?.alert(message, "error");
            }
          },
        },
      },
    }),
    [mediaManager, placeholder, syncCurrentEditorChange]
  );

  const toolbarConfig = useMemo<Partial<IToolbarConfig>>(
    () => ({
      excludeKeys: ["fullScreen"],
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

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      if (disabled) {
        editor.disable();
      } else {
        editor.enable();
      }
    }
  }, [editor, disabled]);

  const handleCreated = useCallback(
    (currentEditor: IDomEditor) => {
      editorRef.current = currentEditor;
      if (disabled) {
        currentEditor.disable();
      }
      setEditor(currentEditor);
      onCreatedCallback?.(currentEditor);
    },
    [disabled, onCreatedCallback]
  );

  if (variant === "admin") {
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
          onCreated={handleCreated}
          style={{ minHeight }}
          value={value}
        />
        <div className="admin-editor__footer">
          <span>{uploadError ?? ""}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="wang-editor-shell overflow-hidden rounded-[0.9rem] border border-border/70 bg-white">
      <Toolbar
        className="wang-editor-shell__toolbar"
        defaultConfig={toolbarConfig}
        editor={editor}
        mode="default"
      />
      <Editor
        className="wang-editor-shell__editor"
        defaultConfig={editorConfig}
        mode="default"
        onChange={emitEditorChange}
        onCreated={handleCreated}
        style={{ minHeight }}
        value={value}
      />
      <div className="wang-editor-shell__footer">
        <span>{uploadError ?? ""}</span>
        <span>{characterCount} 字</span>
      </div>
    </div>
  );
}
