import {
  coreCreateEditor,
  coreCreateToolbar,
  registerElemToHtmlConf,
  registerMenu,
  registerParseElemHtmlConf,
  registerParseStyleHtmlHandler,
  registerPreParseHtmlConf,
  registerRenderElemConf,
  registerStyleHandler,
  registerStyleToHtmlHandler,
  type IEditorConfig,
  type IDomEditor,
  type IModuleConf,
  type IToolbarConfig
} from "@wangeditor/core";
import "@wangeditor/core/dist/css/style.css";
import basicModules from "@wangeditor/basic-modules";
import listModule from "@wangeditor/list-module";
import tableModule from "@wangeditor/table-module";
import uploadImageModule from "@wangeditor/upload-image-module";
import videoModule from "@wangeditor/video-module";
import { useEffect, useMemo, useRef, useState } from "react";

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
type RegisteredModule = Partial<IModuleConf>;

const ARTICLE_BASE_TOOLBAR_KEYS = [
  "headerSelect",
  "bold",
  "italic",
  "underline",
  "through",
  "color",
  "bgColor",
  "clearStyle",
  "bulletedList",
  "numberedList",
  "insertLink",
  "blockquote",
  "codeBlock",
  "divider",
  "undo",
  "redo"
] as const;

const ARTICLE_MODULES: RegisteredModule[] = [
  ...basicModules,
  listModule,
  tableModule,
  uploadImageModule,
  videoModule
];

const ARTICLE_EDITOR_PLUGINS = ARTICLE_MODULES.flatMap((moduleConf) =>
  moduleConf.editorPlugin ? [moduleConf.editorPlugin] : []
);

let articleModulesRegistered = false;

