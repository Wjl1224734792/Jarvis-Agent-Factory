import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowLeftIcon, MessageCircleIcon, StarIcon } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SitePage, SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InlineCommentComposer } from "@/features/posts/inline-comment-composer";
import { apiClient } from "../lib/api-client";
import { getEditorialImage, getModelImage } from "../lib/aviation-media";

function RatingStars({
  value,
  onSelect
}: {
  value: number;
  onSelect?: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <button className="p-0.5" key={index} onClick={() => onSelect?.(index + 1)} type="button">
          <StarIcon className="size-5" fill={index < Math.round(value / 2) ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

export function RankingItemDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const queryClient = useQueryClient();
  const [commentContent, setCommentContent] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"rating" | "comment" | null>(null);

  const detailQuery = useQuery({
    queryKey: ["ranking-item-detail", id],
    queryFn: () => apiClient.getRankingItemDetail(id),
    enabled: Boolean(id)
  });

  const item = detailQuery.data?.item;

  return (
    <SitePage className="gap-6">
      <Button asChild className="w-fit rounded-full" variant="ghost">
        <Link to={item ? APP_ROUTES.rankingDetail.replace(":id", item.ranking.id) : APP_ROUTES.rankings}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回榜单页
        </Link>
      </Button>

      {detailQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>榜单项详情加载失败</AlertTitle>
          <AlertDescription>{detailQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {!id || (!detailQuery.isLoading && !item) ? (
        <Alert>
          <AlertTitle>榜单项详情不可用</AlertTitle>
          <AlertDescription>当前条目不存在，或还没有可展示的数据。</AlertDescription>
        </Alert>
      ) : null}

      {item ? (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <img
              alt={item.title}
              className="h-[260px] w-full object-cover"
              src={
                item.imageUrl ??
                getModelImage(item.linkedModel?.slug ?? item.id, item.linkedModel?.powerType ?? "electric") ??
                getEditorialImage(item.id)
              }
            />
            <div className="space-y-4">
              <div className="text-sm uppercase tracking-[0.24em] text-primary">
                {item.brandName ?? item.linkedModel?.brand.name ?? item.ranking.title}
              </div>
              <h1 className="text-[2.6rem] font-semibold leading-[1] tracking-[-0.05em] text-foreground">{item.title}</h1>
              <div className="flex items-center gap-3">
                <RatingStars
                  onSelect={(value) => {
                    setActionError(null);
                    setBusyAction("rating");
                    void apiClient
                      .submitRankingItemRating(item.id, { rating: value })
                      .then(() => {
                        return Promise.all([
                          queryClient.invalidateQueries({ queryKey: ["ranking-item-detail", item.id] }),
                          queryClient.invalidateQueries({ queryKey: ["ranking-detail", item.ranking.id] }),
                          queryClient.invalidateQueries({ queryKey: ["rankings"] })
                        ]);
                      })
                      .catch((reason: unknown) => {
                        setActionError(reason instanceof Error ? reason.message : "评分失败");
                      })
                      .finally(() => {
                        setBusyAction(null);
                      });
                  }}
                  value={item.averageScore}
                />
                <span className="text-sm text-foreground/80">{item.averageScore.toFixed(1)}</span>
              </div>
              <p className="text-base leading-8 text-muted-foreground">{item.summary ?? "当前条目的详细介绍还在补充中。"}</p>
              {item.linkedModel ? (
                <Button asChild variant="outline">
                  <Link to={APP_ROUTES.modelDetail.replace(":slug", item.linkedModel.slug)}>查看飞行器详情</Link>
                </Button>
              ) : null}
            </div>
          </div>

          <SitePanel>
            <SitePanelBody className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div className="text-xl font-semibold text-foreground">评分与点评</div>
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageCircleIcon className="size-4" />
                  {item.comments.length} 条评论
                </div>
              </div>

              <div className="space-y-4">
                {item.comments.map((comment) => (
                  <div className="border-b border-border/60 py-3 last:border-b-0" key={comment.id}>
                    <div className="text-sm font-medium text-foreground">{comment.author.displayName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(comment.updatedAt).toLocaleString("zh-CN", { hour12: false })}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-foreground/78">{comment.content}</p>
                  </div>
                ))}
              </div>

              <InlineCommentComposer
                busy={busyAction === "comment"}
                onChange={setCommentContent}
                onSubmit={() => {
                  if (!commentContent.trim()) {
                    return;
                  }

                  setActionError(null);
                  setBusyAction("comment");
                  void apiClient
                    .createRankingItemComment(item.id, { content: commentContent })
                    .then(() => {
                      setCommentContent("");
                      return Promise.all([
                        queryClient.invalidateQueries({ queryKey: ["ranking-item-detail", item.id] }),
                        queryClient.invalidateQueries({ queryKey: ["ranking-detail", item.ranking.id] })
                      ]);
                    })
                    .catch((reason: unknown) => {
                      setActionError(reason instanceof Error ? reason.message : "点评失败");
                    })
                    .finally(() => {
                      setBusyAction(null);
                    });
                }}
                placeholder="为这条榜单项补充你的观点..."
                value={commentContent}
              />

              {actionError ? (
                <Alert variant="destructive">
                  <AlertTitle>榜单项互动失败</AlertTitle>
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              ) : null}
            </SitePanelBody>
          </SitePanel>
        </div>
      ) : null}
    </SitePage>
  );
}
