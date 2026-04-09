import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CornerDownRightIcon,
  SquarePenIcon,
  Trash2Icon
} from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { CommentPublishedTime } from "@/components/comment-published-time";
import {
  CommentIconOnlyButton,
  CommentLikeIconButton,
  CommentTextAction
} from "@/components/comment-thread-controls";
import { PageShareControl } from "@/components/page-share-control";
import { DetailPageSkeleton } from "@/components/page-skeletons";
import { ProfileLink } from "@/components/profile-link";
import { RatingBreakdown } from "@/components/rating-breakdown";
import { RatingValue } from "@/components/rating-value";
import { RatingStars, toFiveStarRating } from "@/components/rating-stars";
import { ReportActionSheet } from "@/components/report-action-sheet";
import { SitePage } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InlineCommentComposer } from "@/features/posts/inline-comment-composer";
import { useAuthStore } from "@/features/auth/auth-store";
import { useLoginPrompt } from "@/features/auth/use-login-prompt";
import { apiClient } from "@/lib/api-client";
import { buildRatingTargetDetailPath } from "@/lib/web-routes";
import { cn } from "@/lib/utils";
import { getAvatarImage, getEditorialImage, getModelImage } from "@/lib/aviation-media";
import {
  buildRatingTargetSubmission,
  canSubmitRatingTargetComment,
  patchRatingTargetCommentCreated,
  patchRatingTargetCommentLike
} from "./rating-target-detail-helpers";

type RatingTargetDetail = Awaited<ReturnType<typeof apiClient.getRatingTargetDetail>>["item"];
type RatingTargetComment = RatingTargetDetail["comments"][number];
type RatingTargetCommentReply = RatingTargetComment["replies"][number];
type RatingTargetCommentNode = (RatingTargetComment | RatingTargetCommentReply) & {
  replies?: RatingTargetCommentReply[];
};

function CommentActions(props: {
  itemId: string;
  comment: RatingTargetCommentNode;
  canInteract: boolean;
  disabled: boolean;
  isEditing: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLike: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 self-start">
      <CommentLikeIconButton
        disabled={props.disabled}
        hasLiked={props.comment.viewer.hasLiked}
        likeCount={props.comment.likeCount ?? 0}
        onClick={props.onLike}
      />

      {props.canInteract ? (
        <CommentTextAction disabled={props.disabled} onClick={props.onReply} variant="reply">
          回复
        </CommentTextAction>
      ) : null}

      {!props.comment.viewer.canDelete ? (
        <ReportActionSheet
          description="请填写举报理由，并至少上传 1 张证据图。"
          onSubmit={async (input) => {
            await apiClient.reportRatingTargetComment(props.itemId, props.comment.id, input);
          }}
          title="举报评论"
          trigger={
            <CommentTextAction
              disabled={props.disabled}
              hasReported={props.comment.viewer.hasReported}
              variant="report"
            >
              举报
            </CommentTextAction>
          }
        />
      ) : null}

      {props.comment.viewer.canEdit ? (
        <CommentIconOnlyButton
          active={props.isEditing}
          disabled={props.disabled}
          icon={SquarePenIcon}
          label="编辑评论"
          onClick={props.onEdit}
        />
      ) : null}

      {props.comment.viewer.canDelete ? (
        <CommentIconOnlyButton
          destructiveHover
          disabled={props.disabled}
          icon={Trash2Icon}
          label="删除评论"
          onClick={props.onDelete}
        />
      ) : null}
    </div>
  );
}

