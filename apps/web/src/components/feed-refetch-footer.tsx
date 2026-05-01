import { AlertCircleIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

type FeedRefetchFooterProps = {
  show: boolean;
  state?: "loading" | "error";
  label?: string;
  errorMessage?: string;
  className?: string;
};

export function FeedRefetchFooter(props: FeedRefetchFooterProps) {
  if (!props.show) {
    return null;
  }

  const state = props.state ?? "loading";
  const isError = state === "error";
  const statusText = isError
    ? props.errorMessage ?? props.label ?? "加载失败，请稍后再试。"
    : props.label ?? "加载中...";

  return (
    <div
      aria-live={isError ? "assertive" : "polite"}
      className={cn(
        "flex justify-center py-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
        props.className
      )}
      role="status"
    >
      {isError ? (
        <div className="inline-flex items-center gap-2 text-sm text-destructive">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{statusText}</span>
        </div>
      ) : (
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          {statusText}
        </span>
      )}
    </div>
  );
}
