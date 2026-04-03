import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, Heart, Share2, UserCheck, UserPlus } from "lucide-react";
import { useState, type ComponentType, type MouseEvent, type SVGProps } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiClient } from "../../lib/api-client";
import { useLoginPrompt } from "../auth/use-login-prompt";

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
  hideShare?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  hideFollow?: boolean;
  plain?: boolean;
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

  return (
    <Button
      className={cn(
        "rounded-full",
        plain &&
          "h-auto border-0 bg-transparent px-0 py-0 text-agree-gray shadow-none hover:bg-transparent hover:text-foreground",
        active && activeClassName
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
        className={cn("size-4", !iconOnly && "mr-0")}
        fill={active && supportsFill ? "currentColor" : "none"}
        strokeWidth={active && supportsFill ? 1.7 : 2}
      />
      <span className="sr-only">{label}</span>
      {typeof count === "number" ? (
        <span className={cn("text-xs tabular-nums", !plain && "ml-1")}>{count}</span>
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["home-shell-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["circle-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["post-detail", props.postId] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] })
      ]);
    } catch (value: unknown) {
      setError(value instanceof Error ? value.message : "操作失败");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
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

                void runAction("follow", async () => {
                  await apiClient.toggleFollow(props.authorId);
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

              void runAction("like", async () => {
                await apiClient.togglePostInteraction(props.postId, "like");
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

              void runAction("favorite", async () => {
                await apiClient.togglePostInteraction(props.postId, "favorite");
              });
            });
          }}
          plain={props.plain}
          tone="favorite"
        />

        {!props.hideShare ? (
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