function RatingTargetCommentCard(props: {
  itemId: string;
  comment: RatingTargetCommentNode;
  canInteract: boolean;
  depth?: number;
  onRefresh: () => Promise<void>;
  onRequireLogin: () => void;
}) {
  const queryClient = useQueryClient();
  const depth = props.depth ?? 0;
  const [replyingTo, setReplyingTo] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState(props.comment.content);
  const [busy, setBusy] = useState<"reply" | "edit" | "delete" | "like" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const replies = useMemo(
    () => ((props.comment.replies ?? []) as RatingTargetCommentNode[]),
    [props.comment.replies]
  );

  function ensureCanInteract() {
    if (props.canInteract) {
      return true;
    }
    props.onRequireLogin();
    return false;
  }

  function patchDetail(
    updater: (item: RatingTargetDetail) => RatingTargetDetail
  ) {
    queryClient.setQueryData<Awaited<ReturnType<typeof apiClient.getRatingTargetDetail>>>(
      ["rating-target-detail", props.itemId],
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

  return (
    <article>
      <div className="flex items-start gap-3">
        <ProfileLink userId={props.comment.author.id}>
          <Avatar className="mt-0.5" size="sm">
            <AvatarImage
              alt={props.comment.author.displayName}
              src={props.comment.author.avatarUrl ?? getAvatarImage(props.comment.author.id)}
            />
            <AvatarFallback>{props.comment.author.displayName.slice(0, 1)}</AvatarFallback>
          </Avatar>
        </ProfileLink>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
            <ProfileLink className="font-medium text-foreground hover:text-primary" userId={props.comment.author.id}>
              {props.comment.author.displayName}
            </ProfileLink>
            {props.comment.replyToUser ? (
              <span className="inline-flex items-center gap-1 text-[0.72rem] text-primary/85">
                <CornerDownRightIcon className="size-3.25" />
                @{props.comment.replyToUser.displayName}
              </span>
            ) : null}
            {props.comment.rating ? <RatingStars size="xs" tone="rating" value={props.comment.rating} /> : null}
            <CommentPublishedTime createdAt={props.comment.createdAt} />
          </div>

          {isEditing ? (
            <InlineCommentComposer
              busy={busy === "edit"}
              disabled={busy !== null || !editingContent.trim()}
              onChange={setEditingContent}
              onSubmit={() => {
                if (!editingContent.trim()) {
                  return;
                }
                setBusy("edit");
                setError(null);
                void apiClient
                  .updateRatingTargetComment(props.itemId, props.comment.id, { content: editingContent.trim() })
                  .then(() => {
                    setIsEditing(false);
                    return props.onRefresh();
                  })
                  .catch((reason: unknown) => {
                    setError(reason instanceof Error ? reason.message : "编辑评论失败。");
                  })
                  .finally(() => setBusy(null));
              }}
              placeholder="编辑评论内容"
              value={editingContent}
            />
          ) : (
            <p className="text-sm leading-6 text-foreground/84">{props.comment.content}</p>
          )}
        </div>

        <CommentActions
          canInteract={props.canInteract}
          comment={props.comment}
          disabled={busy !== null}
          isEditing={isEditing}
          itemId={props.itemId}
          onDelete={() => {
            setBusy("delete");
            setError(null);
            void apiClient
              .deleteRatingTargetComment(props.itemId, props.comment.id)
              .then(props.onRefresh)
              .catch((reason: unknown) => {
                setError(reason instanceof Error ? reason.message : "删除评论失败。");
              })
              .finally(() => setBusy(null));
          }}
          onEdit={() => {
            setIsEditing((value) => !value);
            setEditingContent(props.comment.content);
          }}
          onLike={() => {
            if (!ensureCanInteract()) {
              return;
            }
            setBusy("like");
            setError(null);
            void apiClient
              .likeRatingTargetComment(props.itemId, props.comment.id)
              .then(() => {
                patchDetail((item) =>
                  patchRatingTargetCommentLike(item, props.comment.id, !props.comment.viewer.hasLiked)
                );
              })
              .catch((reason: unknown) => {
                setError(reason instanceof Error ? reason.message : "点赞失败。");
              })
              .finally(() => setBusy(null));
          }}
          onReply={() => {
            if (!ensureCanInteract()) {
              return;
            }
            setReplyingTo((value) => !value);
            setReplyContent((current) => (current ? current : `@${props.comment.author.displayName} `));
          }}
        />
      </div>

      {replyingTo ? (
        <div className="mt-3">
          <InlineCommentComposer
            busy={busy === "reply"}
            disabled={busy !== null || !replyContent.trim()}
            onChange={setReplyContent}
            onSubmit={() => {
              if (!replyContent.trim()) {
                return;
              }
              setBusy("reply");
              setError(null);
              void apiClient
                .createRatingTargetComment(props.itemId, {
                  content: replyContent.trim(),
                  parentCommentId: props.comment.id
                })
                .then((payload) => {
                  patchDetail((item) =>
                    patchRatingTargetCommentCreated(item, {
                      ...payload.item,
                      replies: []
                    })
                  );
                  setReplyingTo(false);
                  setReplyContent("");
                })
                .catch((reason: unknown) => {
                  setError(reason instanceof Error ? reason.message : "回复评论失败。");
                })
                .finally(() => setBusy(null));
            }}
            placeholder={`回复 @${props.comment.author.displayName}`}
            value={replyContent}
          />
        </div>
      ) : null}

      {error ? (
        <Alert className="mt-3" variant="destructive">
          <AlertTitle>评论操作失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {replies.length > 0 ? (
        <div className="mt-3 space-y-4 border-l border-border/60 pl-4 dark:border-border/50">
          {replies.map((reply) => (
            <RatingTargetCommentCard
              canInteract={props.canInteract}
              comment={reply}
              depth={depth + 1}
              itemId={props.itemId}
              key={reply.id}
              onRefresh={props.onRefresh}
              onRequireLogin={props.onRequireLogin}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

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

  function patchDetail(
    updater: (current: RatingTargetDetail) => RatingTargetDetail
  ) {
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
      return items.sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
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

          <div className="grid gap-4 border border-border/80 bg-white p-4 md:grid-cols-[320px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-[1rem]">
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
                  {item.summary ? <p className="text-sm leading-7 text-muted-foreground">{item.summary}</p> : null}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-col items-start gap-2">
                    <RatingValue className="tracking-[-0.04em]" score={item.averageScore} size="xl" />
                    <RatingStars size="md" tone="rating" value={toFiveStarRating(item.averageScore)} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {totalRatings > 0 ? `${totalRatings} 人评分` : "还没有用户评分"}
                  </div>
                </div>

                <div className="border-t border-border/70 pt-4">
                  <RatingBreakdown entries={item.ratingBreakdown} totalCount={totalRatings} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {item.linkedModel ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to={APP_ROUTES.modelDetail.replace(":slug", item.linkedModel.slug)}>查看飞行器详情</Link>
                    </Button>
                  ) : null}

                  <PageShareControl
                    sharePath={`${buildRatingTargetDetailPath(item.id)}${location.search}`}
                  />

                  <ReportActionSheet
                    description="请填写举报理由，并至少上传 1 张证据图。"
                    onSubmit={(input) =>
                      apiClient.reportRatingTarget(item.id, input).then(() => {
                        void queryClient.invalidateQueries({ queryKey: ["rating-target-detail", item.id] });
                      })
                    }
                    title="举报评分对象"
                    trigger={
                      <Button
                        aria-label="举报评分对象"
                        className={cn(
                          "group inline-flex size-auto min-h-0 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0.5 shadow-none",
                          "hover:!bg-transparent active:translate-y-0",
                          "focus-visible:ring-2 focus-visible:ring-orange-400/45 focus-visible:ring-offset-2"
                        )}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <AlertTriangleIcon
                          className={cn(
                            "size-4 transition-transform duration-150 ease-out",
                            "text-orange-600/90 group-hover:text-orange-700 group-active:scale-[0.92]",
                            "dark:text-orange-400 dark:group-hover:text-orange-300",
                            item.viewer.hasReported &&
                              "fill-orange-500/40 text-orange-800 dark:fill-orange-400/45 dark:text-orange-300"
                          )}
                        />
                        <span className="sr-only">举报评分对象</span>
                      </Button>
                    }
                  />
                </div>

                {isEditMode && item.viewer.canEdit ? (
                  <div className="space-y-3 border-t border-border/70 pt-4">
                    <div className="text-sm font-medium text-foreground">编辑评分对象</div>
                    <Input onChange={(event) => setItemTitle(event.target.value)} value={itemTitle} />
                    <Input onChange={(event) => setItemBrandName(event.target.value)} value={itemBrandName} />
                    <Textarea
                      className="min-h-28"
                      onChange={(event) => setItemSummary(event.target.value)}
                      value={itemSummary}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={busy || !itemTitle.trim()}
                        onClick={() => {
                          setBusy(true);
                          setActionError(null);
                          void apiClient
                            .updateRatingTarget(item.id, {
                              title: itemTitle.trim(),
                              summary: itemSummary.trim() || null,
                              imageFileId: item.imageFileId ?? null,
                              brandName: itemBrandName.trim() || null,
                              linkedModelSlug: item.linkedModel?.slug ?? null
                            })
                            .then(() => refreshAll())
                            .catch((reason: unknown) => {
                              setActionError(reason instanceof Error ? reason.message : "评分对象更新失败。");
                            })
                            .finally(() => {
                              setBusy(false);
                            });
                        }}
                        size="sm"
                        type="button"
                        variant="hero"
                      >
                        保存返修
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() => {
                          setBusy(true);
                          setActionError(null);
                          void apiClient
                            .deleteRatingTarget(item.id)
                            .then(() => {
                              window.location.assign(APP_ROUTES.rankingDetail.replace(":id", item.ranking.id));
                            })
                            .catch((reason: unknown) => {
                              setActionError(reason instanceof Error ? reason.message : "评分对象删除失败。");
                              setBusy(false);
                            });
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        删除评分对象
                      </Button>
                    </div>
                  </div>
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-base font-semibold text-foreground">评分与评论</div>
              <div className="flex items-center gap-2">
                {(["latest", "hot"] as const).map((item) => (
                  <button
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition",
                      commentSort === item
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/70 text-muted-foreground hover:text-foreground"
                    )}
                    key={item}
                    onClick={() => setCommentSort(item)}
                    type="button"
                  >
                    {item === "latest" ? "最新" : "热门"}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-border/70 bg-white px-5 py-5">
              <div className="space-y-4">
                {replyingTo ? (
                  <Alert>
                    <AlertTitle>正在回复</AlertTitle>
                    <AlertDescription>当前回复 @{replyingTo.displayName}，回复不需要选择评分。</AlertDescription>
                  </Alert>
                ) : (
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
                )}

                {authStatus === "authenticated" ? (
                  <InlineCommentComposer
                    busy={busy}
                    disabled={
                      busy ||
                      !canSubmitRatingTargetComment({
                        rating: selectedRating,
                        content,
                        isReplying: Boolean(replyingTo)
                      })
                    }
                    onChange={setContent}
                    onSubmit={() => {
                      if (!content.trim()) {
                        return;
                      }
                      if (!replyingTo && selectedRating === 0) {
                        setActionError("请先选择评分，再发布评论。");
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
                            patchDetail((current) =>
                              patchRatingTargetCommentCreated(current, {
                                ...payload.item,
                                replies: []
                              })
                            );
                          }
                          setReplyingTo(null);
                          setContent("");
                          setSelectedRating(0);
                          if (!replyingTo) {
                            refreshRankingDataInBackground();
                          }
                        })
                        .catch((reason: unknown) => {
                          setActionError(reason instanceof Error ? reason.message : "评分对象评论提交失败。");
                        })
                        .finally(() => {
                          setBusy(false);
                        });
                    }}
                    placeholder={replyingTo ? `回复 @${replyingTo.displayName}` : "写下你的评分理由或使用体验"}
                    value={content}
                  />
                ) : (
                  <Button className="w-full" onClick={openLoginPrompt} size="sm" type="button" variant="outline">
                    登录后参与互动
                  </Button>
                )}

                {replyingTo ? (
                  <Button
                    className="w-fit"
                    onClick={() => {
                      setReplyingTo(null);
                      setContent("");
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    取消回复
                  </Button>
                ) : null}

                {actionError ? (
                  <Alert variant="destructive">
                    <AlertTitle>评分对象互动失败</AlertTitle>
                    <AlertDescription>{actionError}</AlertDescription>
                  </Alert>
                ) : null}
              </div>
            </div>

            <div className="border border-border/70 bg-white">
              {sortedComments.length > 0 ? (
                <div className="space-y-0 px-5 py-4">
                  {sortedComments.map((comment, index) => (
                    <div className={index === 0 ? "" : "border-t border-border/70 pt-4"} key={comment.id}>
                      <RatingTargetCommentCard
                        canInteract={authStatus === "authenticated"}
                        comment={comment}
                        itemId={item.id}
                        onRefresh={refreshAll}
                        onRequireLogin={openLoginPrompt}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-5 text-[0.82rem] text-muted-foreground">还没有评论。</div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </SitePage>
  );
}
