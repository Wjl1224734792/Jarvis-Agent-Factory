import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, Eye, Flag, Heart, Share2, UserCheck, UserPlus } from "lucide-react";
import { startTransition, useRef, useState, type ComponentType, type MouseEvent, type SVGProps } from "react";
import { PageShareControl } from "@/components/page-share-control";
import { ShareQrCodeDialog } from "@/components/share-qrcode-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../auth/auth-store";
import { useLoginPrompt } from "../auth/use-login-prompt";
import { patchPostAuthorFollowState, patchPostInteractionState } from "./post-query-cache";

type FeedItem = Awaited<ReturnType<typeof apiClient.listHomeFeed>>["items"][number];

type ViewerState = FeedItem["engagement"]["viewer"];
type InteractionAction = "follow" | "like" | "favorite" | "share";
type PendingActionState = Record<InteractionAction, boolean>;

type Props = {
  postId: string;
  authorId: string;
  isPublished: boolean;
  viewer: ViewerState;
  likeCount: number;
  favoriteCount: number;
  shareCount: number;
  // Display-only view count shown before the interaction actions.
  viewCount?: number;
  hideShare?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  hideFollow?: boolean;
  plain?: boolean;
  // Enables copy-link and QR-based share flows when provided.
  sharePath?: string;
  layout?: "horizontal" | "vertical";
  /** 举报回调——传入后显示举报按钮 */
  onReport?: () => void;
  hideReport?: boolean;
};

type ActionButtonProps = {
  label: string;
  count?: number;
  active?: boolean;
  disabled?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  plain?: boolean;
  layout?: "horizontal" | "vertical";
  onClick: () => void;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: "follow" | "like" | "favorite" | "share";
};

function ActionButton({
  label,
  count,
  active = false,
  disabled = false,
  compact,
  iconOnly,
  plain,
  layout = "horizontal",
  onClick,
  icon: Icon,
  tone
}: ActionButtonProps) {
  const supportsFill = tone !== "follow";
  const activeClassName =
    tone === "like"
      ? "border-rose-200 bg-rose-50 text-like-red hover:bg-rose-100 hover:text-like-red"
      : tone === "favorite"
        ? "border-orange-200 bg-orange-50 text-rating-orange hover:bg-orange-100 hover:text-rating-orange"
        : tone === "follow"
          ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
          : "border-sky-200 bg-sky-50 text-rating-blue hover:bg-sky-100 hover:text-rating-blue";

  const plainHoverTone =
    plain && layout === "vertical"
      ? tone === "like"
        ? "hover:text-rose-600 dark:hover:text-rose-400"
        : tone === "favorite"
          ? "hover:text-amber-700 dark:hover:text-amber-400"
          : tone === "share"
            ? "hover:text-blue-600 dark:hover:text-blue-400"
            : "hover:text-primary"
      : null;

  const plainActiveIconTone =
    plain && active
      ? tone === "like"
        ? "text-like-red"
        : tone === "favorite"
          ? "text-rating-orange"
          : tone === "share"
            ? "text-rating-blue"
            : "text-primary"
      : null;
  const plainActiveButtonTone =
    plain && active
      ? tone === "like"
        ? "text-like-red"
        : tone === "favorite"
          ? "text-rating-orange"
          : tone === "share"
            ? "text-rating-blue"
            : "text-primary"
      : null;

  return (
    <Button
      className={cn(
        "rounded-full",
        layout === "vertical" && "flex-col gap-0.5",
        plain &&
          cn(
            "group h-auto border-0 bg-transparent px-2 py-1 text-agree-gray shadow-none hover:!bg-transparent active:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2",
            layout !== "vertical" && "hover:text-foreground",
            plainHoverTone
          ),
        layout === "vertical" && plain && "px-1.5 py-2.5",
        plain &&
          active &&
          "rounded-full bg-white/82 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.35)]",
        plainActiveButtonTone,
        active && !plain && activeClassName
      )}
      disabled={disabled}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onClick();
      }}
      size={layout === "vertical" || plain ? undefined : compact ? "sm" : "default"}
      type="button"
      variant={plain ? "ghost" : active ? "secondary" : "outline"}
    >
      <Icon
        className={cn(
          "transition-transform duration-150 ease-out group-active:scale-[0.92]",
          layout === "vertical" ? "size-5" : "size-4",
          plainActiveIconTone,
          active && "motion-safe:animate-[reaction-pop_220ms_cubic-bezier(0.2,0.9,0.2,1)]",
          !iconOnly && layout !== "vertical" && "mr-0"
        )}
        fill={active && supportsFill ? "currentColor" : "none"}
        strokeWidth={active && supportsFill ? 1.7 : 2}
      />
      <span className="sr-only">{label}</span>
      {typeof count === "number" ? (
        <span className={cn("text-xs tabular-nums transition-colors", layout === "vertical" ? "mt-0.5" : !plain && "ml-1", plainActiveIconTone)}>
          {count}
        </span>
      ) : null}
    </Button>
  );
}

