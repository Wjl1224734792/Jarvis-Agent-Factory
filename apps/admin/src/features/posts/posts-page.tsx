import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiClient } from "../../lib/api-client";

const statusOptions = [
  ["all", "全部"],
  ["pending", "待审核"],
  ["published", "已发布"],
  ["rejected", "已驳回"],
  ["hidden", "已隐藏"]
] as const;

type PostStatusFilter = (typeof statusOptions)[number][0];

export function PostsPage() {
  const [status, setStatus] = useState<PostStatusFilter>("all");
  const [error, setError] = useState<string | null>(null);

  const postsQuery = useQuery({
    queryKey: ["admin-posts", status],
    queryFn: () => apiClient.listAdminPosts(status === "all" ? undefined : status)
  });

  function updateStatus(id: string, nextStatus: "published" | "rejected" | "hidden") {
    setError(null);
    void apiClient
      .updateAdminPostStatus(id, {
        status: nextStatus
      })
      .then(() => {
        postsQuery.refetch();
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "更新帖子状态失败");
      });
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Posts Moderation</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">帖子审核</h2>
      </header>

      <div className="flex flex-wrap gap-3">
        {statusOptions.map(([value, label]) => (
          <button
            className={`rounded-full px-4 py-2 text-sm transition ${
              value === status
                ? "bg-emerald-400 text-slate-950"
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
        {postsQuery.isLoading ? <p className="text-sm text-slate-400">加载中…</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {(postsQuery.data?.items ?? []).map((item) => (
          <article
            className="rounded-3xl border border-white/10 bg-white/5 p-5"
            key={item.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  {item.author.displayName} · 评论 {item.commentCount} · 举报 {item.reportCount}
                </div>
                <h3 className="mt-3 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                  {item.contentPreview}
                </p>
              </div>

              <div className="space-y-2">
                <span className="block rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300">
                  当前状态：{item.status}
                </span>
                <div className="flex flex-wrap gap-2">
                  {item.status !== "published" ? (
                    <button
                      className="rounded-full bg-emerald-400 px-3 py-2 text-xs font-medium text-slate-950"
                      onClick={() => {
                        updateStatus(item.id, "published");
                      }}
                      type="button"
                    >
                      通过发布
                    </button>
                  ) : null}
                  {item.status !== "rejected" ? (
                    <button
                      className="rounded-full border border-amber-300/40 px-3 py-2 text-xs text-amber-200"
                      onClick={() => {
                        updateStatus(item.id, "rejected");
                      }}
                      type="button"
                    >
                      驳回
                    </button>
                  ) : null}
                  {item.status !== "hidden" ? (
                    <button
                      className="rounded-full border border-rose-300/40 px-3 py-2 text-xs text-rose-200"
                      onClick={() => {
                        updateStatus(item.id, "hidden");
                      }}
                      type="button"
                    >
                      隐藏
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        ))}

        {!postsQuery.isLoading && (postsQuery.data?.items ?? []).length === 0 ? (
          <p className="text-sm text-slate-400">当前筛选下暂无帖子。</p>
        ) : null}
      </div>
    </section>
  );
}
