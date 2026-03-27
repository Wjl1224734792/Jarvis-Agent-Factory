import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { PlusIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { apiClient } from "../../lib/api-client";

export function RankingsPage() {
  const rankingsQuery = useQuery({
    queryKey: ["admin-rankings"],
    queryFn: () => apiClient.listRankings()
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Official Rankings</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">官方榜单</h2>
        </div>
        <Link
          className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-white transition hover:bg-cyan-400/15"
          to={`${APP_ROUTES.adminRankings}/new`}
        >
            <PlusIcon className="mr-2 h-4 w-4" />
            新建官方榜单
        </Link>
      </div>

      {rankingsQuery.isError ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
          {rankingsQuery.error.message}
        </div>
      ) : null}

      <div className="space-y-3">
        {(rankingsQuery.data?.official ?? []).map((ranking) => (
          <Link
            className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 transition hover:border-cyan-300/25 hover:bg-white/8"
            key={ranking.id}
            to={`${APP_ROUTES.adminRankings}/${ranking.id}`}
          >
            <div className="min-w-0">
              <div className="truncate text-base font-medium text-white">{ranking.title}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                {ranking.itemCount} items
              </div>
            </div>
            <div className="text-sm text-cyan-200">{ranking.averageScore.toFixed(1)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
