import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { Clock3Icon, PencilLineIcon, SaveIcon, SendHorizonalIcon, SparklesIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IDomEditor } from "@wangeditor/editor";
import { AiFormatButton } from "../features/ai/ai-format-button";
import { AiChatPanel } from "../features/ai/ai-chat-panel";
import { ImportFileButton } from "../features/ai/import-file-button";
import { AiSummaryPanel } from "../features/ai/ai-summary-panel";
import { useAiSummary } from "../features/ai/use-ai-summary";
import { useAuthStore } from "../features/auth/auth-store";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { RichTextEditor } from "@/components/rich-text-editor";
import { PublishArticlePageSkeleton } from "@/components/page-skeletons";
import { PublishShell } from "@/components/publish-shell";
import { SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { extractPlainTextFromHtml } from "@/components/rich-text-editor-helpers";
import { createMediaManager, replaceBlobUrls, uploadMediaBatch } from "@feijia/rich-text-editor";
import { sanitizeHtml } from "@/lib/sanitize";
import { clearDraftSnapshot, loadDraftSnapshot, saveDraftSnapshot } from "@/lib/uploads/draft-store";
import {
  restorePersistedPreviewAsset,
  revokePreviewAsset
} from "@/lib/uploads/local-preview-assets";
import { cn } from "@/lib/utils";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { apiClient } from "../lib/api-client";
import { buildPublishStatusPath } from "../lib/web-routes";
import {
  formatArticleMediaSummary,
  replaceArticleLocalMediaUrls
} from "./publish-article-page-helpers";

const ARTICLE_DRAFT_KEY = "feijia:article-draft";
const ARTICLE_TITLE_MAX_LENGTH = 64;
const ARTICLE_SUMMARY_MAX_LENGTH = 120;
const AUTO_SAVE_DELAY_MS = 500;

/** 生成简易唯一 ID（避免 crypto.randomUUID 兼容性问题） */
function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type UploadedImage = {
  id: string;
  url: string;
  fileName?: string;
  file?: File;
  isLocal?: boolean;
};

type UploadedVideo = {
  id: string;
  url: string;
  fileName?: string;
  file?: File;
  isLocal?: boolean;
};

type ArticleDraftData = {
  title: string;
  summary: string;
  editorHtml: string;
  categoryId: string;
  sourceLabel: string;
  sourceUrl: string;
  declaration: string;
  coverImage: UploadedImage | null;
  /** 已注册 blob URL 列表（保持注册顺序），用于恢复时构建旧→新 URL 映射 */
  mediaBlobUrls: string[];
};

const DECLARATION_OPTIONS = [
  { label: '原创', value: 'original' },
  { label: '含AI生成内容', value: 'ai_generated' },
  { label: '转载', value: 'reprinted' },
] as const;

const SOURCE_LABEL_OPTIONS = [
  { label: '转载', value: '转载' },
] as const;

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildArticleHtml(summary: string, editorHtml: string) {
  const summaryBlock = summary.trim() ? `<p><strong>${escapeHtml(summary.trim())}</strong></p>` : "";
  return [summaryBlock, editorHtml.trim()].filter(Boolean).join("");
}

function removeMediaReferenceFromHtml(html: string, mediaUrl: string) {
  if (!html.trim() || !mediaUrl) {
    return html;
  }

  if (typeof DOMParser === "undefined") {
    return html;
  }

  const documentNode = new DOMParser().parseFromString(html, "text/html");

  documentNode.querySelectorAll(`img[src="${mediaUrl}"]`).forEach((node) => {
    node.remove();
  });

  documentNode.querySelectorAll(`video[src="${mediaUrl}"]`).forEach((node) => {
    const figure = node.closest("figure[data-video-block]");
    if (figure) {
      figure.remove();
      return;
    }

    node.remove();
  });

  documentNode.querySelectorAll(`source[src="${mediaUrl}"]`).forEach((node) => {
    const video = node.closest("video");
    const figure = node.closest("figure[data-video-block]");
    if (figure) {
      figure.remove();
      return;
    }

    if (video) {
      video.remove();
      return;
    }

    node.remove();
  });

  return documentNode.body.innerHTML.trim();
}

/** 过滤 HTML 中的 file:/// 本地路径（WPS/Word 粘贴残留） */
function stripFileUrls(html: string): string {
  if (!html) return html;
  // 移除 src="file:///..." 和 src='file:///...'
  return html.replace(/\b(file:\/\/\/)[^\s"'>]+/gi, "").replace(/src\s*=\s*["']\s*["']\s*/gi, "");
}

function formatDraftSavedAt(timestamp: number | null) {
  if (!timestamp) {
    return "草稿保存在当前浏览器";
  }

  return `已保存到本地 ${new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

/**
 * Article publish/edit workspace.
 *
 * Boundaries:
 * - Owns browser draft persistence, local preview asset lifecycle and the
 *   article composition workflow for title/summary/body/media.
 * - Defers all persistence and moderation rules to `apiClient`; the route
 *   only uploads local media first, then submits the final payload.
 * - Keeps create and edit in one entry so rejected articles can be revised
 *   without branching into another screen.
 */
export function PublishArticlePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const promptLogin = useLoginPrompt();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const coverImageRef = useRef<UploadedImage | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [editorHtml, setEditorHtml] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [declaration, setDeclaration] = useState("");
  const [coverImage, setCoverImage] = useState<UploadedImage | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const editorRef = useRef<IDomEditor | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiChatWidth, setAiChatWidth] = useState(320);
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated";

  const handleEditorCreated = useCallback((editor: IDomEditor) => {
    editorRef.current = editor;
    setEditorReady(true);
  }, []);

  /** AI 聊天面板拖拽调整宽度 */
  const handleAiChatResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = aiChatWidth;

      const onMove = (ev: MouseEvent) => {
        const newWidth = Math.max(280, Math.min(480, startWidth + (startX - ev.clientX)));
        setAiChatWidth(newWidth);
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [aiChatWidth]
  );
  const [hasRestoredDraftSnapshot, setHasRestoredDraftSnapshot] = useState(false);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<number | null>(null);
  const mediaManager = useMemo(() => createMediaManager(), []);
  const aiSummary = useAiSummary();

  const categoriesQuery = useQuery({
    queryKey: ["publish-article-categories"],
    queryFn: () => apiClient.listContentCategories()
  });
  const detailQuery = useQuery({
    queryKey: ["publish-article-edit", editId],
    queryFn: () => {
      if (!editId) {
        throw new Error("Missing edit id");
      }
      return apiClient.getPostDetail(editId);
    },
    enabled: Boolean(editId)
  });

  useEffect(() => {
    if (editId) {
      setHasRestoredDraftSnapshot(false);
      setLastDraftSavedAt(null);
      return;
    }

    setHasRestoredDraftSnapshot(false);

    void loadDraftSnapshot<ArticleDraftData>(ARTICLE_DRAFT_KEY)
      .then(async (snapshot) => {
        if (!snapshot) {
          return;
        }

        setHasRestoredDraftSnapshot(true);
        setLastDraftSavedAt(snapshot.updatedAt);

        const parsed = snapshot.data;
        const restoredCoverImage = restorePersistedPreviewAsset(parsed.coverImage ?? null);

        // Restore mediaManager files from IndexedDB
        const restoredFiles = await mediaManager.restore(ARTICLE_DRAFT_KEY);
        const newBlobUrls = Array.from(restoredFiles.keys());

        // Build old→new blob URL mapping using saved registration order
        const oldBlobUrls: string[] = parsed.mediaBlobUrls ?? [];
        const blobUrlMapping: Record<string, string> = {};
        oldBlobUrls.forEach((oldUrl, i) => {
          if (i < newBlobUrls.length) {
            blobUrlMapping[oldUrl] = newBlobUrls[i];
          }
        });

        setTitle(parsed.title ?? "");
        setSummary(parsed.summary ?? "");
        setEditorHtml(
          stripFileUrls(
            replaceArticleLocalMediaUrls(parsed.editorHtml ?? "", blobUrlMapping).html
          )
        );
        setCategoryId(parsed.categoryId ?? "");
        setSourceLabel(parsed.sourceLabel ?? "");
        setSourceUrl(parsed.sourceUrl ?? "");
        setDeclaration(parsed.declaration ?? "");
        setCoverImage(restoredCoverImage?.asset ?? null);
      })
      .catch(() => {
        // Keep the workspace usable even when draft restore fails.
      });
  }, [editId, mediaManager]);

  useEffect(() => {
    coverImageRef.current = coverImage;
  }, [coverImage]);

  useEffect(() => {
    return () => {
      revokePreviewAsset(coverImageRef.current);
      // Release any remaining blob URLs tracked by mediaManager
      for (const blobUrl of mediaManager.getAllFiles().keys()) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [mediaManager]);

  useEffect(() => {
    if (!detailQuery.data?.item) {
      return;
    }

    const item = detailQuery.data.item;
    setTitle(item.title);
    setSummary("");
    setEditorHtml(stripFileUrls(item.contentHtml ?? ""));
    setCategoryId(item.contentCategory?.id ?? "");
    setSourceLabel(item.source?.label ?? "");
    setSourceUrl(item.source?.url ?? "");
    setDeclaration(item.declaration?.value ?? "");
    setCoverImage(
      item.images[0]
        ? {
            id: item.images[0].id,
            url: item.images[0].url,
            fileName: item.images[0].fileName
          }
        : null
    );
    setUploadedImages(
      item.images.map((image) => ({
        id: image.id,
        url: image.url,
        fileName: image.fileName
      }))
    );
    setUploadedVideos(
      item.videos.map((video) => ({
        id: video.id,
        url: video.url,
        fileName: video.fileName
      }))
    );
  }, [detailQuery.data?.item]);

  useEffect(() => {
    if (!categoryId && categoriesQuery.data?.items[0]?.id) {
      setCategoryId(categoriesQuery.data.items[0].id);
    }
  }, [categoryId, categoriesQuery.data?.items]);

  const articleHtml = useMemo(() => buildArticleHtml(summary, editorHtml), [summary, editorHtml]);
  const articleText = useMemo(
    () => [summary.trim(), extractPlainTextFromHtml(editorHtml)].filter(Boolean).join("\n\n"),
    [summary, editorHtml]
  );
  const editorPlainText = useMemo(
    () => extractPlainTextFromHtml(editorHtml),
    [editorHtml]
  );
  const articleCharacterCount = useMemo(
    () => articleText.replace(/\s+/g, "").length,
    [articleText]
  );
  const coverUrl = coverImage?.url ?? null;
  const selectedCategory =
    categoriesQuery.data?.items.find((item) => item.id === categoryId) ?? null;
  const sourceLabelValue = sourceLabel.trim();
  const sourceUrlValue = sourceUrl.trim();
  const canSubmit =
    Boolean(title.trim()) &&
    Boolean(articleText.trim()) &&
    Boolean(categoryId) &&
    Boolean(coverImage) &&
    !isPublishing;
  const draftStatusText = formatDraftSavedAt(lastDraftSavedAt);
  const mediaSummaryText = useMemo(
    () =>
      formatArticleMediaSummary({
        imageCount: uploadedImages.length,
        videoCount: uploadedVideos.length
      }),
    [uploadedImages.length, uploadedVideos.length]
  );
  const hasInsertedMedia = uploadedImages.length > 0 || uploadedVideos.length > 0;

  /** 在创建模式下，从 mediaManager 同步媒体资源到显示清单 */
  useEffect(() => {
    // 编辑模式下由 detailQuery 管理清单，不同步
    if (editId) {
      return;
    }

    const files = mediaManager.getAllFiles();
    const images: UploadedImage[] = [];
    const videos: UploadedVideo[] = [];

    for (const [blobUrl, file] of files) {
      // 只显示当前在编辑器 HTML 中的 blob URL
      if (!editorHtml.includes(blobUrl)) {
        continue;
      }
      const entry = { id: blobUrl, url: blobUrl, fileName: file.name, isLocal: true as const };
      if (file.type.startsWith("video/")) {
        videos.push(entry as unknown as UploadedVideo);
      } else {
        images.push(entry);
      }
    }

    setUploadedImages(images);
    setUploadedVideos(videos);
  }, [editId, editorHtml, mediaManager]);

  const persistDraft = useCallback(async () => {
    const savedAt = Date.now();

    // 获取当前 mediaManager 中所有 blob URL（保持注册顺序）
    const allFiles = mediaManager.getAllFiles();
    const mediaBlobUrls = Array.from(allFiles.keys());

    await saveDraftSnapshot<ArticleDraftData>({
      key: ARTICLE_DRAFT_KEY,
      version: 1,
      updatedAt: savedAt,
      data: {
        title,
        summary,
        editorHtml,
        categoryId,
        sourceLabel,
        sourceUrl,
        declaration,
        coverImage,
        mediaBlobUrls
      },
      filesBySlot: {}
    });

    await mediaManager.persist(ARTICLE_DRAFT_KEY);
    setLastDraftSavedAt(savedAt);
  }, [
    categoryId,
    coverImage,
    declaration,
    editorHtml,
    mediaManager,
    sourceLabel,
    sourceUrl,
    summary,
    title
  ]);

  useEffect(() => {
    if (editId) {
      return;
    }

    const timer = window.setTimeout(() => {
      void persistDraft().catch(() => {
        // Draft persistence is best-effort and should not block writing.
      });
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [editId, persistDraft]);

  async function uploadCoverImage(file: File | null) {
    if (!file) {
      return;
    }

    setError(null);
    setCoverImage((current) => {
      if (current?.isLocal) {
        URL.revokeObjectURL(current.url);
      }

      return {
        id: uid("local-cover"),
        url: URL.createObjectURL(file),
        fileName: file.name,
        file,
        isLocal: true
      };
    });

    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
  }

  function handleRemoveImage(image: UploadedImage) {
    if (image.isLocal) {
      URL.revokeObjectURL(image.url);
    }
    setUploadedImages((current) => current.filter((item) => item.id !== image.id));
    setEditorHtml((current) => removeMediaReferenceFromHtml(current, image.url));
  }

  function handleRemoveVideo(video: UploadedVideo) {
    if (video.isLocal) {
      URL.revokeObjectURL(video.url);
    }
    setUploadedVideos((current) => current.filter((item) => item.id !== video.id));
    setEditorHtml((current) => removeMediaReferenceFromHtml(current, video.url));
  }

  async function handleSubmit() {
    if (
      !promptLogin({
        title: "登录后才能发布文章",
        description: "发布文章前请先登录。"
      })
    ) {
      return;
    }

    if (!coverImage) {
      setError("请先上传封面。");
      return;
    }

    setError(null);
    setIsPublishing(true);

    try {
      // Step 1: 上传封面图（保留原流程）
      let submitCoverImage = coverImage;
      if (coverImage.file) {
        const uploaded = await apiClient.uploadPostImage(coverImage.file);
        submitCoverImage = {
          id: uploaded.item.id,
          url: uploaded.item.url,
          fileName: uploaded.item.fileName
        };
      }

      // Step 2: 批量上传 mediaManager 中的所有本地文件
      const allFiles = mediaManager.getAllFiles();
      let batchImageIds: string[] = [];
      let batchVideoIds: string[] = [];
      let urlMapping = new Map<string, string>();

      if (allFiles.size > 0) {
        const batchResult = await uploadMediaBatch(
          allFiles,
          async (file) => {
            const result = await apiClient.uploadPostImage(file);
            return {
              id: result.item.id,
              url: result.item.url,
              fileName: result.item.fileName ?? file.name,
              mimeType: file.type
            };
          },
          async (file) => {
            const result = await apiClient.uploadPostVideo(file);
            return {
              id: result.item.id,
              url: result.item.url,
              fileName: result.item.fileName ?? file.name,
              mimeType: file.type
            };
          }
        );

        if (batchResult.errors.length > 0) {
          throw new Error(`部分媒体上传失败: ${batchResult.errors[0].message}`);
        }

        urlMapping = batchResult.urlMapping;
        batchImageIds = batchResult.imageIds;
        batchVideoIds = batchResult.videoIds;
      }

      // Step 3: 替换文章 HTML 中的 blob URL
      const replacedHtml = replaceBlobUrls(articleHtml, urlMapping);

      // Step 4: 组装图片/视频 ID 列表
      // 编辑模式：包含已有的服务端媒体 ID
      const existingImageIds = uploadedImages.filter((img) => !img.isLocal).map((img) => img.id);
      const existingVideoIds = uploadedVideos.filter((vid) => !vid.isLocal).map((vid) => vid.id);

      const imageIds = Array.from(
        new Set(
          [submitCoverImage?.id, ...batchImageIds, ...existingImageIds].filter(Boolean)
        )
      );
      const videoIds = [...batchVideoIds, ...existingVideoIds];

      const payload = {
        type: "article" as const,
        title,
        content: articleText,
        contentHtml: replacedHtml,
        contentCategoryId: categoryId,
        sourceLabel,
        sourceUrl,
        declaration,
        imageIds,
        videoIds
      };

      const response = editId
        ? await apiClient.updatePost(editId, payload)
        : await apiClient.createPost(payload);

      await clearDraftSnapshot(ARTICLE_DRAFT_KEY);
      await mediaManager.clear(ARTICLE_DRAFT_KEY);
      setLastDraftSavedAt(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["home-shell-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["post-detail", response.item.id] })
      ]);

      void navigate(buildPublishStatusPath("article", response.item.id), {
        state: {
          title,
          description: summary,
          imageUrl: submitCoverImage?.url ?? null
        }
      });
    } catch (value: unknown) {
      setError(value instanceof Error ? value.message : "文章发布失败");
    } finally {
      setIsPublishing(false);
    }
  }

  if (categoriesQuery.isLoading || detailQuery.isLoading) {
    return <PublishArticlePageSkeleton />;
  }

  return (
    <>
    <PublishShell
      eyebrow="文章"
      gridClassName="gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]"
      main={
        <>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>文章发布失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {detailQuery.data?.item.rejectionReason ? (
            <Alert>
              <AlertTitle>驳回原因</AlertTitle>
              <AlertDescription>{detailQuery.data.item.rejectionReason}</AlertDescription>
            </Alert>
          ) : null}

          <SitePanel>
            <SitePanelBody className="space-y-6 md:space-y-7">
              <input
                accept="image/*"
                aria-label="选择文章封面图片"
                className="hidden"
                onChange={(event) => {
                  void uploadCoverImage(event.target.files?.[0] ?? null);
                }}
                ref={coverInputRef}
                type="file"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-2 rounded-full bg-surface-1 px-3 py-1.5">
                    <Clock3Icon className="size-3.5" />
                    {draftStatusText}
                  </span>
                  {hasRestoredDraftSnapshot ? (
                    <span className="rounded-full bg-primary/10 px-3 py-1.5 text-primary">已恢复草稿</span>
                  ) : null}
                </div>
                {selectedCategory?.name ? (
                  <div className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-primary">
                    {selectedCategory.name}
                  </div>
                ) : null}
              </div>

              <div className="space-y-5">
                <Input
                  className="h-auto min-h-14 border-0 px-0 py-2 text-[2rem] leading-tight font-semibold tracking-normal break-words overflow-wrap-anywhere shadow-none placeholder:text-muted-foreground/72 focus-visible:ring-0 md:text-[2.625rem]"
                  maxLength={ARTICLE_TITLE_MAX_LENGTH}
                  onChange={(event) => setTitle(event.target.value.slice(0, ARTICLE_TITLE_MAX_LENGTH))}
                  placeholder="标题"
                  value={title}
                />

                <div className="space-y-2">
                  <div className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">栏目</div>
                  <div className="flex flex-wrap gap-2">
                    {categoriesQuery.data?.items.map((item) => (
                      <button
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[0.82rem] transition",
                          categoryId === item.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/70 text-foreground/72 hover:border-primary/24 hover:text-foreground"
                        )}
                        key={item.id}
                        onClick={() => setCategoryId(item.id)}
                        type="button"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">摘要</div>
                    <div className="flex items-center gap-2">
                      <Button
                        disabled={aiSummary.isLoading || !editorPlainText.trim()}
                        onClick={() => {
                          aiSummary.generate({
                            postId: editId || 'draft',
                            content: editorPlainText.slice(0, 4000)
                          });
                        }}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <SparklesIcon data-icon="inline-start" />
                        {aiSummary.isLoading ? '生成中...' : 'AI 生成摘要'}
                      </Button>
                      <div className="text-xs text-muted-foreground">{summary.length}/{ARTICLE_SUMMARY_MAX_LENGTH}</div>
                    </div>
                  </div>
                  <Textarea
                    className="min-h-28 resize-none border-0 bg-surface-1/72 px-4 py-3 shadow-none placeholder:text-muted-foreground/72 focus-visible:ring-0"
                    maxLength={ARTICLE_SUMMARY_MAX_LENGTH}
                    onChange={(event) => setSummary(event.target.value.slice(0, ARTICLE_SUMMARY_MAX_LENGTH))}
                    placeholder="摘要（可选）"
                    value={summary}
                  />
                  {(aiSummary.summary || aiSummary.isLoading || aiSummary.error) ? (
                    <AiSummaryPanel
                      cached={aiSummary.cached}
                      className="mt-2"
                      disabled={aiSummary.isLoading}
                      error={aiSummary.error?.message ?? null}
                      isLoading={aiSummary.isLoading}
                      onAdopt={(raw) => {
                        const truncated = raw.slice(0, ARTICLE_SUMMARY_MAX_LENGTH);
                        setSummary(truncated);
                      }}
                      onRegenerate={() => {
                        aiSummary.reset();
                        aiSummary.generate({
                          postId: editId || 'draft',
                          content: editorPlainText.slice(0, 4000)
                        });
                      }}
                      summary={aiSummary.summary}
                    />
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">声明</div>
                  <select
                    className="rounded-full border border-border/70 bg-surface-1 px-3 py-1.5 text-[0.82rem] text-foreground/82 focus:border-primary focus:outline-none"
                    onChange={(e) => setDeclaration(e.target.value)}
                    value={declaration}
                  >
                    <option value="">不设置</option>
                    {DECLARATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">来源（可选）</div>
                  <select
                    className="rounded-full border border-border/70 bg-surface-1 px-3 py-1.5 text-[0.82rem] text-foreground/82 focus:border-primary focus:outline-none"
                    onChange={(e) => setSourceLabel(e.target.value)}
                    value={sourceLabel}
                  >
                    <option value="">不设置</option>
                    {SOURCE_LABEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {sourceLabel ? (
                    <Input
                      className="mt-2"
                      inputMode="url"
                      onChange={(event) => setSourceUrl(event.target.value)}
                      placeholder="链接（可选）"
                      value={sourceUrl}
                    />
                  ) : null}
                </div>

                <div className="flex justify-end gap-2">
                  <AiFormatButton editor={editorRef.current} />
                  <ImportFileButton editor={editorRef.current} />
                </div>

                <RichTextEditor
                  onChange={({ html }) => setEditorHtml(html)}
                  mediaManager={mediaManager}
                  onCreated={handleEditorCreated}
                  placeholder="开始写作"
                  value={editorHtml}
                  variant="web"
                />
              </div>

              {hasInsertedMedia ? (
                <div className="space-y-4 border-t border-border/60 pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-medium text-foreground">媒体</div>
                    <div className="text-xs text-muted-foreground">{mediaSummaryText}</div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    {uploadedImages.length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-foreground/72">图片</div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {uploadedImages.map((image) => (
                            <div className="relative overflow-hidden rounded-[0.9rem] border border-border/70" key={image.id}>
                              <img alt={image.fileName ?? "article"} className="h-32 w-full object-cover" src={image.url} />
                              <button
                                className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white"
                                onClick={() => handleRemoveImage(image)}
                                type="button"
                              >
                                <XIcon className="size-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {uploadedVideos.length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-foreground/72">视频</div>
                        <div className="grid gap-3">
                          {uploadedVideos.map((video) => (
                            <div className="relative overflow-hidden rounded-[0.9rem] border border-border/70 bg-slate-950" key={video.id}>
                              <video className="h-40 w-full object-cover" controls preload="metadata" src={video.url} />
                              <button
                                className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white"
                                onClick={() => handleRemoveVideo(video)}
                                type="button"
                              >
                                <XIcon className="size-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </SitePanelBody>
          </SitePanel>
        </>
      }
      aside={
        <SitePanel variant="muted">
          <SitePanelBody className="space-y-5 xl:sticky xl:top-[5.25rem]">
            <div className="space-y-1">
              <div className="text-sm uppercase tracking-[0.18em] text-muted-foreground">发布</div>
              <div className="text-sm text-muted-foreground">
                {selectedCategory?.name ? selectedCategory.name : "请选择栏目"}
              </div>
            </div>

            {coverUrl ? (
              <button
                aria-label="更换文章封面"
                className="group relative block w-full overflow-hidden rounded-[0.9rem] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                onClick={() => coverInputRef.current?.click()}
                type="button"
              >
                <img alt="cover preview" className="h-48 w-full object-cover" src={coverUrl} />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/0 transition group-hover:bg-slate-950/30 group-focus-visible:bg-slate-950/30">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/30 px-4 py-2 text-sm font-medium text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    <PencilLineIcon className="size-4" />
                    编辑封面
                  </span>
                </div>
              </button>
            ) : (
              <button
                aria-label="上传文章封面"
                className="flex h-48 w-full cursor-pointer items-center justify-center rounded-[0.9rem] border border-dashed border-border/70 bg-surface-1 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                onClick={() => coverInputRef.current?.click()}
                type="button"
              >
                暂未设置封面
              </button>
            )}

            <div className="space-y-2">
              {selectedCategory?.name ? (
                <div className="text-[0.76rem] font-medium uppercase tracking-[0.16em] text-primary">
                  {selectedCategory.name}
                </div>
              ) : null}
              <div className="text-[1.2rem] font-semibold text-foreground">{title || "未命名文章"}</div>
              {declaration ? (
                <div className="text-[0.72rem] text-muted-foreground">
                  {DECLARATION_OPTIONS.find((o) => o.value === declaration)?.label ?? declaration}
                </div>
              ) : null}
              {sourceLabelValue ? (
                <div className="text-[0.8rem] text-muted-foreground">
                  来源：
                  {sourceUrlValue ? (
                    <a
                      className="text-primary underline-offset-4 hover:underline"
                      href={sourceUrlValue}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {sourceLabelValue}
                    </a>
                  ) : (
                    <span className="text-foreground/78">{sourceLabelValue}</span>
                  )}
                </div>
              ) : null}
              {summary ? <p className="text-sm leading-6 text-muted-foreground">{summary}</p> : null}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{mediaSummaryText}</span>
                <span>{articleCharacterCount} 字</span>
              </div>
            </div>

            {uploadedVideos[0] ? (
              <div className="overflow-hidden rounded-[0.9rem] border border-border/70 bg-slate-950">
                <video className="h-44 w-full object-cover" controls preload="metadata" src={uploadedVideos[0].url} />
              </div>
            ) : null}

            {articleHtml ? (
              <div
                className="max-h-[min(54vh,34rem)] overflow-auto border-t border-border/60 pt-4 text-sm leading-6 text-foreground/78 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/35 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_figure]:my-4 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_hr]:my-4 [&_hr]:border-dashed [&_img]:w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:text-slate-100 [&_pre_code]:bg-transparent [&_pre_code]:px-0 [&_pre_code]:py-0 [&_pre_code]:text-slate-100 [&_table]:min-w-[24rem] [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-border [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1.5 [&_ul[data-type='taskList']]:list-none [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(articleHtml)
                }}
              />
            ) : null}

            <div className="space-y-2 border-t border-border/60 pt-4">
              {isAuthenticated ? (
                <Button
                  className="w-full"
                  onClick={() => setAiChatOpen(true)}
                  type="button"
                  variant="outline"
                >
                  AI 助手
                </Button>
              ) : null}
              <Button
                className="w-full"
                onClick={() => {
                  void persistDraft().catch(() => {
                    setError("草稿保存失败，请稍后重试。");
                  });
                }}
                type="button"
                variant="outline"
              >
                <SaveIcon data-icon="inline-start" />
                保存草稿
              </Button>
              <Button asChild className="w-full" type="button" variant="outline">
                <Link to={APP_ROUTES.feedHome}>取消</Link>
              </Button>
              <Button className="w-full" disabled={!canSubmit} onClick={() => void handleSubmit()} type="button" variant="hero">
                <SendHorizonalIcon data-icon="inline-start" />
                {isPublishing ? "提交中..." : "提交文章"}
              </Button>
            </div>
          </SitePanelBody>
        </SitePanel>
      }
      title={editId ? "编辑文章" : "发布文章"}
    />
    <AiChatPanel
      articleContent={articleText}
      articleTitle={title}
      isOpen={aiChatOpen}
      onClose={() => setAiChatOpen(false)}
      width={aiChatWidth}
      onResizeStart={handleAiChatResizeStart}
    />
  </>
  );
}
