import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, Eye, Heart, Share2, UserCheck, UserPlus } from "lucide-react";
import { startTransition, useState, type ComponentType, type MouseEvent, type SVGProps } from "react";
import { PageShareControl } from "@/components/page-share-control";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../auth/auth-store";
import { useLoginPrompt } from "../auth/use-login-prompt";
import { patchPostAuthorFollowState, patchPostInteractionState } from "./post-query-cache";

type FeedItem = Awaited<ReturnType<typeof apiClient.listHomeFeed>>["items"][number];

type ViewerState = FeedItem["engagement"]["viewer"]  ;

type Props = {
  postId: string;
  authorId: string;
  isPublished: boolean;
  viewer: ViewerState;
  likeCount: number;
  favoriteCount: number;
  shareCount: number;
  /** 展示在互动条最前的浏览量（仅展示，无交互） */
  viewCount?: number;
  hideShare?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  hideFollow?: boolean;
  plain?: boolean;
  /** 传入后启用复制链接、悬浮二维码；已登录用户复制成功会记录分享 */
  sharePath?: string;
};

type BusyAction = "follow" | "like" | "favorite" | "share" | null;

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
          "group h-auto border-0 bg-transparent px-0 py-0 text-agree-gray shadow-none hover:!bg-transparent hover:text-foreground active:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2",
        plain &&
          active &&
          "rounded-full bg-white/82 px-2 py-1 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.35)]",
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

export function PostInteractionBar(props: Props) {
  const queryClient = useQueryClient();
  const promptLogin = useLoginPrompt();
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);

  async function ensureAuthenticated() {
    if (
      promptLogin({
        title: "登录后才能互动",
        description: "关注、点赞、收藏、分享都需要登录后才能继续。"
      })
    ) {
      return true;
    }

    return false;
  }

  async function runAction(action: BusyAction, task: () => Promise<void>) {
    setError(null);
    setBusyAction(action);

    try {
      await task();
      startTransition(() => {
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      });
    } catch (value: unknown) {
      setError(value instanceof Error ? value.message : "操作失败");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {typeof props.viewCount === "number" ? (
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
            disabled={busyAction !== null}
            icon={props.viewer.isFollowingAuthor ? UserCheck : UserPlus}
            iconOnly
            label={props.viewer.isFollowingAuthor ? "已关注作者" : "关注作者"}
            onClick={() => {
              void ensureAuthenticated().then((ready) => {
                if (!ready) {
                  return;
                }

                const nextIsFollowing = !props.viewer.isFollowingAuthor;
                void runAction("follow", async () => {
                  await apiClient.toggleFollow(props.authorId);
                  patchPostAuthorFollowState(queryClient, props.authorId, nextIsFollowing);
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
          disabled={!props.isPublished || busyAction !== null}
          icon={Heart}
          iconOnly
          label="点赞"
          onClick={() => {
            void ensureAuthenticated().then((ready) => {
              if (!ready) {
                return;
              }

              const nextHasLiked = !props.viewer.hasLiked;
              void runAction("like", async () => {
                await apiClient.togglePostInteraction(props.postId, "like");
                patchPostInteractionState(queryClient, {
                  postId: props.postId,
                  likeDelta: nextHasLiked ? 1 : -1,
                  viewerPatch: { hasLiked: nextHasLiked }
                });
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
          disabled={!props.isPublished || busyAction !== null}
          icon={Bookmark}
          iconOnly
          label="收藏"
          onClick={() => {
            void ensureAuthenticated().then((ready) => {
              if (!ready) {
                return;
              }

              const nextHasFavorited = !props.viewer.hasFavorited;
              void runAction("favorite", async () => {
                await apiClient.togglePostInteraction(props.postId, "favorite");
                patchPostInteractionState(queryClient, {
                  postId: props.postId,
                  favoriteDelta: nextHasFavorited ? 1 : -1,
                  viewerPatch: { hasFavorited: nextHasFavorited }
                });
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
                aria-label={`分享（${props.shareCount} 次）`}
                className={cn(props.plain && "[&_button]:rounded-full")}
                disabled={!props.isPublished || busyAction !== null}
                iconClassName="size-4"
                onCopySuccess={() => {
                  if (useAuthStore.getState().status !== "authenticated") {
                    return;
                  }
                  const nextHasShared = !props.viewer.hasShared;
                  void runAction("share", async () => {
                    await apiClient.togglePostInteraction(props.postId, "share");
                    patchPostInteractionState(queryClient, {
                      postId: props.postId,
                      shareDelta: nextHasShared ? 1 : -1,
                      viewerPatch: { hasShared: nextHasShared }
                    });
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
              disabled={!props.isPublished || busyAction !== null}
              icon={Share2}
              iconOnly
              label="分享"
              onClick={() => {
                setError("分享功能暂未开放。");
              }}
              plain={props.plain}
              tone="share"
            />
          )
        ) : null}
      </div>

      {error ? (
        <Alert className="border-rose-200 bg-rose-50 text-rose-900" variant="destructive">
          <AlertTitle>互动失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
