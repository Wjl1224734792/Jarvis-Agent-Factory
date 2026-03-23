import { useQueryClient } from "@tanstack/react-query";
import { CornerDownRight, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { apiClient } from "../../lib/api-client";

type CommentNode = Awaited<ReturnType<typeof apiClient.getPostDetail>>["item"]["comments"][number];

type ThreadProps = {
  postId: string;
  comments: CommentNode[];
  currentUserId?: string;
  canInteract: boolean;
};

type NodeProps = {
  postId: string;
  comment: CommentNode;
  currentUserId?: string;
  canInteract: boolean;
  depth: number;
};

function CommentItem(props: NodeProps) {
  const queryClient = useQueryClient();
  const canDelete = props.currentUserId === props.comment.author.id;
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [busy, setBusy] = useState<"reply" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["post-detail", props.postId] }),
      queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    ]);
  }

  return (
    <article
      className={cn(
        "relative flex flex-col gap-4 rounded-[1.5rem] border border-border/60 bg-white/80 p-5 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.28)]",
        props.depth > 0 && "ml-4 sm:ml-6"
      )}
      style={{ marginLeft: `${Math.min(props.depth, 4) * 18}px` }}
    >
      {props.depth > 0 ? (
        <span className="absolute -left-3 top-7 hidden h-px w-3 bg-border sm:block" />
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="bg-muted" size="lg">
            <AvatarFallback>{props.comment.author.displayName.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">
                {props.comment.author.displayName}
              </p>
              {props.depth > 0 ? (
                <Badge variant="secondary">
                  <CornerDownRight data-icon="inline-start" />
                  楼中回复
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {new Date(props.comment.updatedAt).toLocaleString("zh-CN", { hour12: false })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {props.canInteract ? (
            <Button
              onClick={() => {
                setReplying((value) => !value);
                setReplyContent("");
                setError(null);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              回复
            </Button>
          ) : null}

          {canDelete ? (
            <Button
              disabled={busy !== null}
              onClick={() => {
                setBusy("delete");
                setError(null);

                void apiClient
                  .deletePostComment(props.postId, props.comment.id)
                  .then(refresh)
                  .catch((value: unknown) => {
                    setError(value instanceof Error ? value.message : "删除评论失败");
                  })
                  .finally(() => {
                    setBusy(null);
                  });
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <Trash2 data-icon="inline-start" />
              删除
            </Button>
          ) : null}
        </div>
      </div>

      <p className="text-sm leading-7 text-foreground/80">{props.comment.content}</p>

      {replying ? (
        <div className="flex flex-col gap-3 rounded-[1.25rem] border border-border/60 bg-background/70 p-4">
          <Textarea
            onChange={(event) => {
              setReplyContent(event.target.value);
            }}
            placeholder={`回复 ${props.comment.author.displayName}`}
            value={replyContent}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={!replyContent.trim() || busy !== null}
              onClick={() => {
                setBusy("reply");
                setError(null);

                void apiClient
                  .createPostComment(props.postId, {
                    content: replyContent,
                    parentCommentId: props.comment.id
                  })
                  .then(() => {
                    setReplyContent("");
                    setReplying(false);
                    return refresh();
                  })
                  .catch((value: unknown) => {
                    setError(value instanceof Error ? value.message : "回复失败");
                  })
                  .finally(() => {
                    setBusy(null);
                  });
              }}
              type="button"
            >
              <Send data-icon="inline-start" />
              发送回复
            </Button>
            <Button
              onClick={() => {
                setReplying(false);
                setReplyContent("");
                setError(null);
              }}
              type="button"
              variant="outline"
            >
              取消
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <Alert className="border-rose-200 bg-rose-50 text-rose-900" variant="destructive">
          <AlertTitle>评论操作失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {props.comment.replies.length > 0 ? (
        <>
          <Separator />
          <div className="relative flex flex-col gap-3 before:absolute before:bottom-0 before:left-3 before:top-0 before:w-px before:bg-border/70">
            {props.comment.replies.map((reply: CommentNode) => (
              <CommentItem
                canInteract={props.canInteract}
                comment={reply}
                currentUserId={props.currentUserId}
                depth={props.depth + 1}
                key={reply.id}
                postId={props.postId}
              />
            ))}
          </div>
        </>
      ) : null}
    </article>
  );
}

export function PostCommentThread(props: ThreadProps) {
  return (
    <div className="flex flex-col gap-4">
      {props.comments.map((comment) => (
        <CommentItem
          canInteract={props.canInteract}
          comment={comment}
          currentUserId={props.currentUserId}
          depth={0}
          key={comment.id}
          postId={props.postId}
        />
      ))}
    </div>
  );
}
