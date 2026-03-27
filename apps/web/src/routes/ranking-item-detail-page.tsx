import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowLeftIcon, StarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { SitePage } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InlineCommentComposer } from "@/features/posts/inline-comment-composer";
import { useAuthStore } from "../features/auth/auth-store";
import { apiClient } from "../lib/api-client";
import { getEditorialImage, getModelImage } from "../lib/aviation-media";

function RatingStars({
  value,
  onSelect
}: {
  value: number;
  onSelect?: (value: number) => void;
}) {
  const toneClassName = value < 3 ? "text-destructive" : "text-rating-orange";

  return (
    <div className={toneClassName + " flex items-center gap-1.5"}>
      {Array.from({ length: 5 }).map((_, index) => (
        <button
          className="rounded-full p-0.5 transition hover:scale-105"
          key={index}
          onClick={() => onSelect?.(index + 1)}
          type="button"
        >
          <StarIcon className="size-5" fill={index < value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

export function RankingItemDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((state) => state.status);
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

  return (
    <SitePage className="mx-auto w-full max-w-[1120px] gap-6">
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
          <AlertDescription>当前条目不存在，或者还没有可展示的数据。</AlertDescription>
        </Alert>
      ) : null}

      {item ? (
        <>
          <div className="grid gap-6 rounded-[1rem] border border-border bg-white p-5 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.35)] md:grid-cols-[minmax(0,1fr)_420px]">
            <div className="overflow-hidden rounded-[0.95rem]">
              <img
                alt={item.title}
                className="h-[300px] w-full object-cover md:h-[420px]"
                src={
                  item.imageUrl ??
                  getModelImage(item.linkedModel?.slug ?? item.id, item.linkedModel?.powerType ?? "electric") ??
                  getEditorialImage(item.id)
                }
              />
            </div>

            <div className="space-y-4">
              <div className="text-sm text-primary">
                {item.brandName ?? item.linkedModel?.brand.name ?? item.ranking.title}
              </div>
              <h1 className="text-[2.15rem] leading-[1.04] font-semibold tracking-[-0.05em] text-foreground">
                {item.title}
              </h1>
              <p className="text-[0.96rem] leading-8 text-foreground/72">
                {item.summary ?? "这里展示排行项的综合评分、用户点评以及与机型详情的关联入口。"}
              </p>
              <div className="flex justify-end border-t border-border/70 pt-4">
                <div className="text-right">
                  <div className="text-[2.5rem] font-semibold leading-none text-rating-blue">
                    {item.averageScore.toFixed(1)}
                  </div>
                  <div className="mt-3">
                    <RatingStars value={Math.max(1, Math.round(item.averageScore / 2))} />
                  </div>
                </div>
              </div>
              {item.linkedModel ? (
                <Button asChild variant="outline">
                  <Link to={APP_ROUTES.modelDetail.replace(":slug", item.linkedModel.slug)}>
                    查看飞行器详情
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-5 border-t border-border/60 pt-6">
            <div className="space-y-3">
              <div className="text-lg font-semibold text-foreground">评分与点评</div>
              <RatingStars
                onSelect={(value) => {
                  setSelectedRating(value);
                }}
                value={selectedRating}
              />

              {authStatus === "authenticated" ? (
                <div className="border border-border px-4 py-4">
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
                        : "请先选择星级评分"
                    }
                    value={commentContent}
                  />
                </div>
              ) : (
                <Alert>
                  <AlertTitle>登录后可点评</AlertTitle>
                  <AlertDescription>需要先登录，才能选择星级并发布点评。</AlertDescription>
                </Alert>
              )}

              {actionError ? (
                <Alert variant="destructive">
                  <AlertTitle>排行项互动失败</AlertTitle>
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              ) : null}
            </div>

            <div className="space-y-0 border border-border">
              {item.comments.map((comment) => (
                <div className="border-b border-border px-5 py-5 last:border-b-0" key={comment.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">{comment.author.displayName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(comment.updatedAt).toLocaleString("zh-CN", { hour12: false })}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <RatingStars value={comment.rating} />
                      <button
                        className="text-xs text-primary"
                        onClick={() => {
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
                  <p className="mt-3 text-sm leading-7 text-foreground/76">{comment.content}</p>
                </div>
              ))}

              {item.comments.length === 0 ? (
                <div className="px-5 py-5 text-sm text-muted-foreground">
                  还没有点评，欢迎留下第一条。
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </SitePage>
  );
}
