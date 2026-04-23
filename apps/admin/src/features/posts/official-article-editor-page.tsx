import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, Select, Space } from "antd";
import {
  Suspense,
  lazy,
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState
} from "react";
import { useSearchParams } from "react-router-dom";
import { extractPlainTextFromHtml } from "../../components/admin-rich-text-editor-helpers";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";
import { apiClient } from "../../lib/api-client";
import {
  buildOfficialArticlePayload,
  removeMediaFromHtml,
  type OfficialArticleFormValues
} from "./official-articles-helpers";

type UploadedMediaAsset = { id: string; url: string; fileName?: string };

type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleCapableWindow = Window & {
  requestIdleCallback?: (
    callback: (deadline: IdleDeadline) => void,
    options?: { timeout: number }
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const LazyAdminRichTextEditor = lazy(() =>
  import("../../components/admin-rich-text-editor").then((module) => ({
    default: module.AdminRichTextEditor
  }))
);

function createMediaAssetList(
  items: Array<{ id: string; url: string; fileName: string }> | undefined,
  skipFirst = false
) {
  return (items ?? [])
    .slice(skipFirst ? 1 : 0)
    .map((item) => ({ id: item.id, url: item.url, fileName: item.fileName }));
}

function RichTextEditorFallback(props: { loading: boolean; onLoad?: () => void }) {
  return (
    <div aria-busy={props.loading} className="admin-empty">
      <Space align="center" direction="vertical" size={8}>
        <Button loading={props.loading} onClick={props.onLoad} type="default">
          {props.loading ? "正在加载编辑器" : "加载富文本编辑器"}
        </Button>
        <span>页面主体已可操作，富文本工具会在需要时按需加载。</span>
      </Space>
    </div>
  );
}

export function OfficialArticleEditorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const categoriesQuery = useQuery({
    queryKey: ["admin-official-article-categories"],
    queryFn: () => apiClient.listAdminContentCategories()
  });
  const detailQuery = useQuery({
    queryKey: ["admin-official-article-detail", editId],
    queryFn: () => {
      if (!editId) {
        throw new Error("Missing official article id.");
      }
      return apiClient.getAdminOfficialArticle(editId);
    },
    enabled: Boolean(editId)
  });
  const [form] = Form.useForm<OfficialArticleFormValues>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [coverImage, setCoverImage] = useState<UploadedMediaAsset | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedMediaAsset[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<UploadedMediaAsset[]>([]);
  const [shouldLoadEditor, setShouldLoadEditor] = useState(false);
  const [editorHtml, setEditorHtml] = useState("");
  const [editorText, setEditorText] = useState("");
  const watchedTitle = Form.useWatch("title", form);
  const watchedCategoryId = Form.useWatch("contentCategoryId", form);
  const editorViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editId) {
      return;
    }
    if (!detailQuery.data?.item) {
      return;
    }

    const item = detailQuery.data.item;
    const [firstImage, ...restImages] = item.images;
    form.setFieldsValue({
      title: item.title,
      contentCategoryId: item.contentCategory?.id ?? undefined
    });
    setCoverImage(firstImage ? { id: firstImage.id, url: firstImage.url, fileName: firstImage.fileName } : null);
    setUploadedImages(restImages.map((image) => ({ id: image.id, url: image.url, fileName: image.fileName })));
    setUploadedVideos(createMediaAssetList(item.videos));
    setEditorHtml(item.contentHtml ?? "");
    setEditorText(item.content);
  }, [detailQuery.data?.item, editId, form]);

  const categoryOptions = (categoriesQuery.data?.items ?? []).map((item) => ({
    label: item.name,
    value: item.id
  }));
  const selectedCategoryLabel = useMemo(() => {
    return categoryOptions.find((item) => item.value === watchedCategoryId)?.label ?? "未选择分类";
  }, [categoryOptions, watchedCategoryId]);
  const previewImageUrl = coverImage?.url ?? uploadedImages[0]?.url ?? null;

  const requestEditorLoad = useEffectEvent(() => {
    startTransition(() => {
      setShouldLoadEditor(true);
    });
  });

  useEffect(() => {
    if (shouldLoadEditor) {
      return undefined;
    }

    const idleWindow = window as IdleCapableWindow;
    const editorViewport = editorViewportRef.current;
    let observer: IntersectionObserver | undefined;
    let idleHandle: number | undefined;
    let timeoutHandle: number | undefined;

    if (editorViewport && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            requestEditorLoad();
            observer?.disconnect();
          }
        },
        { rootMargin: "200px 0px" }
      );
      observer.observe(editorViewport);
    }

    if (idleWindow.requestIdleCallback) {
      idleHandle = idleWindow.requestIdleCallback(() => {
        requestEditorLoad();
      }, { timeout: 1200 });
    } else {
      timeoutHandle = window.setTimeout(() => {
        requestEditorLoad();
      }, 1200);
    }

    return () => {
      observer?.disconnect();
      if (idleHandle !== undefined) {
        idleWindow.cancelIdleCallback?.(idleHandle);
      }
      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [requestEditorLoad, shouldLoadEditor]);

  function removeMediaAsset(assetUrl: string, kind: "image" | "video") {
    const nextHtml = removeMediaFromHtml(editorHtml, assetUrl);
    setEditorHtml(nextHtml);
    setEditorText(extractPlainTextFromHtml(nextHtml));

    if (kind === "image") {
      setUploadedImages((current) => current.filter((item) => item.url !== assetUrl));
      return;
    }

    setUploadedVideos((current) => current.filter((item) => item.url !== assetUrl));
  }

  function resetFormState(clearEdit = false) {
    form.resetFields();
    setError(null);
    setStatusMessage(null);
    setCoverImage(null);
    setUploadedImages([]);
    setUploadedVideos([]);
    setEditorHtml("");
    setEditorText("");
    if (clearEdit) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("edit");
        return next;
      });
    }
  }

  async function uploadImages(files: FileList | null) {
    if (!files?.length) {
      return [];
    }

    setIsUploading(true);
    try {
      const uploads: UploadedMediaAsset[] = [];
      for (const file of Array.from(files)) {
        const response = await apiClient.uploadPostImage(file);
        uploads.push({
          id: response.item.id,
          url: response.item.url,
          fileName: response.item.fileName
        });
      }
      setUploadedImages((current) => [...current, ...uploads]);
      return uploads;
    } finally {
      setIsUploading(false);
    }
  }

  async function uploadVideos(files: FileList | null) {
    if (!files?.length) {
      return [];
    }

    setIsUploading(true);
    try {
      const uploads: UploadedMediaAsset[] = [];
      for (const file of Array.from(files)) {
        const response = await apiClient.uploadPostVideo(file);
        uploads.push({
          id: response.item.id,
          url: response.item.url,
          fileName: response.item.fileName
        });
      }
      setUploadedVideos((current) => [...current, ...uploads]);
      return uploads;
    } finally {
      setIsUploading(false);
    }
  }

  async function uploadCover(file: File | null) {
    if (!file) {
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const response = await apiClient.uploadPostImage(file);
      setCoverImage({
        id: response.item.id,
        url: response.item.url,
        fileName: response.item.fileName
      });
      setStatusMessage("封面图上传成功。");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "封面图上传失败");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(values: OfficialArticleFormValues) {
    setIsSubmitting(true);
    setError(null);
    setStatusMessage(null);

    const payload = buildOfficialArticlePayload(
      {
        ...values,
        content: editorText,
        contentHtml: editorHtml
      },
      Array.from(new Set([coverImage?.id, ...uploadedImages.map((item) => item.id)].filter(Boolean))) as string[],
      uploadedVideos.map((item) => item.id)
    );

    try {
      if (editId) {
        await apiClient.updateAdminOfficialArticle(editId, payload);
        setStatusMessage("官方文章已更新。");
      } else {
        await apiClient.createOfficialArticle(payload);
        resetFormState(false);
        setStatusMessage("官方文章已发布。");
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "保存官方文章失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminPage
      actions={
        <Space wrap>
          <Button href={ADMIN_ROUTE_PATHS.managementOfficialArticles}>官方文章库</Button>
          {editId ? (
            <Button
              onClick={() => {
                resetFormState(true);
              }}
            >
              新建文章
            </Button>
          ) : null}
        </Space>
      }
      description="运营区仅保留官方文章创建与编辑工作台。"
      title={editId ? "编辑文章" : "创建文章"}
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {statusMessage ? <div className="admin-shell__banner">{statusMessage}</div> : null}

      <div className="admin-split admin-split--wide">
        <AdminPanel
          description="填写标题、选择分类、管理封面与正文内容，并保持右侧预览实时同步。"
          title={editId ? "编辑官方文章" : "新建官方文章"}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => {
              void handleSubmit(values);
            }}
            variant="filled"
          >
            <Form.Item label="标题" name="title" rules={[{ required: true, message: "请输入文章标题" }]}>
              <Input placeholder="例如：低空空域周报" />
            </Form.Item>
            <Form.Item
              label="内容分类"
              name="contentCategoryId"
              rules={[{ required: true, message: "请选择内容分类" }]}
            >
              <Select loading={categoriesQuery.isLoading} options={categoryOptions} placeholder="选择分类" />
            </Form.Item>
            <Form.Item label="正文" required>
              <div ref={editorViewportRef}>
                {shouldLoadEditor ? (
                  <Suspense fallback={<RichTextEditorFallback loading />}>
                    <LazyAdminRichTextEditor
                onChange={(value) => {
                  setEditorHtml(value.html);
                  setEditorText(value.plainText);
                }}
                onUploadImage={uploadImages}
                onUploadVideo={uploadVideos}
                placeholder="请输入官方文章正文..."
                value={editorHtml}
                    />
                  </Suspense>
                ) : (
                  <RichTextEditorFallback
                    loading={false}
                    onLoad={() => {
                      requestEditorLoad();
                    }}
                  />
                )}
              </div>
            </Form.Item>
            <div className="admin-uploader">
              <div>
                <div className="admin-panel__title">封面图</div>
                <div className="admin-panel__description">可选。封面图会优先展示在列表卡片与详情页头图位置。</div>
              </div>
              <Space align="center" size="middle" wrap>
                <Button loading={isUploading} onClick={() => fileInputRef.current?.click()} type="default">
                  {isUploading ? "上传中..." : "上传封面"}
                </Button>
                {coverImage ? <span className="admin-muted">当前封面：{coverImage.fileName ?? coverImage.id}</span> : null}
                {coverImage ? (
                  <Button
                    onClick={() => {
                      setCoverImage(null);
                    }}
                    size="small"
                    type="link"
                  >
                    清除封面
                  </Button>
                ) : null}
              </Space>
              <input
                accept="image/*"
                hidden
                onChange={(event) => {
                  void uploadCover(event.target.files?.[0] ?? null);
                }}
                ref={fileInputRef}
                type="file"
              />
            </div>
            <div className="admin-form-actions">
              <Button disabled={!editorText.trim()} htmlType="submit" loading={isSubmitting} type="primary">
                {editId ? "保存文章" : "发布文章"}
              </Button>
            </div>
          </Form>
        </AdminPanel>

        <div className="admin-field-stack">
          <AdminPanel description="发布前确认封面、分类、标题和正文效果。" title="实时预览">
            <div className="admin-article-preview">
              {previewImageUrl ? (
                <div className="admin-image-preview">
                  <img alt="官方文章封面" src={previewImageUrl} />
                </div>
              ) : (
                <div className="admin-article-preview__placeholder">未设置封面图</div>
              )}
              <div className="admin-article-preview__meta">{selectedCategoryLabel}</div>
              <div className="admin-article-preview__title">{watchedTitle || "文章标题"}</div>
              <div
                className="admin-article-preview__body"
                dangerouslySetInnerHTML={{
                  __html: editorHtml || "<p>正文预览会显示在这里。</p>"
                }}
              />
            </div>
          </AdminPanel>

          {(uploadedImages.length > 0 || uploadedVideos.length > 0) ? (
            <AdminPanel description="保存前可移除已上传的正文媒体，移除后会同步从正文中删除。" title="已上传媒体">
              {uploadedImages.length > 0 ? (
                <div className="admin-preview-list">
                  {uploadedImages.map((image) => (
                    <div className="admin-preview-item" key={image.id}>
                      <div className="admin-row-actions">
                        <span className="admin-muted">{image.fileName ?? image.id}</span>
                        <Button
                          onClick={() => {
                            removeMediaAsset(image.url, "image");
                          }}
                          size="small"
                          type="link"
                        >
                          移除图片
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {uploadedVideos.length > 0 ? (
                <div className="admin-preview-list">
                  {uploadedVideos.map((video) => (
                    <div className="admin-preview-item" key={video.id}>
                      <div className="admin-row-actions">
                        <span className="admin-muted">{video.fileName ?? video.id}</span>
                        <Button
                          onClick={() => {
                            removeMediaAsset(video.url, "video");
                          }}
                          size="small"
                          type="link"
                        >
                          移除视频
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </AdminPanel>
          ) : null}
        </div>
      </div>
    </AdminPage>
  );
}
