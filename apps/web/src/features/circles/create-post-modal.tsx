import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/auth-store";
import { apiClient } from "@/lib/api-client";
import { useCreatePostDialogStore } from "./create-post-dialog-store";

interface CreatePostModalProps {
  onCreated?: () => void;
  /** 预选圈子 ID — 传入时跳过选择圈子，直接填内容 */
  preselectedCircleId?: string;
  /** 预选圈子名称 — 传入时显示在弹窗中 */
  preselectedCircleName?: string;
}

interface UserCircle {
  id: string;
  slug: string;
  name: string;
  memberCount: number;
  postCount: number;
  coverImageUrl: string | null;
}

type SubmitStatus = "idle" | "submitting" | "success" | "error";

/** 创建帖子弹窗 — 单步表单，居中 Dialog */
export function CreatePostModal({
  onCreated,
  preselectedCircleId,
  preselectedCircleName,
}: CreatePostModalProps) {
  const open = useCreatePostDialogStore((s) => s.open);
  const closeDialog = useCreatePostDialogStore((s) => s.closeDialog);
  const authStatus = useAuthStore((s) => s.status);
  const currentUser = useAuthStore((s) => s.user);

  const isPreselected = Boolean(preselectedCircleId);

  // 圈子选择
  const [selectedCircleId, setSelectedCircleId] = useState<string>(
    preselectedCircleId ?? ""
  );
  const [selectedCircleName, setSelectedCircleName] = useState<string>(
    preselectedCircleName ?? ""
  );

  // 表单字段
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isVideoUploading, setIsVideoUploading] = useState(false);

  // 提交状态
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const titleMaxLength = 31;

  /** 查询用户已加入的圈子列表 */
  const userCirclesQuery = useQuery({
    queryKey: ["user-circles", currentUser?.id],
    queryFn: () => apiClient.listUserCircles(currentUser!.id),
    enabled:
      open &&
      !isPreselected &&
      authStatus === "authenticated" &&
      !!currentUser?.id,
  });

  const userCircles = (userCirclesQuery.data?.items ?? []) as unknown as UserCircle[];
  const isLoadingCircles = userCirclesQuery.isLoading;
  const contentMaxLength = 2000;

  function resetForm() {
    setSelectedCircleId(preselectedCircleId ?? "");
    setSelectedCircleName(preselectedCircleName ?? "");
    setTitle("");
    setContent("");
    setImageIds([]);
    setImagePreviews([]);
    setVideoId(null);
    setVideoPreviewUrl(null);
    setSubmitStatus("idle");
    setErrorMessage(null);
  }

  function handleClose() {
    closeDialog();
    // 如果之前成功发布过，通知父组件刷新列表
    if (submitStatus === "success") {
      onCreated?.();
    }
    resetForm();
  }

  /** 图片上传（复用三段式上传逻辑） */
  async function handleImageUpload(files: FileList) {
    if (videoId) {
      setErrorMessage("已选择视频，无法再添加图片");
      return;
    }

    setIsImageUploading(true);
    setErrorMessage(null);

    try {
      const newImageIds: string[] = [];
      const newPreviews: string[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;

        const init = await apiClient.initUpload({
          bizType: "post-image",
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
        });

        if (init.upload.mode === "presigned-put") {
          await fetch(init.upload.url, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });
        }

        const complete = await apiClient.completeUpload(init.fileId);
        newImageIds.push(complete.item.id);
        newPreviews.push(complete.item.url);
      }

      setImageIds((prev) => [...prev, ...newImageIds]);
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : "图片上传失败");
    } finally {
      setIsImageUploading(false);
    }
  }

  /** 移除图片 */
  function handleRemoveImage(index: number) {
    setImageIds((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  /** 视频上传（复用三段式上传逻辑） */
  async function handleVideoUpload(file: File) {
    if (imageIds.length > 0) {
      setErrorMessage("已选择图片，无法再添加视频");
      return;
    }

    setIsVideoUploading(true);
    setErrorMessage(null);

    try {
      const init = await apiClient.initUpload({
        bizType: "post-video",
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
      });

      if (init.upload.mode === "presigned-put") {
        await fetch(init.upload.url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
      }

      const complete = await apiClient.completeUpload(init.fileId);
      setVideoId(complete.item.id);
      setVideoPreviewUrl(complete.item.url);
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : "视频上传失败");
    } finally {
      setIsVideoUploading(false);
    }
  }

  /** 移除视频 */
  function handleRemoveVideo() {
    setVideoId(null);
    setVideoPreviewUrl(null);
  }

  /** 提交帖子 */
  async function handleSubmit() {
    if (!selectedCircleId) {
      setErrorMessage("请选择目标圈子");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("标题不能为空");
      return;
    }

    if (title.length > titleMaxLength) {
      setErrorMessage(`标题最多 ${titleMaxLength} 个字符`);
      return;
    }

    if (content.length > contentMaxLength) {
      setErrorMessage(`正文最多 ${contentMaxLength} 个字符`);
      return;
    }

    if (imageIds.length > 0 && videoId) {
      setErrorMessage("图片和视频不能同时选择");
      return;
    }

    setSubmitStatus("submitting");
    setErrorMessage(null);

    try {
      await apiClient.createCirclePost(selectedCircleId, {
        title: title.trim(),
        content: content.trim() || undefined,
        images: imageIds.length > 0 ? imageIds : undefined,
        videos: videoId ? [videoId] : undefined,
      });
      setSubmitStatus("success");
    } catch (e: unknown) {
      setSubmitStatus("error");
      const err = e as Record<string, unknown>;
      if (err.code === "SPAM_BLOCKED") {
        setErrorMessage((err.message as string) ?? "暂不满足发布条件");
      } else {
        setErrorMessage((err.message as string) ?? "发布失败，请重试");
      }
    }
  }

  const isUploading = isImageUploading || isVideoUploading;
  const isSubmitting = submitStatus === "submitting";

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        }
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>发布动态</DialogTitle>
          <DialogDescription>
            {selectedCircleName
              ? `发布到 ${selectedCircleName}`
              : "选择圈子并填写内容"}
          </DialogDescription>
        </DialogHeader>

        {/* 发布成功状态 */}
        {submitStatus === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="size-6 text-green-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-foreground">
                发布成功
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                内容审核通过后将公开展示
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 错误提示 */}
            {errorMessage ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}

            {/* 圈子选择（非预选时显示） */}
            {!isPreselected ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  目标圈子 *
                </label>
                {isLoadingCircles ? (
                  <div className="text-sm text-muted-foreground">加载中...</div>
                ) : userCircles.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {authStatus !== "authenticated"
                      ? "请先登录后再选择圈子"
                      : "你还没有加入任何圈子，请先关注圈子"}
                  </div>
                ) : (
                  <select
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    onChange={(e) => {
                      const circle = userCircles.find(
                        (c) => c.id === e.target.value
                      );
                      setSelectedCircleId(circle?.id ?? "");
                      setSelectedCircleName(circle?.name ?? "");
                    }}
                    value={selectedCircleId}
                  >
                    <option value="">请选择圈子</option>
                    {userCircles.map((circle) => (
                      <option key={circle.id} value={circle.id}>
                        {circle.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : null}

            {/* 标题 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-foreground">
                  标题 *
                </div>
                <span
                  className={`text-xs ${
                    title.length > titleMaxLength
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {title.length}/{titleMaxLength}
                </span>
              </div>
              <Input
                disabled={isSubmitting}
                maxLength={titleMaxLength}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入标题（最多 31 字）"
                value={title}
              />
            </div>

            {/* 正文 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-foreground">
                  正文（选填）
                </div>
                <span
                  className={`text-xs ${
                    content.length > contentMaxLength
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {content.length}/{contentMaxLength}
                </span>
              </div>
              <Textarea
                disabled={isSubmitting}
                maxLength={contentMaxLength}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请输入正文（最多 2000 字）"
                value={content}
              />
            </div>

            {/* 图片上传 */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                图片（选填，与视频互斥）
              </div>
              {imagePreviews.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {imagePreviews.map((url, index) => (
                    <div className="relative inline-block" key={url}>
                      <img
                        alt={`图片 ${index + 1}`}
                        className="h-20 w-20 rounded-lg object-cover border border-border/60"
                        src={url}
                      />
                      <button
                        className="absolute -top-2 -right-2 size-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                        disabled={isImageUploading || isSubmitting}
                        onClick={() => handleRemoveImage(index)}
                        type="button"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <input
                accept="image/*"
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
                disabled={isImageUploading || isSubmitting || !!videoId}
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    void handleImageUpload(e.target.files);
                  }
                }}
                type="file"
              />
              {isImageUploading ? (
                <div className="text-xs text-muted-foreground">上传中...</div>
              ) : null}
            </div>

            {/* 视频上传 */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                视频（选填，与图片互斥）
              </div>
              {videoPreviewUrl ? (
                <div className="relative inline-block">
                  <video
                    className="h-28 w-28 rounded-lg object-cover border border-border/60"
                    src={videoPreviewUrl}
                  />
                  <button
                    className="absolute -top-2 -right-2 size-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                    disabled={isVideoUploading || isSubmitting}
                    onClick={handleRemoveVideo}
                    type="button"
                  >
                    x
                  </button>
                </div>
              ) : (
                <input
                  accept="video/*"
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
                  disabled={isVideoUploading || isSubmitting || imageIds.length > 0}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handleVideoUpload(file);
                    }
                  }}
                  type="file"
                />
              )}
              {isVideoUploading ? (
                <div className="text-xs text-muted-foreground">上传中...</div>
              ) : null}
            </div>
          </div>
        )}

        <DialogFooter>
          {submitStatus === "success" ? (
            <Button onClick={handleClose} type="button" variant="default">
              关闭
            </Button>
          ) : (
            <Button
              disabled={
                isUploading ||
                isSubmitting ||
                !selectedCircleId ||
                !title.trim() ||
                title.length > titleMaxLength
              }
              onClick={() => {
                void handleSubmit();
              }}
              type="button"
              variant="hero"
            >
              {isSubmitting ? "发布中..." : "发布"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
