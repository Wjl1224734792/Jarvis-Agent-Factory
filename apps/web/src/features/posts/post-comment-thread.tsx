import { useQueryClient } from "@tanstack/react-query";
import { CornerDownRightIcon, SquarePenIcon, Trash2Icon } from "lucide-react";
import { startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import { CommentPublishedTime } from "@/components/comment-published-time";
import {
  CommentIconOnlyButton,
  CommentLikeIconButton,
  CommentTextAction
} from "@/components/comment-thread-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileLink } from "@/components/profile-link";
import { ReportActionSheet } from "@/components/report-action-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineCommentComposer } from "@/features/posts/inline-comment-composer";
import { getAvatarImage } from "@/lib/aviation-media";
import { cn } from "@/lib/utils";
import { apiClient } from "../../lib/api-client";
import {
  estimateTotalCommentsFromPostRoots,
  getVisibleRootComments,
  shouldShowCommentCollapseToggle
} from "./comment-collapse-helpers";
import {
  patchPostCommentCreated,
  patchPostCommentDeleted,
  patchPostCommentLikeToggle,
  patchPostCommentReported,
  patchPostCommentUpdated,
  patchPostReplyDeleted
} from "./post-query-cache";

type CommentNode = Awaited<ReturnType<typeof apiClient.getPostDetail>>["item"]["comments"][number];

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
  /** 默认只展示前 N 条顶级评论，其余通过按钮展开 */
  collapsedRootLimit?: number;
  /** 展开按钮展示的总条数（含回复），通常传帖子 commentCount */
  totalCommentCount?: number;
};

