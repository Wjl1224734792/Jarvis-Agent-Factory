import { useCommentPublishedTimeLabel } from "@/lib/comment-relative-time";
import { cn } from "@/lib/utils";

export function CommentPublishedTime(props: { createdAt: string; className?: string }) {
  const label = useCommentPublishedTimeLabel(props.createdAt);
  return (
    <span className={cn("text-[0.72rem] text-muted-foreground", props.className)}>{label}</span>
  );
}
