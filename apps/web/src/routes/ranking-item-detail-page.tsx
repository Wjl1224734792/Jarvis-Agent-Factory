import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { buildRankingItemSubmission } from "./ranking-item-detail-helpers";

export function RankingItemDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((state) => state.status);
  const promptLogin = useLoginPrompt();
  const [content, setContent] = useState("");
  const [selectedRating, setSelectedRating] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["ranking-item-detail", id],
    queryFn: () => apiClient.getRankingItemDetail(id),
    enabled: Boolean(id)
  });

  const item = detailQuery.data?.item;
  const parentRankingId = searchParams.get("ranking");

  useEffect(() => {
    if (!item) {
      return;
    }

    setSelectedRating(item.myRating ?? 0);
    setContent(item.myReview?.content ?? "");
  }, [item]);

  const totalRatings = item?.totalRatings ?? 0;
  const ratingLabel = useMemo(() => {
    if (!selectedRating) {
      return "请选择星级";
    }

    return `${selectedRating} 星评价`;
  }, [selectedRating]);

  async function refreshAll() {
    if (!item) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["ranking-item-detail", item.id] }),
      queryClient.invalidateQueries({ queryKey: ["ranking-detail", item.ranking.id] }),
      queryClient.invalidateQueries({ queryKey: ["rankings"] })
    ]);
  }

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
          <div className="grid gap-4 border border-border/80 bg-white p-4 md:grid-cols-[320px_minmax(0,1fr)]">
            <div className="overflow-hidden">
              <img
                alt={item.title}
                className="h-[240px] w-full object-cover md:h-[280px]"
                src={
                  item.imageUrl ??
                  getModelImage(item.linkedModel?.slug ?? item.id, item.linkedModel?.powerType ?? "electric") ??
                  getEditorialImage(item.id)
                }
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-[0.8rem] font-semibold tracking-[0.16em] text-primary">
                    {item.brandName ?? item.linkedModel?.brand.name ?? item.ranking.title}
                  </div>
                  <div className="text-[1.9rem] font-semibold tracking-[-0.04em] text-foreground md:text-[2.2rem]">
                    {item.title}
                  </div>
                  {item.summary ? (
                    <p className="text-sm leading-7 text-muted-foreground">{item.summary}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="text-[2rem] font-semibold text-foreground">
                      {item.averageScore > 0 ? item.averageScore.toFixed(1) : "暂无"}
                    </div>
                    <RatingStars size="md" tone="rating" value={toFiveStarRating(item.averageScore)} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {totalRatings > 0 ? `${totalRatings} 人评分` : "还没有用户评分"}
                  </div>
                </div>

                <div className="border-t border-border/70 pt-4">
                  <RatingBreakdown entries={item.ratingBreakdown} totalCount={totalRatings} />
                </div>

                {item.linkedModel ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to={APP_ROUTES.modelDetail.replace(":slug", item.linkedModel.slug)}>查看飞行器详情</Link>
                  </Button>
                ) : null}
              </div>

              <div className="border border-border/70 px-4 py-4">
                <div className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">所属榜单</div>
                <div className="mt-1.5 text-sm font-medium text-foreground">{item.ranking.title}</div>
                <div className="mt-4 text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">评论数</div>
                <div className="mt-1.5 text-2xl font-semibold text-foreground">{item.commentCount}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-border/60 pt-4">
            <div className="space-y-1">
              <div className="text-base font-semibold text-foreground">评分与评论</div>
              <div className="text-sm text-muted-foreground">
                使用单一入口提交星级。补充文字时会同步作为这条评分的评论内容。
              </div>
            </div>

            <div className="border border-border/70 bg-white px-5 py-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">{ratingLabel}</div>
                  <RatingStars
                    className="text-rating-orange"
                    onSelect={setSelectedRating}
                    size="lg"
                    tone="rating"
                    value={selectedRating}
                  />
                </div>

                {authStatus === "authenticated" ? (
                  <InlineCommentComposer
                    busy={busy}
                    disabled={busy || selectedRating === 0}
                    onChange={setContent}
                    onSubmit={() => {
                      const submission = buildRankingItemSubmission(selectedRating, content);
                      if (!submission) {
                        return;
                      }

                      setActionError(null);
                      setBusy(true);

                      const request =
                        submission.kind === "review"
                          ? apiClient.submitRankingItemReview(item.id, submission.payload)
                          : apiClient.submitRankingItemRating(item.id, submission.payload);

                      void request
                        .then(() => refreshAll())
                        .catch((reason: unknown) => {
                          setActionError(reason instanceof Error ? reason.message : "评分提交失败");
                        })
                        .finally(() => {
                          setBusy(false);
                        });
                    }}
                    placeholder="补充这次评分的理由，可选..."
                    value={content}
                  />
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      promptLogin({
                        title: "登录后才能评分",
                        description: "评分与评论前请先登录。"
                      });
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    登录后评分
                  </Button>
                )}

                {actionError ? (
                  <Alert variant="destructive">
                    <AlertTitle>条目互动失败</AlertTitle>
                    <AlertDescription>{actionError}</AlertDescription>
                  </Alert>
                ) : null}
              </div>
            </div>

            <div className="border border-border/70 bg-white">
              {item.comments.map((comment) => (
                <div className="border-b border-border/70 px-5 py-4 last:border-b-0" key={comment.id}>
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
                        <div className="mt-0.5 flex items-center gap-2 text-[0.72rem] text-muted-foreground">
                          <RatingStars size="xs" tone="rating" value={comment.rating} />
                          <span>{new Date(comment.updatedAt).toLocaleString("zh-CN", { hour12: false })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {comment.content ? (
                    <p className="mt-2.5 text-[0.82rem] leading-6 text-foreground/76">{comment.content}</p>
                  ) : null}
                </div>
              ))}

              {item.comments.length === 0 ? (
                <div className="px-5 py-5 text-[0.82rem] text-muted-foreground">还没有评分评论。</div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </SitePage>
  );
}
