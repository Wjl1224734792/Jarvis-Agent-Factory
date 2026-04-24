import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, Eye, Heart, Share2, UserCheck, UserPlus } from "lucide-react";
import { startTransition, useRef, useState, type ComponentType, type MouseEvent, type SVGProps } from "react";
import { PageShareControl } from "@/components/page-share-control";
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
};

type ActionButtonProps = {
  label: string;
  count?: number;
  active?: boolean;
  disabled?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  plain?: boolean;
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
        plain &&
          "group h-auto border-0 bg-transparent px-2 py-1 text-agree-gray shadow-none hover:!bg-transparent hover:text-foreground active:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2",
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
      size={plain ? undefined : compact ? "sm" : "default"}
      type="button"
      variant={plain ? "ghost" : active ? "secondary" : "outline"}
    >
      <Icon
        className={cn(
          "size-4 transition-transform duration-150 ease-out group-active:scale-[0.92]",
          plainActiveIconTone,
          active && "motion-safe:animate-[reaction-pop_220ms_cubic-bezier(0.2,0.9,0.2,1)]",
          !iconOnly && "mr-0"
        )}
        fill={active && supportsFill ? "currentColor" : "none"}
        strokeWidth={active && supportsFill ? 1.7 : 2}
      />
      <span className="sr-only">{label}</span>
      {typeof count === "number" ? (
        <span className={cn("text-xs tabular-nums transition-colors", !plain && "ml-1", plainActiveIconTone)}>
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

  async function ensureAuthenticated() {
    if (
      promptLogin({
        title: "\u767b\u5f55\u540e\u624d\u80fd\u4e92\u52a8",
        description:
          "\u5173\u6ce8\u3001\u70b9\u8d5e\u3001\u6536\u85cf\u3001\u5206\u4eab\u90fd\u9700\u8981\u767b\u5f55\u540e\u624d\u80fd\u7ee7\u7eed\u3002"
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {typeof props.viewCount === "number" ? (
          <span
            aria-label={`\u6d4f\u89c8\u91cf ${props.viewCount}`}
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
                ? "\u5df2\u5173\u6ce8\u4f5c\u8005"
                : "\u5173\u6ce8\u4f5c\u8005"
            }
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
                  fallbackErrorMessage: "\u5173\u6ce8\u5931\u8d25"
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
          label="\u70b9\u8d5e"
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
                fallbackErrorMessage: "\u70b9\u8d5e\u5931\u8d25"
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
          label="\u6536\u85cf"
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
                fallbackErrorMessage: "\u6536\u85cf\u5931\u8d25"
              });
            });
          }}
          plain={props.plain}
          tone="favorite"
        />

        {!props.hideShare ? (
          props.sharePath ? (
            <div className="inline-flex items-center gap-1">
              <PageShareControl
                active={props.viewer.hasShared}
                aria-label={`\u5206\u4eab\uff08${props.shareCount} \u6b21\uff09`}
                className={cn(props.plain && "[&_button]:rounded-full")}
                disabled={!props.isPublished || pendingActions.share}
                iconClassName="size-4"
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
                    fallbackErrorMessage: "\u5206\u4eab\u5931\u8d25"
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
              label="\u5206\u4eab"
              onClick={() => {
                setError("\u5206\u4eab\u529f\u80fd\u6682\u672a\u5f00\u653e");
              }}
              plain={props.plain}
              tone="share"
            />
          )
        ) : null}
      </div>

      {error ? (
        <Alert className="border-rose-200 bg-rose-50 text-rose-900" variant="destructive">
          <AlertTitle>\u4e92\u52a8\u5931\u8d25</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
