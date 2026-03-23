import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  CheckCheck,
  Clock3,
  FileText,
  MessageSquareMore,
  Plane,
  ShieldCheck,
  Star,
  Tags
} from "lucide-react";
import { useAdminAuthStore } from "./auth-store";
import { apiClient } from "../../lib/api-client";

const dashboardCards = [
  {
    key: "posts",
    label: "帖子总量",
    description: "已进入治理视图的内容池",
    icon: FileText,
    tone: "from-cyan-500/20 to-sky-500/10 border-cyan-400/20 text-cyan-100"
  },
  {
    key: "comments",
    label: "评论总量",
    description: "含楼中回复的审核对象",
    icon: MessageSquareMore,
    tone: "from-violet-500/20 to-fuchsia-500/10 border-violet-400/20 text-violet-100"
  },
  {
    key: "reviews",
    label: "点评总量",
    description: "口碑展示与隐藏治理",
    icon: Star,
    tone: "from-amber-500/20 to-orange-500/10 border-amber-400/20 text-amber-100"
  },
  {
    key: "models",
    label: "机型总量",
    description: "当前公开的机型主数据",
    icon: Plane,
    tone: "from-emerald-500/20 to-teal-500/10 border-emerald-400/20 text-emerald-100"
  }
] as const;

export function AdminOverviewPage() {
  const user = useAdminAuthStore((state) => state.user);
  const error = useAdminAuthStore((state) => state.error);

  const postsQuery = useQuery({
    queryKey: ["admin-overview", "posts"],
    queryFn: () => apiClient.listAdminPosts()
  });
  const commentsQuery = useQuery({
    queryKey: ["admin-overview", "comments"],
    queryFn: () => apiClient.listAdminPostComments()
  });
  const reviewsQuery = useQuery({
    queryKey: ["admin-overview", "reviews"],
    queryFn: () => apiClient.listAdminReviews()
  });
  const modelsQuery = useQuery({
    queryKey: ["admin-overview", "models"],
    queryFn: () => apiClient.listModels()
  });
  const categoriesQuery = useQuery({
    queryKey: ["admin-overview", "categories"],
    queryFn: () => apiClient.listCategories()
  });
  const brandsQuery = useQuery({
    queryKey: ["admin-overview", "brands"],
    queryFn: () => apiClient.listBrands()
  });

  const loading =
    postsQuery.isLoading ||
    commentsQuery.isLoading ||
    reviewsQuery.isLoading ||
    modelsQuery.isLoading ||
    categoriesQuery.isLoading ||
    brandsQuery.isLoading;

  const metrics = {
    posts: postsQuery.data?.items.length ?? 0,
    comments: commentsQuery.data?.items.length ?? 0,
    reviews: reviewsQuery.data?.items.length ?? 0,
    models: modelsQuery.data?.items.length ?? 0,
    pendingPosts:
      postsQuery.data?.items.filter((item) => item.status === "pending").length ?? 0,
    hiddenComments:
      commentsQuery.data?.items.filter((item) => item.status === "hidden").length ?? 0,
    hiddenReviews:
      reviewsQuery.data?.items.filter((item) => item.status === "hidden").length ?? 0,
    categories: categoriesQuery.data?.length ?? 0,
    brands: brandsQuery.data?.length ?? 0
  };

  const latestPost = postsQuery.data?.items[0];
  const latestComment = commentsQuery.data?.items[0];

  return (
    <section className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(140deg,rgba(6,23,42,0.98)_0%,rgba(12,74,110,0.92)_52%,rgba(14,116,144,0.82)_100%)] p-6 shadow-[0_35px_90px_-50px_rgba(0,0,0,0.82)] sm:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/10 bg-white/8 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100/80">
              <ShieldCheck className="h-4 w-4" />
              Governance Overview
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              管理员工作台已进入可治理状态
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-cyan-50/80">
              当前后台聚焦飞加网 MVP 的最小治理闭环：帖子审核、评论处理、点评展示和机型基础维护。
              概览页把内容池规模、待处理风险和目录资产集中呈现，方便快速判断优先级。
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/10 bg-white/8 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/65">Current Admin</p>
                <p className="mt-3 text-lg font-medium text-white">{user?.displayName ?? "管理员"}</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/8 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/65">Pending Queue</p>
                <p className="mt-3 text-lg font-medium text-white">{metrics.pendingPosts} 条待审核帖子</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/8 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/65">Catalog Assets</p>
                <p className="mt-3 text-lg font-medium text-white">
                  {metrics.categories} 分类 / {metrics.brands} 品牌
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-950/25 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">Moderation Pulse</p>
            <div className="mt-5 space-y-3">
              <div className="rounded-[22px] border border-amber-300/10 bg-amber-400/8 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-100">
                    <Clock3 className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">待处理队列</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-amber-100/70">
                      帖子 {metrics.pendingPosts} / 隐藏评论 {metrics.hiddenComments}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[22px] border border-rose-300/10 bg-rose-400/8 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-400/10 text-rose-100">
                    <AlertTriangle className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">口碑可见性</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-rose-100/70">
                      已隐藏点评 {metrics.hiddenReviews} 条
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[22px] border border-emerald-300/10 bg-emerald-400/8 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-100">
                    <CheckCheck className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">目录资产</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-emerald-100/70">
                      机型 {metrics.models} / 品牌 {metrics.brands} / 分类 {metrics.categories}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {error ? (
              <div className="mt-5 rounded-[20px] border border-rose-200/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <article className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Core Metrics</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">治理主看板</h3>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-400">
              {loading ? "同步中" : "已同步"}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {dashboardCards.map((card) => {
              const Icon = card.icon;
              const value = metrics[card.key];

              return (
                <div
                  className={`rounded-[24px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.03)_100%)] p-5 ${card.tone}`}
                  key={card.key}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-3xl font-semibold text-white">{value}</span>
                  </div>
                  <p className="mt-5 text-base font-medium text-white">{card.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{card.description}</p>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.5)]">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Latest Signals</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">最近治理对象</h3>

          <div className="mt-6 space-y-4">
            <div className="rounded-[22px] border border-white/10 bg-slate-950/35 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-100">
                  <FileText className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">最新帖子对象</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                    {latestPost ? latestPost.status : "暂无数据"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                {latestPost
                  ? `${latestPost.author.displayName} · ${latestPost.title}`
                  : "当前还没有进入治理列表的帖子。"}
              </p>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-slate-950/35 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-100">
                  <MessageSquareMore className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">最新评论对象</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                    {latestComment ? latestComment.status : "暂无数据"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                {latestComment
                  ? `${latestComment.author.displayName} · ${latestComment.postTitle}`
                  : "当前还没有进入治理列表的评论。"}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8 text-slate-200">
                    <Tags className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">分类资产</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                      {metrics.categories} 条
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8 text-slate-200">
                    <Boxes className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">品牌资产</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                      {metrics.brands} 条
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}
