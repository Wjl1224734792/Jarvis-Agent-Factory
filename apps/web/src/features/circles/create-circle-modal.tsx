import { useState } from "react";
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
import { apiClient } from "@/lib/api-client";
import { useCreateCircleDialogStore } from "./create-circle-dialog-store";

interface CreateCircleModalProps {
  onCreated?: () => void;
}

type SubmitStatus = "idle" | "submitting" | "success" | "error";

/** 创建圈子弹窗 — Dialog 风格，与发帖弹窗一致 */
export function CreateCircleModal({ onCreated }: CreateCircleModalProps) {
  const open = useCreateCircleDialogStore((s) => s.open);
  const closeDialog = useCreateCircleDialogStore((s) => s.closeDialog);

  // 表单字段
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [coverFileId, setCoverFileId] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [isCoverUploading, setIsCoverUploading] = useState(false);

  // 提交状态
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setSlug("");
    setDescription("");
    setCoverFileId(null);
    setCoverPreviewUrl(null);
    setSubmitStatus("idle");
    setErrorMessage(null);
  }

  function handleClose() {
    closeDialog();
    if (submitStatus === "success") {
      onCreated?.();
    }
    resetForm();
  }

  /** 封面图上传（三段式上传） */
  async function handleCoverUpload(file: File) {
    setIsCoverUploading(true);
    setErrorMessage(null);
    try {
      const init = await apiClient.initUpload({
        bizType: "circle-cover-image",
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
      setCoverFileId(complete.item.id);
      setCoverPreviewUrl(complete.item.url);
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : "封面上传失败");
    } finally {
      setIsCoverUploading(false);
    }
  }

  /** 提交创建圈子 */
  async function handleSubmit() {
    setErrorMessage(null);

    if (!name.trim() || !slug.trim()) {
      setErrorMessage("名称和 Slug 不能为空");
      return;
    }
    if (!coverFileId) {
      setErrorMessage("请上传圈子封面图");
      return;
    }

    setSubmitStatus("submitting");
    try {
      await apiClient.createCircle({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        coverImageFileId: coverFileId,
      });
      setSubmitStatus("success");
    } catch (e: unknown) {
      setSubmitStatus("error");
      const err = e as Record<string, unknown>;
      if (err.code === "SPAM_BLOCKED") {
        setErrorMessage((err.message as string) ?? "暂不满足创建条件");
      } else {
        setErrorMessage((err.message as string) ?? "创建失败");
      }
    }
  }

  const isUploading = isCoverUploading;
  const isSubmitting = submitStatus === "submitting";

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>创建圈子</DialogTitle>
          <DialogDescription>
            填写圈子信息后提交，审核通过后即可使用。
          </DialogDescription>
        </DialogHeader>

        {/* 创建成功状态 */}
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
                创建成功
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                审核通过后即可使用
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

            {/* 圈子名称 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                圈子名称 *
              </label>
              <Input
                disabled={isSubmitting}
                onChange={(e) => setName(e.target.value)}
                placeholder="圈子名称"
                value={name}
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Slug（英文标识）*
              </label>
              <Input
                disabled={isSubmitting}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="英文标识，如 fpv-lovers"
                value={slug}
              />
            </div>

            {/* 简介 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                圈子简介（选填）
              </label>
              <Input
                disabled={isSubmitting}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简要描述圈子主题"
                value={description}
              />
            </div>

            {/* 封面图上传 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                圈子封面图 *
              </label>
              {coverPreviewUrl ? (
                <div className="relative inline-block">
                  <img
                    alt="圈子封面预览"
                    className="h-28 w-28 rounded-lg object-cover border border-border/60"
                    src={coverPreviewUrl}
                  />
                  <button
                    className="absolute -top-2 -right-2 size-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                    disabled={isCoverUploading || isSubmitting}
                    onClick={() => {
                      setCoverFileId(null);
                      setCoverPreviewUrl(null);
                    }}
                    type="button"
                  >
                    x
                  </button>
                </div>
              ) : (
                <input
                  accept="image/*"
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
                  disabled={isCoverUploading || isSubmitting}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleCoverUpload(file);
                  }}
                  type="file"
                />
              )}
              {isCoverUploading ? (
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
              disabled={isUploading || isSubmitting}
              onClick={() => {
                void handleSubmit();
              }}
              type="button"
              variant="hero"
            >
              {isSubmitting ? "提交中..." : "确认创建"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
