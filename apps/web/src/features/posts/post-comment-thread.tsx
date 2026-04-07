import { useQueryClient } from "@tanstack/react-query";
import { CornerDownRightIcon, SquarePenIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { CommentPublishedTime } from "@/components/comment-published-time";
import {
  CommentIconOnlyButton,
  CommentLikeIconButton,
  CommentTextAction
} from "@/components/comment-thread-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileLink } from "@/components/profile-link";
import { ReportActionSheet } from "@/components/report-action-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineCommentComposer } from "@/features/posts/inline-comment-composer";
import { getAvatarImage } from "@/lib/aviation-media";
import { cn } from "@/lib/utils";
import { apiClient } from "../../lib/api-client";

type CommentNode = Awaited<ReturnType<typeof apiClient.getPostDetail>>["item"]["comments"][number];
type CommentReply = CommentNode["replies"][number];

type ThreadProps = {
  postId: string;
  comments: CommentNode[];
  currentUserId?: string;
  canInteract: boolean;
  isRefreshing?: boolean;
  showPendingComment?: boolean;
  sortOrder?: "latest" | "hot";
  /** 嵌入带外边框的面板时可去掉根节点纵向边框，避免重复描边 */
  className?: string;
};

type ReplyView = {
  id: string;
  content: string;
  likeCount: number;
  createdAt: string;
  hasLiked: boolean;
  author: CommentNode["author"];
  replyToDisplayName?: string;
};

function flattenReplies(nodes: CommentReply[], replyToDisplayName?: string): ReplyView[] {
  return nodes.map((node) => ({
    id: node.id,
    content: node.content,
    likeCount: node.likeCount ?? 0,
    createdAt: node.createdAt,
    hasLiked: node.viewer.hasLiked,
    author: node.author,
    replyToDisplayName: node.replyToUser?.displayName ?? replyToDisplayName
  }));
}

function CommentSkeletonItem(props: { compact?: boolean }) {
  return (
    <div className={cn("flex items-start gap-3", props.compact && "opacity-80")}>
      <Skeleton className="mt-0.5 size-8 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-32 rounded" />
        <Skeleton className="h-3.5 w-full rounded" />
        <Skeleton className="h-3.5 w-4/5 rounded" />
      </div>
    </div>
  );
}

function InteractionRow(props: {
  canDelete: boolean;
  canEdit: boolean;
  canInteract: boolean;
  disabled: boolean;
  likeCount: number;
  hasLiked?: boolean;
  isEditing?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onLike?: () => void;
  onReply?: () => void;
  reportTrigger?: ReactNode;
}) {
  const hasLiked = props.hasLiked ?? false;
  return (
    <div className="flex shrink-0 items-center gap-1 self-start">
      {props.onLike ? (
        <CommentLikeIconButton
          disabled={props.disabled}
          hasLiked={hasLiked}
          likeCount={props.likeCount}
          onClick={props.onLike}
        />
      ) : null}
      {props.canInteract && props.onReply ? (
        <CommentTextAction disabled={props.disabled} onClick={props.onReply} variant="reply">
          回复
        </CommentTextAction>
      ) : null}
      {props.reportTrigger && !props.canDelete ? props.reportTrigger : null}
      {props.canEdit && props.onEdit ? (
        <CommentIconOnlyButton
          active={props.isEditing}
          disabled={props.disabled}
          icon={SquarePenIcon}
          label="编辑评论"
          onClick={props.onEdit}
        />
      ) : null}
      {props.canDelete && props.onDelete ? (
        <CommentIconOnlyButton
          destructiveHover
          disabled={props.disabled}
          icon={Trash2Icon}
          label="删除评论"
          onClick={props.onDelete}
        />
      ) : null}
    </div>
  );
}

function RootCommentItem(props: {
  postId: string;
  comment: CommentNode;
  currentUserId?: string;
  canInteract: boolean;
}) {
  const queryClient = useQueryClient();
  const canDelete = props.currentUserId === props.comment.author.id;
  const canEdit = props.currentUserId === props.comment.author.id;
  const replies = useMemo(() => flattenReplies(props.comment.replies), [props.comment.replies]);
  const [replyingTo, setReplyingTo] = useState<{ id: string; displayName: string } | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(props.comment.content);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<"reply" | "delete" | "edit" | "like" | "report" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isPending = props.comment.status === "pending";

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
    <article
      className={cn(
        "border-b border-border/85 py-3.5 first:pt-0 last:border-b-0 last:pb-0",
        busy === "delete" && "opacity-75"
      )}
    >
      <div className="flex items-start gap-3">
        <ProfileLink userId={props.comment.author.id}>
          <Avatar className="mt-0.5" size="sm">
            <AvatarImage
              alt={props.comment.author.displayName}
              src={getAvatarImage(props.comment.author.id)}
            />
            <AvatarFallback>{props.comment.author.displayName.slice(0, 1)}</AvatarFallback>
          </Avatar>
        </ProfileLink>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
            <ProfileLink
              className="font-medium text-foreground hover:text-primary"
              userId={props.comment.author.id}
            >
              {props.comment.author.displayName}
            </ProfileLink>
            {isPending ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.68rem] font-medium text-amber-700">
                待审核
              </span>
            ) : null}
            <CommentPublishedTime createdAt={props.comment.createdAt} />
          </div>

          {editing ? (
            <InlineCommentComposer
              busy={busy === "edit"}
              disabled={busy !== null}
              onChange={setEditContent}
              onSubmit={() => {
                if (!editContent.trim()) {
                  return;
                }

                setBusy("edit");
                setError(null);
                void apiClient
                  .updatePostComment(props.postId, props.comment.id, {
                    content: editContent
                  })
                  .then(() => {
                    setEditing(false);
                    return refresh();
                  })
                  .catch((value: unknown) => {
                    setError(value instanceof Error ? value.message : "编辑评论失败");
                  })
                  .finally(() => {
                    setBusy(null);
                  });
              }}
              placeholder="编辑评论"
              value={editContent}
            />
          ) : (
            <p className="text-sm leading-6 text-foreground/84">{props.comment.content}</p>
          )}

          {isPending ? (
            <p className="text-[0.72rem] text-amber-700">
              仅你自己可见，审核通过后会公开显示。
            </p>
          ) : null}
        </div>

        <InteractionRow
          canDelete={canDelete}
          canEdit={canEdit}
          canInteract={props.canInteract && !isPending}
          disabled={busy !== null}
          hasLiked={props.comment.viewer.hasLiked}
          isEditing={editing}
          likeCount={props.comment.likeCount ?? 0}
          onDelete={() => {
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
          onEdit={() => {
            setEditing((value) => !value);
            setEditContent(props.comment.content);
          }}
          onLike={
            isPending
              ? undefined
              : () => {
                  setBusy("like");
                  setError(null);
                  void apiClient
                    .likePostComment(props.postId, props.comment.id)
                    .then(refresh)
                    .catch((value: unknown) => {
                      setError(value instanceof Error ? value.message : "点赞失败");
                    })
                    .finally(() => {
                      setBusy(null);
                    });
                }
          }
          onReply={
            props.canInteract && !isPending
              ? () => openReply(props.comment.id, props.comment.author.displayName)
              : undefined
          }
          reportTrigger={
            isPending || canDelete ? undefined : (
              <ReportActionSheet
                description="请填写举报理由，并至少上传 1 张证据图。"
                onSubmit={(input) =>
                  apiClient.reportPostComment(props.postId, props.comment.id, input).then(refresh)
                }
                title="举报评论"
                trigger={
                  <CommentTextAction
                    disabled={busy !== null}
                    hasReported={props.comment.viewer.hasReported}
                    variant="report"
                  >
                    举报
                  </CommentTextAction>
                }
              />
            )
          }
        />
      </div>

      {replies.length > 0 ? (
        <div className="mt-3 border-l border-border/85 pl-4">
          <button
            className="text-[0.72rem] font-medium text-primary"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            {expanded ? "收起回复" : `展开全部回复 (${replies.length})`}
          </button>

          {expanded ? (
            <div className="mt-3">
              {replies.map((reply) => (
                <div className="border-t border-border/80 py-3 first:border-t-0 first:pt-0" key={reply.id}>
                  <div className="flex items-start gap-3">
                    <ProfileLink userId={reply.author.id}>
                      <Avatar className="mt-0.5" size="sm">
                        <AvatarImage alt={reply.author.displayName} src={getAvatarImage(reply.author.id)} />
                        <AvatarFallback>{reply.author.displayName.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                    </ProfileLink>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
                        <ProfileLink
                          className="font-medium text-foreground hover:text-primary"
                          userId={reply.author.id}
                        >
                          {reply.author.displayName}
                        </ProfileLink>
                        {reply.replyToDisplayName ? (
                          <span className="inline-flex items-center gap-1 text-[0.72rem] text-primary/82">
                            <CornerDownRightIcon className="size-3.25" />
                            @{reply.replyToDisplayName}
                          </span>
                        ) : null}
                        <CommentPublishedTime createdAt={reply.createdAt} />
                      </div>
                      <p className="text-sm leading-6 text-foreground/80">{reply.content}</p>
                    </div>

                    <InteractionRow
                      canDelete={false}
                      canEdit={false}
                      canInteract={props.canInteract && !isPending}
                      disabled={busy !== null}
                      hasLiked={reply.hasLiked}
                      likeCount={reply.likeCount}
                      onLike={() => {
                        setBusy("like");
                        setError(null);
                        void apiClient
                          .likePostComment(props.postId, reply.id)
                          .then(refresh)
                          .catch((value: unknown) => {
                            setError(value instanceof Error ? value.message : "点赞失败");
                          })
                          .finally(() => {
                            setBusy(null);
                          });
                      }}
                      onReply={() => openReply(reply.id, reply.author.displayName)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {replyingTo && !isPending ? (
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
          {busy === "reply" ? (
            <div className="mt-3 rounded-[calc(var(--radius-control)-0.08rem)] border border-border/70 bg-background/70 px-3 py-3">
              <CommentSkeletonItem compact />
            </div>
          ) : null}
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
  const sortedComments = useMemo(() => {
    const items = [...props.comments];
    if ((props.sortOrder ?? "latest") === "latest") {
      return items.sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    }

    return items.sort((left, right) => {
      const leftScore = (left.likeCount ?? 0) * 2 + left.replyCount;
      const rightScore = (right.likeCount ?? 0) * 2 + right.replyCount;
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [props.comments, props.sortOrder]);

  return (
    <div
      className={cn(
        "border-y border-border",
        props.comments.length === 0 && "border-none",
        props.className
      )}
    >
      {props.showPendingComment ? (
        <div className="border-b border-border/80 py-3.5 first:pt-0">
          <CommentSkeletonItem />
        </div>
      ) : null}

      {props.isRefreshing ? (
        <div className="border-b border-border/80 py-3.5">
          <CommentSkeletonItem compact />
        </div>
      ) : null}

      {sortedComments.map((comment) => (
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
