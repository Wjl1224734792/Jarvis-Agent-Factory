import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellRing,
  Compass,
  MessageSquareText,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { apiClient } from "../lib/api-client";

function notificationLabel(
  item: Awaited<ReturnType<typeof apiClient.listNotifications>>["items"][number]
) {
  switch (item.type) {
    case "followed":
      return `${item.actor.displayName} 关注了你`;
    case "post_liked":
      return `${item.actor.displayName} 点赞了你的帖子`;
    case "post_favorited":
      return `${item.actor.displayName} 收藏了你的帖子`;
    case "post_shared":
      return `${item.actor.displayName} 分享了你的帖子`;
    case "post_commented":
      return `${item.actor.displayName} 评论了你的帖子`;
    case "comment_replied":
      return `${item.actor.displayName} 回复了你的评论`;
    default:
      return "你有一条新通知";
  }
}

function notificationGroupLabel(
  type: Awaited<ReturnType<typeof apiClient.listNotifications>>["items"][number]["type"]
) {
  switch (type) {
    case "followed":
      return "关注动态";
    case "post_liked":
    case "post_favorited":
    case "post_shared":
      return "帖子互动";
    case "post_commented":
    case "comment_replied":
      return "评论交流";
    default:
      return "站内提醒";
  }
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.listNotifications()
  });

  if (notificationsQuery.isLoading) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-sm text-slate-500">
        正在加载通知...
      </div>
    );
  }

  if (notificationsQuery.isError) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
        {notificationsQuery.error.message}
      </div>
    );
  }

  const payload = notificationsQuery.data;
  const unreadCount = payload?.unreadCount ?? 0;
  const totalCount = payload?.items.length ?? 0;
  const socialCount =
    payload?.items.filter((item) => item.type === "followed").length ?? 0;
  const discussionCount =
    payload?.items.filter(
      (item) => item.type === "post_commented" || item.type === "comment_replied"
    ).length ?? 0;

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_48%,#38bdf8_100%)] p-6 text-white shadow-[0_35px_90px_-45px_rgba(15,23,42,0.75)] sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-sky-100/85">
              <BellRing className="h-4 w-4" />
              Notification Center
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              关注、互动与回复，统一在这里收口
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-sky-100/85">
              当前通知中心聚合了关注关系、帖子互动和评论链路，让用户可以快速回到真正发生内容变化的地方。
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">Unread</p>
                <p className="mt-3 text-3xl font-semibold">{unreadCount}</p>
              </div>
              <div className="rounded-[22px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">Social</p>
                <p className="mt-3 text-3xl font-semibold">{socialCount}</p>
              </div>
              <div className="rounded-[22px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">Discussion</p>
                <p className="mt-3 text-3xl font-semibold">{discussionCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/12 bg-slate-950/25 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">Control</p>
                <h3 className="mt-2 text-xl font-semibold">消息收纳动作</h3>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-sky-100/80">
                Total {totalCount}
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-[0_24px_55px_-30px_rgba(255,255,255,0.45)] transition hover:bg-slate-100"
                onClick={() => {
                  void apiClient.markAllNotificationsRead().then(() => {
                    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
                  });
                }}
                type="button"
              >
                <ShieldCheck className="h-4 w-4" />
                全部标记为已读
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                onClick={() => {
                  void queryClient.invalidateQueries({ queryKey: ["notifications"] });
                }}
                type="button"
              >
                <RefreshCcw className="h-4 w-4" />
                刷新提醒列表
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {[
                {
                  label: "关注提醒",
                  value: "让关系链更新被看见",
                  icon: Users
                },
                {
                  label: "互动提醒",
                  value: "点赞、收藏、分享统一收纳",
                  icon: Sparkles
                },
                {
                  label: "讨论提醒",
                  value: "评论与回复回到帖子上下文",
                  icon: MessageSquareText
                }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    className="rounded-[20px] border border-white/10 bg-white/8 p-4"
                    key={item.label}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sky-100">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-white">{item.label}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-sky-100/70">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Message Summary</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">本次通知侧重点</h3>

          <div className="mt-6 space-y-3">
            {[
              {
                label: "未读消息",
                value: unreadCount,
                tone: "bg-sky-50 text-sky-700 border-sky-100",
                icon: BellRing
              },
              {
                label: "全部通知",
                value: totalCount,
                tone: "bg-slate-50 text-slate-700 border-slate-200",
                icon: Bell
              },
              {
                label: "评论链路",
                value: discussionCount,
                tone: "bg-cyan-50 text-cyan-700 border-cyan-100",
                icon: MessageSquareText
              },
              {
                label: "关系变化",
                value: socialCount,
                tone: "bg-indigo-50 text-indigo-700 border-indigo-100",
                icon: Compass
              }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  className={`flex items-center justify-between rounded-[22px] border px-4 py-4 ${item.tone}`}
                  key={item.label}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-2xl font-semibold">{item.value}</span>
                </div>
              );
            })}
          </div>
        </article>

        <section className="space-y-4">
          {payload && payload.items.length > 0 ? (
            payload.items.map((item) => (
              <article
                className={`rounded-[28px] border p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.32)] transition ${
                  item.isRead
                    ? "border-slate-200 bg-white"
                    : "border-sky-200 bg-[linear-gradient(180deg,#f7fbff_0%,#eef7ff_100%)]"
                }`}
                key={item.id}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      item.isRead
                        ? "bg-slate-100 text-slate-500"
                        : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {item.isRead ? (
                      <Bell className="h-5 w-5" />
                    ) : (
                      <BellRing className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white">
                        {notificationGroupLabel(item.type)}
                      </span>
                      {!item.isRead ? (
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-medium text-sky-700">
                          未读
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-950">
                      {notificationLabel(item)}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {item.post ? (
                        <div className="rounded-[20px] border border-slate-200 bg-white/80 p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                            相关帖子
                          </p>
                          <p className="mt-2 text-sm font-medium leading-6 text-slate-950">
                            {item.post.title}
                          </p>
                        </div>
                      ) : null}
                      {item.comment ? (
                        <div className="rounded-[20px] border border-slate-200 bg-white/80 p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                            评论摘录
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {item.comment.contentPreview}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-sm text-slate-500">
              还没有新的站内通知。当前会在有人关注你、与你互动或回复评论时进入这里。
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