function normalizeMediaUrl(input: string) {
  const value = input.trim();
  if (!value) {
    return "";
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
    return value;
  }

  if (/\s/.test(value)) {
    return "";
  }

  if (value.startsWith("www.") || /^[^/]+\.[^/]+/.test(value)) {
    return `https://${value}`;
  }

  return value;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function ignoreDuplicateRegisterError(error: unknown) {
  if (!(error instanceof Error)) {
    throw error;
  }

  const message = error.message.toLowerCase();
  if (
    message.includes("duplicate") ||
    message.includes("duplicated") ||
    message.includes("already")
  ) {
    return;
  }

  throw error;
}

function safelyRegister(fn: () => void) {
  try {
    fn();
  } catch (error) {
    ignoreDuplicateRegisterError(error);
  }
}

function registerWangModule(moduleConf: RegisteredModule) {
  moduleConf.menus?.forEach((menuConf) => {
    safelyRegister(() => {
      registerMenu(menuConf, menuConf.config);
    });
  });

  if (moduleConf.renderStyle) {
    const renderStyle = moduleConf.renderStyle;
    safelyRegister(() => {
      registerStyleHandler(renderStyle);
    });
  }

  moduleConf.renderElems?.forEach((conf) => {
    safelyRegister(() => {
      registerRenderElemConf(conf);
    });
  });

  if (moduleConf.styleToHtml) {
    const styleToHtml = moduleConf.styleToHtml;
    safelyRegister(() => {
      registerStyleToHtmlHandler(styleToHtml);
    });
  }

  moduleConf.elemsToHtml?.forEach((conf) => {
    safelyRegister(() => {
      registerElemToHtmlConf(conf);
    });
  });

  moduleConf.preParseHtml?.forEach((conf) => {
    safelyRegister(() => {
      registerPreParseHtmlConf(conf);
    });
  });

  if (moduleConf.parseStyleHtml) {
    const parseStyleHtml = moduleConf.parseStyleHtml;
    safelyRegister(() => {
      registerParseStyleHtmlHandler(parseStyleHtml);
    });
  }

  moduleConf.parseElemsHtml?.forEach((conf) => {
    safelyRegister(() => {
      registerParseElemHtmlConf(conf);
    });
  });
}

function ensureArticleModulesRegistered() {
  if (articleModulesRegistered) {
    return;
  }

  ARTICLE_MODULES.forEach(registerWangModule);
  articleModulesRegistered = true;
}

function buildToolbarConfig(input: {
  hasImageUpload: boolean;
  hasVideoUpload: boolean;
}): Partial<IToolbarConfig> {
  const toolbarKeys = [
    ...ARTICLE_BASE_TOOLBAR_KEYS,
    "insertImage",
    "insertVideo"
  ] as string[];

  if (input.hasImageUpload) {
    toolbarKeys.push("uploadImage");
  }
  if (input.hasVideoUpload) {
    toolbarKeys.push("uploadVideo");
  }

  return {
    toolbarKeys
  };
}

function buildEditorConfig(
  propsRef: { current: RichTextEditorProps },
  placeholder?: string
): Partial<IEditorConfig> {
  return {
    placeholder: placeholder ?? "浠庤繖閲屽紑濮嬪啓姝ｆ枃...",
    scroll: false,
    onChange(currentEditor) {
      propsRef.current?.onChange(currentEditor.getHtml());
    },
    MENU_CONF: {
      uploadImage: {
        async customUpload(file: File, insertFn: InsertImageFn) {
          const onUploadImage = propsRef.current?.onUploadImage;
          if (!onUploadImage) {
            return;
          }

          const assets = await onUploadImage([file]);
          for (const asset of assets) {
            insertFn(asset.url, asset.fileName ?? "", "");
          }
        }
      },
      uploadVideo: {
        async customUpload(file: File, insertFn: InsertVideoFn) {
          const onUploadVideo = propsRef.current?.onUploadVideo;
          if (!onUploadVideo) {
            return;
          }

          const assets = await onUploadVideo([file]);
          for (const asset of assets) {
            insertFn(asset.url, "");
          }
        }
      },
      insertImage: {
        parseImageSrc(src: string) {
          return normalizeMediaUrl(src);
        },
        checkImage(src: string) {
          return isHttpUrl(src) ? true : "鍥剧墖閾炬帴闇€浣跨敤 http(s) 鍦板潃";
        }
      },
      insertVideo: {
        parseVideoSrc(src: string) {
          return normalizeMediaUrl(src);
        },
        checkVideo(src: string) {
          return isHttpUrl(src) ? true : "瑙嗛閾炬帴闇€浣跨敤 http(s) 鍦板潃";
        }
      }
    }
  };
}

export function RichTextEditor(props: RichTextEditorProps) {
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const toolbarContainerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<IDomEditor | null>(null);
  const propsRef = useRef(props);
  const toolbarCreatedRef = useRef(false);
  const [editor, setEditor] = useState<IDomEditor | null>(null);

  propsRef.current = props;

  const toolbarConfig = useMemo(
    () =>
      buildToolbarConfig({
        hasImageUpload: Boolean(props.onUploadImage),
        hasVideoUpload: Boolean(props.onUploadVideo)
      }),
    [props.onUploadImage, props.onUploadVideo]
  );
  const editorConfig = useMemo(
    () => buildEditorConfig(propsRef, props.placeholder),
    [props.placeholder]
  );

  useEffect(() => {
    ensureArticleModulesRegistered();

    if (!editorContainerRef.current || editorRef.current) {
      return;
    }

    const nextEditor = coreCreateEditor({
      selector: editorContainerRef.current,
      config: editorConfig,
      html: props.value,
      plugins: ARTICLE_EDITOR_PLUGINS
    });

    editorRef.current = nextEditor;
    setEditor(nextEditor);
  }, [editorConfig, props.value]);

  useEffect(() => {
    return () => {
      if (!editorRef.current) {
        return;
      }

      editorRef.current.destroy();
      editorRef.current = null;
      toolbarCreatedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!editor || !toolbarContainerRef.current || toolbarCreatedRef.current) {
      return;
    }

    coreCreateToolbar(editor, {
      selector: toolbarContainerRef.current,
      config: toolbarConfig
    });
    toolbarCreatedRef.current = true;
  }, [editor, toolbarConfig]);

  useEffect(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor) {
      return;
    }

    if (currentEditor.getHtml() === props.value) {
      return;
    }

    try {
      currentEditor.setHtml(props.value);
    } catch (error) {
      console.error(error);
    }
  }, [props.value]);

  return (
    <div className="wang-editor-shell overflow-visible rounded-[0.9rem] border border-border/70 bg-white">
      <div
        ref={toolbarContainerRef}
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "0.5rem 0.75rem"
        }}
      />
      <div ref={editorContainerRef} />
    </div>
  );
}
