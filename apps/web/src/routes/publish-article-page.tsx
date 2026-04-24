import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { Clock3Icon, ImagePlusIcon, PencilLineIcon, SaveIcon, SendHorizonalIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { sanitizeHtml } from "@/lib/sanitize";
import { clearDraftSnapshot, loadDraftSnapshot, saveDraftSnapshot } from "@/lib/uploads/draft-store";
import {
  buildRestoredPreviewUrlMap,
  restorePersistedPreviewAsset,
  restorePersistedPreviewAssets,
  revokePreviewAsset,
  revokePreviewAssets
} from "@/lib/uploads/local-preview-assets";
import { cn } from "@/lib/utils";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { apiClient } from "../lib/api-client";
import { buildPublishStatusPath } from "../lib/web-routes";

const ARTICLE_DRAFT_KEY = "feijia:article-draft";
const ARTICLE_SUMMARY_MAX_LENGTH = 120;
const ARTICLE_IMAGE_LIMIT = 6;
const ARTICLE_VIDEO_LIMIT = 2;
const AUTO_SAVE_DELAY_MS = 500;

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
  coverImage: UploadedImage | null;
  uploadedImages: UploadedImage[];
  uploadedVideos: UploadedVideo[];
};

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

function replaceLocalMediaUrls(html: string, mapping: Record<string, string>) {
  return Object.entries(mapping).reduce((current, [from, to]) => current.split(from).join(to), html);
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
  const previewAssetsRef = useRef<{
    coverImage: UploadedImage | null;
    uploadedImages: UploadedImage[];
    uploadedVideos: UploadedVideo[];
  }>({
    coverImage: null,
    uploadedImages: [],
    uploadedVideos: []
  });
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [editorHtml, setEditorHtml] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [coverImage, setCoverImage] = useState<UploadedImage | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasRestoredDraftSnapshot, setHasRestoredDraftSnapshot] = useState(false);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<number | null>(null);

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
      .then((snapshot) => {
        if (!snapshot) {
          return;
        }

        setHasRestoredDraftSnapshot(true);
        setLastDraftSavedAt(snapshot.updatedAt);

        const parsed = snapshot.data;
        const restoredCoverImage = restorePersistedPreviewAsset(parsed.coverImage ?? null);
        const restoredImageEntries = restorePersistedPreviewAssets(parsed.uploadedImages ?? []);
        const restoredVideoEntries = restorePersistedPreviewAssets(parsed.uploadedVideos ?? []);
        const restoredMediaUrlMap = {
          ...buildRestoredPreviewUrlMap(restoredImageEntries),
          ...buildRestoredPreviewUrlMap(restoredVideoEntries)
        };

        setTitle(parsed.title ?? "");
        setSummary(parsed.summary ?? "");
        setEditorHtml(replaceLocalMediaUrls(parsed.editorHtml ?? "", restoredMediaUrlMap));
        setCategoryId(parsed.categoryId ?? "");
        setCoverImage(restoredCoverImage?.asset ?? null);
        setUploadedImages(restoredImageEntries.map((entry) => entry.asset));
        setUploadedVideos(restoredVideoEntries.map((entry) => entry.asset));
      })
      .catch(() => {
        // Keep the workspace usable even when draft restore fails.
      });
  }, [editId]);

  useEffect(() => {
    previewAssetsRef.current = {
      coverImage,
      uploadedImages,
      uploadedVideos
    };
  }, [coverImage, uploadedImages, uploadedVideos]);

  useEffect(() => {
    return () => {
      revokePreviewAsset(previewAssetsRef.current.coverImage);
      revokePreviewAssets(previewAssetsRef.current.uploadedImages);
      revokePreviewAssets(previewAssetsRef.current.uploadedVideos);
    };
  }, []);

  useEffect(() => {
    if (!detailQuery.data?.item) {
      return;
    }

    const item = detailQuery.data.item;
    setTitle(item.title);
    setSummary("");
    setEditorHtml(item.contentHtml ?? "");
    setCategoryId(item.contentCategory?.id ?? "");
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
  const articleCharacterCount = useMemo(
    () => articleText.replace(/\s+/g, "").length,
    [articleText]
  );
  const coverUrl = coverImage?.url ?? null;
  const selectedCategory =
    categoriesQuery.data?.items.find((item) => item.id === categoryId) ?? null;
  const canSubmit =
    Boolean(title.trim()) &&
    Boolean(articleText.trim()) &&
    Boolean(categoryId) &&
    Boolean(coverImage) &&
    !isPublishing;
  const draftStatusText = formatDraftSavedAt(lastDraftSavedAt);

  const persistDraft = useCallback(async () => {
    const savedAt = Date.now();
    await saveDraftSnapshot<ArticleDraftData>({
      key: ARTICLE_DRAFT_KEY,
      version: 1,
      updatedAt: savedAt,
      data: {
        title,
        summary,
        editorHtml,
        categoryId,
        coverImage,
        uploadedImages,
        uploadedVideos
      },
      filesBySlot: {}
    });
    setLastDraftSavedAt(savedAt);
  }, [categoryId, coverImage, editorHtml, summary, title, uploadedImages, uploadedVideos]);

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

  async function uploadImages(files: File[]) {
    if (files.length === 0) {
      return [];
    }

    if (uploadedImages.length + files.length > ARTICLE_IMAGE_LIMIT) {
      setError(`最多插入 ${ARTICLE_IMAGE_LIMIT} 张图片。`);
      return [];
    }

    setError(null);
    const nextImages: UploadedImage[] = files.map((file) => ({
      id: `local-image-${crypto.randomUUID()}`,
      url: URL.createObjectURL(file),
      fileName: file.name,
      file,
      isLocal: true
    }));

    setUploadedImages((current) => [...current, ...nextImages]);
    return nextImages;
  }

  async function uploadVideos(files: File[]) {
    if (files.length === 0) {
      return [];
    }

    if (uploadedVideos.length + files.length > ARTICLE_VIDEO_LIMIT) {
      setError(`文章最多插入 ${ARTICLE_VIDEO_LIMIT} 个视频。`);
      return [];
    }

    setError(null);
    const nextVideos: UploadedVideo[] = files.map((file) => ({
      id: `local-video-${crypto.randomUUID()}`,
      url: URL.createObjectURL(file),
      fileName: file.name,
      file,
      isLocal: true
    }));

    setUploadedVideos((current) => [...current, ...nextVideos]);
    return nextVideos;
  }

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
        id: `local-cover-${crypto.randomUUID()}`,
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
      const mediaUrlMapping: Record<string, string> = {};

      let submitCoverImage = coverImage;
      if (coverImage.file) {
        const uploaded = await apiClient.uploadPostImage(coverImage.file);
        submitCoverImage = {
          id: uploaded.item.id,
          url: uploaded.item.url,
          fileName: uploaded.item.fileName
        };
        mediaUrlMapping[coverImage.url] = uploaded.item.url;
      }

      const submitImages = await Promise.all(
        uploadedImages.map(async (item) => {
          if (!item.file) {
            return item;
          }

          const uploaded = await apiClient.uploadPostImage(item.file);
          mediaUrlMapping[item.url] = uploaded.item.url;
          return {
            id: uploaded.item.id,
            url: uploaded.item.url,
            fileName: uploaded.item.fileName
          } satisfies UploadedImage;
        })
      );

      const submitVideos = await Promise.all(
        uploadedVideos.map(async (item) => {
          if (!item.file) {
            return item;
          }

          const uploaded = await apiClient.uploadPostVideo(item.file);
          mediaUrlMapping[item.url] = uploaded.item.url;
          return {
            id: uploaded.item.id,
            url: uploaded.item.url,
            fileName: uploaded.item.fileName
          } satisfies UploadedVideo;
        })
      );

      const payload = {
        type: "article" as const,
        title,
        content: articleText,
        contentHtml: replaceLocalMediaUrls(articleHtml, mediaUrlMapping),
        contentCategoryId: categoryId,
        imageIds: Array.from(
          new Set([submitCoverImage?.id, ...submitImages.map((item) => item.id)].filter(Boolean))
        ),
        videoIds: submitVideos.map((item) => item.id)
      };

      const response = editId
        ? await apiClient.updatePost(editId, payload)
        : await apiClient.createPost(payload);

      await clearDraftSnapshot(ARTICLE_DRAFT_KEY);
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
    <PublishShell
      description="把标题、导语、封面和正文放进同一个写作工作区，边写边预览，草稿保存在当前浏览器。"
      eyebrow="文章"
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
            <SitePanelBody className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">写作工作区</div>
                  <div className="text-sm text-muted-foreground">标题、栏目、摘要和正文现在是连续输入流，不用再额外点一次加载编辑器。</div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-surface-1 px-3 py-1.5 text-xs text-muted-foreground">
                  <Clock3Icon className="size-3.5" />
                  {draftStatusText}
                </div>
              </div>

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

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">标题</div>
                    <Input
                      className="h-14 rounded-[0.9rem] px-4 text-[1.2rem] font-semibold"
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="先写一个让人愿意点开的标题"
                      value={title}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">栏目</div>
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
                      <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">导语</div>
                      <div className="text-xs text-muted-foreground">{summary.length}/{ARTICLE_SUMMARY_MAX_LENGTH}</div>
                    </div>
                    <Textarea
                      className="min-h-28 resize-none rounded-[0.9rem]"
                      maxLength={ARTICLE_SUMMARY_MAX_LENGTH}
                      onChange={(event) => setSummary(event.target.value.slice(0, ARTICLE_SUMMARY_MAX_LENGTH))}
                      placeholder="用 1-2 句话把文章主旨说清楚，这段会作为导语显示在正文最前。"
                      value={summary}
                    />
                  </div>
                </div>

                <button
                  aria-label={coverUrl ? "更换文章封面" : "上传文章封面"}
                  className={cn(
                    "group flex min-h-56 w-full flex-col overflow-hidden rounded-[0.9rem] border border-border/70 bg-surface-1 text-left transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  )}
                  onClick={() => coverInputRef.current?.click()}
                  type="button"
                >
                  {coverUrl ? (
                    <>
                      <img alt="cover preview" className="h-40 w-full object-cover" src={coverUrl} />
                      <div className="flex flex-1 items-center justify-between gap-3 px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-foreground">封面已就绪</div>
                          <div className="text-xs text-muted-foreground">点击可重新选择一张更合适的主图。</div>
                        </div>
                        <PencilLineIcon className="size-4 text-muted-foreground" />
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 px-4 py-5 text-center">
                      <div className="inline-flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <ImagePlusIcon className="size-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">上传封面</div>
                        <div className="text-xs text-muted-foreground">封面会同时用于列表卡片和详情页首屏。</div>
                      </div>
                    </div>
                  )}
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-foreground">正文</div>
                    <div className="text-sm text-muted-foreground">常用格式、表格、任务列表、图片和视频都在同一套工具栏里。</div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-surface-1 px-3 py-1.5 text-xs text-muted-foreground">
                    <span>{articleCharacterCount} 字</span>
                    {hasRestoredDraftSnapshot ? <span>已恢复草稿</span> : null}
                  </div>
                </div>

                <RichTextEditor
                  onChange={setEditorHtml}
                  onUploadImage={uploadImages}
                  onUploadVideo={uploadVideos}
                  placeholder="从这里开始写正文。建议先写结构，再补图片、视频和表格。"
                  value={editorHtml}
                />
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-foreground">媒体清单</div>
                    <div className="text-sm text-muted-foreground">这里会显示正文里插入过的本地图片和视频，删除时也会同步从正文移除。</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    图片 {uploadedImages.length}/{ARTICLE_IMAGE_LIMIT}，视频 {uploadedVideos.length}/{ARTICLE_VIDEO_LIMIT}
                  </div>
                </div>

                {uploadedImages.length === 0 && uploadedVideos.length === 0 ? (
                  <div className="rounded-[0.9rem] border border-dashed border-border/70 bg-surface-1 px-4 py-4 text-sm text-muted-foreground">
                    还没有插入媒体。正文工具栏里的图片和视频按钮会先做本地预览，再在提交时统一上传。
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-foreground/72">已插入图片</div>
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

                    <div className="space-y-3">
                      <div className="text-sm font-medium text-foreground/72">已插入视频</div>
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
                  </div>
                )}
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {selectedCategory?.name ? `当前栏目：${selectedCategory.name}` : "请选择一个栏目再继续。"}
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <Button
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
                <Button asChild type="button" variant="outline">
                  <Link to={APP_ROUTES.feedHome}>取消</Link>
                </Button>
                <Button disabled={!canSubmit} onClick={() => void handleSubmit()} type="button" variant="hero">
                  <SendHorizonalIcon data-icon="inline-start" />
                  {isPublishing ? "提交中..." : "提交文章"}
                </Button>
              </div>
            </SitePanelBody>
          </SitePanel>
        </>
      }
      aside={
        <SitePanel variant="muted">
          <SitePanelBody className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm uppercase tracking-[0.18em] text-muted-foreground">预览</div>
              <div className="text-xs text-muted-foreground">{articleCharacterCount} 字</div>
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

            <div className="text-[0.76rem] font-medium uppercase tracking-[0.16em] text-primary">
              {selectedCategory?.name ?? "未选择栏目"}
            </div>
            <div className="text-[1.2rem] font-semibold text-foreground">{title || "文章标题"}</div>
            {summary ? <p className="text-sm leading-6 text-muted-foreground">{summary}</p> : null}

            {uploadedVideos[0] ? (
              <div className="overflow-hidden rounded-[0.9rem] border border-border/70 bg-slate-950">
                <video className="h-44 w-full object-cover" controls preload="metadata" src={uploadedVideos[0].url} />
              </div>
            ) : null}

            <div
              className="max-h-[320px] overflow-y-auto border-t border-border/60 pt-4 text-sm leading-6 text-foreground/78 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/35 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_figure]:my-4 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_hr]:my-4 [&_hr]:border-dashed [&_img]:w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:text-slate-100 [&_pre_code]:bg-transparent [&_pre_code]:px-0 [&_pre_code]:py-0 [&_pre_code]:text-slate-100 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-border [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1.5 [&_ul[data-type='taskList']]:list-none [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{
                __html: articleHtml ? sanitizeHtml(articleHtml) : "<p>正文预览会显示在这里。</p>"
              }}
            />
          </SitePanelBody>
        </SitePanel>
      }
      title="发布文章"
    />
  );
}
