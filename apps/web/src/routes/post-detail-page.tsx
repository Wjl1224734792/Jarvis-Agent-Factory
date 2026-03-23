import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { AlertTriangle, ArrowLeft, MessageSquareText, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../features/auth/auth-store";
import { apiClient } from "../lib/api-client";

function postDetailPath(id: string) {
  return APP_ROUTES.postDetail.replace(":id", id);
}

export function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.user);
  const [commentContent, setCommentContent] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
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
        当前帖子不存在或还未公开。
      </div>
    );
  }

  const isAuthor = currentUser?.id === item.author.id;

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
        <div className="flex flex-wrap items-start justify-between gap-4">
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
                    .catch((error: unknown) => {
                      setActionError(error instanceof Error ? error.message : "举报失败");
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
                    .catch((error: unknown) => {
                      setActionError(error instanceof Error ? error.message : "删帖失败");
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
              登录后即可参与评论和回复。
            </div>
          ) : item.status !== "published" ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              只有已发布帖子可继续评论。
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
                      void queryClient.invalidateQueries({ queryKey: ["post-detail", id] });
                      void queryClient.invalidateQueries({ queryKey: ["home-feed"] });
                    })
                    .catch((error: unknown) => {
                      setActionError(error instanceof Error ? error.message : "评论失败");
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
            {item.comments.map((comment) => {
              const canDeleteComment = currentUser?.id === comment.author.id;

              return (
                <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5" key={comment.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-950">{comment.author.displayName}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(comment.updatedAt).toLocaleString("zh-CN", { hour12: false })}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {authStatus === "authenticated" && item.status === "published" ? (
                        <button
                          className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                          onClick={() => {
                            setReplyTargetId((current) => (current === comment.id ? null : comment.id));
                            setReplyContent("");
                          }}
                          type="button"
                        >
                          回复
                        </button>
                      ) : null}
                      {canDeleteComment ? (
                        <button
                          className="rounded-full border border-rose-200 px-3 py-2 text-xs text-rose-600 transition hover:border-rose-300"
                          onClick={() => {
                            setActionError(null);
                            void apiClient
                              .deletePostComment(item.id, comment.id)
                              .then(() => {
                                void queryClient.invalidateQueries({ queryKey: ["post-detail", id] });
                                void queryClient.invalidateQueries({ queryKey: ["home-feed"] });
                              })
                              .catch((error: unknown) => {
                                setActionError(
                                  error instanceof Error ? error.message : "删除评论失败"
                                );
                              });
                          }}
                          type="button"
                        >
                          删除
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-slate-700">{comment.content}</p>

                  {replyTargetId === comment.id ? (
                    <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <textarea
                        className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-sky-400"
                        onChange={(event) => {
                          setReplyContent(event.target.value);
                        }}
                        placeholder={`回复 ${comment.author.displayName}`}
                        value={replyContent}
                      />
                      <div className="flex gap-2">
                        <button
                          className="rounded-full bg-slate-950 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                          disabled={!replyContent.trim()}
                          onClick={() => {
                            setActionError(null);
                            void apiClient
                              .createPostComment(item.id, {
                                content: replyContent,
                                parentCommentId: comment.id
                              })
                              .then(() => {
                                setReplyTargetId(null);
                                setReplyContent("");
                                void queryClient.invalidateQueries({ queryKey: ["post-detail", id] });
                                void queryClient.invalidateQueries({ queryKey: ["home-feed"] });
                              })
                              .catch((error: unknown) => {
                                setActionError(
                                  error instanceof Error ? error.message : "回复失败"
                                );
                              });
                          }}
                          type="button"
                        >
                          回复这条评论
                        </button>
                        <button
                          className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                          onClick={() => {
                            setReplyTargetId(null);
                            setReplyContent("");
                          }}
                          type="button"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {comment.replies.length > 0 ? (
                    <div className="mt-4 space-y-3 border-l border-slate-200 pl-4">
                      {comment.replies.map((reply) => {
                        const canDeleteReply = currentUser?.id === reply.author.id;

                        return (
                          <div className="rounded-2xl bg-white p-4" key={reply.id}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="font-medium text-slate-900">{reply.author.displayName}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {new Date(reply.updatedAt).toLocaleString("zh-CN", {
                                    hour12: false
                                  })}
                                </div>
                              </div>

                              {canDeleteReply ? (
                                <button
                                  className="rounded-full border border-rose-200 px-3 py-2 text-xs text-rose-600 transition hover:border-rose-300"
                                  onClick={() => {
                                    setActionError(null);
                                    void apiClient
                                      .deletePostComment(item.id, reply.id)
                                      .then(() => {
                                        void queryClient.invalidateQueries({
                                          queryKey: ["post-detail", id]
                                        });
                                        void queryClient.invalidateQueries({
                                          queryKey: ["home-feed"]
                                        });
                                      })
                                      .catch((error: unknown) => {
                                        setActionError(
                                          error instanceof Error
                                            ? error.message
                                            : "删除回复失败"
                                        );
                                      });
                                  }}
                                  type="button"
                                >
                                  删除
                                </button>
                              ) : null}
                            </div>

                            <p className="mt-3 text-sm leading-7 text-slate-700">{reply.content}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </article>
              );
            })}

            {item.comments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                还没有人参与这条讨论，欢迎留下第一条评论。
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
