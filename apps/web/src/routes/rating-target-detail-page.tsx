import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowLeftIcon } from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { ImmersivePageShell } from "@/components/immersive-page-shell";
import { RatingTargetDetailPageSkeleton } from "@/components/route-skeletons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/auth-store";
import { useLoginPrompt } from "@/features/auth/use-login-prompt";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  buildRatingTargetSubmission,
  canSubmitRatingTargetComment,
  patchRatingTargetCommentCreated
} from "./rating-target-detail-helpers";
import { RatingTargetCommentChannel } from "./rating-target-detail-comment-channel";
import { RatingTargetCommentList } from "./rating-target-detail-comment-list";
import { RatingTargetDetailHeader } from "./rating-target-detail-header";
import type { RatingTargetCommentNode, RatingTargetDetail } from "./rating-target-detail-types";

export function RatingTargetDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((state) => state.status);
  const promptLogin = useLoginPrompt();
  const [content, setContent] = useState("");
  const [selectedRating, setSelectedRating] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; displayName: string } | null>(null);
  const [commentSort, setCommentSort] = useState<"latest" | "hot">("latest");
  const [itemTitle, setItemTitle] = useState("");
  const [itemSummary, setItemSummary] = useState("");
  const [itemBrandName, setItemBrandName] = useState("");

  const detailQuery = useQuery({
    queryKey: ["rating-target-detail", id],
    queryFn: () => apiClient.getRatingTargetDetail(id),
    enabled: Boolean(id)
  });

  const item = detailQuery.data?.item;
  const parentRankingId = searchParams.get("ranking");
  const isEditMode = searchParams.get("edit") === "1";

  useEffect(() => {
    if (!item) {
      return;
    }

    setSelectedRating(0);
    setContent("");
    setReplyingTo(null);
    setItemTitle(item.title);
    setItemSummary(item.summary ?? "");
    setItemBrandName(item.brandName ?? item.linkedModel?.brand.name ?? "");
  }, [item]);

  async function refreshAll() {
    if (!item) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["rating-target-detail", item.id] }),
      queryClient.invalidateQueries({ queryKey: ["ranking-detail", item.ranking.id] }),
      queryClient.invalidateQueries({ queryKey: ["rankings"] })
    ]);
  }

  function patchDetail(updater: (current: RatingTargetDetail) => RatingTargetDetail) {
    queryClient.setQueryData<Awaited<ReturnType<typeof apiClient.getRatingTargetDetail>>>(
      ["rating-target-detail", id],
      (current) => {
        if (!current?.item) {
          return current;
        }

        return {
          ...current,
          item: updater(current.item)
        };
      }
    );
  }

  function refreshRankingDataInBackground() {
    if (!item) {
      return;
    }

    startTransition(() => {
      void queryClient.invalidateQueries({ queryKey: ["ranking-detail", item.ranking.id] });
      void queryClient.invalidateQueries({ queryKey: ["rankings"] });
    });
  }

  function openLoginPrompt() {
    promptLogin({
      title: "登录后才能参与互动",
      description: "发布、回复、点赞和举报评论都需要先登录。"
    });
  }

  const totalRatings = item?.totalRatings ?? 0;
  const sortedComments = useMemo(() => {
    const items = [...(item?.comments ?? [])];
    if (commentSort === "latest") {
      return items.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    }

    return items.sort((left, right) => {
      const leftScore = (left.likeCount ?? 0) * 2 + left.replies.length;
      const rightScore = (right.likeCount ?? 0) * 2 + right.replies.length;
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [commentSort, item?.comments]);

  const ratingLabel = useMemo(() => {
    if (replyingTo) {
      return `正在回复 @${replyingTo.displayName}`;
    }
    if (!selectedRating) {
      return "先选择评分，再发布评论";
    }
    return `${selectedRating} 星评分`;
  }, [replyingTo, selectedRating]);

  const canSubmitComment = canSubmitRatingTargetComment({
    rating: selectedRating,
    content,
    isReplying: Boolean(replyingTo)
  });

  const commentPlaceholder = replyingTo ? `回复 @${replyingTo.displayName}` : "写下您对评分对象的感受";

  function handleCancelReply() {
    setReplyingTo(null);
    setContent("");
  }

  async function handleReportItem(input: { reason: string; imageIds: string[] }) {
    if (!item) {
      return;
    }

    await apiClient.reportRatingTarget(item.id, input);
    await queryClient.invalidateQueries({ queryKey: ["rating-target-detail", item.id] });
  }

  function handleCommentSubmit() {
    if (!item || !content.trim()) {
      return;
    }
    if (!replyingTo && selectedRating === 0) {
      setActionError("先选择评分，再发布评论");
      return;
    }

    setActionError(null);
    setBusy(true);
    const topLevelSubmission = buildRatingTargetSubmission(selectedRating, content);
    const request = replyingTo
      ? apiClient.createRatingTargetComment(item.id, {
          content: content.trim(),
          parentCommentId: replyingTo.id
        })
      : topLevelSubmission?.kind === "review"
        ? apiClient.createRatingTargetComment(item.id, topLevelSubmission.payload)
        : apiClient.submitRatingTargetRating(item.id, topLevelSubmission?.payload ?? { rating: selectedRating });

    void request
      .then((payload) => {
        if ("ratingTargetId" in payload.item) {
          const createdComment: RatingTargetCommentNode = {
            ...payload.item,
            replies: []
          };
          patchDetail((current) => patchRatingTargetCommentCreated(current, createdComment));
        }

        setReplyingTo(null);
        setContent("");
        setSelectedRating(0);
        if (!replyingTo) {
          refreshRankingDataInBackground();
        }
      })
      .catch((reason: unknown) => {
        setActionError(reason instanceof Error ? reason.message : "评论提交失败，请稍后重试");
      })
      .finally(() => {
        setBusy(false);
      });
  }

  if (detailQuery.isLoading) {
    return <RatingTargetDetailPageSkeleton />;
  }

  return (
    <ImmersivePageShell className="max-w-[1120px] gap-6">
      <Button asChild className="w-fit border-0" variant="ghost">
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
          <AlertTitle>评分对象详情加载失败</AlertTitle>
          <AlertDescription>{detailQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {!id || (!detailQuery.isLoading && !item) ? (
        <Alert>
          <AlertTitle>评分对象详情不可用</AlertTitle>
          <AlertDescription>当前评分对象不存在，或暂时没有可展示的数据。</AlertDescription>
        </Alert>
      ) : null}

      {item ? (
        <>
          {item.rejectionReason ? (
            <Alert>
              <AlertTitle>驳回原因</AlertTitle>
              <AlertDescription>{item.rejectionReason}</AlertDescription>
            </Alert>
          ) : null}

          <RatingTargetDetailHeader
            busy={busy}
            isEditMode={isEditMode}
            item={item}
            itemBrandName={itemBrandName}
            itemSummary={itemSummary}
            itemTitle={itemTitle}
            locationSearch={location.search}
            onReportItem={handleReportItem}
            refreshAll={refreshAll}
            setActionError={setActionError}
            setBusy={setBusy}
            setItemBrandName={setItemBrandName}
            setItemSummary={setItemSummary}
            setItemTitle={setItemTitle}
            totalRatings={totalRatings}
          />

          <div className="space-y-4 border-t border-border/60 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-base font-semibold text-foreground">评分圈留言</div>
              <div className="flex items-center gap-2">
                {(["latest", "hot"] as const).map((value) => (
                  <button
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition",
                      value === commentSort
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/70 text-muted-foreground hover:text-foreground"
                    )}
                    key={value}
                    onClick={() => setCommentSort(value)}
                    type="button"
                  >
                    {value === "latest" ? "最新" : "热门"}
                  </button>
                ))}
              </div>
            </div>

            <RatingTargetCommentChannel
              actionError={actionError}
              authStatus={authStatus}
              busy={busy}
              canSubmit={canSubmitComment}
              content={content}
              onCancelReply={handleCancelReply}
              onSubmit={handleCommentSubmit}
              openLoginPrompt={openLoginPrompt}
              placeholder={commentPlaceholder}
              ratingLabel={ratingLabel}
              replyingTo={replyingTo}
              selectedRating={selectedRating}
              setContent={setContent}
              setSelectedRating={setSelectedRating}
            />

            <RatingTargetCommentList
              canInteract={authStatus === "authenticated"}
              itemId={item.id}
              onRefresh={refreshAll}
              onRequireLogin={openLoginPrompt}
              sortedComments={sortedComments}
            />
          </div>
        </>
      ) : null}
    </ImmersivePageShell>
  );
}
