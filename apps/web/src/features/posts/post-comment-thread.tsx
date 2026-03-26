import { useQueryClient } from "@tanstack/react-query";
import { CornerDownRightIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InlineCommentComposer } from "@/features/posts/inline-comment-composer";
import { cn } from "@/lib/utils";
import { apiClient } from "../../lib/api-client";

type CommentNode = Awaited<ReturnType<typeof apiClient.getPostDetail>>["item"]["comments"][number];

type ThreadProps = {
  postId: string;
  comments: CommentNode[];
  currentUserId?: string;
  canInteract: boolean;
};

type ReplyView = {
  id: string;
  content: string;
  updatedAt: string;
  author: CommentNode["author"];
  replyToDisplayName?: string;
};

function flattenReplies(nodes: CommentNode[], replyToDisplayName?: string): ReplyView[] {
  return nodes.flatMap((node) => [
    {
      id: node.id,
      content: node.content,
      updatedAt: node.updatedAt,
      author: node.author,
      replyToDisplayName
    },
    ...flattenReplies(node.replies, node.author.displayName)
  ]);
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function RootCommentItem(props: {
  postId: string;
  comment: CommentNode;
  currentUserId?: string;
  canInteract: boolean;
}) {
  const queryClient = useQueryClient();
  const canDelete = props.currentUserId === props.comment.author.id;
  const replies = useMemo(() => flattenReplies(props.comment.replies), [props.comment.replies]);
  const [replyingTo, setReplyingTo] = useState<{ id: string; displayName: string } | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<"reply" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["post-detail", props.postId] }),
      queryClient.invalidateQueries({ queryKey: ["home-shell-feed"] }),
      queryClient.invalidateQueries({ queryKey: ["circle-feed"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    ]);
  }

  function openReply(targetId: string, displayName: string) {
    setReplyingTo({ id: targetId, displayName });
    setReplyContent(`@${displayName} `);
    setError(null);
  }

  return (
    <article className="border-b border-border/70 py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-medium text-foreground">{props.comment.author.displayName}</span>
            <span className="text-xs text-muted-foreground">{formatTime(props.comment.updatedAt)}</span>
          </div>
          <p className="text-sm leading-7 text-foreground/82">{props.comment.content}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {props.canInteract ? (
            <Button
              className="h-7 rounded-none px-0 text-xs text-muted-foreground"
              onClick={() => openReply(props.comment.id, props.comment.author.displayName)}
              size="sm"
              type="button"
              variant="ghost"
            >
              回复
            </Button>
          ) : null}

          {canDelete ? (
            <Button
              className="h-7 rounded-none px-0 text-xs text-muted-foreground"
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
              variant="ghost"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      {replies.length > 0 ? (
        <div className="mt-3 border-l border-border/70 pl-4">
          <button
            className="text-xs font-medium text-primary"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            {expanded ? "收起回复" : `展开全部回复 (${replies.length})`}
          </button>

          {expanded ? (
            <div className="mt-3">
              {replies.map((reply) => (
                <div className="border-t border-border/60 py-3 first:border-t-0 first:pt-0" key={reply.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className="font-medium text-foreground">{reply.author.displayName}</span>
                        {reply.replyToDisplayName ? (
                          <span className="inline-flex items-center gap-1 text-primary/82">
                            <CornerDownRightIcon className="size-3.5" />
                            @{reply.replyToDisplayName}
                          </span>
                        ) : null}
                        <span className="text-xs text-muted-foreground">{formatTime(reply.updatedAt)}</span>
                      </div>
                      <p className="text-sm leading-7 text-foreground/78">{reply.content}</p>
                    </div>

                    {props.canInteract ? (
                      <Button
                        className="h-7 rounded-none px-0 text-xs text-muted-foreground"
                        onClick={() => openReply(reply.id, reply.author.displayName)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        回复
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {replyingTo ? (
        <div className="mt-3">
          <InlineCommentComposer
            busy={busy === "reply"}
            disabled={!props.canInteract}
            onChange={setReplyContent}
            onSubmit={() => {
              if (!replyContent.trim()) {
                return;
              }

              setBusy("reply");
              setError(null);

              void apiClient
                .createPostComment(props.postId, {
                  content: replyContent,
                  parentCommentId: props.comment.id
                })
                .then(() => {
                  setReplyingTo(null);
                  setReplyContent("");
                  setExpanded(true);
                  return refresh();
                })
                .catch((value: unknown) => {
                  setError(value instanceof Error ? value.message : "回复失败");
                })
                .finally(() => {
                  setBusy(null);
                });
            }}
            placeholder={`回复 @${replyingTo.displayName}`}
            value={replyContent}
          />
        </div>
      ) : null}

      {error ? (
        <Alert className="mt-3 rounded-none border-border/80 bg-transparent text-foreground" variant="destructive">
          <AlertTitle>评论操作失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </article>
  );
}

export function PostCommentThread(props: ThreadProps) {
  return (
    <div className={cn("border-y border-border/70", props.comments.length === 0 && "border-none")}>
      {props.comments.map((comment) => (
        <RootCommentItem
          canInteract={props.canInteract}
          comment={comment}
          currentUserId={props.currentUserId}
          key={comment.id}
          postId={props.postId}
        />
      ))}
    </div>
  );
}
