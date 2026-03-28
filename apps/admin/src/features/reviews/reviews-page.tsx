import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiClient } from "../../lib/api-client";

export function ReviewsPage() {
  const reviewsQuery = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => apiClient.listAdminReviews()
  });
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Reviews</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">评论治理</h2>
      </header>

      <div className="rounded-[28px] border border-white/10 bg-slate-950/50 p-6">
        <div className="space-y-3">
          {(reviewsQuery.data?.items ?? []).map((item) => (
            <article
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200"
              key={item.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-white">{item.model.name}</div>
                  <div className="mt-1 text-xs text-slate-400">{item.author.displayName} 路 评论内容</div>
                </div>
                <button
                  className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-200"
                  onClick={() => {
                    setError(null);
                    void apiClient
                      .updateReviewStatus(item.id, {
                        status: item.status === "visible" ? "hidden" : "visible"
                      })
                      .then(() => {
                        reviewsQuery.refetch();
                      })
                      .catch((reason: unknown) => {
                        setError(reason instanceof Error ? reason.message : "更新评论状态失败");
                      });
                  }}
                  type="button"
                >
                  {item.status === "visible" ? "隐藏" : "恢复显示"}
                </button>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                {item.content ?? "该评论当前没有补充正文。"}
              </p>
            </article>
          ))}

          {reviewsQuery.isLoading ? <p className="text-sm text-slate-400">加载中…</p> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
