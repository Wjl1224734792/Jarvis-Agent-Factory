import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { apiClient } from "@/lib/api-client";
import { useCreateCircleDialogStore } from "./create-circle-dialog-store";

interface CreateCircleModalProps {
  onCreated?: () => void;
}

/** 创建圈子弹窗 — 从 circle-page.tsx 提取为独立组件 */
export function CreateCircleModal({ onCreated }: CreateCircleModalProps) {
  const open = useCreateCircleDialogStore((s) => s.open);
  const closeDialog = useCreateCircleDialogStore((s) => s.closeDialog);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [coverFileId, setCoverFileId] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setSlug("");
    setDescription("");
    setCoverFileId(null);
    setCoverPreviewUrl(null);
    setError(null);
  }

  function handleClose() {
    closeDialog();
    resetForm();
  }

  async function handleCoverUpload(file: File) {
    setIsCoverUploading(true);
    setError(null);
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
      setError(e instanceof Error ? e.message : "封面上传失败");
    } finally {
      setIsCoverUploading(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!name.trim() || !slug.trim()) {
      setError("名称和Slug不能为空");
      return;
    }
    if (!coverFileId) {
      setError("请上传圈子封面图");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.createCircle({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        coverImageFileId: coverFileId,
      });
      handleClose();
      onCreated?.();
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      if (err.code === "SPAM_BLOCKED") {
        setError((err.message as string) ?? "暂不满足创建条件");
      } else {
        setError((err.message as string) ?? "创建失败");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); }} open={open}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>创建圈子</SheetTitle>
          <SheetDescription>
            填写圈子信息后提交，审核通过后即可使用。
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>创建失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">圈子名称 *</div>
            <Input
              onChange={(e) => setName(e.target.value)}
              placeholder="圈子名称"
              value={name}
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Slug（英文标识）*</div>
            <Input
              onChange={(e) => setSlug(e.target.value)}
              placeholder="英文标识，如 fpv-lovers"
              value={slug}
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">圈子简介（选填）</div>
            <Input
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述圈子主题"
              value={description}
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">圈子封面图 *</div>
            {coverPreviewUrl ? (
              <div className="relative inline-block">
                <img
                  alt="圈子封面预览"
                  className="h-28 w-28 rounded-lg object-cover border border-border/60"
                  src={coverPreviewUrl}
                />
                <button
                  className="absolute -top-2 -right-2 size-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                  disabled={isCoverUploading}
                  onClick={() => { setCoverFileId(null); setCoverPreviewUrl(null); }}
                  type="button"
                >
                  x
                </button>
              </div>
            ) : (
              <input
                accept="image/*"
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
                disabled={isCoverUploading}
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

        <SheetFooter>
          <Button
            disabled={isCoverUploading || isSubmitting}
            onClick={() => { void handleSubmit(); }}
            type="button"
            variant="hero"
          >
            {isSubmitting ? "提交中..." : "确认创建"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
