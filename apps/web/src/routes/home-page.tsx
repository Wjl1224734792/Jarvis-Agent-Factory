import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  ArrowRight,
  Clock3,
  Compass,
  Flame,
  MessageSquareText,
  PenSquare
} from "lucide-react";
import { startTransition, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/auth-store";
import { apiClient } from "../lib/api-client";

const tabItems = [
  {
    id: "recommended",
    label: "推荐",
    icon: Flame,
    hint: "按基础热度与发布时间排序"
  },
  {
    id: "latest",
    label: "最新",
    icon: Clock3,
    hint: "查看刚进入广场的最新内容"
  }
] as const;

type FeedTab = (typeof tabItems)[number]["id"];

function postDetailPath(id: string) {
  return APP_ROUTES.postDetail.replace(":id", id);
}

export function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<FeedTab>("recommended");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedQuery = useQuery({
    queryKey: ["home-feed", activeTab],
    queryFn: () => apiClient.listHomeFeed(activeTab)
  });

  const canSubmit = title.trim().length >= 2 && content.trim().length > 0;

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-[linear-gradient(135deg,#020617_0%,#0f172a_56%,#164e63_100%)] px-8 py-9 text-white shadow-[0_35px_90px_-45px_rgba(2,6,23,0.85)]">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <article>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100/80">
              <Compass className="h-4 w-4" />
              MVP 第5/6迭代
            </p>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white">
              {APP_NAME} 进入内容流阶段，首页开始承接真实讨论。
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              当前版本先打通最小闭环：推荐/最新 feed、纯文本帖子、帖子详情、评论与单层回复，
              以及后台基础审核。先把内容生产、分发和治理连成一条可用链路。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                to={APP_ROUTES.models}
              >
                去机型库看看
                <ArrowRight className="h-4 w-4" />
              </Link>
              {status === "authenticated" && user ? (
                <span className="inline-flex items-center rounded-full border border-white/15 px-4 py-3 text-sm text-slate-200">
                  当前登录：{user.displayName}
                </span>
              ) : (
                <Link
                  className="inline-flex items-center rounded-full border border-white/15 px-4 py-3 text-sm text-slate-100 transition hover:border-white/30 hover:bg-white/5"
                  to={APP_ROUTES.webLogin}
                >
                  登录后即可发帖与互动
                </Link>
              )}
            </div>
          </article>

          <article className="rounded-[30px] border border-white/10 bg-white/8 p-6 backdrop-blur">
            <div className="flex items-center gap-2 text-sm text-cyan-100/80">
              <PenSquare className="h-4 w-4" />
              发布一条帖子
            </div>

            {status !== "authenticated" || !user ? (
              <div className="mt-6 rounded-3xl border border-dashed border-white/15 bg-black/10 p-5 text-sm leading-7 text-slate-300">
                当前内容流支持游客浏览，但发帖、评论、回复和举报都需要登录。
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70"
                  onChange={(event) => {
                    setTitle(event.target.value);
                  }}
                  placeholder="给这条内容起个标题"
                  value={title}
                />
                <textarea
                  className="min-h-36 w-full rounded-3xl border border-white/10 bg-slate-950/40 px-4 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70"
                  onChange={(event) => {
                    setContent(event.target.value);
                  }}
                  placeholder="分享今天的飞行记录、踩坑经验，或者一条正在观察的行业现象。"
                  value={content}
                />

                {submitError ? (
                  <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {submitError}
                  </p>
                ) : null}

                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-300"
                  disabled={!canSubmit || isSubmitting}
                  onClick={() => {
                    setSubmitError(null);
                    setIsSubmitting(true);

                    void apiClient
                      .createPost({
                        title,
                        content
                      })
                      .then((payload) => {
                        setTitle("");
                        setContent("");
                        void queryClient.invalidateQueries({ queryKey: ["home-feed"] });
                        navigate(postDetailPath(payload.item.id));
                      })
                      .catch((error: unknown) => {
                        setSubmitError(error instanceof Error ? error.message : "发帖失败");
                      })
                      .finally(() => {
                        setIsSubmitting(false);
                      });
                  }}
                  type="button"
                >
                  {isSubmitting ? "发布中..." : "提交帖子，进入审核队列"}
                </button>
              </div>
            )}
          </article>
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white/85 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.3)] backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeTab;

            return (
              <button
                className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950"
                }`}
                key={item.id}
                onClick={() => {
                  startTransition(() => {
                    setActiveTab(item.id);
                  });
                }}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
          <p className="text-sm text-slate-500">{tabItems.find((item) => item.id === activeTab)?.hint}</p>
        </div>
      </section>

      <section className="grid gap-4">
        {feedQuery.isLoading ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-sm text-slate-500">
            正在加载首页内容流...
          </div>
        ) : null}

        {feedQuery.isError ? (
          <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
            {feedQuery.error.message}
          </div>
        ) : null}

        {!feedQuery.isLoading && !feedQuery.isError && feedQuery.data?.items.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-sm leading-7 text-slate-500">
            当前 feed 还没有公开内容。你可以先进入机型详情留下点评，或者登录后发一条帖子作为第一批社区样本。
          </div>
        ) : null}

        {feedQuery.data?.items.map((item) => (
          <article
            className="grid gap-4 rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.35)] lg:grid-cols-[1fr_auto]"
            key={item.id}
          >
            <div>
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                <span>{item.author.displayName}</span>
                <span>评论 {item.commentCount}</span>
                <span>
                  {new Date(item.publishedAt ?? item.createdAt).toLocaleString("zh-CN", {
                    hour12: false
                  })}
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{item.contentPreview}</p>
            </div>

            <div className="flex items-end justify-start lg:justify-end">
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                to={postDetailPath(item.id)}
              >
                查看详情
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
