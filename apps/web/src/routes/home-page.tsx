import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  ArrowRight,
  Clock3,
  Compass,
  Flame,
  ImagePlus,
  PenSquare,
  Users,
  X
} from "lucide-react";
import { startTransition, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PostInteractionBar } from "../features/posts/post-interaction-bar";
import { useAuthStore } from "../features/auth/auth-store";
import { apiClient } from "../lib/api-client";

const tabItems = [
  {
    id: "recommended",
    label: "推荐",
    icon: Flame,
    hint: "按简化热度和发布时间排序"
  },
  {
    id: "latest",
    label: "最新",
    icon: Clock3,
    hint: "查看刚进入社区广场的最新内容"
  },
  {
    id: "following",
    label: "关注",
    icon: Users,
    hint: "只看你关注作者发布的帖子"
  }
] as const;

type FeedTab = (typeof tabItems)[number]["id"];
type UploadedImage = Awaited<ReturnType<typeof apiClient.uploadPostImage>>["item"];

function postDetailPath(id: string) {
  return APP_ROUTES.postDetail.replace(":id", id);
}

function emptyFeedMessage(tab: FeedTab, authenticated: boolean) {
  if (tab === "following" && !authenticated) {
    return "登录后即可查看关注流，并根据作者建立自己的内容面板。";
  }

  if (tab === "following") {
    return "你还没有关注任何作者，先去帖子详情页关注几位飞友吧。";
  }

  return "当前还没有公开内容。你可以先登录发一条帖子，或浏览机型库参与讨论。";
}

export function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<FeedTab>("recommended");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const feedQuery = useQuery({
    queryKey: ["home-feed", activeTab],
    queryFn: () => apiClient.listHomeFeed(activeTab)
  });

  const canSubmit = title.trim().length >= 2 && content.trim().length > 0 && !isUploading;

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-[linear-gradient(135deg,#020617_0%,#0f172a_56%,#164e63_100%)] px-8 py-9 text-white shadow-[0_35px_90px_-45px_rgba(2,6,23,0.85)]">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <article>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100/80">
              <Compass className="h-4 w-4" />
              Social Iteration
            </p>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white">
              {APP_NAME} 已接入图片帖子、关注流、互动按钮和站内通知。
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              当前版本围绕社区主链路做最小闭环扩展：发帖可带图片，内容流支持关注筛选，
              帖子详情支持点赞、收藏、分享和递归评论回复。
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
                  登录后即可发帖、关注和互动
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
                游客可以浏览广场内容；发帖、上传图片、关注作者和评论回复需要登录。
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70"
                  onChange={(event) => {
                    setTitle(event.target.value);
                  }}
                  placeholder="给这条帖子起个标题"
                  value={title}
                />
                <textarea
                  className="min-h-36 w-full rounded-3xl border border-white/10 bg-slate-950/40 px-4 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70"
                  onChange={(event) => {
                    setContent(event.target.value);
                  }}
                  placeholder="分享今天的飞行记录、踩坑经验，或一条正在观察的行业变化。"
                  value={content}
                />

                <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">上传图片</p>
                      <p className="mt-1 text-xs text-slate-400">最多 4 张，仅支持图片文件。</p>
                    </div>

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-cyan-300/30 px-4 py-2 text-sm text-cyan-100 transition hover:border-cyan-200/60 hover:bg-white/5">
                      <ImagePlus className="h-4 w-4" />
                      {isUploading ? "上传中..." : "添加图片"}
                      <input
                        accept="image/*"
                        className="hidden"
                        multiple
                        onChange={(event) => {
                          const files = Array.from(event.target.files ?? []);
                          event.target.value = "";

                          if (files.length === 0) {
                            return;
                          }

                          if (uploadedImages.length + files.length > 4) {
                            setSubmitError("最多上传 4 张图片");
                            return;
                          }

                          setSubmitError(null);
                          setIsUploading(true);

                          void Promise.all(files.map((file) => apiClient.uploadPostImage(file)))
                            .then((payload) => {
                              setUploadedImages((current) => [
                                ...current,
                                ...payload.map((item) => item.item)
                              ]);
                            })
                            .catch((value: unknown) => {
                              setSubmitError(
                                value instanceof Error ? value.message : "图片上传失败"
                              );
                            })
                            .finally(() => {
                              setIsUploading(false);
                            });
                        }}
                        type="file"
                      />
                    </label>
                  </div>

                  {uploadedImages.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {uploadedImages.map((image) => (
                        <div
                          className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50"
                          key={image.id}
                        >
                          <img
                            alt={image.fileName}
                            className="h-36 w-full object-cover"
                            src={image.url}
                          />
                          <div className="flex items-center justify-between gap-3 px-3 py-3 text-xs text-slate-300">
                            <span className="truncate">{image.fileName}</span>
                            <button
                              className="rounded-full border border-white/10 p-1.5 text-slate-300 transition hover:border-white/30 hover:text-white"
                              onClick={() => {
                                setUploadedImages((current) =>
                                  current.filter((item) => item.id !== image.id)
                                );
                              }}
                              type="button"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

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
                        content,
                        imageIds: uploadedImages.map((image) => image.id)
                      })
                      .then((payload) => {
                        setTitle("");
                        setContent("");
                        setUploadedImages([]);
                        void queryClient.invalidateQueries({ queryKey: ["home-feed"] });
                        navigate(postDetailPath(payload.item.id));
                      })
                      .catch((value: unknown) => {
                        setSubmitError(value instanceof Error ? value.message : "发帖失败");
                      })
                      .finally(() => {
                        setIsSubmitting(false);
                      });
                  }}
                  type="button"
                >
                  {isSubmitting ? "提交中..." : "提交帖子"}
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
          <p className="text-sm text-slate-500">
            {tabItems.find((item) => item.id === activeTab)?.hint}
          </p>
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
            {emptyFeedMessage(activeTab, status === "authenticated")}
          </div>
        ) : null}

        {feedQuery.data?.items.map((item) => (
          <article
            className="space-y-5 rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.35)]"
            key={item.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                <span>{item.author.displayName}</span>
                <span>评论 {item.commentCount}</span>
                <span>
                  {new Date(item.publishedAt ?? item.createdAt).toLocaleString("zh-CN", {
                    hour12: false
                  })}
                </span>
              </div>
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                to={postDetailPath(item.id)}
              >
                查看详情
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div>
              <h3 className="text-2xl font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{item.contentPreview}</p>
            </div>

            {item.images.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {item.images.slice(0, 3).map((image) => (
                  <img
                    alt={image.fileName}
                    className="h-52 w-full rounded-3xl object-cover"
                    key={image.id}
                    src={image.url}
                  />
                ))}
              </div>
            ) : null}

            <PostInteractionBar
              authorId={item.author.id}
              compact
              favoriteCount={item.engagement.favoriteCount}
              isPublished={item.status === "published"}
              likeCount={item.engagement.likeCount}
              postId={item.id}
              shareCount={item.engagement.shareCount}
              viewer={item.engagement.viewer}
            />
          </article>
        ))}
      </section>
    </main>
  );
}
