import { useQueryClient } from "@tanstack/react-query";
import { Send, Trash2 } from "lucide-react";
import { useState } from "react";
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
      className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5"
      style={{ marginLeft: `${Math.min(props.depth, 5) * 16}px` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-medium text-slate-950">{props.comment.author.displayName}</div>
          <div className="mt-1 text-xs text-slate-500">
            {new Date(props.comment.updatedAt).toLocaleString("zh-CN", { hour12: false })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {props.canInteract ? (
            <button
              className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
              onClick={() => {
                setReplying((value) => !value);
                setReplyContent("");
                setError(null);
              }}
              type="button"
            >
              回复
            </button>
          ) : null}

          {canDelete ? (
            <button
              className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-2 text-xs text-rose-600 transition hover:border-rose-300"
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
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
              删除
            </button>
          ) : null}
        </div>
      </div>

      <p className="text-sm leading-7 text-slate-700">{props.comment.content}</p>

      {replying ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <textarea
            className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-sky-400"
            onChange={(event) => {
              setReplyContent(event.target.value);
            }}
            placeholder={`回复 ${props.comment.author.displayName}`}
            value={replyContent}
          />
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
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
              <Send className="h-3.5 w-3.5" />
              发送回复
            </button>
            <button
              className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
              onClick={() => {
                setReplying(false);
                setReplyContent("");
                setError(null);
              }}
              type="button"
            >
              取消
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {props.comment.replies.length > 0 ? (
        <div className="space-y-3 border-l border-slate-200 pl-3">
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
      ) : null}
    </article>
  );
}

export function PostCommentThread(props: ThreadProps) {
  return (
    <div className="space-y-4">
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
