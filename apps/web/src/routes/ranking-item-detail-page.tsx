import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { DetailPageSkeleton } from "@/components/page-skeletons";
import { RatingBreakdown } from "@/components/rating-breakdown";
import { RatingStars, toFiveStarRating } from "@/components/rating-stars";
import { SitePage } from "@/components/site-shell";
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
  const [selectedRating, setSelectedRating] = useState(0);
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
    if (item?.myReview) {
      setSelectedRating(item.myReview.rating);
      setCommentContent(item.myReview.content);
    } else if (item?.myRating) {
      setSelectedRating(item.myRating);
    }
  }, [item?.myRating, item?.myReview]);

  if (detailQuery.isLoading) {
    return <DetailPageSkeleton />;
  }

  return (
    <SitePage className="mx-auto w-full max-w-[1080px] gap-5">
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
          <AlertTitle>排行项详情加载失败</AlertTitle>
          <AlertDescription>{detailQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {!id || (!detailQuery.isLoading && !item) ? (
        <Alert>
          <AlertTitle>排行项详情不可用</AlertTitle>
          <AlertDescription>当前条目不存在或暂无可展示数据。</AlertDescription>
        </Alert>
      ) : null}

      {item ? (
        <>
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

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_248px]">
              <div className="space-y-3">
                <div className="text-[0.8rem] font-semibold tracking-[0.16em] text-primary">
                  {item.brandName ?? item.linkedModel?.brand.name ?? item.ranking.title}
                </div>
                <h1 className="text-[1.9rem] leading-[1.04] font-semibold tracking-[-0.05em] text-foreground">
                  {item.title}
                </h1>
                {item.summary ? (
                  <p className="text-[0.9rem] leading-6 text-foreground/72">{item.summary}</p>
                ) : null}
                {item.linkedModel ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to={APP_ROUTES.modelDetail.replace(":slug", item.linkedModel.slug)}>查看飞行器详情</Link>
                  </Button>
                ) : null}
              </div>

              <div className="rounded-[0.85rem] border border-border bg-surface-1 px-4 py-4">
                <div className="flex items-end justify-between gap-3">
                  <div className="space-y-1.5">
                    <RatingStars size="sm" value={toFiveStarRating(item.averageScore)} />
                    <div className="text-[0.72rem] text-muted-foreground">{item.commentCount} 条点评</div>
                  </div>
                  <div className="text-[2.3rem] font-semibold leading-none text-rating-blue">
                    {item.averageScore.toFixed(1)}
                  </div>
                </div>
                <div className="mt-4">
                  <RatingBreakdown entries={item.ratingBreakdown} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-border/60 pt-5">
            <div className="space-y-3">
              <div className="text-base font-semibold text-foreground">评分与点评</div>
              <RatingStars
                onSelect={(value) => {
                  setSelectedRating(value);
                }}
                size="md"
                value={selectedRating}
              />

              {replyTarget ? (
                <div className="text-[0.78rem] text-muted-foreground">正在回复 @{replyTarget}</div>
              ) : null}

              {authStatus === "authenticated" ? (
                <div className="rounded-[0.85rem] border border-border bg-white p-3">
                  <InlineCommentComposer
                    busy={busy}
                    disabled={selectedRating <= 0}
                    onChange={setCommentContent}
                    onSubmit={() => {
                      if (!commentContent.trim() || selectedRating <= 0) {
                        return;
                      }

                      setActionError(null);
                      setBusy(true);
                      void apiClient
                        .submitRankingItemReview(item.id, {
                          rating: selectedRating,
                          content: commentContent
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
                          setActionError(reason instanceof Error ? reason.message : "点评失败");
                        })
                        .finally(() => {
                          setBusy(false);
                        });
                    }}
                    placeholder={
                      selectedRating > 0
                        ? replyTarget
                          ? `回复 @${replyTarget}`
                          : "写下你的点评..."
                        : "请先选择星级"
                    }
                    value={commentContent}
                  />
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => {
                    promptLogin({
                      title: "登录后才能点评",
                      description: "点评前请先登录。"
                    });
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  登录后点评
                </Button>
              )}

              {actionError ? (
                <Alert variant="destructive">
                  <AlertTitle>排行项互动失败</AlertTitle>
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-[0.95rem] border border-border bg-white">
              {item.comments.map((comment) => (
                <div className="border-b border-border px-5 py-4 last:border-b-0" key={comment.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar size="sm">
                        <AvatarImage alt={comment.author.displayName} src={getAvatarImage(comment.author.id)} />
                        <AvatarFallback>{comment.author.displayName.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-foreground">{comment.author.displayName}</div>
                        <div className="mt-0.5 text-[0.72rem] text-muted-foreground">
                          {new Date(comment.updatedAt).toLocaleString("zh-CN", { hour12: false })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <RatingStars size="xs" value={comment.rating} />
                      <button
                        className="text-[0.72rem] text-primary"
                        onClick={() => {
                          if (
                            !promptLogin({
                              title: "登录后才能回复点评",
                              description: "回复前请先登录。"
                            })
                          ) {
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
                  </div>
                  <p className="mt-2.5 text-[0.82rem] leading-6 text-foreground/76">{comment.content}</p>
                </div>
              ))}

              {item.comments.length === 0 ? (
                <div className="px-5 py-5 text-[0.82rem] text-muted-foreground">还没有点评。</div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </SitePage>
  );
}
