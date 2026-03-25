import { useQueryClient } from "@tanstack/react-query";
import { CornerDownRightIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

function RootCommentItem(props: {
  postId: string;
  comment: CommentNode;
  currentUserId?: string;
  canInteract: boolean;
}) {
  const queryClient = useQueryClient();
  const canDelete = props.currentUserId === props.comment.author.id;
  const allReplies = useMemo(() => flattenReplies(props.comment.replies), [props.comment.replies]);
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
    <article className="border-b border-border/60 py-5 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="bg-muted" size="lg">
            <AvatarFallback>{props.comment.author.displayName.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">{props.comment.author.displayName}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(props.comment.updatedAt).toLocaleString("zh-CN", { hour12: false })}
              </p>
            </div>
            <p className="mt-2 text-sm leading-7 text-foreground/80">{props.comment.content}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {props.canInteract ? (
            <Button
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
              <Trash2Icon className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {allReplies.length > 0 ? (
        <div className="mt-4 border-l border-border/60 pl-4">
          <button
            className="text-xs font-medium text-primary"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            {expanded ? "收起回复" : `展开全部回复 (${allReplies.length})`}
          </button>

          {expanded ? (
            <div className="mt-3 flex flex-col">
              {allReplies.map((reply, index) => (
                <div
                  className={cn(
                    "py-3",
                    index !== allReplies.length - 1 && "border-b border-border/50"
                  )}
                  key={reply.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-foreground">{reply.author.displayName}</span>
                        {reply.replyToDisplayName ? (
                          <span className="inline-flex items-center gap-1 text-primary">
                            <CornerDownRightIcon className="size-3.5" />
                            @{reply.replyToDisplayName}
                          </span>
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                          {new Date(reply.updatedAt).toLocaleString("zh-CN", { hour12: false })}
                        </span>
                      </div>
                      <p className="text-sm leading-7 text-foreground/76">{reply.content}</p>
                    </div>

                    {props.canInteract ? (
                      <Button
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
        <div className="mt-4">
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
        <Alert className="mt-4 border-rose-200 bg-rose-50 text-rose-900" variant="destructive">
          <AlertTitle>评论操作失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </article>
  );
}

export function PostCommentThread(props: ThreadProps) {
  return (
    <div className="flex flex-col">
      {props.comments.map((comment, index) => (
        <div key={comment.id}>
          <RootCommentItem
            canInteract={props.canInteract}
            comment={comment}
            currentUserId={props.currentUserId}
            postId={props.postId}
          />
          {index !== props.comments.length - 1 ? <Separator /> : null}
        </div>
      ))}
    </div>
  );
}
