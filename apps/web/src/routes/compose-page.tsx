import { useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  EyeIcon,
  ImageIcon,
  Link2Icon,
  ListIcon,
  QuoteIcon,
  SaveIcon,
  SendHorizonalIcon,
  Settings2Icon,
  SparklesIcon,
  VideoIcon,
  XIcon
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  SiteGrid,
  SitePage,
  SitePageDescription,
  SitePageEyebrow,
  SitePageHead,
  SitePageTitle,
  SitePanel,
  SitePanelBody,
  SiteRail
} from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "../lib/api-client";
import { getAvatarImage, getEditorialImage } from "../lib/aviation-media";

const contentTypes = [
  { id: "short", label: "动态 (Short)", icon: ImageIcon },
  { id: "article", label: "长文章 (Article)", icon: ListIcon },
  { id: "video", label: "飞行视频 (Video)", icon: VideoIcon }
] as const;

const suggestedTags = ["# Boeing 737-800", "# 模拟飞行", "# 晨光航线", "# 飞行日志"] as const;

type ContentType = (typeof contentTypes)[number]["id"];
type UploadedImage = Awaited<ReturnType<typeof apiClient.uploadPostImage>>["item"];

export function ComposePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [contentType, setContentType] = useState<ContentType>("short");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [tags, setTags] = useState<string[]>([suggestedTags[0]!, suggestedTags[1]!]);
  const [coverImage, setCoverImage] = useState<string>(getEditorialImage("compose-cover"));
  const [saveHint, setSaveHint] = useState<string | null>("草稿自动保存于 14:02");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const canPublish = title.trim().length >= 2 && content.trim().length > 0 && !isUploading;

  const previewLabel = useMemo(() => {
    switch (contentType) {
      case "article":
        return "ARTICLE";
      case "video":
        return "VIDEO";
      default:
        return "SHORT";
    }
  }, [contentType]);

  function toggleTag(tag: string) {
    setTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  }

  function handleDraftSave() {
    setSaveHint(
      `草稿已保存于 ${new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit"
      })}`
    );
  }

  return (
    <SitePage>
      <SitePanel>
        <SitePanelBody className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Button asChild size="icon-lg" variant="ghost">
              <Link to={APP_ROUTES.feedHome}>←</Link>
            </Button>
            <SitePageHead className="gap-1 px-0">
              <SitePageEyebrow>AeroEditor</SitePageEyebrow>
              <SitePageTitle className="text-3xl">发布内容</SitePageTitle>
              <SitePageDescription className="text-sm">{saveHint}</SitePageDescription>
            </SitePageHead>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleDraftSave} type="button" variant="panel">
              <SaveIcon data-icon="inline-start" />
              Save Draft
            </Button>
            <Button
              disabled={!canPublish || isPublishing}
              onClick={() => {
                setSubmitError(null);
                setIsPublishing(true);

                void apiClient
                  .createPost({
                    title,
                    content,
                    imageIds: uploadedImages.map((item) => item.id)
                  })
                  .then((payload) => {
                    void queryClient.invalidateQueries({ queryKey: ["home-feed"] });
                    navigate(APP_ROUTES.postDetail.replace(":id", payload.item.id));
                  })
                  .catch((reason: unknown) => {
                    setSubmitError(reason instanceof Error ? reason.message : "发布失败");
                  })
                  .finally(() => {
                    setIsPublishing(false);
                  });
              }}
              type="button"
              variant="hero"
            >
              <SendHorizonalIcon data-icon="inline-start" />
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </SitePanelBody>
      </SitePanel>

      <SiteGrid className="xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <SitePanel>
            <SitePanelBody className="space-y-8">
              <Tabs
                onValueChange={(value) => {
                  setContentType(value as ContentType);
                }}
                value={contentType}
              >
                <TabsList className="w-full justify-start overflow-x-auto" variant="pills">
                  {contentTypes.map((item) => {
                    const Icon = item.icon;
                    return (
                      <TabsTrigger key={item.id} value={item.id}>
                        <Icon data-icon="inline-start" />
                        {item.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>

              <div className="space-y-6">
                <Input
                  className="h-20 border-0 px-0 text-5xl font-semibold shadow-none focus-visible:ring-0"
                  onChange={(event) => {
                    setTitle(event.target.value);
                  }}
                  placeholder="请输入标题..."
                  value={title}
                />

                <div className="flex items-center gap-4 border-y border-border/80 py-4 text-muted-foreground">
                  <Button size="icon-sm" type="button" variant="ghost">
                    <span className="text-xl font-semibold">B</span>
                  </Button>
                  <Button size="icon-sm" type="button" variant="ghost">
                    <span className="text-xl italic">I</span>
                  </Button>
                  <Button size="icon-sm" type="button" variant="ghost">
                    <ListIcon />
                  </Button>
                  <Button size="icon-sm" type="button" variant="ghost">
                    <Link2Icon />
                  </Button>
                  <Button size="icon-sm" type="button" variant="ghost">
                    <QuoteIcon />
                  </Button>
                </div>

                <Textarea
                  className="min-h-[420px] resize-none border-0 px-0 text-lg leading-9 shadow-none focus-visible:ring-0"
                  onChange={(event) => {
                    setContent(event.target.value);
                  }}
                  placeholder="在这里记录你的飞行灵感..."
                  value={content}
                />

                <SitePanel variant="muted">
                  <SitePanelBody className="space-y-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold text-foreground">添加媒体素材</div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          上传航拍照片、飞行视频封面或驾驶舱记录，让内容更完整。
                        </div>
                      </div>
                      <Button asChild type="button" variant="panel">
                        <label className="cursor-pointer">
                          <ImageIcon data-icon="inline-start" />
                          {isUploading ? "Uploading..." : "Add Media"}
                          <input
                            accept="image/*"
                            className="hidden"
                            multiple
                            onChange={(event) => {
                              const files = Array.from(event.target.files ?? []);
                              event.target.value = "";

                              if (files.length === 0) {
                                return;
                              }

                              setIsUploading(true);
                              setSubmitError(null);

                              void Promise.all(files.map((file) => apiClient.uploadPostImage(file)))
                                .then((payload) => {
                                  const nextImages = payload.map((item) => item.item);
                                  setUploadedImages((current) => [...current, ...nextImages].slice(0, 4));
                                  if (nextImages[0]) {
                                    setCoverImage(nextImages[0].url);
                                  }
                                })
                                .catch((reason: unknown) => {
                                  setSubmitError(reason instanceof Error ? reason.message : "上传媒体失败");
                                })
                                .finally(() => {
                                  setIsUploading(false);
                                });
                            }}
                            type="file"
                          />
                        </label>
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {uploadedImages.length > 0 ? (
                        uploadedImages.map((item) => (
                          <div
                            className="overflow-hidden rounded-[var(--radius-control)] border border-border/80 bg-background"
                            key={item.id}
                          >
                            <img alt={item.fileName} className="h-44 w-full object-cover" src={item.url} />
                            <div className="flex items-center justify-between gap-3 px-4 py-3">
                              <span className="truncate text-sm text-muted-foreground">{item.fileName}</span>
                              <Button
                                onClick={() => {
                                  setUploadedImages((current) => current.filter((image) => image.id !== item.id));
                                }}
                                size="icon-sm"
                                type="button"
                                variant="ghost"
                              >
                                <XIcon />
                                <span className="sr-only">移除媒体</span>
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex min-h-56 items-center justify-center rounded-[var(--radius-control)] border border-dashed border-border/80 bg-background/72 text-sm text-muted-foreground">
                          Add Media
                        </div>
                      )}
                    </div>
                  </SitePanelBody>
                </SitePanel>
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-5">
              <div className="flex items-center gap-3 text-xl font-semibold text-foreground">
                <SparklesIcon className="size-5 text-primary" />
                关联机型与标签
              </div>
              <div className="flex flex-wrap gap-3">
                {suggestedTags.map((tag) => (
                  <button
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      tags.includes(tag)
                        ? "border-primary/20 bg-primary/8 text-primary"
                        : "border-border/80 bg-background text-muted-foreground hover:text-foreground"
                    }`}
                    key={tag}
                    onClick={() => {
                      toggleTag(tag);
                    }}
                    type="button"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </SitePanelBody>
          </SitePanel>

          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>操作失败</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <SiteRail>
          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="flex items-center gap-3 text-xl font-semibold text-foreground">
                <ImageIcon className="size-5 text-primary" />
                设置封面
              </div>
              <div className="overflow-hidden rounded-[var(--radius-control)] border border-border/80">
                <img alt="cover preview" className="h-48 w-full object-cover" src={coverImage} />
              </div>
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Recommended: 16:9, max 5 MB
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-5">
              <div className="flex items-center gap-3 text-xl font-semibold text-foreground">
                <EyeIcon className="size-5 text-primary" />
                实时预览
              </div>
              <div className="rounded-[var(--radius-control)] border border-border/80 bg-background/72 p-5">
                <div className="flex items-center gap-3">
                  <img
                    alt="author avatar"
                    className="size-10 rounded-full object-cover"
                    src={getAvatarImage("compose-preview")}
                  />
                  <div>
                    <div className="font-medium text-foreground">Aero_Explorer</div>
                    <div className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                      {previewLabel}
                    </div>
                  </div>
                </div>
                <div className="mt-5 text-2xl font-semibold leading-tight text-foreground">
                  {title || "你的标题将显示在这里"}
                </div>
                <div className="mt-4 text-sm leading-7 text-muted-foreground">
                  {content || "实时预览会根据你的输入更新摘要、标签和主视觉。"}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge className="rounded-full px-3 py-1" key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="highlight">
            <SitePanelBody className="space-y-3">
              <div className="flex items-center gap-3 text-xl font-semibold">
                <Settings2Icon className="size-5" />
                内容审核提示
              </div>
              <p className="text-sm leading-7 text-panel-highlight-foreground/86">
                检测到标题可能带有高热话题，请确保内容符合社区安全准则，避免误导性飞行建议。
              </p>
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="muted">
            <SitePanelBody className="space-y-4">
              <div className="text-lg font-semibold tracking-[0.24em] text-foreground">
                Publishing Guidelines
              </div>
              {[
                "首选高质量航空摄影作品，提升社区整体专业度。",
                "详细标注机型与注册号，方便其他飞友索引及交流。",
                "严禁发布非法入侵机场禁区或干扰飞行安全的影像资料。"
              ].map((rule, index) => (
                <div className="flex items-start gap-3" key={rule}>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-7 text-muted-foreground">{rule}</span>
                </div>
              ))}
            </SitePanelBody>
          </SitePanel>
        </SiteRail>
      </SiteGrid>
    </SitePage>
  );
}
