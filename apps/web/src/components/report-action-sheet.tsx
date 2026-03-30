import { useRef, useState, type ReactNode } from "react";
import { FileImageIcon, XIcon } from "lucide-react";
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
  SheetTrigger
} from "@/components/ui/sheet";
import { apiClient } from "@/lib/api-client";

type UploadedImage = {
  id: string;
  url: string;
  fileName?: string;
};

export function ReportActionSheet(props: {
  title: string;
  description?: string;
  trigger: ReactNode;
  onSubmit: (input: { reason: string; imageIds: string[] }) => Promise<void>;
  successMessage?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function uploadImages(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    if (images.length + files.length > 3) {
      setError("最多上传 3 张举报证据图。");
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const uploaded: UploadedImage[] = [];
      for (const file of Array.from(files)) {
        const payload = await apiClient.uploadReportImage(file);
        uploaded.push({
          id: payload.item.id,
          url: payload.item.url,
          fileName: payload.item.fileName
        });
      }
      setImages((current) => [...current, ...uploaded]);
    } catch (reasonValue: unknown) {
      setError(reasonValue instanceof Error ? reasonValue.message : "举报证据上传失败。");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function submit() {
    if (!reason.trim()) {
      setError("请填写举报理由。");
      return;
    }

    if (images.length === 0) {
      setError("请至少上传 1 张举报证据图。");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await props.onSubmit({
        reason: reason.trim(),
        imageIds: images.map((image) => image.id)
      });
      setReason("");
      setImages([]);
      setOpen(false);
    } catch (reasonValue: unknown) {
      setError(reasonValue instanceof Error ? reasonValue.message : "举报提交失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>{props.trigger}</SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{props.title}</SheetTitle>
          <SheetDescription>
            {props.description ?? "请填写举报理由，并至少上传 1 张证据图。"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>举报提交失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">举报理由</div>
            <Textarea
              className="min-h-28"
              onChange={(event) => setReason(event.target.value)}
              placeholder="请尽量说明违规点、上下文和你看到的问题。"
              value={reason}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-foreground">证据图片</div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                size="sm"
                type="button"
                variant="outline"
              >
                <FileImageIcon data-icon="inline-start" />
                {isUploading ? "上传中..." : "上传证据图"}
              </Button>
            </div>
            <Input readOnly value={`${images.length} / 3`} />
            <input
              accept="image/*"
              className="hidden"
              multiple
              onChange={(event) => {
                void uploadImages(event.target.files);
              }}
              ref={fileInputRef}
              type="file"
            />

            {images.length === 0 ? (
              <div className="flex h-28 items-center justify-center rounded-[0.9rem] border border-dashed border-border/70 bg-surface-1 text-sm text-muted-foreground">
                至少上传 1 张证据图
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {images.map((image) => (
                  <div className="relative overflow-hidden rounded-[0.9rem] border border-border/70" key={image.id}>
                    <img
                      alt={image.fileName ?? "report evidence"}
                      className="h-28 w-full object-cover"
                      src={image.url}
                    />
                    <button
                      className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
                      onClick={() => {
                        setImages((current) => current.filter((item) => item.id !== image.id));
                      }}
                      type="button"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <SheetFooter>
          <Button
            disabled={isSubmitting || isUploading}
            onClick={() => {
              void submit();
            }}
            type="button"
            variant="hero"
          >
            {isSubmitting ? "提交中..." : props.successMessage ?? "提交举报"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
