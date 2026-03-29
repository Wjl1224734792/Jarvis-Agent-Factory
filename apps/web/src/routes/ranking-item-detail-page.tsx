import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  ArrowLeftIcon,
  HeartIcon,
  ShieldAlertIcon,
  SquarePenIcon,
  Trash2Icon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { DetailPageSkeleton } from "@/components/page-skeletons";
import { RatingBreakdown } from "@/components/rating-breakdown";
import { RatingValue } from "@/components/rating-value";
import { RatingStars, toFiveStarRating } from "@/components/rating-stars";
import { SitePage } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InlineCommentComposer } from "@/features/posts/inline-comment-composer";
import { useAuthStore } from "../features/auth/auth-store";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { apiClient } from "../lib/api-client";
import { getAvatarImage, getEditorialImage, getModelImage } from "../lib/aviation-media";
import { buildRankingItemSubmission } from "./ranking-item-detail-helpers";

type RankingItemDetail = Awaited<ReturnType<typeof apiClient.getRankingItemDetail>>["item"];
type RankingItemComment = RankingItemDetail["comments"][number];

function CommentActions(props: {
  itemId: string;
  comment: RankingItemComment;
  canReply: boolean;
  currentUserId?: string;
  onReply: (comment: RankingItemComment) => void;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onEdit: (comment: RankingItemComment) => void;
}) {
  const isAuthor = props.currentUserId === props.comment.author.id;

  return (
    <div className="flex items-center gap-1">
      <Button
        onClick={() => {
          void apiClient
            .likeRankingItemComment(props.itemId, props.comment.id)
            .then(props.onRefresh)
            .catch((reason: unknown) => {
              props.onError(reason instanceof Error ? reason.message : "点赞失败");
            });
        }}
        size="sm"
        type="button"
        variant="ghost"
      >
        <HeartIcon className="size-4" />
        {props.comment.likeCount ?? 0}
      </Button>
      {props.canReply ? (
        <Button onClick={() => props.onReply(props.comment)} size="sm" type="button" variant="ghost">
          回复
        </Button>
      ) : null}
      {!isAuthor ? (
        <Button
          onClick={() => {
            void apiClient
              .reportRankingItemComment(props.itemId, props.comment.id, { reason: "不当评论" })
              .then(props.onRefresh)
              .catch((reason: unknown) => {
                props.onError(reason instanceof Error ? reason.message : "举报失败");
              });
          }}
          size="sm"
          type="button"
          variant="ghost"
        >
          <ShieldAlertIcon className="size-4" />
        </Button>
      ) : null}
      {isAuthor ? (
        <>
          <Button onClick={() => props.onEdit(props.comment)} size="sm" type="button" variant="ghost">
            <SquarePenIcon className="size-4" />
          </Button>
          <Button
            onClick={() => {
              void apiClient
                .deleteRankingItemComment(props.itemId, props.comment.id)
                .then(props.onRefresh)
                .catch((reason: unknown) => {
                  props.onError(reason instanceof Error ? reason.message : "删除失败");
                });
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2Icon className="size-4" />
          </Button>
        </>
      ) : null}
    </div>
  );
}

export function RankingItemDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((state) => state.status);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const promptLogin = useLoginPrompt();
  const [content, setContent] = useState("");
  const [selectedRating, setSelectedRating] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; displayName: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const detailQuery = useQuery({
    queryKey: ["ranking-item-detail", id],
    queryFn: () => apiClient.getRankingItemDetail(id),
    enabled: Boolean(id)
  });

  const item = detailQuery.data?.item;
  const parentRankingId = searchParams.get("ranking");
  const isEditMode = searchParams.get("edit") === "1";
  const [itemTitle, setItemTitle] = useState("");
  const [itemSummary, setItemSummary] = useState("");
  const [itemBrandName, setItemBrandName] = useState("");

  useEffect(() => {
    if (!item) {
      return;
    }

    setSelectedRating(item.myRating ?? 0);
    setContent(item.myReview?.content ?? "");
    setItemTitle(item.title);
    setItemSummary(item.summary ?? "");
    setItemBrandName(item.brandName ?? item.linkedModel?.brand.name ?? "");
  }, [item]);

  const totalRatings = item?.totalRatings ?? 0;
  const ratingLabel = useMemo(() => {
    if (!selectedRating) {
      return "请选择评分";
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
          <AlertTitle>条目详情加载失败</AlertTitle>
          <AlertDescription>{detailQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {!id || (!detailQuery.isLoading && !item) ? (
        <Alert>
          <AlertTitle>条目详情不可用</AlertTitle>
          <AlertDescription>当前条目不存在或暂无可展示数据。</AlertDescription>
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

                <div className="flex flex-wrap gap-2">
                  {item.linkedModel ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to={APP_ROUTES.modelDetail.replace(":slug", item.linkedModel.slug)}>查看飞行器详情</Link>
                    </Button>
                  ) : null}
                  <Button
                    onClick={() => {
                      void apiClient.reportRankingItem(item.id, { reason: "不当内容" }).catch((reason: unknown) => {
                        setActionError(reason instanceof Error ? reason.message : "举报失败");
                      });
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ShieldAlertIcon data-icon="inline-start" />
                    举报条目
                  </Button>
                </div>

                {isEditMode && item.viewer.canEdit ? (
                  <div className="space-y-3 border-t border-border/70 pt-4">
                    <div className="text-sm font-medium text-foreground">编辑条目</div>
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
                            .updateRankingItem(item.id, {
                              title: itemTitle.trim(),
                              summary: itemSummary.trim() || null,
                              imageFileId: item.imageFileId ?? null,
                              brandName: itemBrandName.trim() || null,
                              linkedModelSlug: item.linkedModel?.slug ?? null
                            })
                            .then(() => refreshAll())
                            .catch((reason: unknown) => {
                              setActionError(reason instanceof Error ? reason.message : "条目更新失败");
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
                            .deleteRankingItem(item.id)
                            .then(() => {
                              window.location.assign(APP_ROUTES.rankingDetail.replace(":id", item.ranking.id));
                            })
                            .catch((reason: unknown) => {
                              setActionError(reason instanceof Error ? reason.message : "条目删除失败");
                              setBusy(false);
                            });
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        删除条目
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
            <div className="space-y-1">
              <div className="text-base font-semibold text-foreground">评分与评论</div>
              <div className="text-sm text-muted-foreground">
                先评分，再补充评论；也可以直接对已有评论回复。
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
                    disabled={busy || (!replyingTo && selectedRating === 0)}
                    onChange={setContent}
                    onSubmit={() => {
                      setActionError(null);
                      setBusy(true);
                      const request = replyingTo
                        ? apiClient.createRankingItemComment(item.id, {
                            content,
                            parentCommentId: replyingTo.id
                          } as Parameters<typeof apiClient.createRankingItemComment>[1])
                        : (() => {
                            const submission = buildRankingItemSubmission(selectedRating, content);
                            if (!submission) {
                              return Promise.reject(new Error("请先评分"));
                            }

                            return submission.kind === "review"
                              ? apiClient.submitRankingItemReview(item.id, submission.payload)
                              : apiClient.submitRankingItemRating(item.id, submission.payload);
                          })();

                      void request
                        .then(() => {
                          setReplyingTo(null);
                          setContent("");
                          return refreshAll();
                        })
                        .catch((reason: unknown) => {
                          setActionError(reason instanceof Error ? reason.message : "条目互动失败");
                        })
                        .finally(() => {
                          setBusy(false);
                        });
                    }}
                    placeholder={replyingTo ? `回复 @${replyingTo.displayName}` : "补充评分理由，或直接发表评论"}
                    value={content}
                  />
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      promptLogin({
                        title: "登录后才能评论",
                        description: "评分、回复和举报都需要登录。"
                      });
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    登录后参与互动
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
                    <CommentActions
                      canReply={authStatus === "authenticated"}
                      comment={comment}
                      currentUserId={currentUserId}
                      itemId={item.id}
                      onEdit={(target) => {
                        setEditingId(target.id);
                        setEditingContent(target.content);
                      }}
                      onError={setActionError}
                      onRefresh={refreshAll}
                      onReply={(target) => {
                        setReplyingTo({ id: target.id, displayName: target.author.displayName });
                        setContent(`@${target.author.displayName} `);
                      }}
                    />
                  </div>

                  {editingId === comment.id ? (
                    <div className="mt-3">
                      <InlineCommentComposer
                        busy={busy}
                        disabled={busy}
                        onChange={setEditingContent}
                        onSubmit={() => {
                          setBusy(true);
                          void apiClient
                            .updateRankingItemComment(item.id, comment.id, { content: editingContent })
                            .then(() => {
                              setEditingId(null);
                              return refreshAll();
                            })
                            .catch((reason: unknown) => {
                              setActionError(reason instanceof Error ? reason.message : "编辑失败");
                            })
                            .finally(() => {
                              setBusy(false);
                            });
                        }}
                        placeholder="编辑评论"
                        value={editingContent}
                      />
                    </div>
                  ) : comment.content ? (
                    <p className="mt-2.5 text-[0.82rem] leading-6 text-foreground/76">{comment.content}</p>
                  ) : null}

                  {(comment.replies ?? []).length > 0 ? (
                    <div className="mt-4 space-y-3 border-l border-border/70 pl-4">
                      {(comment.replies ?? []).map((reply) => (
                        <div className="flex items-start justify-between gap-3" key={reply.id}>
                          <div className="flex min-w-0 items-start gap-3">
                            <Avatar size="sm">
                              <AvatarImage
                                alt={reply.author.displayName}
                                src={reply.author.avatarUrl ?? getAvatarImage(reply.author.id)}
                              />
                              <AvatarFallback>{reply.author.displayName.slice(0, 1)}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-[0.72rem] text-muted-foreground">
                                <span className="text-sm font-medium text-foreground">{reply.author.displayName}</span>
                                {reply.replyToUser ? <span>@{reply.replyToUser.displayName}</span> : null}
                                <span>{new Date(reply.updatedAt).toLocaleString("zh-CN", { hour12: false })}</span>
                              </div>
                              <p className="text-[0.82rem] leading-6 text-foreground/76">{reply.content}</p>
                            </div>
                          </div>
                          <CommentActions
                            canReply={authStatus === "authenticated"}
                            comment={reply as RankingItemComment}
                            currentUserId={currentUserId}
                            itemId={item.id}
                            onEdit={(target) => {
                              setEditingId(target.id);
                              setEditingContent(target.content);
                            }}
                            onError={setActionError}
                            onRefresh={refreshAll}
                            onReply={(target) => {
                              setReplyingTo({ id: target.id, displayName: target.author.displayName });
                              setContent(`@${target.author.displayName} `);
                            }}
                          />
                        </div>
                      ))}
                    </div>
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
