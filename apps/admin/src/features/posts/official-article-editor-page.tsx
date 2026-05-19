import type { IDomEditor } from '@wangeditor/editor';
import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, Select, Space } from "antd";
import {
  Suspense,
  lazy,
  startTransition,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState
} from "react";
import { useSearchParams } from "react-router-dom";
import { AiFormatButton } from "../ai/ai-format-button";
import { ImportFileButton } from "../ai/import-file-button";
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
import {
  collectBlobUrls,
  createMediaManager,
  replaceBlobUrls,
  uploadMediaBatch
} from "@feijia/rich-text-editor";
import {
  clearDraftSnapshot,
  loadDraftSnapshot,
  saveDraftSnapshot,
} from "../../lib/uploads/draft-store";

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
  declaration?: string;
};

const DECLARATION_OPTIONS = [
  { label: '原创', value: 'original' },
  { label: 'AI生成', value: 'ai_generated' },
  { label: 'AI辅助创作', value: 'ai_assisted' },
  { label: '转载', value: 'reprinted' },
  { label: '深度合成', value: 'deep_synthesis' }
];

const SOURCE_LABEL_OPTIONS = [
  { label: '飞加官方', value: '飞加官方' },
  { label: '转载媒体', value: '转载媒体' },
  { label: '作者投稿', value: '作者投稿' },
  { label: '行业媒体', value: '行业媒体' },
  { label: '航司官方', value: '航司官方' },
  { label: '其他来源', value: '其他来源' },
];

const SOURCE_URL_MAP: Record<string, string> = {
  '飞加官方': 'https://feijia.com',
};

const OFFICIAL_ARTICLE_SUMMARY_MAX_LENGTH = 120;
const ADMIN_ARTICLE_DRAFT_KEY = "feijia:admin-article-draft";
const ADMIN_AUTO_SAVE_DELAY_MS = 500;

/** Admin 文章编辑器草稿数据类型 */
interface AdminArticleDraftData {
  title: string;
  summary: string;
  editorHtml: string;
  categoryId: string;
  sourceLabel: string | null;
  sourceUrl: string | null;
  declaration: string;
  /** 封面图数据（携带本地 File 用于恢复 blob URL） */
  coverImage: {
    id?: string;
    url: string;
    fileName?: string;
    file?: File;
    isLocal?: boolean;
  } | null;
  /** 按注册顺序的 media blob URL 列表，用于恢复时构造旧→新 URL 映射 */
  mediaBlobUrls: string[];
}

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

function isBlobUrl(url: string) {
  return url.startsWith("blob:");
}

