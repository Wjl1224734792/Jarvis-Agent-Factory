import { useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { CameraIcon, ImageIcon, SendHorizonalIcon, VideoIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PublishShell } from "@/components/publish-shell";
import { SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { apiClient } from "../lib/api-client";
import { buildPublishStatusPath } from "../lib/web-routes";
import { getEditorialImage } from "../lib/aviation-media";

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

export function PublishMomentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const promptLogin = useLoginPrompt();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    if (uploadedImages.length + files.length > 6) {
      setError("最多上传 6 张图片。");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const nextImages: UploadedImage[] = [];
      for (const file of Array.from(files)) {
        const uploaded = await apiClient.uploadPostImage(file);
        nextImages.push({
          id: uploaded.item.id,
          url: uploaded.item.url,
          fileName: uploaded.item.fileName
        });
      }
      setUploadedImages((current) => [...current, ...nextImages]);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "图片上传失败");
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  async function handleVideoUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    if (uploadedVideos.length + files.length > 2) {
      setError("动态最多上传 2 个视频。");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const nextVideos: UploadedVideo[] = [];
      for (const file of Array.from(files)) {
        const uploaded = await apiClient.uploadPostVideo(file);
        nextVideos.push({
          id: uploaded.item.id,
          url: uploaded.item.url,
          fileName: uploaded.item.fileName
        });
      }
      setUploadedVideos((current) => [...current, ...nextVideos]);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "视频上传失败");
    } finally {
      setIsUploading(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
    }
  }

  const coverUrl = uploadedImages[0]?.url ?? getEditorialImage("moment-create");

  return (
    <PublishShell
      description="飞友圈动态"
      eyebrow="动态"
      main={
        <>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>动态发布失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-base font-semibold text-foreground">内容</div>
                <Button
                  onClick={() => imageInputRef.current?.click()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <CameraIcon data-icon="inline-start" />
                  {isUploading ? "上传中..." : "添加图片"}
                </Button>
                <Button
                  onClick={() => videoInputRef.current?.click()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <VideoIcon data-icon="inline-start" />
                  {isUploading ? "上传中..." : "添加视频"}
                </Button>
              </div>

              <Input
                onChange={(event) => setTitle(event.target.value)}
                placeholder="标题可选"
                value={title}
              />
              <Textarea
                className="min-h-[220px]"
                onChange={(event) => setContent(event.target.value)}
                placeholder="写下你的飞行动态..."
                value={content}
              />

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
              <input
                accept="video/*"
                className="hidden"
                multiple
                onChange={(event) => {
                  void handleVideoUpload(event.target.files);
                }}
                ref={videoInputRef}
                type="file"
              />

              <div className="grid gap-3 sm:grid-cols-3">
                {uploadedImages.map((image) => (
                  <div className="relative overflow-hidden rounded-[0.9rem] border border-border/70" key={image.id}>
                    <img alt={image.fileName ?? "moment"} className="h-32 w-full object-cover" src={image.url} />
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

              {uploadedVideos.length > 0 ? (
                <div className="grid gap-3">
                  {uploadedVideos.map((video) => (
                    <div className="relative overflow-hidden rounded-[0.9rem] border border-border/70 bg-slate-950" key={video.id}>
                      <video className="h-44 w-full object-cover" controls preload="metadata" src={video.url} />
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
              ) : null}

              {uploadedImages.length === 0 && uploadedVideos.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-[0.9rem] border border-dashed border-border/80 bg-surface-1 text-sm text-muted-foreground">
                  还没有上传图片或视频
                </div>
              ) : null}
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="flex flex-wrap justify-end gap-3">
              <Button asChild type="button" variant="outline">
                <Link to={APP_ROUTES.flightCircle}>取消</Link>
              </Button>
              <Button
                disabled={!content.trim() || isPublishing || isUploading}
                onClick={() => {
                  if (
                    !promptLogin({
                      title: "登录后才能发布动态",
                      description: "发布动态前请先登录。"
                    })
                  ) {
                    return;
                  }
                  setError(null);
                  setIsPublishing(true);

                  void apiClient
                    .createPost({
                      type: "moment",
                      title: title.trim() || "飞友圈动态",
                      content,
                      imageIds: uploadedImages.map((item) => item.id),
                      videoIds: uploadedVideos.map((item) => item.id)
                    })
                    .then((payload) => {
                      void queryClient.invalidateQueries({ queryKey: ["circle-feed"] });
                      navigate(buildPublishStatusPath("moment", payload.item.id), {
                        state: {
                          title: title.trim() || "飞友圈动态",
                          description: content.trim().slice(0, 120),
                          imageUrl: uploadedImages[0]?.url ?? null
                        }
                      });
                    })
                    .catch((reason: unknown) => {
                      setError(reason instanceof Error ? reason.message : "动态发布失败");
                    })
                    .finally(() => {
                      setIsPublishing(false);
                    });
                }}
                type="button"
                variant="hero"
              >
                <SendHorizonalIcon data-icon="inline-start" />
                {isPublishing ? "提交中..." : "提交动态"}
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
              {uploadedVideos[0] ? (
                <div className="overflow-hidden rounded-[0.9rem] border border-border/70 bg-slate-950">
                  <video className="h-48 w-full object-cover" controls preload="metadata" src={uploadedVideos[0].url} />
                </div>
              ) : (
                <div className="overflow-hidden rounded-[0.9rem] border border-border/70 bg-slate-100">
                  <img alt="preview" className="h-48 w-full object-cover" src={coverUrl} />
                </div>
              )}
              <div className="space-y-2">
                <div className="text-[1.15rem] font-semibold text-foreground">{title || "动态标题"}</div>
                <p className="text-sm leading-6 text-muted-foreground">{content || "动态内容会显示在这里。"}</p>
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="muted">
            <SitePanelBody className="space-y-3">
              <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                <ImageIcon className="size-4.5 text-primary" />
                飞友圈卡片
              </div>
              <div className="rounded-[0.9rem] border border-border bg-white p-2.5">
                <img alt="card" className="h-32 w-full rounded-[0.75rem] object-cover" src={coverUrl} />
                <div className="mt-2.5 text-sm font-semibold text-foreground">{title || "动态标题"}</div>
              </div>
            </SitePanelBody>
          </SitePanel>
        </>
      }
      title="发布动态"
    />
  );
}
