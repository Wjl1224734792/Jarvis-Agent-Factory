import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { AlertTriangle, ArrowLeft, MessageSquareText, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../features/auth/auth-store";
import { PostCommentThread } from "../features/posts/post-comment-thread";
import { PostInteractionBar } from "../features/posts/post-interaction-bar";
import { apiClient } from "../lib/api-client";

export function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.user);
  const [commentContent, setCommentContent] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postQuery = useQuery({
    queryKey: ["post-detail", id],
    queryFn: () => apiClient.getPostDetail(id),
    enabled: Boolean(id)
  });

  if (!id) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
        缺少帖子标识，无法加载详情。
      </div>
    );
  }

  if (postQuery.isLoading) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-sm text-slate-500">
        正在加载帖子详情...
      </div>
    );
  }

  if (postQuery.isError) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
        {postQuery.error.message}
      </div>
    );
  }

  const item = postQuery.data?.item;

  if (!item) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-sm text-slate-500">
        当前帖子不存在或尚未公开。
      </div>
    );
  }

  const isAuthor = currentUser?.id === item.author.id;
  const canComment = authStatus === "authenticated" && item.status === "published";

  return (
    <main className="space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
        to={APP_ROUTES.feedHome}
      >
        <ArrowLeft className="h-4 w-4" />
        返回首页内容流
      </Link>

      <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.35)]">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
              <span>{item.author.displayName}</span>
              <span>{new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}</span>
              <span>评论 {item.commentCount}</span>
            </div>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              {item.title}
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-700">{item.content}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {item.status !== "published" ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
                当前状态：{item.status}
              </span>
            ) : null}

            {authStatus === "authenticated" && !isAuthor ? (
              <button
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                onClick={() => {
                  setActionError(null);
                  void apiClient
                    .reportPost(item.id, {
                      reason: "疑似广告或不当内容"
                    })
                    .then(() => {
                      void queryClient.invalidateQueries({ queryKey: ["post-detail", id] });
                    })
                    .catch((value: unknown) => {
                      setActionError(value instanceof Error ? value.message : "举报失败");
                    });
                }}
                type="button"
              >
                <AlertTriangle className="h-4 w-4" />
                举报
              </button>
            ) : null}

            {isAuthor ? (
              <button
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
                onClick={() => {
                  setActionError(null);
                  void apiClient
                    .deletePost(item.id)
                    .then(() => {
                      void queryClient.invalidateQueries({ queryKey: ["home-feed"] });
                      navigate(APP_ROUTES.feedHome, { replace: true });
                    })
                    .catch((value: unknown) => {
                      setActionError(value instanceof Error ? value.message : "删除帖子失败");
                    });
                }}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                删除帖子
              </button>
            ) : null}
          </div>
        </div>

        {item.images.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {item.images.map((image) => (
              <img
                alt={image.fileName}
                className="h-72 w-full rounded-[28px] object-cover"
                key={image.id}
                src={image.url}
              />
            ))}
          </div>
        ) : null}

        <div className="mt-6">
          <PostInteractionBar
            authorId={item.author.id}
            favoriteCount={item.engagement.favoriteCount}
            isPublished={item.status === "published"}
            likeCount={item.engagement.likeCount}
            postId={item.id}
            shareCount={item.engagement.shareCount}
            viewer={item.engagement.viewer}
          />
        </div>

        {actionError ? (
          <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError}</p>
        ) : null}
      </section>

      <section className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
          <div className="flex items-center gap-2 text-slate-950">
            <MessageSquareText className="h-5 w-5" />
            <h3 className="text-lg font-semibold">发表评论</h3>
          </div>

          {authStatus !== "authenticated" ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              登录后即可参与评论、回复、点赞和关注。
            </div>
          ) : item.status !== "published" ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              只有已发布帖子才允许继续评论。
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <textarea
                className="min-h-32 w-full rounded-3xl border border-slate-200 px-4 py-4 text-sm leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400"
                onChange={(event) => {
                  setCommentContent(event.target.value);
                }}
                placeholder="写下你的看法、补充经验或不同观点。"
                value={commentContent}
              />
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!commentContent.trim() || isSubmitting}
                onClick={() => {
                  setActionError(null);
                  setIsSubmitting(true);

                  void apiClient
                    .createPostComment(item.id, {
                      content: commentContent
                    })
                    .then(() => {
                      setCommentContent("");
                      return Promise.all([
                        queryClient.invalidateQueries({ queryKey: ["post-detail", id] }),
                        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
                        queryClient.invalidateQueries({ queryKey: ["notifications"] })
                      ]);
                    })
                    .catch((value: unknown) => {
                      setActionError(value instanceof Error ? value.message : "评论失败");
                    })
                    .finally(() => {
                      setIsSubmitting(false);
                    });
                }}
                type="button"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "提交中..." : "提交评论"}
              </button>
            </div>
          )}
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
          <h3 className="text-lg font-semibold text-slate-950">评论区</h3>

          <div className="mt-5 space-y-4">
            {item.comments.length > 0 ? (
              <PostCommentThread
                canInteract={canComment}
                comments={item.comments}
                currentUserId={currentUser?.id}
                postId={item.id}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                还没有人参与这条讨论，欢迎留下第一条评论。
              </div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
