import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { PlayIcon, SendHorizonalIcon, XIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { buildPublishStatusPath } from "../lib/web-routes";
import { getCircleCardHeightClass } from "./circle-page-helpers";
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
      setUploadedVideo({
        id: uploaded.item.id,
        url: uploaded.item.url,
        fileName: uploaded.item.fileName
      });
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "操作失败，请稍后重试。");
    } finally {
      setIsUploading(false);
      if (zoneInputRef.current) {
        zoneInputRef.current.value = "";
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
                        className={cn("w-full object-cover", getCircleCardHeightClass(index))}
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
                  <video className="h-56 w-full object-cover" controls preload="metadata" src={uploadedVideo.url} />
                  <button
                    aria-label="移除视频"
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
              <div className="mx-auto w-full max-w-54 space-y-1.5">
                {uploadedVideo ? (
                  <div className="relative overflow-hidden rounded-[1rem] bg-slate-100">
                    <video
                      className={cn("w-full object-cover", getCircleCardHeightClass(0))}
                      muted
                      playsInline
                      preload="metadata"
                      src={uploadedVideo.url}
                    />
                    <span className="pointer-events-none absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white">
                      <PlayIcon className="size-3.5 fill-current" />
                    </span>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-[1rem] bg-slate-100">
                    <img
                      alt="preview"
                      className={cn("w-full object-cover", getCircleCardHeightClass(0))}
                      src={coverUrl}
                    />
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
