import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiClient } from "../../lib/api-client";

const statusOptions = [
  ["all", "全部"],
  ["visible", "可见"],
  ["hidden", "已隐藏"]
] as const;

type CommentStatusFilter = (typeof statusOptions)[number][0];

export function PostCommentsPage() {
  const [status, setStatus] = useState<CommentStatusFilter>("all");
  const [error, setError] = useState<string | null>(null);

  const commentsQuery = useQuery({
    queryKey: ["admin-post-comments", status],
    queryFn: () => apiClient.listAdminPostComments(status === "all" ? undefined : status)
  });

  function updateStatus(id: string, nextStatus: "visible" | "hidden") {
    setError(null);
    void apiClient
      .updateAdminPostCommentStatus(id, {
        status: nextStatus
      })
      .then(() => {
        commentsQuery.refetch();
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "更新评论状态失败");
      });
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Post Comments</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">评论审核</h2>
      </header>

      <div className="flex flex-wrap gap-3">
        {statusOptions.map(([value, label]) => (
          <button
            className={`rounded-full px-4 py-2 text-sm transition ${
              value === status
                ? "bg-sky-400 text-slate-950"
                : "border border-white/10 text-slate-200"
            }`}
            key={value}
            onClick={() => {
              setStatus(value);
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/50 p-6">
        {commentsQuery.isLoading ? <p className="text-sm text-slate-400">加载中…</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {(commentsQuery.data?.items ?? []).map((item) => (
          <article
            className="rounded-3xl border border-white/10 bg-white/5 p-5"
            key={item.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  {item.author.displayName} · {item.parentCommentId ? "回复" : "主评论"}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">{item.postTitle}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.content}</p>
              </div>

              <div className="space-y-2">
                <span className="block rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300">
                  当前状态：{item.status}
                </span>
                <button
                  className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-200"
                  onClick={() => {
                    updateStatus(item.id, item.status === "visible" ? "hidden" : "visible");
                  }}
                  type="button"
                >
                  {item.status === "visible" ? "隐藏评论" : "恢复显示"}
                </button>
              </div>
            </div>
          </article>
        ))}

        {!commentsQuery.isLoading && (commentsQuery.data?.items ?? []).length === 0 ? (
          <p className="text-sm text-slate-400">当前筛选下暂无评论。</p>
        ) : null}
      </div>
    </section>
  );
}