/** 点赞 / 编辑 / 删除按 targetId 区分，避免同线程内其它行一起禁用 */
type CommentBusyState =
  | { action: "like"; targetId: string }
  | { action: "reply" }
  | { action: "edit"; targetId: string }
  | { action: "delete"; targetId: string };

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
  disableLike: boolean;
  disableReply: boolean;
  disableEdit: boolean;
  disableDelete: boolean;
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
          disabled={props.disableLike}
          hasLiked={hasLiked}
          likeCount={props.likeCount}
          onClick={props.onLike}
        />
      ) : null}
      {props.canInteract && props.onReply ? (
        <CommentTextAction disabled={props.disableReply} onClick={props.onReply} variant="reply">
          回复
        </CommentTextAction>
      ) : null}
      {props.reportTrigger && !props.canDelete ? props.reportTrigger : null}
      {props.canEdit && props.onEdit ? (
        <CommentIconOnlyButton
          active={props.isEditing}
          disabled={props.disableEdit}
          icon={SquarePenIcon}
          label="编辑评论"
          onClick={props.onEdit}
        />
      ) : null}
      {props.canDelete && props.onDelete ? (
        <CommentIconOnlyButton
          destructiveHover
          disabled={props.disableDelete}
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
  const canDelete = props.comment.viewer.canDelete;
  const canEdit = props.comment.viewer.canEdit;
  const replyList = props.comment.replies;
  const [replyingTo, setReplyingTo] = useState<{ id: string; displayName: string } | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState(props.comment.content);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<CommentBusyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isPending = props.comment.status === "pending";

  function openReply(targetId: string, displayName: string) {
    setReplyingTo({ id: targetId, displayName });
    setReplyContent(`@${displayName} `);
    setError(null);
  }

  return (
    <article
      className={cn(
        "border-b border-border/85 py-3.5 first:pt-0 last:border-b-0 last:pb-0",
        busy?.action === "delete" && busy.targetId === props.comment.id && "opacity-75"
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

          {editingCommentId === props.comment.id ? (
            <InlineCommentComposer
              busy={busy?.action === "edit" && busy.targetId === props.comment.id}
              disabled={busy !== null}
              onChange={setEditContent}
              onSubmit={() => {
                if (!editContent.trim()) {
                  return;
                }

                setBusy({ action: "edit", targetId: props.comment.id });
                setError(null);
                void apiClient
                  .updatePostComment(props.postId, props.comment.id, {
                    content: editContent.trim()
                  })
                  .then((payload) => {
                    patchPostCommentUpdated(
                      queryClient,
                      props.postId,
                      props.comment.id,
                      payload.item,
                      props.comment.status
                    );
                    setEditingCommentId(null);
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
          disableDelete={busy?.action === "delete" && busy.targetId === props.comment.id}
          disableEdit={busy?.action === "edit" && busy.targetId === props.comment.id}
          disableLike={busy?.action === "like" && busy.targetId === props.comment.id}
          disableReply={busy?.action === "reply"}
          hasLiked={props.comment.viewer.hasLiked}
          isEditing={editingCommentId === props.comment.id}
          likeCount={props.comment.likeCount ?? 0}
          onDelete={() => {
            setBusy({ action: "delete", targetId: props.comment.id });
            setError(null);
            void apiClient
              .deletePostComment(props.postId, props.comment.id)
              .then(() => {
                patchPostCommentDeleted(
                  queryClient,
                  props.postId,
                  props.comment.id,
                  (props.comment.status === "visible" ? 1 : 0) +
                    props.comment.replies.filter((reply) => reply.status === "visible").length
                );
              })
              .catch((value: unknown) => {
                setError(value instanceof Error ? value.message : "删除评论失败");
              })
              .finally(() => {
                setBusy(null);
              });
          }}
          onEdit={() => {
            if (editingCommentId === props.comment.id) {
              setEditingCommentId(null);
            } else {
              setEditingCommentId(props.comment.id);
              setEditContent(props.comment.content);
            }
          }}
          onLike={
            isPending
              ? undefined
              : () => {
                  const nextHasLiked = !props.comment.viewer.hasLiked;
                  setBusy({ action: "like", targetId: props.comment.id });
                  setError(null);
                  void apiClient
                    .likePostComment(props.postId, props.comment.id)
                    .then(() => {
                      patchPostCommentLikeToggle(queryClient, props.postId, props.comment.id, nextHasLiked);
                    })
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
                  apiClient.reportPostComment(props.postId, props.comment.id, input).then(() => {
                    patchPostCommentReported(queryClient, props.postId, props.comment.id);
                    startTransition(() => {
                      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
                    });
                  })
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

      {replyList.length > 0 ? (
        <div className="mt-3 border-l border-border/85 pl-4">
          <button
            className="text-[0.72rem] font-medium text-primary"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            {expanded ? "收起回复" : `展开全部回复 (${replyList.length})`}
          </button>

          {expanded ? (
            <div className="mt-3">
              {replyList.map((reply) => {
                const replyPending = reply.status === "pending";
                const replyCanEdit = reply.viewer.canEdit;
                const replyCanDelete = reply.viewer.canDelete;
                const replyToName = reply.replyToUser?.displayName;

                return (
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
                          {replyToName ? (
                            <span className="inline-flex items-center gap-1 text-[0.72rem] text-primary/82">
                              <CornerDownRightIcon className="size-3.25" />
                              @{replyToName}
                            </span>
                          ) : null}
                          {replyPending ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.68rem] font-medium text-amber-700">
                              待审核
                            </span>
                          ) : null}
                          <CommentPublishedTime createdAt={reply.createdAt} />
                        </div>
                        {editingCommentId === reply.id ? (
                          <InlineCommentComposer
                            busy={busy?.action === "edit" && busy.targetId === reply.id}
                            disabled={busy !== null}
                            onChange={setEditContent}
                            onSubmit={() => {
                              if (!editContent.trim()) {
                                return;
                              }

                              setBusy({ action: "edit", targetId: reply.id });
                              setError(null);
                              void apiClient
                                .updatePostComment(props.postId, reply.id, {
                                  content: editContent.trim()
                                })
                                .then((payload) => {
                                  patchPostCommentUpdated(
                                    queryClient,
                                    props.postId,
                                    reply.id,
                                    payload.item,
                                    reply.status
                                  );
                                  setEditingCommentId(null);
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
                          <p className="text-sm leading-6 text-foreground/80">{reply.content}</p>
                        )}
                        {replyPending ? (
                          <p className="text-[0.72rem] text-amber-700">仅你自己可见，审核通过后会公开显示。</p>
                        ) : null}
                      </div>

                      <InteractionRow
                        canDelete={replyCanDelete}
                        canEdit={replyCanEdit}
                        canInteract={props.canInteract && !replyPending}
                        disableDelete={busy?.action === "delete" && busy.targetId === reply.id}
                        disableEdit={busy?.action === "edit" && busy.targetId === reply.id}
                        disableLike={busy?.action === "like" && busy.targetId === reply.id}
                        disableReply={replyPending || busy?.action === "reply"}
                        hasLiked={reply.viewer.hasLiked}
                        isEditing={editingCommentId === reply.id}
                        likeCount={reply.likeCount ?? 0}
                        onDelete={
                          replyCanDelete
                            ? () => {
                                setBusy({ action: "delete", targetId: reply.id });
                                setError(null);
                                void apiClient
                                  .deletePostComment(props.postId, reply.id)
                                  .then(() => {
                                    patchPostReplyDeleted(
                                      queryClient,
                                      props.postId,
                                      props.comment.id,
                                      reply.id,
                                      reply.status === "visible" ? 1 : 0
                                    );
                                    if (editingCommentId === reply.id) {
                                      setEditingCommentId(null);
                                    }
                                  })
                                  .catch((value: unknown) => {
                                    setError(value instanceof Error ? value.message : "删除评论失败");
                                  })
                                  .finally(() => {
                                    setBusy(null);
                                  });
                              }
                            : undefined
                        }
                        onEdit={
                          replyCanEdit
                            ? () => {
                                if (editingCommentId === reply.id) {
                                  setEditingCommentId(null);
                                } else {
                                  setEditingCommentId(reply.id);
                                  setEditContent(reply.content);
                                }
                              }
                            : undefined
                        }
                        onLike={
                          replyPending
                            ? undefined
                            : () => {
                                const nextHasLiked = !reply.viewer.hasLiked;
                                setBusy({ action: "like", targetId: reply.id });
                                setError(null);
                                void apiClient
                                  .likePostComment(props.postId, reply.id)
                                  .then(() => {
                                    patchPostCommentLikeToggle(queryClient, props.postId, reply.id, nextHasLiked);
                                  })
                                  .catch((value: unknown) => {
                                    setError(value instanceof Error ? value.message : "点赞失败");
                                  })
                                  .finally(() => {
                                    setBusy(null);
                                  });
                              }
                        }
                        onReply={
                          replyPending
                            ? undefined
                            : () => openReply(reply.id, reply.author.displayName)
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {replyingTo && !isPending ? (
        <div className="mt-3">
          <InlineCommentComposer
            busy={busy?.action === "reply"}
            disabled={!props.canInteract}
            onChange={setReplyContent}
            onSubmit={() => {
              if (!replyContent.trim()) {
                return;
              }

              setBusy({ action: "reply" });
              setError(null);

              void apiClient
                .createPostComment(props.postId, {
                  content: replyContent,
                  parentCommentId: props.comment.id
                })
                .then((payload) => {
                  patchPostCommentCreated(queryClient, props.postId, payload.item);
                  setReplyingTo(null);
                  setReplyContent("");
                  setExpanded(true);
                  startTransition(() => {
                    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
                  });
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
          {busy?.action === "reply" ? (
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
  const [rootsExpanded, setRootsExpanded] = useState(false);

  useEffect(() => {
    setRootsExpanded(false);
  }, [props.sortOrder]);

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

  const limit = props.collapsedRootLimit;
  const displayComments = useMemo(
    () => getVisibleRootComments(sortedComments, limit, rootsExpanded),
    [limit, rootsExpanded, sortedComments]
  );

  const canToggleRoots = shouldShowCommentCollapseToggle(sortedComments.length, limit);
  const totalForLabel =
    props.totalCommentCount ?? estimateTotalCommentsFromPostRoots(sortedComments);

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

      {displayComments.map((comment) => (
        <RootCommentItem
          canInteract={props.canInteract}
          comment={comment}
          currentUserId={props.currentUserId}
          key={comment.id}
          postId={props.postId}
        />
      ))}

      {canToggleRoots ? (
        <div className="border-t border-border/80 py-3">
          {rootsExpanded ? (
            <Button
              className="w-full"
              onClick={() => {
                setRootsExpanded(false);
              }}
              type="button"
              variant="ghost"
            >
              收起评论
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={() => {
                setRootsExpanded(true);
              }}
              type="button"
              variant="ghost"
            >
              展开全部评论（共 {totalForLabel} 条）
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
