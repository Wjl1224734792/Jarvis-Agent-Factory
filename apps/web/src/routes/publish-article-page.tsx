import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  BoldIcon,
  Heading2Icon,
  ImageIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  SaveIcon,
  SendHorizonalIcon,
  VideoIcon,
  XIcon
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PublishFormSkeleton } from "@/components/page-skeletons";
import { PublishShell } from "@/components/publish-shell";
import { SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { apiClient } from "../lib/api-client";
import { getEditorialImage } from "../lib/aviation-media";
import { buildPublishStatusPath } from "../lib/web-routes";

const ARTICLE_DRAFT_KEY = "feijia:article-draft";

type UploadedImage = {
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

function buildVideoMarkup(url: string) {
  const escapedUrl = escapeHtml(url);
  if (/\.(mp4|webm|ogg)(\?.*)?$/iu.test(url)) {
    return `<figure><video controls preload="metadata" src="${escapedUrl}" style="width:100%;border-radius:16px;background:#0f172a"></video></figure>`;
  }

  return `<p><a href="${escapedUrl}" target="_blank" rel="noreferrer">${escapedUrl}</a></p>`;
}

function buildArticleHtml(summary: string, editorHtml: string) {
  const summaryBlock = summary.trim()
    ? `<p><strong>${escapeHtml(summary.trim())}</strong></p>`
    : "";

  return [summaryBlock, editorHtml.trim()].filter(Boolean).join("");
}

export function PublishArticlePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const promptLogin = useLoginPrompt();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [editorHtml, setEditorHtml] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ["publish-article-categories"],
    queryFn: () => apiClient.listContentCategories()
  });

  useEffect(() => {
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
        uploadedImages?: UploadedImage[];
      };

      setTitle(parsed.title ?? "");
      setSummary(parsed.summary ?? "");
      setEditorHtml(parsed.editorHtml ?? "");
      setCategoryId(parsed.categoryId ?? "");
      setUploadedImages(parsed.uploadedImages ?? []);
    } catch {
      window.localStorage.removeItem(ARTICLE_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (!categoryId && categoriesQuery.data?.items[0]?.id) {
      setCategoryId(categoriesQuery.data.items[0].id);
    }
  }, [categoryId, categoriesQuery.data?.items]);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== editorHtml) {
      editorRef.current.innerHTML = editorHtml;
    }
  }, [editorHtml]);

  const articleHtml = useMemo(() => buildArticleHtml(summary, editorHtml), [editorHtml, summary]);
  const articleText = useMemo(
    () => [summary.trim(), extractPlainText(editorHtml)].filter(Boolean).join("\n\n"),
    [editorHtml, summary]
  );
  const coverUrl = uploadedImages[0]?.url ?? getEditorialImage("article-publish");
  const selectedCategory =
    categoriesQuery.data?.items.find((item) => item.id === categoryId) ?? null;

  function syncEditorState() {
    setEditorHtml(editorRef.current?.innerHTML ?? "");
  }

  function runEditorCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditorState();
  }

  function insertHtml(html: string) {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    syncEditorState();
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    if (uploadedImages.length + files.length > 6) {
      setError("最多插入 6 张图片。");
      return;
    }

    setError(null);
    setIsUploadingMedia(true);

    try {
      const nextImages: UploadedImage[] = [];

      for (const file of Array.from(files)) {
        const uploaded = await apiClient.uploadPostImage(file);
        nextImages.push({
          id: uploaded.item.id,
          url: uploaded.item.url,
          fileName: uploaded.item.fileName
        });
        insertHtml(
          `<figure><img src="${escapeHtml(uploaded.item.url)}" alt="${escapeHtml(file.name)}" style="width:100%;border-radius:16px" /></figure>`
        );
      }

      setUploadedImages((current) => [...current, ...nextImages]);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "图片上传失败");
    } finally {
      setIsUploadingMedia(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
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
        uploadedImages
      })
    );
  }

  if (categoriesQuery.isLoading) {
    return <PublishFormSkeleton />;
  }

  return (
    <PublishShell
      description="文章发布"
      eyebrow="Article"
      main={
        <>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>文章发布失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { icon: BoldIcon, action: () => runEditorCommand("bold") },
                    { icon: ItalicIcon, action: () => runEditorCommand("italic") },
                    { icon: Heading2Icon, action: () => runEditorCommand("formatBlock", "<h2>") },
                    { icon: ListIcon, action: () => runEditorCommand("insertUnorderedList") },
                    { icon: ListOrderedIcon, action: () => runEditorCommand("insertOrderedList") },
                    { icon: QuoteIcon, action: () => runEditorCommand("formatBlock", "<blockquote>") }
                  ].map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <Button key={index} onClick={item.action} size="sm" type="button" variant="outline">
                        <Icon className="size-4 text-rating-blue" />
                      </Button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => imageInputRef.current?.click()} size="sm" type="button" variant="outline">
                    <ImageIcon data-icon="inline-start" />
                    {isUploadingMedia ? "上传中..." : "插入图片"}
                  </Button>
                  <Button
                    onClick={() => {
                      if (videoUrl.trim()) {
                        insertHtml(buildVideoMarkup(videoUrl.trim()));
                        setVideoUrl("");
                      }
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <VideoIcon data-icon="inline-start" />
                    插入视频
                  </Button>
                </div>
              </div>

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

              <Textarea
                className="min-h-24"
                onChange={(event) => setSummary(event.target.value)}
                placeholder="摘要"
                value={summary}
              />

              <div className="space-y-3">
                <Input
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder="视频链接，可选"
                  value={videoUrl}
                />
                <div className="relative min-h-[360px] overflow-hidden rounded-[0.9rem] border border-border/70 bg-white">
                  {!extractPlainText(editorHtml).trim() ? (
                    <div className="pointer-events-none absolute left-4 top-4 text-sm text-muted-foreground">
                      正文从这里开始。
                    </div>
                  ) : null}
                  <div
                    className="min-h-[360px] px-4 py-4 text-[1rem] leading-7 text-foreground outline-none [&_blockquote]:border-l-4 [&_blockquote]:border-primary/35 [&_blockquote]:pl-4 [&_blockquote]:text-foreground/76 [&_figure]:my-4 [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-[1.45rem] [&_h2]:font-semibold [&_img]:w-full [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6"
                    contentEditable
                    onInput={syncEditorState}
                    ref={editorRef}
                    suppressContentEditableWarning
                  />
                </div>
              </div>

              <input
                accept="image/*"
                className="hidden"
                multiple
                onChange={(event) => {
                  void handleImageUpload(event.target.files);
                }}
                ref={imageInputRef}
                type="file"
              />

              {uploadedImages.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-3">
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
              ) : null}
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
                disabled={!title.trim() || !articleText.trim() || !categoryId || isPublishing || isUploadingMedia}
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

                  void apiClient
                    .createPost({
                      type: "article",
                      title,
                      content: articleText,
                      contentHtml: articleHtml,
                      contentCategoryId: categoryId,
                      imageIds: uploadedImages.map((item) => item.id)
                    })
                    .then((payload) => {
                      window.localStorage.removeItem(ARTICLE_DRAFT_KEY);
                      void Promise.all([
                        queryClient.invalidateQueries({ queryKey: ["home-shell-feed"] }),
                        queryClient.invalidateQueries({ queryKey: ["post-detail", payload.item.id] })
                      ]);
                      navigate(buildPublishStatusPath("article", payload.item.id), {
                        state: {
                          title,
                          description: summary,
                          imageUrl: uploadedImages[0]?.url ?? null
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
        <>
          <SitePanel variant="muted">
            <SitePanelBody className="space-y-4">
              <div className="text-sm uppercase tracking-[0.18em] text-muted-foreground">预览</div>
              <img alt="cover preview" className="h-48 w-full rounded-[0.9rem] object-cover" src={coverUrl} />
              <div className="text-[0.76rem] font-medium uppercase tracking-[0.16em] text-primary">
                {selectedCategory?.name ?? "未选择分类"}
              </div>
              <div className="text-[1.2rem] font-semibold text-foreground">{title || "文章标题"}</div>
              {summary ? <p className="text-sm leading-6 text-muted-foreground">{summary}</p> : null}
              <div
                className="max-h-[320px] overflow-y-auto border-t border-border/60 pt-4 text-sm leading-6 text-foreground/78 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/35 [&_blockquote]:pl-4 [&_figure]:my-4 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_img]:w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{
                  __html: articleHtml || "<p>正文预览会显示在这里。</p>"
                }}
              />
            </SitePanelBody>
          </SitePanel>
        </>
      }
      title="发布文章"
    />
  );
}
