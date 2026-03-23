import { useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  Bookmark,
  Heart,
  Share2,
  UserCheck,
  UserPlus
} from "lucide-react";
import { useState, type ComponentType, type SVGProps } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../auth/auth-store";

type FeedItem = Awaited<ReturnType<typeof apiClient.listHomeFeed>>["items"][number];
type PostDetail = Awaited<ReturnType<typeof apiClient.getPostDetail>>["item"];

type ViewerState = FeedItem["engagement"]["viewer"] | PostDetail["engagement"]["viewer"];

type Props = {
  postId: string;
  authorId: string;
  isPublished: boolean;
  viewer: ViewerState;
  likeCount: number;
  favoriteCount: number;
  shareCount: number;
  compact?: boolean;
};

type BusyAction = "follow" | "like" | "favorite" | "share" | null;

type ActionButtonProps = {
  label: string;
  count?: number;
  active?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick: () => void;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

function ActionButton({
  label,
  count,
  active = false,
  disabled = false,
  compact,
  onClick,
  icon: Icon
}: ActionButtonProps) {
  return (
    <Button
      className={cn(
        "rounded-full",
        active &&
          "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
      )}
      disabled={disabled}
      onClick={onClick}
      size={compact ? "sm" : "default"}
      type="button"
      variant={active ? "secondary" : "outline"}
    >
      <Icon data-icon="inline-start" />
      <span>{label}</span>
      {typeof count === "number" ? (
        <Badge className="ml-1" variant={active ? "default" : "secondary"}>
          {count}
        </Badge>
      ) : null}
    </Button>
  );
}

export function PostInteractionBar(props: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((state) => state.status);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);

  async function ensureAuthenticated() {
    if (authStatus === "authenticated") {
      return true;
    }

    navigate(APP_ROUTES.webLogin);
    return false;
  }

  async function runAction(action: BusyAction, task: () => Promise<void>) {
    setError(null);
    setBusyAction(action);

    try {
      await task();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
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
        {!props.viewer.isAuthor ? (
          <ActionButton
            active={props.viewer.isFollowingAuthor}
            compact={props.compact}
            disabled={busyAction !== null}
            icon={props.viewer.isFollowingAuthor ? UserCheck : UserPlus}
            label={props.viewer.isFollowingAuthor ? "已关注" : "关注作者"}
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
          />
        ) : null}

        <ActionButton
          active={props.viewer.hasLiked}
          compact={props.compact}
          count={props.likeCount}
          disabled={!props.isPublished || busyAction !== null}
          icon={Heart}
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
        />

        <ActionButton
          active={props.viewer.hasFavorited}
          compact={props.compact}
          count={props.favoriteCount}
          disabled={!props.isPublished || busyAction !== null}
          icon={Bookmark}
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
        />

        <ActionButton
          active={props.viewer.hasShared}
          compact={props.compact}
          count={props.shareCount}
          disabled={!props.isPublished || busyAction !== null}
          icon={Share2}
          label="分享"
          onClick={() => {
            void ensureAuthenticated().then((ready) => {
              if (!ready) {
                return;
              }

              void runAction("share", async () => {
                await apiClient.togglePostInteraction(props.postId, "share");

                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  try {
                    await navigator.clipboard.writeText(
                      window.location.origin + APP_ROUTES.postDetail.replace(":id", props.postId)
                    );
                  } catch {
                    setError("已记录分享，但复制链接失败");
                  }
                }
              });
            });
          }}
        />
      </div>

      {error ? (
        <Alert className="border-rose-200 bg-rose-50 text-rose-900" variant="destructive">
          <AlertTitle>交互失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
