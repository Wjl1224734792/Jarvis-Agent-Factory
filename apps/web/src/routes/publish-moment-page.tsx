import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { FileImageIcon, PlayIcon, SendHorizonalIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PublishMomentPageSkeleton } from "@/components/page-skeletons";
import { PublishShell } from "@/components/publish-shell";
import { SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { apiClient } from "../lib/api-client";
import { cn } from "@/lib/utils";
import { buildPublishStatusPath } from "../lib/web-routes";
import { getCircleCardMediaAspectClass } from "./circle-page-helpers";
import {
  canAppendMomentImages,
  canReplaceWithMomentVideo,
  canSubmitMomentMedia
} from "./publish-moment-helpers";

const MOMENT_CONTENT_MAX = 1000;
const VIDEO_COVER_RATIO_DEFAULT = 10;

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

async function captureVideoFrameAsJpegFile(videoUrl: string, seekRatio: number): Promise<File> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.src = videoUrl;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("无法加载视频，请稍后重试或改用手动封面。"));
  });

  const normalizedRatio = Number.isFinite(seekRatio) ? Math.min(1, Math.max(0, seekRatio)) : 0;
  const seekTime =
    Number.isFinite(video.duration) && video.duration > 0
      ? video.duration * normalizedRatio
      : 0.05;

  await new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", () => reject(new Error("无法定位到视频帧。")), { once: true });
    video.currentTime = seekTime;
  });

  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) {
    video.removeAttribute("src");
    video.load();
    throw new Error("无法读取视频画面，请改用手动封面。");
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    video.removeAttribute("src");
    video.load();
    throw new Error("无法生成视频封面。");
  }

  try {
    ctx.drawImage(video, 0, 0, w, h);
  } catch {
    video.removeAttribute("src");
    video.load();
    throw new Error("无法截取视频画面（可能被跨域限制），请改用手动封面。");
  }

  video.removeAttribute("src");
  video.load();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.9);
  });
  if (!blob) {
    throw new Error("视频封面导出失败。");
  }

  return new File([blob], "moment-video-cover.jpg", { type: "image/jpeg" });
}

