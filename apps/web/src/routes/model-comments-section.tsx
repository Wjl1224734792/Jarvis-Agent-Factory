import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CornerDownRightIcon,
  HeartIcon,
  MessageSquareTextIcon,
  SquarePenIcon,
  Trash2Icon
} from "lucide-react";
import { useMemo, useState } from "react";
import { ProfileLink } from "@/components/profile-link";
import { ReportActionSheet } from "@/components/report-action-sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InlineCommentComposer } from "@/features/posts/inline-comment-composer";
import { useLoginPrompt } from "@/features/auth/use-login-prompt";
import { getAvatarImage } from "@/lib/aviation-media";
import { apiClient } from "@/lib/api-client";

type ModelComment = Awaited<ReturnType<typeof apiClient.listModelComments>>["items"][number];
type ModelCommentReply = ModelComment["replies"][number];
type ModelCommentNode = (ModelComment | ModelCommentReply) & {
  replies?: ModelCommentReply[];
};

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function CommentActions(props: {
  slug: string;
  comment: ModelCommentNode;
  canInteract: boolean;
  disabled: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLike: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        className="h-7 rounded-none px-0 text-[0.72rem] text-muted-foreground"
        disabled={props.disabled}
        onClick={props.onLike}
        size="sm"
        type="button"
        variant="ghost"
      >
        <HeartIcon className="size-3.5" />
        {props.comment.likeCount ?? 0}
      </Button>

      {props.canInteract ? (
        <Button
          className="h-7 rounded-none px-0 text-[0.72rem] text-muted-foreground"
          disabled={props.disabled}
          onClick={props.onReply}
          size="sm"
          type="button"
          variant="ghost"
        >
          回复
        </Button>
      ) : null}

      {!props.comment.viewer.canDelete ? (
        <ReportActionSheet
          description="请说明这条评论的问题，并至少上传 1 张证据图。"
          onSubmit={async (input) => {
            await apiClient.reportModelComment(props.slug, props.comment.id, input);
          }}
          title="举报评论"
          trigger={
            <Button
              className="h-7 rounded-none px-0 text-[0.72rem] text-muted-foreground"
              disabled={props.disabled}
              size="sm"
              type="button"
              variant="ghost"
            >
              举报
            </Button>
          }
        />
      ) : null}

      {props.comment.viewer.canEdit ? (
        <Button
          className="h-7 rounded-none px-0 text-[0.72rem] text-muted-foreground"
          disabled={props.disabled}
          onClick={props.onEdit}
          size="sm"
          type="button"
          variant="ghost"
        >
          <SquarePenIcon className="size-3.5" />
          <span className="sr-only">编辑评论</span>
        </Button>
      ) : null}

      {props.comment.viewer.canDelete ? (
        <Button
          className="h-7 rounded-none px-0 text-[0.72rem] text-muted-foreground"
          disabled={props.disabled}
          onClick={props.onDelete}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Trash2Icon className="size-3.5" />
          <span className="sr-only">删除评论</span>
        </Button>
      ) : null}
    </div>
  );
}

function countVisibleComments(items: ModelComment[]): number {
  return items.reduce(
    (total, comment) => total + 1 + countVisibleComments((comment.replies ?? []) as ModelComment[]),
    0
  );
}

