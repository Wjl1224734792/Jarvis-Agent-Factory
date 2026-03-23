import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  ArrowRightIcon,
  CompassIcon,
  FlameIcon,
  ImagePlusIcon,
  PenSquareIcon,
  Rows3Icon,
  UsersIcon,
  XIcon
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PostInteractionBar } from "../features/posts/post-interaction-bar";
import { useAuthStore } from "../features/auth/auth-store";
import { apiClient } from "../lib/api-client";

const tabItems = [
  { id: "recommended", label: "推荐", icon: FlameIcon, hint: "正在被讨论的内容" },
  { id: "latest", label: "最新", icon: Rows3Icon, hint: "刚刚发布的内容" },
  { id: "following", label: "关注", icon: UsersIcon, hint: "你关注作者的动态" }
] as const;

type FeedTab = (typeof tabItems)[number]["id"];
type UploadedImage = Awaited<ReturnType<typeof apiClient.uploadPostImage>>["item"];

function postDetailPath(id: string) {
  return APP_ROUTES.postDetail.replace(":id", id);
}

function emptyFeedMessage(tab: FeedTab, authenticated: boolean) {
  if (tab === "following" && !authenticated) {
    return "登录后即可查看关注作者的动态。";
  }

  if (tab === "following") {
    return "你还没有关注任何作者，先去内容详情里关注几位飞友吧。";
  }

  return "当前还没有公开内容。你可以先发布一条记录，或去机型库继续浏览。";
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

  const authenticated = status === "authenticated" && Boolean(user);
  const canSubmit = title.trim().length >= 2 && content.trim().length > 0 && !isUploading;

  return (
    <main className="flex flex-col gap-8">
      <section className="max-w-[760px]">
        <div className="flex flex-col gap-5 rounded-lg bg-card px-6 py-7 ring-1 ring-border/80 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>社区首页</Badge>
            <Badge variant="outline">PC 优先</Badge>
          </div>
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              一个更容易浏览的飞行器社区，从参数到讨论放在一起。
            </h1>
            <p className="mt-4 text-base leading-8 text-muted-foreground">
              {APP_NAME} 把飞行器资料、真实点评和飞友内容流放在同一站内。你可以先浏览，再判断，
              最后决定是否继续参与讨论。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={APP_ROUTES.models}>
                <CompassIcon data-icon="inline-start" />
                去机型库浏览
              </Link>
            </Button>
            {authenticated ? (
              <Button asChild size="lg" variant="outline">
                <Link to={APP_ROUTES.webProfile}>查看我的入口</Link>
              </Button>
            ) : (
              <Button asChild size="lg" variant="outline">
                <Link to={APP_ROUTES.webLogin}>登录后参与互动</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-[760px]">
        <Card className="rounded-lg border-border/80 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">发布一条飞行记录</CardTitle>
            <CardDescription>写下经验、观察或一次真实试飞感受。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!authenticated ? (
              <Alert>
                <AlertTitle>当前为只读模式</AlertTitle>
                <AlertDescription>登录后即可发帖、上传图片、评论和关注作者。</AlertDescription>
              </Alert>
            ) : (
              <>
                <Input
                  aria-label="帖子标题"
                  onChange={(event) => {
                    setTitle(event.target.value);
                  }}
                  placeholder="给这次飞行记录起个标题"
                  value={title}
                />
                <Textarea
                  aria-label="帖子内容"
                  className="min-h-32"
                  onChange={(event) => {
                    setContent(event.target.value);
                  }}
                  placeholder="分享飞行记录、避坑经验，或你最近正在关注的行业变化。"
                  value={content}
                />

                <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-secondary/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">上传图片</div>
                      <div className="text-sm text-muted-foreground">最多 4 张，仅支持图片文件。</div>
                    </div>
                    <Button asChild type="button" variant="outline">
                      <label className="cursor-pointer">
                        <ImagePlusIcon data-icon="inline-start" />
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
                                setSubmitError(value instanceof Error ? value.message : "图片上传失败");
                              })
                              .finally(() => {
                                setIsUploading(false);
                              });
                          }}
                          type="file"
                        />
                      </label>
                    </Button>
                  </div>

                  {uploadedImages.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {uploadedImages.map((image) => (
                        <div
                          className="overflow-hidden rounded-md border border-border/80 bg-background"
                          key={image.id}
                        >
                          <img alt={image.fileName} className="h-28 w-full object-cover" src={image.url} />
                          <div className="flex items-center justify-between gap-3 px-3 py-2">
                            <span className="truncate text-xs text-muted-foreground">{image.fileName}</span>
                            <Button
                              onClick={() => {
                                setUploadedImages((current) =>
                                  current.filter((item) => item.id !== image.id)
                                );
                              }}
                              size="icon-sm"
                              type="button"
                              variant="ghost"
                            >
                              <XIcon />
                              <span className="sr-only">移除图片</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {submitError ? (
                  <Alert variant="destructive">
                    <AlertTitle>提交失败</AlertTitle>
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                ) : null}

                <Button
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
                  size="lg"
                  type="button"
                >
                  <PenSquareIcon data-icon="inline-start" />
                  {isSubmitting ? "提交中..." : "提交帖子"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="max-w-[760px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">内容流</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                从推荐、最新和关注三条路径继续浏览。
              </p>
            </div>
            <Tabs
              className="gap-0"
              onValueChange={(value) => {
                setActiveTab(value as FeedTab);
              }}
              value={activeTab}
            >
              <TabsList variant="default">
                {tabItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TabsTrigger key={item.id} value={item.id}>
                      <Icon data-icon="inline-start" />
                      {item.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          <div className="text-sm text-muted-foreground">
            {tabItems.find((item) => item.id === activeTab)?.hint}
          </div>
        </div>
      </section>

      <section className="max-w-[760px]">
        <div className="flex flex-col gap-4">
          {feedQuery.isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Card className="rounded-lg border-border/80" key={index}>
                <CardHeader>
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-8 w-3/5 animate-pulse rounded bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))
          ) : null}

          {feedQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>内容流加载失败</AlertTitle>
              <AlertDescription>{feedQuery.error.message}</AlertDescription>
            </Alert>
          ) : null}

          {!feedQuery.isLoading && !feedQuery.isError && feedQuery.data?.items.length === 0 ? (
            <Alert>
              <AlertTitle>当前内容为空</AlertTitle>
              <AlertDescription>{emptyFeedMessage(activeTab, authenticated)}</AlertDescription>
            </Alert>
          ) : null}

          {feedQuery.data?.items.map((item) => (
            <article
              className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm"
              key={item.id}
            >
              <div className="flex flex-col gap-5 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{item.author.displayName}</Badge>
                  <Badge variant="outline">
                    {new Date(item.publishedAt ?? item.createdAt).toLocaleString("zh-CN", {
                      hour12: false
                    })}
                  </Badge>
                  <Badge variant="outline">评论 {item.commentCount}</Badge>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-base leading-8 text-muted-foreground">
                    {item.contentPreview}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to={postDetailPath(item.id)}>
                      查看详情
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={APP_ROUTES.models}>继续浏览机型</Link>
                  </Button>
                </div>

                <Separator />

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
                {item.images.length > 0 ? (
                  <div className="overflow-hidden rounded-md border border-border/80 bg-secondary/20">
                    <img
                      alt={item.images[0]!.fileName}
                      className="max-h-[320px] w-full object-cover"
                      src={item.images[0]!.url}
                    />
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border/80 bg-secondary/20 p-4 text-sm text-muted-foreground">
                    纯文字内容
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