const INITIAL_PENDING_ACTIONS: PendingActionState = {
  follow: false,
  like: false,
  favorite: false,
  share: false
};

export function PostInteractionBar(props: Props) {
  const queryClient = useQueryClient();
  const promptLogin = useLoginPrompt();
  const [pendingActions, setPendingActions] = useState<PendingActionState>(INITIAL_PENDING_ACTIONS);
  const pendingActionsRef = useRef<PendingActionState>(INITIAL_PENDING_ACTIONS);
  const [error, setError] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  async function ensureAuthenticated() {
    if (
      promptLogin({
        title: "登录后才能互动",
        description:
          "关注、点赞、收藏、分享都需要登录后才能继续。"
      })
    ) {
      return true;
    }

    return false;
  }

  function setActionPending(action: InteractionAction, isPending: boolean) {
    if (pendingActionsRef.current[action] === isPending) {
      return;
    }

    const nextState = {
      ...pendingActionsRef.current,
      [action]: isPending
    };

    pendingActionsRef.current = nextState;
    setPendingActions(nextState);
  }

  async function runOptimisticAction(
    action: InteractionAction,
    options: {
      applyOptimisticUpdate: () => void;
      rollbackOptimisticUpdate: () => void;
      task: () => Promise<unknown>;
      fallbackErrorMessage: string;
    }
  ) {
    if (pendingActionsRef.current[action]) {
      return;
    }

    setError(null);
    setActionPending(action, true);
    options.applyOptimisticUpdate();

    try {
      await options.task();
      startTransition(() => {
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      });
    } catch (value: unknown) {
      options.rollbackOptimisticUpdate();
      setError(value instanceof Error ? value.message : options.fallbackErrorMessage);
    } finally {
      setActionPending(action, false);
    }
  }

  const layout = props.layout ?? "horizontal";

  return (
    <div className={cn("relative flex", layout === "vertical" ? "flex-col items-center gap-3" : "flex-col gap-4")}>
      <div className={cn("flex flex-wrap items-center gap-2", layout === "vertical" && "flex-col gap-4")}>
        {typeof props.viewCount === "number" && layout !== "vertical" ? (
          <span
            aria-label={`浏览量 ${props.viewCount}`}
            className="mr-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums"
          >
            <Eye className="size-4 shrink-0" aria-hidden />
            {props.viewCount}
          </span>
        ) : null}

        {!props.hideFollow && !props.viewer.isAuthor ? (
          <ActionButton
            active={props.viewer.isFollowingAuthor}
            compact={props.compact}
            disabled={pendingActions.follow}
            icon={props.viewer.isFollowingAuthor ? UserCheck : UserPlus}
            iconOnly
            label={
              props.viewer.isFollowingAuthor
                ? "已关注作者"
                : "关注作者"
            }
            layout={layout}
            onClick={() => {
              void ensureAuthenticated().then((ready) => {
                if (!ready) {
                  return;
                }

                const nextIsFollowing = !props.viewer.isFollowingAuthor;
                void runOptimisticAction("follow", {
                  applyOptimisticUpdate: () => {
                    patchPostAuthorFollowState(queryClient, props.authorId, nextIsFollowing);
                  },
                  rollbackOptimisticUpdate: () => {
                    patchPostAuthorFollowState(queryClient, props.authorId, props.viewer.isFollowingAuthor);
                  },
                  task: () => apiClient.toggleFollow(props.authorId),
                  fallbackErrorMessage: "关注失败"
                });
              });
            }}
            plain={props.plain}
            tone="follow"
          />
        ) : null}

        <ActionButton
          active={props.viewer.hasLiked}
          compact={props.compact}
          count={props.likeCount}
          disabled={!props.isPublished || pendingActions.like}
          icon={Heart}
          iconOnly
          label="点赞"
          layout={layout}
          onClick={() => {
            void ensureAuthenticated().then((ready) => {
              if (!ready) {
                return;
              }

              const nextHasLiked = !props.viewer.hasLiked;
              void runOptimisticAction("like", {
                applyOptimisticUpdate: () => {
                  patchPostInteractionState(queryClient, {
                    postId: props.postId,
                    likeDelta: nextHasLiked ? 1 : -1,
                    viewerPatch: { hasLiked: nextHasLiked }
                  });
                },
                rollbackOptimisticUpdate: () => {
                  patchPostInteractionState(queryClient, {
                    postId: props.postId,
                    likeDelta: nextHasLiked ? -1 : 1,
                    viewerPatch: { hasLiked: props.viewer.hasLiked }
                  });
                },
                task: () => apiClient.togglePostInteraction(props.postId, "like"),
                fallbackErrorMessage: "点赞失败"
              });
            });
          }}
          plain={props.plain}
          tone="like"
        />

        <ActionButton
          active={props.viewer.hasFavorited}
          compact={props.compact}
          count={props.favoriteCount}
          disabled={!props.isPublished || pendingActions.favorite}
          icon={Bookmark}
          iconOnly
          label="收藏"
          layout={layout}
          onClick={() => {
            void ensureAuthenticated().then((ready) => {
              if (!ready) {
                return;
              }

              const nextHasFavorited = !props.viewer.hasFavorited;
              void runOptimisticAction("favorite", {
                applyOptimisticUpdate: () => {
                  patchPostInteractionState(queryClient, {
                    postId: props.postId,
                    favoriteDelta: nextHasFavorited ? 1 : -1,
                    viewerPatch: { hasFavorited: nextHasFavorited }
                  });
                },
                rollbackOptimisticUpdate: () => {
                  patchPostInteractionState(queryClient, {
                    postId: props.postId,
                    favoriteDelta: nextHasFavorited ? -1 : 1,
                    viewerPatch: { hasFavorited: props.viewer.hasFavorited }
                  });
                },
                task: () => apiClient.togglePostInteraction(props.postId, "favorite"),
                fallbackErrorMessage: "收藏失败"
              });
            });
          }}
          plain={props.plain}
          tone="favorite"
        />

        {!props.hideShare ? (
          props.sharePath ? (
            <div className={cn(layout === "vertical" ? "flex flex-col items-center gap-0.5" : "inline-flex items-center gap-1")}>
              <PageShareControl
                active={props.viewer.hasShared}
                aria-label={`分享（${props.shareCount} 次）`}
                className={cn(props.plain && "[&_button]:rounded-full")}
                disabled={!props.isPublished || pendingActions.share}
                iconClassName={layout === "vertical" ? "size-5" : "size-4"}
                onCopySuccess={() => {
                  if (useAuthStore.getState().status !== "authenticated") {
                    return;
                  }

                  const nextHasShared = !props.viewer.hasShared;
                  void runOptimisticAction("share", {
                    applyOptimisticUpdate: () => {
                      patchPostInteractionState(queryClient, {
                        postId: props.postId,
                        shareDelta: nextHasShared ? 1 : -1,
                        viewerPatch: { hasShared: nextHasShared }
                      });
                    },
                    rollbackOptimisticUpdate: () => {
                      patchPostInteractionState(queryClient, {
                        postId: props.postId,
                        shareDelta: nextHasShared ? -1 : 1,
                        viewerPatch: { hasShared: props.viewer.hasShared }
                      });
                    },
                    task: () => apiClient.togglePostInteraction(props.postId, "share"),
                    fallbackErrorMessage: "分享失败"
                  });
                }}
                sharePath={props.sharePath}
                tone={props.plain ? "plainShare" : "default"}
              />
              <span
                aria-hidden
                className={cn(
                  "text-xs tabular-nums",
                  props.plain && props.viewer.hasShared && "text-rating-blue",
                  props.plain && !props.viewer.hasShared && "text-agree-gray",
                  !props.plain && "text-muted-foreground"
                )}
              >
                {props.shareCount}
              </span>
            </div>
          ) : (
            <ActionButton
              active={props.viewer.hasShared}
              compact={props.compact}
              count={props.shareCount}
              disabled={!props.isPublished || pendingActions.share}
              icon={Share2}
              iconOnly
              label="分享"
              layout={layout}
              onClick={() => {
                setError("分享功能暂未开放");
              }}
              plain={props.plain}
              tone="share"
            />
          )
        ) : null}

        {!props.hideReport && props.onReport && !props.viewer.isAuthor ? (
          <ActionButton
            compact={props.compact}
            icon={Flag}
            iconOnly
            label="举报"
            layout={layout}
            onClick={props.onReport}
            plain={props.plain}
            tone="share"
          />
        ) : null}
      </div>

      {error ? (
        <Alert
          className={cn(
            "border-rose-200 bg-rose-50 text-rose-900",
            layout === "vertical" && "absolute left-full top-0 z-50 ml-3 w-72"
          )}
          variant="destructive"
        >
          <AlertTitle>互动失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
