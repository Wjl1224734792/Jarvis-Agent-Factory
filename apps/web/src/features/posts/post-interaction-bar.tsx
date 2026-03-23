import { useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { Bookmark, Heart, Share2, UserCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

function actionButtonClass(active: boolean, compact: boolean | undefined) {
  return [
    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition",
    compact ? "text-xs" : "text-sm",
    active
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-950"
  ].join(" ");
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {!props.viewer.isAuthor ? (
          <button
            className={actionButtonClass(props.viewer.isFollowingAuthor, props.compact)}
            disabled={busyAction !== null}
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
            type="button"
          >
            {props.viewer.isFollowingAuthor ? (
              <UserCheck className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {props.viewer.isFollowingAuthor ? "已关注" : "关注作者"}
          </button>
        ) : null}

        <button
          className={actionButtonClass(props.viewer.hasLiked, props.compact)}
          disabled={!props.isPublished || busyAction !== null}
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
          type="button"
        >
          <Heart className="h-4 w-4" />
          点赞 {props.likeCount}
        </button>

        <button
          className={actionButtonClass(props.viewer.hasFavorited, props.compact)}
          disabled={!props.isPublished || busyAction !== null}
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
          type="button"
        >
          <Bookmark className="h-4 w-4" />
          收藏 {props.favoriteCount}
        </button>

        <button
          className={actionButtonClass(props.viewer.hasShared, props.compact)}
          disabled={!props.isPublished || busyAction !== null}
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
                    setError("宸茶褰曞垎浜絾澶嶅埗閾炬帴澶辫触");
                  }
                }
              });
            });
          }}
          type="button"
        >
          <Share2 className="h-4 w-4" />
          分享 {props.shareCount}
        </button>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
