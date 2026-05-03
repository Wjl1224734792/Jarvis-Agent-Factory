import { useQuery } from "@tanstack/react-query";
import { Button, Checkbox, Form, Input, Select, Space } from "antd";
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
import {
  buildOfficialArticleDocument,
  parseOfficialArticleDocument,
  removeAdminRichTextMediaReferenceFromHtml,
  type UploadedMediaAsset
} from "../../components/admin-rich-text-editor-helpers";
import { AdminRichTextHtml } from "../../components/admin-rich-text-html";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";
import { apiClient } from "../../lib/api-client";
import {
  buildOfficialArticlePayload,
  type OfficialArticleFormValues
} from "./official-articles-helpers";

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

type OfficialArticleEditorFormValues = {
  title: string;
  summary: string;
  contentCategoryId: string;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  declarations?: string[];
};

const DECLARATION_OPTIONS = [
  { label: '原创', value: 'original' },
  { label: 'AI生成', value: 'ai_generated' },
  { label: 'AI辅助创作', value: 'ai_assisted' },
  { label: '转载', value: 'reprinted' },
  { label: '深度合成', value: 'deep_synthesis' }
];

const OFFICIAL_ARTICLE_SUMMARY_MAX_LENGTH = 120;

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
    <div aria-busy={props.loading} className="admin-empty admin-official-article-editor__editor-fallback">
      <Space align="center" direction="vertical" size={8}>
        <Button loading={props.loading} onClick={props.onLoad} type="default">
          {props.loading ? "加载编辑器" : "打开编辑器"}
        </Button>
        <span>富文本区域按需加载。</span>
      </Space>
    </div>
  );
}