export function PublishMomentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const promptLogin = useLoginPrompt();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const zoneInputRef = useRef<HTMLInputElement | null>(null);
  const videoCoverInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedImageCoverId, setSelectedImageCoverId] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<UploadedVideo | null>(null);
  const [videoCoverImage, setVideoCoverImage] = useState<UploadedImage | null>(null);
  const [videoCoverSource, setVideoCoverSource] = useState<"frame" | "manual">("frame");
  const [videoFrameRatio, setVideoFrameRatio] = useState(VIDEO_COVER_RATIO_DEFAULT);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [isCapturingVideoFrame, setIsCapturingVideoFrame] = useState(false);
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

  const uploadVideoFrameCover = useCallback(
    async (videoUrl: string, ratio: number) => {
      setError(null);
      setIsCapturingVideoFrame(true);
      try {
        const frameFile = await captureVideoFrameAsJpegFile(videoUrl, ratio);
        const uploaded = await apiClient.uploadPostImage(frameFile);
        setVideoCoverImage({
          id: uploaded.item.id,
          url: uploaded.item.url,
          fileName: uploaded.item.fileName
        });
        setVideoCoverSource("frame");
      } catch (reason: unknown) {
        setError(reason instanceof Error ? reason.message : "封面生成失败，请稍后重试。");
      } finally {
        setIsCapturingVideoFrame(false);
      }
    },
    []
  );

  const handleManualVideoCoverUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      const uploaded = await apiClient.uploadPostImage(files[0]);
      setVideoCoverImage({
        id: uploaded.item.id,
        url: uploaded.item.url,
        fileName: uploaded.item.fileName
      });
      setVideoCoverSource("manual");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "封面上传失败，请稍后重试。");
    } finally {
      setIsUploading(false);
      if (videoCoverInputRef.current) {
        videoCoverInputRef.current.value = "";
      }
    }
  }, []);

  useEffect(() => {
    if (!detailQuery.data?.item) {
      return;
    }

    const item = detailQuery.data.item;
    setTitle(item.title);
    setContent(item.content.slice(0, MOMENT_CONTENT_MAX));
    const nextImages = item.images.map((image) => ({
      id: image.id,
      url: image.url,
      fileName: image.fileName
    }));
    const nextVideo = item.videos[0]
      ? {
          id: item.videos[0].id,
          url: item.videos[0].url,
          fileName: item.videos[0].fileName
        }
      : null;
    const nextCover = item.cover
      ? {
          id: item.cover.id,
          url: item.cover.url,
          fileName: item.cover.fileName
        }
      : null;

    if (nextVideo) {
      setUploadedVideo(nextVideo);
      setUploadedImages([]);
      setSelectedImageCoverId(null);
      setVideoCoverImage(nextCover);
      setVideoCoverSource(nextCover ? "manual" : "frame");
      setVideoFrameRatio(VIDEO_COVER_RATIO_DEFAULT);
      setVideoDuration(null);
      return;
    }

    setUploadedVideo(null);
    setVideoCoverImage(null);
    setVideoDuration(null);
    setUploadedImages(nextImages);
    const fallbackImageCoverId =
      nextCover && nextImages.some((image) => image.id === nextCover.id)
        ? nextCover.id
        : nextImages[0]?.id ?? null;
    setSelectedImageCoverId(fallbackImageCoverId);
  }, [detailQuery.data?.item]);

  useEffect(() => {
    if (uploadedImages.length === 0) {
      if (selectedImageCoverId !== null) {
        setSelectedImageCoverId(null);
      }
      return;
    }

    if (selectedImageCoverId && uploadedImages.some((image) => image.id === selectedImageCoverId)) {
      return;
    }
    setSelectedImageCoverId(uploadedImages[0]?.id ?? null);
  }, [uploadedImages, selectedImageCoverId]);

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    if (!canAppendMomentImages(uploadedImages.length, files.length)) {
      setError("图片上传失败，请稍后重试。");
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
      setVideoCoverImage(null);
      setVideoDuration(null);
      setVideoFrameRatio(VIDEO_COVER_RATIO_DEFAULT);
      setUploadedImages((current) => [...current, ...nextImages]);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "操作失败，请稍后重试。");
    } finally {
      setIsUploading(false);
      if (zoneInputRef.current) {
        zoneInputRef.current.value = "";
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
      setSelectedImageCoverId(null);
      setUploadedVideo({
        id: uploaded.item.id,
        url: uploaded.item.url,
        fileName: uploaded.item.fileName
      });
      setVideoFrameRatio(VIDEO_COVER_RATIO_DEFAULT);
      setVideoDuration(null);
      await uploadVideoFrameCover(uploaded.item.url, VIDEO_COVER_RATIO_DEFAULT / 100);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "操作失败，请稍后重试。");
    } finally {
      setIsUploading(false);
      if (zoneInputRef.current) {
        zoneInputRef.current.value = "";
      }
    }
  }

  const selectedImageCover =
    selectedImageCoverId
      ? uploadedImages.find((image) => image.id === selectedImageCoverId) ?? null
      : uploadedImages[0] ?? null;
  const submitCoverImageId = uploadedVideo
    ? videoCoverImage?.id ?? null
    : selectedImageCover?.id ?? null;
  const previewImageUrl = uploadedVideo
    ? videoCoverImage?.url ?? null
    : selectedImageCover?.url ?? null;
  const selectedFrameSecondText =
    videoDuration && Number.isFinite(videoDuration)
      ? `${((videoDuration * videoFrameRatio) / 100).toFixed(1)}s`
      : null;

  if (editId && detailQuery.isLoading) {
    return <PublishMomentPageSkeleton />;
  }

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
              <div className="text-base font-semibold text-foreground">内容</div>

              <input
                accept="image/*,video/*"
                aria-label="选择动态图片或视频"
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

              <p className="text-sm leading-relaxed text-muted-foreground">
                支持多张图片或单个视频，二者不可同时使用；切换类型会替换当前已选媒体。
              </p>

              {uploadedImages.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {uploadedImages.map((image, index) => (
                    <div
                      className="relative overflow-hidden rounded-[1rem] border border-border/70 bg-slate-100"
                      key={image.id}
                    >
                      <img
                        alt={image.fileName ?? "moment"}
                        className={cn("w-full object-cover", getCircleCardMediaAspectClass(index))}
                        src={image.url}
                      />
                      <button
                        aria-label="移除该图片"
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
                      <button
                        className={cn(
                          "absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[0.7rem] font-medium",
                          selectedImageCoverId === image.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-black/55 text-white"
                        )}
                        onClick={() => setSelectedImageCoverId(image.id)}
                        type="button"
                      >
                        {selectedImageCoverId === image.id ? "当前封面" : "设为封面"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {uploadedImages.length > 0 && !uploadedVideo ? (
                <button
                  aria-label="继续添加图片"
                  className="w-full rounded-[1rem] border border-dashed border-border/80 bg-surface-1 py-3 text-sm text-muted-foreground transition hover:border-primary/35 hover:bg-accent/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isUploading}
                  onClick={() => zoneInputRef.current?.click()}
                  type="button"
                >
                  {isUploading ? "上传中..." : "继续添加图片"}
                </button>
              ) : null}

              {uploadedVideo ? (
                <div className="relative overflow-hidden rounded-[1rem] border border-border/70 bg-slate-950">
                  <video
                    className="h-56 w-full object-cover"
                    controls
                    onLoadedMetadata={(event) => {
                      const duration = event.currentTarget.duration;
                      setVideoDuration(Number.isFinite(duration) && duration > 0 ? duration : null);
                    }}
                    preload="metadata"
                    src={uploadedVideo.url}
                  />
                  <button
                    aria-label="移除视频"
                    className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white"
                    onClick={() => {
                      setUploadedVideo(null);
                      setVideoCoverImage(null);
                      setVideoDuration(null);
                    }}
                    type="button"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              ) : null}

              {uploadedVideo ? (
                <div className="space-y-3 rounded-[1rem] border border-border/70 bg-surface-1 p-3">
                  <div className="text-xs font-medium text-muted-foreground">视频封面</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => setVideoCoverSource("frame")}
                      size="sm"
                      type="button"
                      variant={videoCoverSource === "frame" ? "default" : "outline"}
                    >
                      选帧生成
                    </Button>
                    <Button
                      onClick={() => setVideoCoverSource("manual")}
                      size="sm"
                      type="button"
                      variant={videoCoverSource === "manual" ? "default" : "outline"}
                    >
                      手动上传
                    </Button>
                  </div>
                  {videoCoverSource === "frame" ? (
                    <div className="space-y-2">
                      <label className="block text-xs text-muted-foreground">
                        帧位置 {selectedFrameSecondText ? `(${selectedFrameSecondText})` : ""}
                      </label>
                      <input
                        aria-label="视频封面选帧位置"
                        className="w-full"
                        max={100}
                        min={0}
                        onChange={(event) => setVideoFrameRatio(Number(event.target.value))}
                        step={1}
                        type="range"
                        value={videoFrameRatio}
                      />
                      <Button
                        disabled={isCapturingVideoFrame || !uploadedVideo}
                        onClick={() => {
                          if (!uploadedVideo) {
                            return;
                          }
                          void uploadVideoFrameCover(uploadedVideo.url, videoFrameRatio / 100);
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {isCapturingVideoFrame ? "生成中..." : "使用当前帧生成封面"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => videoCoverInputRef.current?.click()}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <FileImageIcon data-icon="inline-start" />
                      上传封面图
                    </Button>
                  )}
                  <input
                    accept="image/*"
                    aria-label="上传视频封面图片"
                    className="hidden"
                    onChange={(event) => {
                      void handleManualVideoCoverUpload(event.target.files);
                    }}
                    ref={videoCoverInputRef}
                    type="file"
                  />
                  {videoCoverImage ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <img
                        alt="video cover"
                        className="h-12 w-16 rounded-md border border-border/70 object-cover"
                        src={videoCoverImage.url}
                      />
                      当前封面已设置
                    </div>
                  ) : null}
                </div>
              ) : null}

              {uploadedImages.length === 0 && !uploadedVideo ? (
                <button
                  aria-label="上传图片或视频"
                  className="flex min-h-32 w-full cursor-pointer items-center justify-center rounded-[1rem] border border-dashed border-border/80 bg-surface-1 text-sm text-muted-foreground transition hover:border-primary/35 hover:bg-accent/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isUploading}
                  onClick={() => zoneInputRef.current?.click()}
                  type="button"
                >
                  {isUploading ? "上传中..." : "点击上传图片或视频"}
                </button>
              ) : null}

              <Input
                onChange={(event) => setTitle(event.target.value)}
                placeholder="请输入标题（必填）"
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
                  placeholder="正文（可选），也可仅上传图片或视频"
                  value={content}
                />
                <div className="pointer-events-none absolute bottom-2 right-3 text-xs tabular-nums text-muted-foreground">
                  {content.length}/{MOMENT_CONTENT_MAX}
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="flex flex-wrap justify-end gap-3">
              <Button asChild type="button" variant="outline">
                <Link to={APP_ROUTES.flightCircle}>取消</Link>
              </Button>
              <Button
                disabled={
                  !title.trim() ||
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

                  if (!title.trim()) {
                    setError("请填写标题。");
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
                      title: title.trim(),
                      content,
                      coverImageId: submitCoverImageId,
                      imageIds: uploadedImages.map((item) => item.id),
                      videoIds: uploadedVideo ? [uploadedVideo.id] : []
                    })
                    .then((payload) => {
                      void queryClient.invalidateQueries({ queryKey: ["circle-feed"] });
                      void navigate(buildPublishStatusPath("moment", payload.item.id), {
                        state: {
                          title: title.trim(),
                          description: content.trim().slice(0, 120),
                          imageUrl: previewImageUrl
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
              <div className="mx-auto w-full max-w-54 space-y-1.5">
                {uploadedVideo ? (
                  <div className="relative overflow-hidden rounded-[1rem] bg-slate-100">
                    {previewImageUrl ? (
                      <img
                        alt="preview"
                        className={cn("w-full object-cover", getCircleCardMediaAspectClass(0))}
                        src={previewImageUrl}
                      />
                    ) : (
                      <video
                        className={cn("w-full object-cover", getCircleCardMediaAspectClass(0))}
                        muted
                        playsInline
                        preload="metadata"
                        src={uploadedVideo.url}
                      />
                    )}
                    <span className="pointer-events-none absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white">
                      <PlayIcon className="size-3.5 fill-current" />
                    </span>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-[1rem] bg-slate-100">
                    {previewImageUrl ? (
                      <img
                        alt="preview"
                        className={cn("w-full object-cover", getCircleCardMediaAspectClass(0))}
                        src={previewImageUrl}
                      />
                    ) : (
                      <div
                        className={cn(
                          "flex w-full items-center justify-center bg-slate-100 text-xs text-muted-foreground",
                          getCircleCardMediaAspectClass(0)
                        )}
                      >
                        未设置封面
                      </div>
                    )}
                    {uploadedImages.length > 1 ? (
                      <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[0.7rem] font-medium text-white">
                        共 {uploadedImages.length} 张
                      </span>
                    ) : null}
                  </div>
                )}
                <div className="space-y-1 px-0.5 pb-0.5 pt-1.5">
                  <h2 className="line-clamp-2 text-[0.88rem] leading-[1.32rem] font-semibold text-foreground">
                    {title || "动态标题"}
                  </h2>
                  <p className="line-clamp-2 text-[0.82rem] leading-[1.35rem] text-foreground/72">
                    {content || "动态内容会显示在这里。"}
                  </p>
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
