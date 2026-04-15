import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { PencilLineIcon, SaveIcon, SendHorizonalIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PublishArticlePageSkeleton } from "@/components/page-skeletons";
import { PublishShell } from "@/components/publish-shell";
import { RichTextEditor } from "@/components/rich-text-editor";
import { SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeHtml } from "@/lib/sanitize";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { apiClient } from "../lib/api-client";
import { buildPublishStatusPath } from "../lib/web-routes";

const ARTICLE_DRAFT_KEY = "feijia:article-draft";
const ARTICLE_SUMMARY_MAX_LENGTH = 100;

type UploadedImage = {
  id: string;
  url: string;
  fileName?: string;
};

type UploadedVideo = {
  id: string;
  url: string;
  fileName?: string;
};

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function extractPlainText(html: string) {
  if (!html.trim()) {
    return "";
  }

  if (typeof DOMParser !== "undefined") {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    return documentNode.body.textContent?.replace(/\s+\n/g, "\n").trim() ?? "";
  }

  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildArticleHtml(summary: string, editorHtml: string) {
  const summaryBlock = summary.trim() ? `<p><strong>${escapeHtml(summary.trim())}</strong></p>` : "";
  return [summaryBlock, editorHtml.trim()].filter(Boolean).join("");
}

export function PublishArticlePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const promptLogin = useLoginPrompt();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [editorHtml, setEditorHtml] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [coverImage, setCoverImage] = useState<UploadedImage | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

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
      return;
    }
    const draft = window.localStorage.getItem(ARTICLE_DRAFT_KEY);
    if (!draft) {
      return;
    }

    try {
      const parsed = JSON.parse(draft) as {
        title?: string;
        summary?: string;
        editorHtml?: string;
        categoryId?: string;
        coverImage?: UploadedImage | null;
        uploadedImages?: UploadedImage[];
        uploadedVideos?: UploadedVideo[];
      };

      setTitle(parsed.title ?? "");
      setSummary(parsed.summary ?? "");
      setEditorHtml(parsed.editorHtml ?? "");
      setCategoryId(parsed.categoryId ?? "");
      setCoverImage(parsed.coverImage ?? null);
      setUploadedImages(parsed.uploadedImages ?? []);
      setUploadedVideos(parsed.uploadedVideos ?? []);
    } catch {
      window.localStorage.removeItem(ARTICLE_DRAFT_KEY);
    }
  }, [editId]);

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

  const articleHtml = useMemo(() => buildArticleHtml(summary, editorHtml), [editorHtml, summary]);
  const articleText = useMemo(
    () => [summary.trim(), extractPlainText(editorHtml)].filter(Boolean).join("\n\n"),
    [editorHtml, summary]
  );
  const coverUrl = coverImage?.url ?? null;
  const selectedCategory =
    categoriesQuery.data?.items.find((item) => item.id === categoryId) ?? null;

  async function uploadImages(files: File[]) {
    if (files.length === 0) {
      return [];
    }

    if (uploadedImages.length + files.length > 6) {
      setError("最多插入 6 张图片。");
      return [];
    }

    setError(null);
    setIsUploadingMedia(true);

    try {
      const nextImages: UploadedImage[] = [];

      for (const file of files) {
        const uploaded = await apiClient.uploadPostImage(file);
        nextImages.push({
          id: uploaded.item.id,
          url: uploaded.item.url,
          fileName: uploaded.item.fileName
        });
      }

      setUploadedImages((current) => [...current, ...nextImages]);
      return nextImages;
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "图片上传失败");
      return [];
    } finally {
      setIsUploadingMedia(false);
    }
  }

  async function uploadVideos(files: File[]) {
    if (files.length === 0) {
      return [];
    }

    if (uploadedVideos.length + files.length > 2) {
      setError("文章最多插入 2 个视频。");
      return [];
    }

    setError(null);
    setIsUploadingMedia(true);

    try {
      const nextVideos: UploadedVideo[] = [];

      for (const file of files) {
        const uploaded = await apiClient.uploadPostVideo(file);
        nextVideos.push({
          id: uploaded.item.id,
          url: uploaded.item.url,
          fileName: uploaded.item.fileName
        });
      }

      setUploadedVideos((current) => [...current, ...nextVideos]);
      return nextVideos;
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "视频上传失败");
      return [];
    } finally {
      setIsUploadingMedia(false);
    }
  }

  async function uploadCoverImage(file: File | null) {
    if (!file) {
      return;
    }

    setError(null);
    setIsUploadingMedia(true);

    try {
      const uploaded = await apiClient.uploadPostImage(file);
      setCoverImage({
        id: uploaded.item.id,
        url: uploaded.item.url,
        fileName: uploaded.item.fileName
      });
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "封面上传失败");
    } finally {
      setIsUploadingMedia(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    }
  }

  function saveDraft() {
    window.localStorage.setItem(
      ARTICLE_DRAFT_KEY,
      JSON.stringify({
        title,
        summary,
        editorHtml,
        categoryId,
        coverImage,
        uploadedImages,
        uploadedVideos
      })
    );
  }

  if (categoriesQuery.isLoading || detailQuery.isLoading) {
    return <PublishArticlePageSkeleton />;
  }

  return (
    <PublishShell
      description="适合长文、图文混排和内嵌视频的文章发布器。草稿会保存在当前浏览器。"
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
            <SitePanelBody className="space-y-4">
              <Input onChange={(event) => setTitle(event.target.value)} placeholder="文章标题" value={title} />

              <div className="flex flex-wrap gap-2">
                {categoriesQuery.data?.items.map((item) => (
                  <button
                    className={`site-tab-trigger rounded-full border px-3 py-1.5 text-[0.82rem] transition ${
                      categoryId === item.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/70 text-foreground/70 hover:text-foreground"
                    }`}
                    key={item.id}
                    onClick={() => setCategoryId(item.id)}
                    type="button"
                  >
                    {item.name}
                  </button>
                ))}
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

              <div className="relative">
                <Textarea
                  className="min-h-24 resize-none pb-8"
                  maxLength={ARTICLE_SUMMARY_MAX_LENGTH}
                  onChange={(event) => setSummary(event.target.value.slice(0, ARTICLE_SUMMARY_MAX_LENGTH))}
                  placeholder="摘要"
                  value={summary}
                />
                <div className="pointer-events-none absolute bottom-3 right-3 text-xs text-muted-foreground">
                  {summary.length}/{ARTICLE_SUMMARY_MAX_LENGTH}
                </div>
              </div>

              <RichTextEditor
                onChange={setEditorHtml}
                onUploadImage={uploadImages}
                onUploadVideo={uploadVideos}
                placeholder="从这里开始写正文，支持图片与视频直接上传后内嵌。"
                value={editorHtml}
              />

              {uploadedImages.length === 0 && uploadedVideos.length === 0 ? (
                <div className="rounded-[0.9rem] border border-dashed border-border/70 bg-surface-1 px-4 py-4 text-sm text-muted-foreground">
                  还没有插入媒体。可以直接从编辑器工具栏上传图片和视频文件。
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-foreground/72">已上传图片</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {uploadedImages.map((image) => (
                        <div className="relative overflow-hidden rounded-[0.9rem] border border-border/70" key={image.id}>
                          <img alt={image.fileName ?? "article"} className="h-32 w-full object-cover" src={image.url} />
                          <button
                            className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white"
                            onClick={() => {
                              setUploadedImages((current) => current.filter((item) => item.id !== image.id));
                            }}
                            type="button"
                          >
                            <XIcon className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium text-foreground/72">已上传视频</div>
                    <div className="grid gap-3">
                      {uploadedVideos.map((video) => (
                        <div className="relative overflow-hidden rounded-[0.9rem] border border-border/70 bg-slate-950" key={video.id}>
                          <video className="h-40 w-full object-cover" controls preload="metadata" src={video.url} />
                          <button
                            className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white"
                            onClick={() => {
                              setUploadedVideos((current) => current.filter((item) => item.id !== video.id));
                            }}
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
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="flex flex-wrap justify-end gap-3">
              <Button onClick={saveDraft} type="button" variant="outline">
                <SaveIcon data-icon="inline-start" />
                保存草稿
              </Button>
              <Button asChild type="button" variant="outline">
                <Link to={APP_ROUTES.feedHome}>取消</Link>
              </Button>
              <Button
                disabled={
                  !title.trim() ||
                  !articleText.trim() ||
                  !categoryId ||
                  isPublishing ||
                  isUploadingMedia
                }
                onClick={() => {
                  if (
                    !promptLogin({
                      title: "登录后才能发布文章",
                      description: "发布文章前请先登录。"
                    })
                  ) {
                    return;
                  }
                  setError(null);
                  setIsPublishing(true);
                  const payload = {
                    type: "article" as const,
                    title,
                    content: articleText,
                    contentHtml: articleHtml,
                    contentCategoryId: categoryId,
                    imageIds: Array.from(
                      new Set([coverImage?.id, ...uploadedImages.map((item) => item.id)].filter(Boolean))
                    ) as string[],
                    videoIds: uploadedVideos.map((item) => item.id)
                  };

                  void (editId ? apiClient.updatePost(editId, payload) : apiClient.createPost(payload))
                    .then((payload) => {
                      window.localStorage.removeItem(ARTICLE_DRAFT_KEY);
                      void Promise.all([
                        queryClient.invalidateQueries({ queryKey: ["home-shell-feed"] }),
                        queryClient.invalidateQueries({ queryKey: ["post-detail", payload.item.id] })
                      ]);
                      void navigate(buildPublishStatusPath("article", payload.item.id), {
                        state: {
                          title,
                          description: summary,
                          imageUrl: coverImage?.url ?? null
                        }
                      });
                    })
                    .catch((reason: unknown) => {
                      setError(reason instanceof Error ? reason.message : "文章发布失败");
                    })
                    .finally(() => {
                      setIsPublishing(false);
                    });
                }}
                type="button"
                variant="hero"
              >
                <SendHorizonalIcon data-icon="inline-start" />
                {isPublishing ? "提交中..." : "提交文章"}
              </Button>
            </SitePanelBody>
          </SitePanel>
        </>
      }
      aside={
        <SitePanel variant="muted">
          <SitePanelBody className="space-y-4">
            <div className="text-sm uppercase tracking-[0.18em] text-muted-foreground">预览</div>
            {coverUrl ? (
              <button
                aria-label={isUploadingMedia ? "封面上传中" : "编辑文章封面"}
                className="group relative block w-full overflow-hidden rounded-[0.9rem] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                disabled={isUploadingMedia}
                onClick={() => coverInputRef.current?.click()}
                type="button"
              >
                <img alt="cover preview" className="h-48 w-full object-cover" src={coverUrl} />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/0 text-transparent transition group-hover:bg-slate-950/30 group-hover:text-white group-focus-visible:bg-slate-950/30 group-focus-visible:text-white">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/30 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                    <PencilLineIcon className="size-4" />
                    {isUploadingMedia ? "上传中..." : "编辑"}
                  </span>
                </div>
              </button>
            ) : (
              <button
                aria-label="上传文章封面"
                className="flex h-48 w-full cursor-pointer items-center justify-center rounded-[0.9rem] border border-dashed border-border/70 bg-surface-1 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                disabled={isUploadingMedia}
                onClick={() => coverInputRef.current?.click()}
                type="button"
              >
                {isUploadingMedia ? "上传中..." : "暂未设置封面"}
              </button>
            )}
            <div className="text-[0.76rem] font-medium uppercase tracking-[0.16em] text-primary">
              {selectedCategory?.name ?? "未选择分类"}
            </div>
            <div className="text-[1.2rem] font-semibold text-foreground">{title || "文章标题"}</div>
            {summary ? <p className="text-sm leading-6 text-muted-foreground">{summary}</p> : null}
            {uploadedVideos[0] ? (
              <div className="overflow-hidden rounded-[0.9rem] border border-border/70 bg-slate-950">
                <video className="h-44 w-full object-cover" controls preload="metadata" src={uploadedVideos[0].url} />
              </div>
            ) : null}
            <div
              className="max-h-[320px] overflow-y-auto border-t border-border/60 pt-4 text-sm leading-6 text-foreground/78 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/35 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_figure]:my-4 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_hr]:my-4 [&_hr]:border-dashed [&_img]:w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:text-slate-100 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-border [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1.5 [&_ul[data-type='taskList']]:list-none [&_ul]:list-disc [&_ul]:pl-5"
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