export function OfficialArticleEditorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [form] = Form.useForm<OfficialArticleEditorFormValues>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorViewportRef = useRef<HTMLDivElement | null>(null);
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
  const watchedTitle = Form.useWatch("title", form) ?? "";
  const watchedSummary = Form.useWatch("summary", form) ?? "";
  const watchedCategoryId = Form.useWatch("contentCategoryId", form);
  const watchedSourceLabel = Form.useWatch("sourceLabel", form) ?? "";
  const watchedSourceUrl = Form.useWatch("sourceUrl", form) ?? "";
  const watchedDeclarations = (Form.useWatch("declarations", form) ?? []) as string[];

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

  useEffect(() => {
    if (!editId || !detailQuery.data?.item) {
      return;
    }

    const item = detailQuery.data.item;
    const [firstImage] = item.images;
    const parsedDocument = parseOfficialArticleDocument(item.contentHtml);

    form.setFieldsValue({
      title: item.title,
      summary: parsedDocument.summary,
      contentCategoryId: item.contentCategory?.id ?? undefined,
      sourceLabel: item.source?.label ?? null,
      sourceUrl: item.source?.url ?? null
    });
    setCoverImage(firstImage ? { id: firstImage.id, url: firstImage.url, fileName: firstImage.fileName } : null);
    setUploadedImages(createMediaAssetList(item.images, Boolean(firstImage)));
    setUploadedVideos(createMediaAssetList(item.videos));
    setEditorHtml(parsedDocument.contentHtml);
    setEditorText(parsedDocument.plainText || item.content);
    form.setFieldValue('declarations', item.declarations?.values ?? []);
  }, [detailQuery.data?.item, editId, form]);

  useEffect(() => {
    if (editId) {
      return;
    }

    if (form.getFieldValue("contentCategoryId")) {
      return;
    }

    const firstCategoryId = categoriesQuery.data?.items[0]?.id;
    if (firstCategoryId) {
      form.setFieldValue("contentCategoryId", firstCategoryId);
    }
  }, [categoriesQuery.data?.items, editId, form]);

  const categoryOptions = (categoriesQuery.data?.items ?? []).map((item) => ({
    label: item.name,
    value: item.id
  }));
  const selectedCategoryLabel = useMemo(() => {
    return categoryOptions.find((item) => item.value === watchedCategoryId)?.label ?? "未选择分类";
  }, [categoryOptions, watchedCategoryId]);
  const previewImageUrl = coverImage?.url ?? uploadedImages[0]?.url ?? null;
  const summaryLength = watchedSummary.length;
  const previewCharacterCount = useMemo(() => {
    return [watchedSummary.trim(), editorText.trim()].filter(Boolean).join("\n\n").replace(/\s+/g, "").length;
  }, [editorText, watchedSummary]);

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
    const nextHtml = removeAdminRichTextMediaReferenceFromHtml(editorHtml, assetUrl);
    const parsedDocument = parseOfficialArticleDocument(nextHtml);

    setEditorHtml(parsedDocument.contentHtml);
    setEditorText(parsedDocument.plainText);

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

  async function uploadImages(files: FileList | File[] | null) {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) {
      return [];
    }

    setIsUploading(true);
    try {
      const uploads: UploadedMediaAsset[] = [];
      for (const file of selectedFiles) {
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

  async function uploadVideos(files: FileList | File[] | null) {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) {
      return [];
    }

    setIsUploading(true);
    try {
      const uploads: UploadedMediaAsset[] = [];
      for (const file of selectedFiles) {
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
      setStatusMessage("封面已更新。");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "封面上传失败");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(values: OfficialArticleEditorFormValues) {
    setIsSubmitting(true);
    setError(null);
    setStatusMessage(null);

    const document = buildOfficialArticleDocument(values.summary, editorHtml);
    const payload = buildOfficialArticlePayload(
      {
        title: values.title,
        contentCategoryId: values.contentCategoryId,
        sourceLabel: values.sourceLabel,
        sourceUrl: values.sourceUrl,
        declarations: values.declarations,
        content: document.plainText,
        contentHtml: document.contentHtml
      } satisfies OfficialArticleFormValues,
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
          <Button href={ADMIN_ROUTE_PATHS.managementOfficialArticles}>返回文章库</Button>
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
      description="用于创建、修订和预览官方文章。"
      title={editId ? "编辑官方文章" : "创建官方文章"}
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {statusMessage ? <div className="admin-shell__banner">{statusMessage}</div> : null}

      <div className="admin-split admin-split--wide admin-official-article-editor">
        <AdminPanel description="标题、摘要和正文在同一工作区完成。" title={editId ? "编辑内容" : "新建内容"}>
          <div className="admin-official-article-editor__stats">
            <div className="admin-official-article-editor__stat">
              <span className="admin-official-article-editor__stat-label">模式</span>
              <strong>{editId ? "编辑" : "创建"}</strong>
            </div>
            <div className="admin-official-article-editor__stat">
              <span className="admin-official-article-editor__stat-label">媒体</span>
              <strong>{uploadedImages.length} 图 / {uploadedVideos.length} 视频</strong>
            </div>
            <div className="admin-official-article-editor__stat">
              <span className="admin-official-article-editor__stat-label">正文</span>
              <strong>{previewCharacterCount} 字</strong>
            </div>
          </div>

          <Form
            form={form}
            initialValues={{ summary: "" }}
            layout="vertical"
            onFinish={(values) => {
              void handleSubmit(values);
            }}
            variant="filled"
          >
            <Form.Item label="标题" name="title" rules={[{ required: true, message: "请输入文章标题" }]}>
              <Input placeholder="输入正式标题" size="large" />
            </Form.Item>

            <Form.Item
              label="分类"
              name="contentCategoryId"
              rules={[{ required: true, message: "请选择内容分类" }]}
            >
              <Select loading={categoriesQuery.isLoading} options={categoryOptions} placeholder="选择分类" size="large" />
            </Form.Item>

            <Form.Item label="声明来源" name="sourceLabel">
              <Input placeholder="例如：飞加官方、转载媒体名称或作者" size="large" />
            </Form.Item>

            <Form.Item
              label="来源链接"
              name="sourceUrl"
              rules={[{ type: "url", message: "请输入合法 URL" }]}
            >
              <Input placeholder="https://example.com/source" size="large" />
            </Form.Item>

            <Form.Item
              label="内容声明"
              name="declarations"
              rules={[
                { required: true, message: '请至少选择一项内容声明' },
                { type: 'array', min: 1, message: '请至少选择一项内容声明' }
              ]}
            >
              <Checkbox.Group options={DECLARATION_OPTIONS} />
            </Form.Item>

            <Form.Item
              label={
                <div className="admin-official-article-editor__field-label">
                  <span>摘要</span>
                  <span>{summaryLength}/{OFFICIAL_ARTICLE_SUMMARY_MAX_LENGTH}</span>
                </div>
              }
              name="summary"
              rules={[{ max: OFFICIAL_ARTICLE_SUMMARY_MAX_LENGTH, message: `摘要不超过 ${OFFICIAL_ARTICLE_SUMMARY_MAX_LENGTH} 字` }]}
            >
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 5 }}
                maxLength={OFFICIAL_ARTICLE_SUMMARY_MAX_LENGTH}
                placeholder="输入导语或内容摘要"
              />
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
                      placeholder="输入正文"
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

            <div className="admin-form-actions">
              <Button
                disabled={!editorText.trim() || isUploading}
                htmlType="submit"
                loading={isSubmitting}
                type="primary"
              >
                {editId ? "保存文章" : "发布文章"}
              </Button>
            </div>
          </Form>
        </AdminPanel>

        <div className="admin-field-stack">
          <AdminPanel description="提交前核对标题、摘要、封面和正文呈现。" title="实时预览">
            <div className="admin-article-preview admin-official-article-editor__preview">
              <div className="admin-article-preview__cover">
                <button
                  aria-label={coverImage ? "更换封面" : "设置封面"}
                  className="admin-article-preview__cover-trigger"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  title={coverImage ? "更换封面" : "设置封面"}
                  type="button"
                >
                  {previewImageUrl ? (
                    <span className="admin-image-preview">
                      <img alt="官方文章封面" src={previewImageUrl} />
                    </span>
                  ) : (
                    <span className="admin-article-preview__placeholder">未设置封面</span>
                  )}
                </button>
                {coverImage ? (
                  <button
                    aria-label="清除封面"
                    className="admin-article-preview__cover-clear"
                    onClick={() => {
                      setCoverImage(null);
                    }}
                    title="清除封面"
                    type="button"
                  >
                    ×
                  </button>
                ) : null}
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
              <div className="admin-article-preview__meta">{selectedCategoryLabel}</div>
              {watchedSourceLabel.trim() ? (
                <div className="admin-article-preview__meta">
                  来源：
                  {watchedSourceUrl.trim() ? (
                    <a href={watchedSourceUrl.trim()} rel="noreferrer" target="_blank">
                      {watchedSourceLabel.trim()}
                    </a>
                  ) : (
                    watchedSourceLabel.trim()
                  )}
                </div>
              ) : null}
              {watchedDeclarations.length > 0 ? (
                <div className="admin-article-preview__meta">
                  {watchedDeclarations
                    .map(
                      (value) =>
                        DECLARATION_OPTIONS.find((o) => o.value === value)?.label ?? value
                    )
                    .join(' / ')}
                </div>
              ) : null}
              <div className="admin-article-preview__title">{watchedTitle || "文章标题"}</div>
              {watchedSummary.trim() ? (
                <p className="admin-official-article-editor__summary-preview">{watchedSummary.trim()}</p>
              ) : null}
              <AdminRichTextHtml
                className="admin-article-preview__body"
                fallbackHtml="<p>正文预览</p>"
                html={editorHtml}
              />
            </div>
          </AdminPanel>

          {(uploadedImages.length > 0 || uploadedVideos.length > 0) ? (
            <AdminPanel description="移除媒体时会同步从正文中删除对应节点。" title="正文媒体">
              <div className="admin-official-article-editor__media-list">
                {uploadedImages.map((image) => (
                  <div className="admin-official-article-editor__media-item" key={image.id}>
                    <div className="admin-official-article-editor__media-thumb">
                      <img alt={image.fileName ?? image.id} src={image.url} />
                    </div>
                    <div className="admin-official-article-editor__media-copy">
                      <div className="admin-table-title">{image.fileName ?? image.id}</div>
                      <div className="admin-table-subtitle">图片</div>
                    </div>
                    <Button
                      onClick={() => {
                        removeMediaAsset(image.url, "image");
                      }}
                      size="small"
                      type="link"
                    >
                      移除
                    </Button>
                  </div>
                ))}

                {uploadedVideos.map((video) => (
                  <div className="admin-official-article-editor__media-item" key={video.id}>
                    <div className="admin-official-article-editor__media-thumb admin-official-article-editor__media-thumb--video">
                      <span>VIDEO</span>
                    </div>
                    <div className="admin-official-article-editor__media-copy">
                      <div className="admin-table-title">{video.fileName ?? video.id}</div>
                      <div className="admin-table-subtitle">视频</div>
                    </div>
                    <Button
                      onClick={() => {
                        removeMediaAsset(video.url, "video");
                      }}
                      size="small"
                      type="link"
                    >
                      移除
                    </Button>
                  </div>
                ))}
              </div>
            </AdminPanel>
          ) : null}
        </div>
      </div>
    </AdminPage>
  );
}
