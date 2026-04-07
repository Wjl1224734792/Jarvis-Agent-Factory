import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  CameraIcon,
  ImageIcon,
  PlayIcon,
  SendHorizonalIcon,
  VideoIcon,
  XIcon
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import {
  canAppendMomentImages,
  canReplaceWithMomentVideo,
  canSubmitMomentMedia
} from "./publish-moment-helpers";

const MOMENT_CONTENT_MAX = 1000;

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
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const zoneInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<UploadedVideo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const detailQuery = useQuery({
    queryKey: ["publish-moment-edit", editId],
    queryFn: () => {
      if (!editId) {
        throw new Error("Missing edit id");
      }
      return apiClient.getPostDetail(editId);
    },
    enabled: Boolean(editId)
  });

  useEffect(() => {
    if (!detailQuery.data?.item) {
      return;
    }

    const item = detailQuery.data.item;
    setTitle(item.title);
    setContent(item.content.slice(0, MOMENT_CONTENT_MAX));
    setUploadedImages(
      item.images.map((image) => ({
        id: image.id,
        url: image.url,
        fileName: image.fileName
      }))
    );
    setUploadedVideo(
      item.videos[0]
        ? {
            id: item.videos[0].id,
            url: item.videos[0].url,
            fileName: item.videos[0].fileName
          }
        : null
    );
  }, [detailQuery.data?.item]);

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    if (!canAppendMomentImages(uploadedImages.length, files.length)) {
      setError("动态最多上传 6 张图片。");
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

      setUploadedVideo(null);
      setUploadedImages((current) => [...current, ...nextImages]);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "操作失败，请稍后重试。");
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  async function handleZoneMediaPick(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const list = Array.from(files);
    const videos = list.filter((file) => file.type.startsWith("video/"));
    if (videos.length > 0) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(videos[0]);
      await handleVideoUpload(dataTransfer.files);
      return;
    }

    const images = list.filter((file) => file.type.startsWith("image/"));
    if (images.length > 0) {
      const dataTransfer = new DataTransfer();
      for (const file of images) {
        dataTransfer.items.add(file);
      }
      await handleImageUpload(dataTransfer.files);
    }
  }

  async function handleVideoUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    if (!canReplaceWithMomentVideo(files.length)) {
      setError("动态只支持上传一个视频。");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const file = files[0];
      const uploaded = await apiClient.uploadPostVideo(file);
      setUploadedImages([]);
      setUploadedVideo({
        id: uploaded.item.id,
        url: uploaded.item.url,
        fileName: uploaded.item.fileName
      });
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "操作失败，请稍后重试。");
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

          {detailQuery.data?.item.rejectionReason ? (
            <Alert>
              <AlertTitle>驳回原因</AlertTitle>
              <AlertDescription>{detailQuery.data.item.rejectionReason}</AlertDescription>
            </Alert>
          ) : null}

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-base font-semibold text-foreground">内容</div>
                <div className="flex flex-wrap gap-2">
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
                    {isUploading ? "上传中..." : "上传视频"}
                  </Button>
                </div>
              </div>

              <Input
                onChange={(event) => setTitle(event.target.value)}
                placeholder="标题可选"
                value={title}
              />
              <div className="relative">
                <Textarea
                  className="min-h-[120px] resize-none pb-9 pr-14"
                  maxLength={MOMENT_CONTENT_MAX}
                  onChange={(event) => {
                    const next = event.target.value.slice(0, MOMENT_CONTENT_MAX);
                    setContent(next);
                  }}
                  placeholder="写下你的飞行动态..."
                  value={content}
                />
                <div className="pointer-events-none absolute bottom-2 right-3 text-xs tabular-nums text-muted-foreground">
                  {content.length}/{MOMENT_CONTENT_MAX}
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
              <input
                accept="video/*"
                className="hidden"
                onChange={(event) => {
                  void handleVideoUpload(event.target.files);
                }}
                ref={videoInputRef}
                type="file"
              />
              <input
                accept="image/*,video/*"
                className="hidden"
                multiple
                onChange={(event) => {
                  void handleZoneMediaPick(event.target.files);
                  if (zoneInputRef.current) {
                    zoneInputRef.current.value = "";
                  }
                }}
                ref={zoneInputRef}
                type="file"
              />

              <div className="rounded-[0.9rem] border border-dashed border-border/80 bg-surface-1 px-4 py-3 text-sm text-muted-foreground">
                动态支持多张图片，或一个视频。图片和视频不能同时发布；切换上传类型会自动替换当前媒体。
              </div>

              {uploadedImages.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {uploadedImages.map((image) => (
                    <div className="relative overflow-hidden rounded-[0.9rem] border border-border/70" key={image.id}>
                      <img
                        alt={image.fileName ?? "moment"}
                        className="h-36 w-full object-cover"
                        src={image.url}
                      />
                      <button
                        className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white"
                        onClick={() => {
                          setUploadedImages((current) =>
                            current.filter((item) => item.id !== image.id)
                          );
                        }}
                        type="button"
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {uploadedVideo ? (
                <div className="relative overflow-hidden rounded-[0.9rem] border border-border/70 bg-slate-950">
                  <video className="h-56 w-full object-cover" controls preload="metadata" src={uploadedVideo.url} />
                  <button
                    className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white"
                    onClick={() => {
                      setUploadedVideo(null);
                    }}
                    type="button"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              ) : null}

              {uploadedImages.length === 0 && !uploadedVideo ? (
                <button
                  aria-label="上传图片或视频"
                  className="flex h-32 w-full cursor-pointer items-center justify-center rounded-[0.9rem] border border-dashed border-border/80 bg-surface-1 text-sm text-muted-foreground transition hover:border-primary/35 hover:bg-accent/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isUploading}
                  onClick={() => zoneInputRef.current?.click()}
                  type="button"
                >
                  {isUploading ? "上传中..." : "点击上传图片或视频"}
                </button>
              ) : null}
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="flex flex-wrap justify-end gap-3">
              <Button asChild type="button" variant="outline">
                <Link to={APP_ROUTES.flightCircle}>取消</Link>
              </Button>
              <Button
                disabled={
                  !content.trim() ||
                  isPublishing ||
                  isUploading ||
                  !canSubmitMomentMedia(uploadedImages.length, uploadedVideo ? 1 : 0)
                }
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

                  const submitPost = editId
                    ? (input: Parameters<typeof apiClient.createPost>[0]) => apiClient.updatePost(editId, input)
                    : (input: Parameters<typeof apiClient.createPost>[0]) => apiClient.createPost(input);
                  void submitPost
                    ({
                      type: "moment",
                      title: title.trim() || "飞友圈动态",
                      content,
                      imageIds: uploadedImages.map((item) => item.id),
                      videoIds: uploadedVideo ? [uploadedVideo.id] : []
                    })
                    .then((payload) => {
                      void queryClient.invalidateQueries({ queryKey: ["circle-feed"] });
                      void navigate(buildPublishStatusPath("moment", payload.item.id), {
                        state: {
                          title: title.trim() || "飞友圈动态",
                          description: content.trim().slice(0, 120),
                          imageUrl: uploadedImages[0]?.url ?? null
                        }
                      });
                    })
                    .catch((reason: unknown) => {
                      setError(reason instanceof Error ? reason.message : "操作失败，请稍后重试。");
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
              {uploadedVideo ? (
                <div className="relative overflow-hidden rounded-[0.9rem] border border-border/70 bg-slate-950">
                  <video className="h-48 w-full object-cover" controls preload="metadata" src={uploadedVideo.url} />
                </div>
              ) : (
                <div className="overflow-hidden rounded-[0.9rem] border border-border/70 bg-slate-100">
                  <img alt="preview" className="h-48 w-full object-cover" src={coverUrl} />
                </div>
              )}
              <div className="space-y-2">
                <div className="text-[1.15rem] font-semibold text-foreground">
                  {title || "动态标题"}
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {content || "动态内容会显示在这里。"}
                </p>
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
                <div className="relative">
                  <img alt="card" className="h-32 w-full rounded-[0.75rem] object-cover" src={coverUrl} />
                  {uploadedVideo ? (
                    <span className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white">
                      <PlayIcon className="size-3.5 fill-current" />
                    </span>
                  ) : null}
                </div>
                <div className="mt-2.5 text-sm font-semibold text-foreground">
                  {title || "动态标题"}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {uploadedVideo
                    ? "当前为单视频动态"
                    : uploadedImages.length > 0
                      ? `当前共 ${uploadedImages.length} 张图片`
                      : "未选择媒体"}
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>
        </>
      }
      title="发布动态"
    />
  );
}
