import { useQueryClient } from "@tanstack/react-query";
import { CornerDownRightIcon, SquarePenIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { CommentPublishedTime } from "@/components/comment-published-time";
import {
  CommentIconOnlyButton,
  CommentLikeIconButton,
  CommentTextAction
} from "@/components/comment-thread-controls";
import { ProfileLink } from "@/components/profile-link";
import { RatingStars } from "@/components/rating-stars";
import { ReportActionSheet } from "@/components/report-action-sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InlineCommentComposer } from "@/features/posts/inline-comment-composer";
import { apiClient } from "@/lib/api-client";
import { getAvatarImage } from "@/lib/aviation-media";
import {
  patchRatingTargetCommentCreated,
  patchRatingTargetCommentLike
} from "./rating-target-detail-helpers";
import type { RatingTargetCommentNode, RatingTargetDetail } from "./rating-target-detail-types";

type CommentActionsProps = {
  itemId: string;
  comment: RatingTargetCommentNode;
  canInteract: boolean;
  disabled: boolean;
  isEditing: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLike: () => void;
};

function CommentActions(props: CommentActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1 self-start">
      <CommentLikeIconButton
        disabled={props.disabled}
        hasLiked={props.comment.viewer.hasLiked}
        likeCount={props.comment.likeCount ?? 0}
        onClick={props.onLike}
      />

      {props.canInteract ? (
        <CommentTextAction disabled={props.disabled} onClick={props.onReply} variant="reply">
          回复
        </CommentTextAction>
      ) : null}

      {!props.comment.viewer.canDelete ? (
        <ReportActionSheet
          description="请填写举报理由，并至少上传 1 张证据图。"
          onSubmit={async (input) => {
            await apiClient.reportRatingTargetComment(props.itemId, props.comment.id, input);
          }}
          title="举报评论"
          trigger={
            <CommentTextAction
              disabled={props.disabled}
              hasReported={props.comment.viewer.hasReported}
              variant="report"
            >
              举报
            </CommentTextAction>
          }
        />
      ) : null}

      {props.comment.viewer.canEdit ? (
        <CommentIconOnlyButton
          active={props.isEditing}
          disabled={props.disabled}
          icon={SquarePenIcon}
          label="编辑评论"
          onClick={props.onEdit}
        />
      ) : null}

      {props.comment.viewer.canDelete ? (
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

type RatingTargetCommentCardProps = {
  itemId: string;
  comment: RatingTargetCommentNode;
  canInteract: boolean;
  depth?: number;
  onRefresh: () => Promise<void>;
  onRequireLogin: () => void;
};

export function RatingTargetCommentCard(props: RatingTargetCommentCardProps) {
  const queryClient = useQueryClient();
  const depth = props.depth ?? 0;
  const [replyingTo, setReplyingTo] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState(props.comment.content);
  const [busy, setBusy] = useState<"reply" | "edit" | "delete" | "like" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const replies = useMemo(() => props.comment.replies ?? [], [props.comment.replies]);

  function ensureCanInteract() {
    if (props.canInteract) {
      return true;
    }
    props.onRequireLogin();
    return false;
  }

  function patchDetail(updater: (item: RatingTargetDetail) => RatingTargetDetail) {
    queryClient.setQueryData<Awaited<ReturnType<typeof apiClient.getRatingTargetDetail>>>(
      ["rating-target-detail", props.itemId],
      (current) => {
        if (!current?.item) {
          return current;
        }

        return {
          ...current,
          item: updater(current.item)
        };
      }
    );
  }

  return (
    <article>
      <div className="flex items-start gap-3">
        <ProfileLink userId={props.comment.author.id}>
          <Avatar className="mt-0.5" size="sm">
            <AvatarImage
              alt={props.comment.author.displayName}
              src={props.comment.author.avatarUrl ?? getAvatarImage(props.comment.author.id)}
            />
            <AvatarFallback>{props.comment.author.displayName.slice(0, 1)}</AvatarFallback>
          </Avatar>
        </ProfileLink>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
            <ProfileLink className="font-medium text-foreground hover:text-primary" userId={props.comment.author.id}>
              {props.comment.author.displayName}
            </ProfileLink>
            {props.comment.replyToUser ? (
              <span className="inline-flex items-center gap-1 text-[0.72rem] text-primary/85">
                <CornerDownRightIcon className="size-3.5" />
                @{props.comment.replyToUser.displayName}
              </span>
            ) : null}
            {props.comment.rating ? <RatingStars size="xs" tone="rating" value={props.comment.rating} /> : null}
            <CommentPublishedTime createdAt={props.comment.createdAt} />
          </div>

          {isEditing ? (
            <InlineCommentComposer
              busy={busy === "edit"}
              disabled={busy !== null || !editingContent.trim()}
              onChange={setEditingContent}
              onSubmit={() => {
                if (!editingContent.trim()) {
                  return;
                }
                setBusy("edit");
                setError(null);
                void apiClient
                  .updateRatingTargetComment(props.itemId, props.comment.id, {
                    content: editingContent.trim()
                  })
                  .then(() => {
                    setIsEditing(false);
                    return props.onRefresh();
                  })
                  .catch((reason: unknown) => {
                    setError(reason instanceof Error ? reason.message : "编辑评论失败。");
                  })
                  .finally(() => setBusy(null));
              }}
              placeholder="编辑评论内容"
              value={editingContent}
            />
          ) : (
            <p className="text-sm leading-6 text-foreground/84">{props.comment.content}</p>
          )}
        </div>

        <CommentActions
          canInteract={props.canInteract}
          comment={props.comment}
          disabled={busy !== null}
          isEditing={isEditing}
          itemId={props.itemId}
          onDelete={() => {
            setBusy("delete");
            setError(null);
            void apiClient
              .deleteRatingTargetComment(props.itemId, props.comment.id)
              .then(props.onRefresh)
              .catch((reason: unknown) => {
                setError(reason instanceof Error ? reason.message : "删除评论失败。");
              })
              .finally(() => setBusy(null));
          }}
          onEdit={() => {
            setIsEditing((value) => !value);
            setEditingContent(props.comment.content);
          }}
          onLike={() => {
            if (!ensureCanInteract()) {
              return;
            }
            setBusy("like");
            setError(null);
            void apiClient
              .likeRatingTargetComment(props.itemId, props.comment.id)
              .then(() => {
                patchDetail((item) =>
                  patchRatingTargetCommentLike(item, props.comment.id, !props.comment.viewer.hasLiked)
                );
              })
              .catch((reason: unknown) => {
                setError(reason instanceof Error ? reason.message : "点赞失败。");
              })
              .finally(() => setBusy(null));
          }}
          onReply={() => {
            if (!ensureCanInteract()) {
              return;
            }
            setReplyingTo((value) => !value);
            setReplyContent((current) => (current || `@${props.comment.author.displayName} `));
          }}
        />
      </div>

      {replyingTo ? (
        <div className="mt-3">
          <InlineCommentComposer
            busy={busy === "reply"}
            disabled={busy !== null || !replyContent.trim()}
            onChange={setReplyContent}
            onSubmit={() => {
              if (!replyContent.trim()) {
                return;
              }
              setBusy("reply");
              setError(null);
              void apiClient
                .createRatingTargetComment(props.itemId, {
                  content: replyContent.trim(),
                  parentCommentId: props.comment.id
                })
                .then((payload) => {
                  patchDetail((item) =>
                    patchRatingTargetCommentCreated(item, {
                      ...payload.item,
                      replies: []
                    })
                  );
                  setReplyingTo(false);
                  setReplyContent("");
                })
                .catch((reason: unknown) => {
                  setError(reason instanceof Error ? reason.message : "回复评论失败。");
                })
                .finally(() => setBusy(null));
            }}
            placeholder={`回复 @${props.comment.author.displayName}`}
            value={replyContent}
          />
        </div>
      ) : null}

      {error ? (
        <Alert className="mt-3" variant="destructive">
          <AlertTitle>评论操作失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {replies.length > 0 ? (
        <div className="mt-3 space-y-4 border-l border-border/60 pl-4 dark:border-border/50">
          {replies.map((reply) => (
            <RatingTargetCommentCard
              canInteract={props.canInteract}
              comment={reply}
              depth={depth + 1}
              itemId={props.itemId}
              key={reply.id}
              onRefresh={props.onRefresh}
              onRequireLogin={props.onRequireLogin}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}
