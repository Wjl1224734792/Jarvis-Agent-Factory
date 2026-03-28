import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { DetailPageSkeleton } from "@/components/page-skeletons";
import {
  SitePage,
  SitePageDescription,
  SitePageEyebrow,
  SitePageHead,
  SitePageTitle
} from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InlineCommentComposer } from "@/features/posts/inline-comment-composer";
import { useAuthStore } from "../features/auth/auth-store";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { apiClient } from "../lib/api-client";
import { getAvatarImage, getEditorialImage, getModelImage } from "../lib/aviation-media";

export function RankingItemDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((state) => state.status);
  const promptLogin = useLoginPrompt();
  const [commentContent, setCommentContent] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [replyTarget, setReplyTarget] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["ranking-item-detail", id],
    queryFn: () => apiClient.getRankingItemDetail(id),
    enabled: Boolean(id)
  });

  const item = detailQuery.data?.item;
  const parentRankingId = searchParams.get("ranking");

  useEffect(() => {
    if (item?.myReview?.content) {
      setCommentContent(item.myReview.content);
    }
  }, [item?.myReview]);

  if (detailQuery.isLoading) {
    return <DetailPageSkeleton />;
  }

  return (
    <SitePage className="mx-auto w-full max-w-[72rem] gap-4">
      <Button asChild className="w-fit" variant="ghost">
        <Link
          to={
            parentRankingId
              ? APP_ROUTES.rankingDetail.replace(":id", parentRankingId)
              : item
                ? APP_ROUTES.rankingDetail.replace(":id", item.ranking.id)
                : APP_ROUTES.rankings
          }
        >
          <ArrowLeftIcon data-icon="inline-start" />
          返回榜单
        </Link>
      </Button>

      {detailQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>榜单条目详情加载失败</AlertTitle>
          <AlertDescription>{detailQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {!id || (!detailQuery.isLoading && !item) ? (
        <Alert>
          <AlertTitle>榜单条目详情不可用</AlertTitle>
          <AlertDescription>当前条目不存在或暂无可展示数据。</AlertDescription>
        </Alert>
      ) : null}

      {item ? (
        <>
          <SitePageHead>
            <SitePageEyebrow>榜单条目</SitePageEyebrow>
            <SitePageTitle className="text-[1.9rem] md:text-[2.2rem]">{item.title}</SitePageTitle>
            <SitePageDescription>{item.summary ?? "查看这条榜单条目的说明与评论。"}</SitePageDescription>
          </SitePageHead>

          <div className="grid gap-4 rounded-[0.95rem] border border-border bg-white p-4 shadow-[var(--shadow-panel)] md:grid-cols-[300px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-[0.85rem] border border-border/70">
              <img
                alt={item.title}
                className="h-[220px] w-full object-cover md:h-[250px]"
                src={
                  item.imageUrl ??
                  getModelImage(item.linkedModel?.slug ?? item.id, item.linkedModel?.powerType ?? "electric") ??
                  getEditorialImage(item.id)
                }
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="space-y-3">
                <div className="text-[0.8rem] font-semibold tracking-[0.16em] text-primary">
                  {item.brandName ?? item.linkedModel?.brand.name ?? item.ranking.title}
                </div>
                {item.linkedModel ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to={APP_ROUTES.modelDetail.replace(":slug", item.linkedModel.slug)}>查看飞行器详情</Link>
                  </Button>
                ) : null}
              </div>

              <div className="rounded-[0.85rem] border border-border bg-surface-1 px-4 py-4">
                <div className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">评论数</div>
                <div className="mt-1.5 text-2xl font-semibold text-foreground">{item.commentCount}</div>
                <div className="mt-4 text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">所属榜单</div>
                <div className="mt-1.5 text-sm font-medium text-foreground">{item.ranking.title}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-border/60 pt-4">
            <div className="space-y-1">
              <div className="text-base font-semibold text-foreground">评论区</div>
              <div className="text-sm text-muted-foreground">只保留正常评论，不再展示评分和星级。</div>
            </div>

            {replyTarget ? (
              <div className="text-[0.78rem] text-muted-foreground">正在回复 @{replyTarget}</div>
            ) : null}

            {authStatus === "authenticated" ? (
              <div className="rounded-[0.85rem] border border-border bg-white p-3">
                <InlineCommentComposer
                  busy={busy}
                  disabled={busy}
                  onChange={setCommentContent}
                  onSubmit={() => {
                    if (!commentContent.trim()) {
                      return;
                    }

                    setActionError(null);
                    setBusy(true);
                    void apiClient
                      .createRankingItemComment(item.id, {
                        content: commentContent.trim()
                      })
                      .then(() => {
                        setReplyTarget(null);
                        return Promise.all([
                          queryClient.invalidateQueries({ queryKey: ["ranking-item-detail", item.id] }),
                          queryClient.invalidateQueries({ queryKey: ["ranking-detail", item.ranking.id] }),
                          queryClient.invalidateQueries({ queryKey: ["rankings"] })
                        ]);
                      })
                      .catch((reason: unknown) => {
                        setActionError(reason instanceof Error ? reason.message : "评论失败");
                      })
                      .finally(() => {
                        setBusy(false);
                      });
                  }}
                  placeholder={replyTarget ? `回复 @${replyTarget}` : "写下你的评论..."}
                  value={commentContent}
                />
              </div>
            ) : (
              <Button
                className="w-full"
                onClick={() => {
                  promptLogin({
                    title: "登录后才能评论",
                    description: "评论前请先登录。"
                  });
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                登录后评论
              </Button>
            )}

            {actionError ? (
              <Alert variant="destructive">
                <AlertTitle>条目互动失败</AlertTitle>
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="overflow-hidden rounded-[0.95rem] border border-border bg-white">
              {item.comments.map((comment) => (
                <div className="border-b border-border px-5 py-4 last:border-b-0" key={comment.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar size="sm">
                        <AvatarImage
                          alt={comment.author.displayName}
                          src={comment.author.avatarUrl ?? getAvatarImage(comment.author.id)}
                        />
                        <AvatarFallback>{comment.author.displayName.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-foreground">{comment.author.displayName}</div>
                        <div className="mt-0.5 text-[0.72rem] text-muted-foreground">
                          {new Date(comment.updatedAt).toLocaleString("zh-CN", { hour12: false })}
                        </div>
                      </div>
                    </div>
                    <button
                      className="text-[0.72rem] text-primary"
                      onClick={() => {
                        if (authStatus !== "authenticated") {
                          promptLogin({
                            title: "登录后才能回复评论",
                            description: "回复前请先登录。"
                          });
                          return;
                        }

                        setReplyTarget(comment.author.displayName);
                        setCommentContent((current) =>
                          current.startsWith(`@${comment.author.displayName}`)
                            ? current
                            : `@${comment.author.displayName} ${current}`.trim()
                        );
                      }}
                      type="button"
                    >
                      回复
                    </button>
                  </div>
                  <p className="mt-2.5 text-[0.82rem] leading-6 text-foreground/76">{comment.content}</p>
                </div>
              ))}

              {item.comments.length === 0 ? (
                <div className="px-5 py-5 text-[0.82rem] text-muted-foreground">还没有评论。</div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </SitePage>
  );
}
