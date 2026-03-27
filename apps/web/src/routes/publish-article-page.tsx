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
  VideoIcon
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  SitePage,
  SitePageDescription,
  SitePageEyebrow,
  SitePageHead,
  SitePageTitle,
  SitePanel,
  SitePanelBody
} from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "../lib/api-client";
import { getEditorialImage } from "../lib/aviation-media";

const ARTICLE_DRAFT_KEY = "feijia:article-draft";

type UploadedImage = {
  id: string;
  url: string;
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

  return `<p><a href="${escapedUrl}" target="_blank" rel="noreferrer">视频链接：${escapedUrl}</a></p>`;
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

  const articleHtml = useMemo(
    () => buildArticleHtml(summary, editorHtml),
    [editorHtml, summary]
  );
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
      setError("文章最多插入 6 张图片。");
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
          url: uploaded.item.url
        });
        insertHtml(
          `<figure><img src="${escapeHtml(uploaded.item.url)}" alt="${escapeHtml(file.name)}" style="width:100%;border-radius:18px" /></figure>`
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

  function handleInsertVideo() {
    if (!videoUrl.trim()) {
      return;
    }

    insertHtml(buildVideoMarkup(videoUrl.trim()));
    setVideoUrl("");
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

  return (
    <SitePage className="gap-5">
      <SitePageHead>
        <SitePageEyebrow>Article Publishing</SitePageEyebrow>
        <SitePageTitle className="text-[2.8rem]">发布文章</SitePageTitle>
        <SitePageDescription>
          支持基础富文本、图片上传和视频链接嵌入。文章会同时保存结构化 HTML 与正文文本，方便后续详情页直接展示。
        </SitePageDescription>
      </SitePageHead>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SitePanel>
          <SitePanelBody className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => runEditorCommand("bold")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <BoldIcon className="size-4 text-rating-blue" />
                </Button>
                <Button
                  onClick={() => runEditorCommand("italic")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ItalicIcon className="size-4 text-rating-blue" />
                </Button>
                <Button
                  onClick={() => runEditorCommand("formatBlock", "<h2>")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Heading2Icon className="size-4 text-rating-blue" />
                </Button>
                <Button
                  onClick={() => runEditorCommand("insertUnorderedList")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ListIcon className="size-4 text-rating-blue" />
                </Button>
                <Button
                  onClick={() => runEditorCommand("insertOrderedList")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ListOrderedIcon className="size-4 text-rating-blue" />
                </Button>
                <Button
                  onClick={() => runEditorCommand("formatBlock", "<blockquote>")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <QuoteIcon className="size-4 text-rating-blue" />
                </Button>
                <Button
                  disabled={isUploadingMedia}
                  onClick={() => imageInputRef.current?.click()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ImageIcon className="size-4 text-rating-orange" />
                </Button>
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
              </div>

              <div className="flex min-w-[260px] flex-1 items-center gap-2 xl:max-w-[360px]">
                <Input
                  className="h-9"
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder="粘贴 mp4 或视频链接"
                  value={videoUrl}
                />
                <Button onClick={handleInsertVideo} size="sm" type="button" variant="outline">
                  <VideoIcon className="size-4 text-rating-blue" />
                </Button>
              </div>
            </div>

            <Input
              className="h-14 rounded-none border-x-0 border-t-0 px-0 text-3xl font-semibold shadow-none focus-visible:ring-0"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="输入文章标题"
              value={title}
            />

            <div className="flex flex-wrap gap-2">
              {categoriesQuery.data?.items.map((item) => (
                <button
                  className={`border-b-2 px-0 py-2 text-sm transition-colors ${
                    categoryId === item.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
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
              className="min-h-24 rounded-none"
              onChange={(event) => setSummary(event.target.value)}
              placeholder="文章导语 / 摘要"
              value={summary}
            />

            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">正文编辑器</div>
              <div className="relative min-h-[360px] border border-border/70 bg-white">
                {!extractPlainText(editorHtml).trim() ? (
                  <div className="pointer-events-none absolute left-4 top-4 text-sm text-muted-foreground">
                    从这里开始写正文，支持标题、列表、引用、图片和视频链接。
                  </div>
                ) : null}
                <div
                  className="min-h-[360px] px-4 py-4 text-[1rem] leading-8 text-foreground outline-none [&_blockquote]:border-l-4 [&_blockquote]:border-primary/35 [&_blockquote]:pl-4 [&_blockquote]:text-foreground/76 [&_figure]:my-4 [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-[1.45rem] [&_h2]:font-semibold [&_img]:w-full [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6"
                  contentEditable
                  onInput={syncEditorState}
                  ref={editorRef}
                  suppressContentEditableWarning
                />
              </div>
            </div>

            {uploadedImages.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">已插入图片</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {uploadedImages.map((image) => (
                    <img
                      alt="uploaded article media"
                      className="h-28 w-full rounded-[0.9rem] object-cover"
                      key={image.id}
                      src={image.url}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>文章发布失败</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                onClick={saveDraft}
                type="button"
                variant="outline"
              >
                <SaveIcon data-icon="inline-start" />
                保存草稿
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
                      navigate(APP_ROUTES.postDetail.replace(":id", payload.item.id));
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
                {isPublishing ? "发布中..." : "发布文章"}
              </Button>
            </div>
          </SitePanelBody>
        </SitePanel>

        <SitePanel className="sticky top-24 h-fit" variant="muted">
          <SitePanelBody className="space-y-4">
            <div className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Article Preview
            </div>
            <img alt="cover preview" className="h-48 w-full object-cover" src={coverUrl} />
            <div className="text-xs text-primary">{selectedCategory?.name ?? "未选择分类"}</div>
            <div className="text-2xl font-semibold text-foreground">{title || "文章标题预览"}</div>
            <p className="text-sm leading-7 text-muted-foreground">
              {summary || "文章摘要会显示在这里。"}
            </p>
            <div
              className="max-h-[340px] overflow-y-auto border-t border-border/60 pt-4 text-sm leading-7 text-foreground/78 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/35 [&_blockquote]:pl-4 [&_figure]:my-4 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_img]:w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{
                __html:
                  articleHtml ||
                  `<p>富文本预览会显示在这里。</p>`
              }}
            />
            <Button asChild className="w-full" variant="outline">
              <Link to={APP_ROUTES.feedHome}>返回首页</Link>
            </Button>
          </SitePanelBody>
        </SitePanel>
      </div>
    </SitePage>
  );
}
