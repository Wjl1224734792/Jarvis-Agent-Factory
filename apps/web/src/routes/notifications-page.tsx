import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing } from "lucide-react";
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

  return (
    <main className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Notifications</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              站内通知
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              未读 {payload?.unreadCount ?? 0} 条，包含关注、互动和评论回复。
            </p>
          </div>

          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            onClick={() => {
              void apiClient.markAllNotificationsRead().then(() => {
                void queryClient.invalidateQueries({ queryKey: ["notifications"] });
              });
            }}
            type="button"
          >
            全部标记为已读
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {payload && payload.items.length > 0 ? (
          payload.items.map((item) => (
            <article
              className={`rounded-[28px] border p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.3)] ${
                item.isRead ? "border-slate-200 bg-white" : "border-sky-200 bg-sky-50/70"
              }`}
              key={item.id}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`rounded-full p-3 ${
                    item.isRead ? "bg-slate-100 text-slate-500" : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {item.isRead ? <Bell className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-base font-semibold text-slate-950">
                      {notificationLabel(item)}
                    </h3>
                    {!item.isRead ? (
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
                        未读
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}
                  </p>
                  {item.post ? (
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      相关帖子：{item.post.title}
                    </p>
                  ) : null}
                  {item.comment ? (
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      评论摘录：{item.comment.contentPreview}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-sm text-slate-500">
            还没有新的站内通知。
          </div>
        )}
      </section>
    </main>
  );
}
