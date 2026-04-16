import { Loader2Icon } from "lucide-react";

type FeedRefetchFooterProps = {
  show: boolean;
  label?: string;
};

export function FeedRefetchFooter(props: FeedRefetchFooterProps) {
  if (!props.show) {
    return null;
  }

  return (
    <div className="flex justify-center py-4" role="status" aria-live="polite">
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        {props.label ?? "更新中…"}
      </span>
    </div>
  );
}