function ModelCommentCard(props: {
  slug: string;
  comment: ModelCommentNode;
  canInteract: boolean;
  depth?: number;
  onRefresh: () => Promise<void>;
  onRequireLogin: () => void;
}) {
  const depth = props.depth ?? 0;
  const [replyingTo, setReplyingTo] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState(props.comment.content);
  const [busy, setBusy] = useState<"reply" | "edit" | "delete" | "like" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const childComments = useMemo(
    () => (("replies" in props.comment ? props.comment.replies : []) ?? []) as ModelCommentNode[],
    [props.comment]
  );

  const isPending = props.comment.status === "pending";

  function ensureCanInteract() {
    if (props.canInteract) {
      return true;
    }
    props.onRequireLogin();
    return false;
  }

  return (
    <article className={depth > 0 ? "bg-muted/15 pl-4 dark:bg-muted/25" : ""}>
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
                <CornerDownRightIcon className="size-3.25" />
                @{props.comment.replyToUser.displayName}
              </span>
            ) : null}
            {isPending ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.68rem] font-medium text-amber-700">
                待审核
              </span>
            ) : null}
            <span className="text-[0.72rem] text-muted-foreground">{formatTime(props.comment.updatedAt)}</span>
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
                  .updateModelComment(props.slug, props.comment.id, { content: editingContent.trim() })
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

          {isPending ? (
            <p className="text-[0.72rem] text-amber-700">这条评论正在审核中，目前仅你自己可见。</p>
          ) : null}

          <CommentActions
            canInteract={props.canInteract && !isPending}
            comment={props.comment}
            disabled={busy !== null}
            onDelete={() => {
              setBusy("delete");
              setError(null);
              void apiClient
                .deleteModelComment(props.slug, props.comment.id)
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
                .likeModelComment(props.slug, props.comment.id)
                .then(props.onRefresh)
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
              setReplyContent((current) => (current ? current : `@${props.comment.author.displayName} `));
            }}
            slug={props.slug}
          />

          {replyingTo && !isPending ? (
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
                  .createModelComment(props.slug, {
                    content: replyContent.trim(),
                    parentCommentId: props.comment.id
                  })
                  .then(() => {
                    setReplyingTo(false);
                    setReplyContent("");
                    return props.onRefresh();
                  })
                  .catch((reason: unknown) => {
                    setError(reason instanceof Error ? reason.message : "回复评论失败。");
                  })
                  .finally(() => setBusy(null));
              }}
              placeholder={`回复 @${props.comment.author.displayName}`}
              value={replyContent}
            />
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>评论操作失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {childComments.length > 0 ? (
            <div className="space-y-4 pt-2">
              {childComments.map((reply) => (
                <ModelCommentCard
                  canInteract={props.canInteract}
                  comment={reply}
                  depth={depth + 1}
                  key={reply.id}
                  onRefresh={props.onRefresh}
                  onRequireLogin={props.onRequireLogin}
                  slug={props.slug}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ModelCommentsSection(props: {
  slug: string;
  currentUserId?: string;
  isAuthenticated: boolean;
}) {
  const promptLogin = useLoginPrompt();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commentsQuery = useQuery({
    queryKey: ["model-comments", props.slug],
    queryFn: () => apiClient.listModelComments(props.slug),
    enabled: Boolean(props.slug)
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["model-comments", props.slug] });
  }

  function openLoginPrompt() {
    promptLogin({
      title: "登录后才能参与评论",
      description: "发布、回复、点赞和举报评论都需要先登录。"
    });
  }

  const visibleCount = countVisibleComments(commentsQuery.data?.items ?? []);

  return (
    <section className="space-y-4" id="model-comment-area">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <MessageSquareTextIcon className="size-4.5 text-primary" />
          评论区
        </div>
        <div className="text-sm text-muted-foreground">共 {visibleCount} 条可见评论</div>
      </div>

      <div className="bg-white px-5 py-5">
        {!props.isAuthenticated ? (
          <Button className="w-full" onClick={openLoginPrompt} size="sm" type="button" variant="outline">
            登录后发表评论
          </Button>
        ) : (
          <InlineCommentComposer
            busy={busy}
            disabled={busy || !content.trim()}
            onChange={setContent}
            onSubmit={() => {
              if (!content.trim()) {
                return;
              }
              setBusy(true);
              setError(null);
              void apiClient
                .createModelComment(props.slug, { content: content.trim() })
                .then(() => {
                  setContent("");
                  return refresh();
                })
                .catch((reason: unknown) => {
                  setError(reason instanceof Error ? reason.message : "发表评论失败。");
                })
                .finally(() => setBusy(false));
            }}
            placeholder="写下你对这款飞行器的看法..."
            value={content}
          />
        )}

        {error ? (
          <Alert className="mt-4" variant="destructive">
            <AlertTitle>评论提交失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      {commentsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>评论加载失败</AlertTitle>
          <AlertDescription>{commentsQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="bg-white">
        {(commentsQuery.data?.items ?? []).length > 0 ? (
          <div className="space-y-6 px-5 py-4">
            {(commentsQuery.data?.items ?? []).map((comment) => (
              <div key={comment.id}>
                <ModelCommentCard
                  canInteract={props.isAuthenticated}
                  comment={comment}
                  onRefresh={refresh}
                  onRequireLogin={openLoginPrompt}
                  slug={props.slug}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-5 text-[0.82rem] text-muted-foreground">还没有公开评论。</div>
        )}
      </div>
    </section>
  );
}