/** 过滤 HTML 中的 file:/// 本地路径（WPS/Word 粘贴残留） */
function stripFileUrls(html: string): string {
  if (!html) {
    return html;
  }
  return html
    .replace(/\b(file:\/\/\/)[^\s"'>]+/gi, "")
    .replace(/src\s*=\s*["']\s*["']\s*/gi, "");
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
  const coverFileRef = useRef<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverImage, setCoverImage] = useState<UploadedMediaAsset | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedMediaAsset[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<UploadedMediaAsset[]>([]);
  const [shouldLoadEditor, setShouldLoadEditor] = useState(false);
  const [editorHtml, setEditorHtml] = useState("");
  const [editorText, setEditorText] = useState("");
  const [editorInstance, setEditorInstance] = useState<IDomEditor | null>(null);
  const watchedTitle = Form.useWatch("title", form) ?? "";
  const watchedSummary = Form.useWatch("summary", form) ?? "";
  const watchedCategoryId = Form.useWatch("contentCategoryId", form);
  const watchedSourceLabel = Form.useWatch("sourceLabel", form) ?? "";
  const watchedSourceUrl = Form.useWatch("sourceUrl", form) ?? "";
  const watchedDeclaration = Form.useWatch("declaration", form) ?? "";

  const mediaManager = useMemo(() => createMediaManager(), []);

  /** 将解析后的 HTML 注入 wangEditor */
  const handleImportHtml = useCallback((html: string) => {
    const editor = editorInstance;
    if (!editor) {
      return;
    }

    const currentHtml = editor.getHtml();
    if (currentHtml.trim() && currentHtml !== '<p><br></p>') {
      editor.dangerouslyInsertHtml(html);
    } else {
      // 通过 DOM 设置内容保留列表结构，
      // wangEditor 的 setHtml 会剥离 ol/ul/li 标签
      const editable = document.getElementById(editor.id);
      if (editable) {
        editable.innerHTML = html;
        editable.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    editor.focus();
  }, [editorInstance]);

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
    form.setFieldValue('declaration', item.declaration?.value ?? '');
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

  /** 创建模式下从 IndexedDB 恢复草稿 */
  useEffect(() => {
    if (editId) {
      return;
    }

    void loadDraftSnapshot<AdminArticleDraftData>(ADMIN_ARTICLE_DRAFT_KEY)
      .then(async (snapshot) => {
        if (!snapshot) {
          return;
        }

        const parsed = snapshot.data;

        // 恢复 mediaManager 中的文件，获取新的 blob URL
        const restoredFiles = await mediaManager.restore(ADMIN_ARTICLE_DRAFT_KEY);
        const newBlobUrls = Array.from(restoredFiles.keys());

        // 构建旧→新 blob URL 映射
        const oldBlobUrls: string[] = parsed.mediaBlobUrls ?? [];
        const blobUrlMapping = new Map<string, string>();
        oldBlobUrls.forEach((oldUrl, i) => {
          if (i < newBlobUrls.length) {
            blobUrlMapping.set(oldUrl, newBlobUrls[i]);
          }
        });

        // 恢复封面图（重建 blob URL）
        const restoredCover = parsed.coverImage;
        if (restoredCover?.isLocal && restoredCover.file) {
          coverFileRef.current = restoredCover.file;
          const newBlobUrl = URL.createObjectURL(restoredCover.file);
          setCoverImage({
            id: restoredCover.id ?? "",
            url: newBlobUrl,
            fileName: restoredCover.fileName ?? restoredCover.file.name,
          });
        } else if (restoredCover) {
          setCoverImage({
            id: restoredCover.id ?? "",
            url: restoredCover.url,
            fileName: restoredCover.fileName ?? "",
          });
        }

        // 还原表单字段
        form.setFieldsValue({
          title: parsed.title,
          summary: parsed.summary,
          contentCategoryId: parsed.categoryId || undefined,
          sourceLabel: parsed.sourceLabel ?? undefined,
          sourceUrl: parsed.sourceUrl ?? undefined,
          declaration: parsed.declaration || undefined,
        });

        // 替换 HTML 中的旧 blob URL 为新 blob URL
        const restoredHtml = replaceBlobUrls(parsed.editorHtml ?? "", blobUrlMapping);
        setEditorHtml(stripFileUrls(restoredHtml));
        setEditorText("");
      })
      .catch(() => {
        // 草稿恢复失败不阻塞页面使用
      });
  }, [editId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  /** 持久化当前编辑器状态到 IndexedDB */
  const persistDraft = useCallback(async () => {
    const allFiles = mediaManager.getAllFiles();
    const mediaBlobUrls = Array.from(allFiles.keys());
    const coverFile = coverFileRef.current;

    await saveDraftSnapshot<AdminArticleDraftData>({
      key: ADMIN_ARTICLE_DRAFT_KEY,
      version: 1,
      updatedAt: Date.now(),
      data: {
        title: watchedTitle,
        summary: watchedSummary,
        editorHtml,
        categoryId: watchedCategoryId ?? "",
        sourceLabel: watchedSourceLabel,
        sourceUrl: watchedSourceUrl,
        declaration: watchedDeclaration,
        coverImage: coverFile && coverImage
          ? { id: coverImage.id, url: coverImage.url, fileName: coverImage.fileName, file: coverFile, isLocal: true }
          : coverImage,
        mediaBlobUrls,
      },
      filesBySlot: {},
    });

    await mediaManager.persist(ADMIN_ARTICLE_DRAFT_KEY);
  }, [
    coverImage,
    editorHtml,
    mediaManager,
    watchedCategoryId,
    watchedDeclaration,
    watchedSourceLabel,
    watchedSourceUrl,
    watchedSummary,
    watchedTitle,
  ]);

  /** 创建模式下自动保存草稿（500ms debounce） */
  useEffect(() => {
    if (editId) {
      return;
    }

    const timer = window.setTimeout(() => {
      void persistDraft().catch(() => {
        // 草稿持久化尽力而为，不应阻塞书写
      });
    }, ADMIN_AUTO_SAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [editId, persistDraft]);

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
    if (coverImage && isBlobUrl(coverImage.url)) {
      URL.revokeObjectURL(coverImage.url);
    }
    setCoverImage(null);
    coverFileRef.current = null;
    setUploadedImages([]);
    setUploadedVideos([]);
    setEditorHtml("");
    setEditorText("");
    void mediaManager.clear("admin:official-article");

    if (clearEdit) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("edit");
        return next;
      });
    }
  }

  function handleCoverSelect(file: File | null) {
    if (!file) {
      return;
    }

    // Clean up previous blob URL if any
    if (coverImage && isBlobUrl(coverImage.url)) {
      URL.revokeObjectURL(coverImage.url);
    }

    coverFileRef.current = file;
    const blobUrl = URL.createObjectURL(file);
    setCoverImage({ id: "", url: blobUrl, fileName: file.name });
    setStatusMessage("封面已选择，发布时上传。");
  }

  async function handleSubmit(values: OfficialArticleEditorFormValues) {
    setIsSubmitting(true);
    setError(null);
    setStatusMessage(null);

    try {
      // Step 1: Upload cover image if it is a local file (blob URL)
      let coverId = "";
      if (coverImage) {
        if (coverFileRef.current) {
          const response = await apiClient.uploadPostImage(coverFileRef.current);
          coverId = response.item.id;
          coverFileRef.current = null;
        } else {
          // Existing uploaded cover image from edit mode
          coverId = coverImage.id ?? "";
        }
      }

      // Step 2: Collect blob URLs from editor HTML
      const blobUrls = collectBlobUrls(editorHtml);

      // Step 3: Get pending files from mediaManager
      const pendingFiles = new Map<string, File>();
      for (const blobUrl of blobUrls) {
        const file = mediaManager.getFile(blobUrl);
        if (file) {
          pendingFiles.set(blobUrl, file);
        }
      }

      // Step 4: Batch upload pending files
      const { urlMapping, imageIds: newImageIds, videoIds: newVideoIds } = await uploadMediaBatch(
        pendingFiles,
        (file) =>
          apiClient.uploadPostImage(file).then((r) => ({
            id: r.item.id,
            url: r.item.url,
            fileName: r.item.fileName ?? file.name
          })),
        (file) =>
          apiClient.uploadPostVideo(file).then((r) => ({
            id: r.item.id,
            url: r.item.url,
            fileName: r.item.fileName ?? file.name
          }))
      );

      // Step 5: Replace blob URLs in HTML with real URLs
      const finalHtml = replaceBlobUrls(editorHtml, urlMapping);

      // Step 6: Build document and payload
      const document = buildOfficialArticleDocument(values.summary, finalHtml);
      const payload = buildOfficialArticlePayload(
        {
          title: values.title,
          contentCategoryId: values.contentCategoryId,
          sourceLabel: values.sourceLabel,
          sourceUrl: values.sourceUrl,
          declaration: values.declaration,
          content: document.plainText,
          contentHtml: document.contentHtml
        } satisfies OfficialArticleFormValues,
        Array.from(new Set([coverId, ...uploadedImages.map((item) => item.id), ...newImageIds].filter(Boolean))) as string[],
        [...uploadedVideos.map((item) => item.id), ...newVideoIds]
      );

      // Step 7: Update editorHtml with real URLs before clearing mediaManager
      setEditorHtml(finalHtml);
      setEditorText(document.plainText);

      // Step 8: Submit
      if (editId) {
        await apiClient.updateAdminOfficialArticle(editId, payload);
        setStatusMessage("官方文章已更新。");
      } else {
        await apiClient.createOfficialArticle(payload);
        setStatusMessage("官方文章已发布。");
        await clearDraftSnapshot(ADMIN_ARTICLE_DRAFT_KEY);
        resetFormState(false);
        return;
      }

      // Step 9: Clear draft snapshot and media manager after successful update
      await clearDraftSnapshot(ADMIN_ARTICLE_DRAFT_KEY);
      await mediaManager.clear("admin:official-article");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "保存官方文章失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  const localMediaEntries = useMemo(() => {
    const blobUrls = new Set(collectBlobUrls(editorHtml));
    const images: Array<{ blobUrl: string; fileName: string }> = [];
    const videos: Array<{ blobUrl: string; fileName: string }> = [];

    for (const blobUrl of blobUrls) {
      const file = mediaManager.getFile(blobUrl);
      if (!file) {
        continue;
      }

      const entry = { blobUrl, fileName: file.name };
      if (file.type.startsWith("video/")) {
        videos.push(entry);
      } else {
        images.push(entry);
      }
    }

    return { images, videos };
  }, [editorHtml, mediaManager]);

  const hasLocalMedia = localMediaEntries.images.length > 0 || localMediaEntries.videos.length > 0;
  const hasExistingMedia = uploadedImages.length > 0 || uploadedVideos.length > 0;

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
              <strong>{localMediaEntries.images.length + uploadedImages.length} 图 / {localMediaEntries.videos.length + uploadedVideos.length} 视频</strong>
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

            <Form.Item
              label="内容声明"
              name="declaration"
              rules={[{ required: true, message: '请选择内容声明' }]}
            >
              <Select options={DECLARATION_OPTIONS} placeholder="选择内容声明" />
            </Form.Item>

            {watchedDeclaration && watchedDeclaration !== 'original' ? (
              <>
                <Form.Item
                  label="声明来源"
                  name="sourceLabel"
                  rules={watchedDeclaration === 'reprinted' ? [{ required: true, message: '转载内容必须填写来源名称' }] : undefined}
                >
                  <Select
                    onChange={(value) => {
                      const defaultUrl = SOURCE_URL_MAP[value];
                      if (defaultUrl !== undefined) {
                        form.setFieldValue('sourceUrl', defaultUrl);
                      }
                    }}
                    options={SOURCE_LABEL_OPTIONS}
                    placeholder="选择来源名称"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label="来源链接"
                  name="sourceUrl"
                  rules={[{ type: "url", message: "请输入合法 URL" }]}
                >
                  <Input placeholder="https://example.com/source" size="large" />
                </Form.Item>
              </>
            ) : null}

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

            <div className="admin-official-article-editor__ai-toolbar" style={{ marginBottom: 8 }}>
              <Space size="small">
                <AiFormatButton editor={editorInstance} />
                <ImportFileButton
                  disabled={!editorInstance}
                  onImport={handleImportHtml}
                />
              </Space>
            </div>

            <Form.Item label="正文" required>
              <div ref={editorViewportRef}>
                {shouldLoadEditor ? (
                  <Suspense fallback={<RichTextEditorFallback loading />}>
                    <LazyAdminRichTextEditor
                      mediaManager={mediaManager}
                      onCreated={setEditorInstance}
                      onChange={(value) => {
                        setEditorHtml(value.html);
                        setEditorText(value.plainText);
                      }}
                      placeholder="输入正文"
                      value={editorHtml}
                      variant="admin"
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
                disabled={!editorText.trim()}
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
                      if (isBlobUrl(coverImage.url)) {
                        URL.revokeObjectURL(coverImage.url);
                      }
                      coverFileRef.current = null;
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
                    handleCoverSelect(event.target.files?.[0] ?? null);
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
              {watchedDeclaration ? (
                <div className="admin-article-preview__meta">
                  {DECLARATION_OPTIONS.find((o) => o.value === watchedDeclaration)?.label ?? watchedDeclaration}
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

          {(hasLocalMedia || hasExistingMedia) ? (
            <AdminPanel description="移除媒体时会同步从正文中删除对应节点。本地文件在发布时统一上传。" title="正文媒体">
              <div className="admin-official-article-editor__media-list">
                {localMediaEntries.images.map((image) => (
                  <div className="admin-official-article-editor__media-item" key={image.blobUrl}>
                    <div className="admin-official-article-editor__media-thumb">
                      <img alt={image.fileName} src={image.blobUrl} />
                    </div>
                    <div className="admin-official-article-editor__media-copy">
                      <div className="admin-table-title">{image.fileName}</div>
                      <div className="admin-table-subtitle">图片（发布时上传）</div>
                    </div>
                    <Button
                      onClick={() => {
                        removeMediaAsset(image.blobUrl, "image");
                      }}
                      size="small"
                      type="link"
                    >
                      移除
                    </Button>
                  </div>
                ))}

                {localMediaEntries.videos.map((video) => (
                  <div className="admin-official-article-editor__media-item" key={video.blobUrl}>
                    <div className="admin-official-article-editor__media-thumb admin-official-article-editor__media-thumb--video">
                      <span>VIDEO</span>
                    </div>
                    <div className="admin-official-article-editor__media-copy">
                      <div className="admin-table-title">{video.fileName}</div>
                      <div className="admin-table-subtitle">视频（发布时上传）</div>
                    </div>
                    <Button
                      onClick={() => {
                        removeMediaAsset(video.blobUrl, "video");
                      }}
                      size="small"
                      type="link"
                    >
                      移除
                    </Button>
                  </div>
                ))}

                {uploadedImages.map((image) => (
                  <div className="admin-official-article-editor__media-item" key={image.id}>
                    <div className="admin-official-article-editor__media-thumb">
                      <img alt={image.fileName ?? image.id} src={image.url} />
                    </div>
                    <div className="admin-official-article-editor__media-copy">
                      <div className="admin-table-title">{image.fileName ?? image.id}</div>
                      <div className="admin-table-subtitle">图片（已上传）</div>
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
                      <div className="admin-table-subtitle">视频（已上传）</div>
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
