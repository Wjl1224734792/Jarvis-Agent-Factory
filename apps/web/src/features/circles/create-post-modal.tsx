import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/features/auth/auth-store";
import { apiClient } from "@/lib/api-client";
import { useCreatePostDialogStore } from "./create-post-dialog-store";

interface CreatePostModalProps {
  onCreated?: () => void;
  /** 预选圈子 ID — 传入时跳过步骤 1（选择圈子），直接进入步骤 2 */
  preselectedCircleId?: string;
  /** 预选圈子名称 — 传入时显示在弹窗标题中 */
  preselectedCircleName?: string;
  /** 预选圈子封面 — 传入时显示在弹窗标题中 */
  preselectedCircleCoverUrl?: string | null;
}

interface UserCircle {
  id: string;
  slug: string;
  name: string;
  memberCount: number;
  postCount: number;
  coverImageUrl: string | null;
}

/** 创建帖子弹窗 — 支持选择圈子 + 填写内容 */
export function CreatePostModal({
  onCreated,
  preselectedCircleId,
  preselectedCircleName,
  preselectedCircleCoverUrl,
}: CreatePostModalProps) {
  const open = useCreatePostDialogStore((s) => s.open);
  const closeDialog = useCreatePostDialogStore((s) => s.closeDialog);
  const currentUser = useAuthStore((s) => s.user);

  const isPreselected = Boolean(preselectedCircleId);

  // 步骤状态：1 = 选择圈子，2 = 填写内容；预选时直接到步骤 2
  const [step, setStep] = useState<1 | 2>(isPreselected ? 2 : 1);
  const [selectedCircle, setSelectedCircle] = useState<UserCircle | null>(
    isPreselected
      ? {
          id: preselectedCircleId!,
          slug: "",
          name: preselectedCircleName ?? "",
          memberCount: 0,
          postCount: 0,
          coverImageUrl: preselectedCircleCoverUrl ?? null,
        }
      : null
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 用户已加入的圈子列表
  const [userCircles, setUserCircles] = useState<UserCircle[]>([]);
  const [isLoadingCircles, setIsLoadingCircles] = useState(false);

  function resetForm() {
    setStep(isPreselected ? 2 : 1);
    setSelectedCircle(
      isPreselected
        ? {
            id: preselectedCircleId!,
            slug: "",
            name: preselectedCircleName ?? "",
            memberCount: 0,
            postCount: 0,
            coverImageUrl: preselectedCircleCoverUrl ?? null,
          }
        : null
    );
    setTitle("");
    setContent("");
    setImageIds([]);
    setImagePreviews([]);
    setVideoId(null);
    setVideoPreviewUrl(null);
    setError(null);
  }

  function handleClose() {
    closeDialog();
    resetForm();
  }

  /** 打开弹窗时加载用户圈子列表 */
  const loadUserCircles = useCallback(async () => {
    if (!currentUser?.id) {
      setError("请先登录");
      return;
    }
    setIsLoadingCircles(true);
    try {
      const result = await apiClient.listUserCircles(currentUser.id);
      const circles = (result.items ?? []) as unknown as UserCircle[];
      setUserCircles(circles);
    } catch {
      setError("加载圈子列表失败");
    } finally {
      setIsLoadingCircles(false);
    }
  }, [currentUser?.id]);

  // 弹窗打开时自动加载用户圈子列表（受控 open 由 zustand store 驱动，
  // onOpenChange 仅在用户交互时触发，需 useEffect 监听）
  useEffect(() => {
    if (open && !isPreselected) {
      void loadUserCircles();
    }
  }, [open, isPreselected, loadUserCircles]);

  /** 选择圈子后进入步骤 2 */
  function handleSelectCircle(circle: UserCircle) {
    setSelectedCircle(circle);
    setStep(2);
  }

  /** 图片上传 */
  async function handleImageUpload(files: FileList) {
    if (videoId) {
      setError("已选择视频，无法再添加图片");
      return;
    }

    setIsImageUploading(true);
    setError(null);

    try {
      const newImageIds: string[] = [];
      const newPreviews: string[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          continue;
        }

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
      setError(e instanceof Error ? e.message : "图片上传失败");
    } finally {
      setIsImageUploading(false);
    }
  }

  /** 移除图片 */
  function handleRemoveImage(index: number) {
    setImageIds((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  /** 视频上传 */
  async function handleVideoUpload(file: File) {
    if (imageIds.length > 0) {
      setError("已选择图片，无法再添加视频");
      return;
    }

    setIsVideoUploading(true);
    setError(null);

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
      setError(e instanceof Error ? e.message : "视频上传失败");
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
    if (!selectedCircle) {
      setError("请选择目标圈子");
      return;
    }

    if (!title.trim()) {
      setError("标题不能为空");
      return;
    }

    if (title.length > 31) {
      setError("标题最多 31 个字符");
      return;
    }

    if (content.length > 2000) {
      setError("正文最多 2000 个字符");
      return;
    }

    if (imageIds.length > 0 && videoId) {
      setError("图片和视频不能同时选择");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.createCirclePost(selectedCircle.id, {
        title: title.trim(),
        content: content.trim() || undefined,
        images: imageIds.length > 0 ? imageIds : undefined,
        videos: videoId ? [videoId] : undefined,
      });
      handleClose();
      onCreated?.();
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      if (err.code === "SPAM_BLOCKED") {
        setError((err.message as string) ?? "暂不满足发布条件");
      } else {
        setError((err.message as string) ?? "发布失败");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  /** 标题字数统计 */
  const titleCharCount = title.length;
  const titleMaxLength = 31;

  /** 正文字数统计 */
  const contentCharCount = content.length;
  const contentMaxLength = 2000;

  return (
    <Sheet
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        }
      }}
      open={open}
    >
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {step === 1 ? "选择圈子" : "发布动态"}
          </SheetTitle>
          <SheetDescription>
            {step === 1
              ? "选择一个圈子发布动态"
              : `发布到 ${selectedCircle?.name ?? ""}`
            }
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>发布失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {/* 步骤 1：选择圈子 */}
          {step === 1 ? (
            <div className="space-y-2">
              {isLoadingCircles ? (
                <div className="text-sm text-muted-foreground">加载中...</div>
              ) : userCircles.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  暂无已加入的圈子，请先加入或创建圈子。
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {userCircles.map((circle) => (
                    <button
                      className="flex flex-col items-center gap-2 rounded-lg border border-border/60 p-3 transition hover:bg-secondary/55"
                      key={circle.id}
                      onClick={() => handleSelectCircle(circle)}
                      type="button"
                    >
                      {circle.coverImageUrl ? (
                        <img
                          alt={circle.name}
                          className="h-12 w-12 rounded-full object-cover"
                          src={circle.coverImageUrl}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-secondary/55" />
                      )}
                      <span className="text-xs font-medium text-foreground">
                        {circle.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* 步骤 2：填写内容 */
            <div className="space-y-4">
              {/* 返回选择圈子（预选时不显示） */}
              {!isPreselected ? (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setStep(1)}
                  type="button"
                >
                  ← 重新选择圈子
                </button>
              ) : null}

              {/* 标题 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-foreground">标题 *</div>
                  <span className={`text-xs ${titleCharCount > titleMaxLength ? "text-destructive" : "text-muted-foreground"}`}>
                    {titleCharCount}/{titleMaxLength}
                  </span>
                </div>
                <Input
                  maxLength={titleMaxLength}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="请输入标题（最多 31 字）"
                  value={title}
                />
              </div>

              {/* 正文 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-foreground">正文（选填）</div>
                  <span className={`text-xs ${contentCharCount > contentMaxLength ? "text-destructive" : "text-muted-foreground"}`}>
                    {contentCharCount}/{contentMaxLength}
                  </span>
                </div>
                <Textarea
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
                          disabled={isImageUploading}
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
                  disabled={isImageUploading || !!videoId}
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
                      disabled={isVideoUploading}
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
                    disabled={isVideoUploading || imageIds.length > 0}
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
        </div>

        <SheetFooter>
          {step === 2 ? (
            <Button
              disabled={isImageUploading || isVideoUploading || isSubmitting}
              onClick={() => { void handleSubmit(); }}
              type="button"
              variant="hero"
            >
              {isSubmitting ? "发布中..." : "发布"}
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
