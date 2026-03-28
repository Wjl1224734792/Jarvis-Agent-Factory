import {
  BoldOutlined,
  LinkOutlined,
  OrderedListOutlined,
  PictureOutlined,
  VideoCameraOutlined
} from "@ant-design/icons";
import { Button } from "antd";
import { useEffect, useRef, useState } from "react";

type UploadedMediaAsset = {
  id: string;
  url: string;
  fileName?: string;
};

type EditorChange = {
  html: string;
  plainText: string;
};

function buildPlainText(node: HTMLDivElement) {
  return node.innerText.replace(/\n{3,}/g, "\n\n").trim();
}

function applyCommand(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function AdminRichTextEditor(props: {
  value: string;
  placeholder?: string;
  onChange: (value: EditorChange) => void;
  onUploadImage?: (files: FileList | null) => Promise<UploadedMediaAsset[]>;
  onUploadVideo?: (files: FileList | null) => Promise<UploadedMediaAsset[]>;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  useEffect(() => {
    const node = editorRef.current;
    if (!node) {
      return;
    }
    if (node.innerHTML !== props.value) {
      node.innerHTML = props.value;
    }
  }, [props.value]);

  function emitChange() {
    const node = editorRef.current;
    if (!node) {
      return;
    }
    props.onChange({
      html: node.innerHTML,
      plainText: buildPlainText(node)
    });
  }

  async function handleImageUpload(files: FileList | null) {
    if (!props.onUploadImage || !files?.length) {
      return;
    }
    setIsUploadingImage(true);
    try {
      const assets = await props.onUploadImage(files);
      for (const asset of assets) {
        applyCommand(
          "insertHTML",
          `<figure><img src="${asset.url}" alt="${asset.fileName ?? "image"}" /></figure><p></p>`
        );
      }
      emitChange();
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  async function handleVideoUpload(files: FileList | null) {
    if (!props.onUploadVideo || !files?.length) {
      return;
    }
    setIsUploadingVideo(true);
    try {
      const assets = await props.onUploadVideo(files);
      for (const asset of assets) {
        applyCommand(
          "insertHTML",
          `<figure><video controls preload="metadata" src="${asset.url}"></video></figure><p></p>`
        );
      }
      emitChange();
    } finally {
      setIsUploadingVideo(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
    }
  }

  const toolbar = [
    { key: "bold", label: "Bold", icon: <BoldOutlined />, onClick: () => applyCommand("bold") },
    { key: "italic", label: "Italic", icon: <span className="admin-editor__italic">I</span>, onClick: () => applyCommand("italic") },
    { key: "h2", label: "H2", icon: <span className="admin-editor__heading">H2</span>, onClick: () => applyCommand("formatBlock", "<h2>") },
    { key: "bullet", label: "Bullet", icon: <span className="admin-editor__heading">•</span>, onClick: () => applyCommand("insertUnorderedList") },
    { key: "ordered", label: "Ordered", icon: <OrderedListOutlined />, onClick: () => applyCommand("insertOrderedList") },
    { key: "quote", label: "Quote", icon: <span className="admin-editor__heading">"</span>, onClick: () => applyCommand("formatBlock", "<blockquote>") },
    {
      key: "link",
      label: "Link",
      icon: <LinkOutlined />,
      onClick: () => {
        const next = window.prompt("输入链接地址", "https://");
        if (!next) {
          return;
        }
        applyCommand("createLink", next.trim());
      }
    }
  ];

  return (
    <div className="admin-editor">
      <div className="admin-editor__toolbar">
        <div className="admin-editor__toolbar-group">
          {toolbar.map((item) => (
            <Button icon={item.icon} key={item.key} onClick={item.onClick} type="default">
              {item.label}
            </Button>
          ))}
        </div>
        <div className="admin-editor__toolbar-group">
          <Button
            icon={<PictureOutlined />}
            loading={isUploadingImage}
            onClick={() => imageInputRef.current?.click()}
            type="default"
          >
            插入图片
          </Button>
          <Button
            icon={<VideoCameraOutlined />}
            loading={isUploadingVideo}
            onClick={() => videoInputRef.current?.click()}
            type="default"
          >
            插入视频
          </Button>
        </div>
      </div>
      <div className="admin-editor__surface">
        <div
          className={`admin-editor__content${props.value ? "" : " is-empty"}`}
          contentEditable
          data-placeholder={props.placeholder ?? "开始输入正文..."}
          onInput={emitChange}
          ref={editorRef}
          suppressContentEditableWarning
        />
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
    </div>
  );
}
