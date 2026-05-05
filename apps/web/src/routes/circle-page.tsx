import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, lazy, startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { APP_ROUTES, buildLoginRedirectUrl, resolveSafeRedirectPath } from "@feijia/shared";
import { SitePage } from "@/components/site-shell";
import { useAuthStore } from "@/features/auth/auth-store";
import { useLoginPrompt } from "@/features/auth/use-login-prompt";
import {
  patchPostAuthorFollowState,
  patchPostCommentCreated,
  patchPostViewCount
} from "@/features/posts/post-query-cache";
import { apiClient } from "@/lib/api-client";
import { resolveFeedNextCursor } from "@/lib/feed-pagination";
import { shouldRecordSessionView } from "@/lib/view-session";
import { CirclePageFeed, type CircleFeedItem, type FeedTab } from "./circle-page-feed";

const CirclePageDetail = lazy(() =>
  import("./circle-page-detail").then((module) => ({
    default: module.CirclePageDetail
  }))
);

function formatCount(value: number) {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1).replace(/\.0$/, "")}w`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return String(value);
}

export function CirclePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const authStatus = useAuthStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.user);
  const promptLogin = useLoginPrompt();
  const [activeTab, setActiveTab] = useState<FeedTab>("recommended");
  const [commentContent, setCommentContent] = useState("");
  const [commentSort, setCommentSort] = useState<"latest" | "hot">("latest");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function readNoteIdFromURL(): string | null {
    return new URLSearchParams(window.location.search).get("note");
  }

  function syncNoteIdToURL(noteId: string | null) {
    const params = new URLSearchParams(window.location.search);
    if (noteId) {
      params.set("note", noteId);
    } else {
      params.delete("note");
    }
    const search = params.toString();
    const url = search
      ? `${window.location.pathname}?${search}`
      : window.location.pathname;
    window.history.replaceState(window.history.state, "", url);
  }

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(() =>
    readNoteIdFromURL()
  );

  // 响应浏览器前进/后退时同步 selectedNoteId
  useEffect(() => {
    function handlePopState() {
      setSelectedNoteId(readNoteIdFromURL());
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  const circleFeedQuery = useInfiniteQuery({
    queryKey: ["circle-feed", activeTab],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiClient.listCircleFeed(activeTab, {
        cursor: pageParam,
        limit: 20
      }),
    getNextPageParam: (lastPage) => resolveFeedNextCursor(lastPage)
  });
  const noteQuery = useQuery({
    queryKey: ["post-detail", selectedNoteId],
    queryFn: () => {
      if (!selectedNoteId) {
        throw new Error("Missing note id");
      }
      return apiClient.getPostDetail(selectedNoteId);
    },
    enabled: Boolean(selectedNoteId)
  });

  const posts = useMemo<CircleFeedItem[]>(
    () => circleFeedQuery.data?.pages.flatMap((feedPage) => feedPage.items) ?? [],
    [circleFeedQuery.data?.pages]
  );
  const selectedPreview = useMemo(
    () => posts.find((item) => item.id === selectedNoteId) ?? null,
    [posts, selectedNoteId]
  );
  const selectedNote = noteQuery.data?.item ?? null;
  const displayNote = selectedNote ?? selectedPreview;

  useEffect(() => {
    if (!selectedNote || selectedNote.status !== "published" || !shouldRecordSessionView("post", selectedNote.id)) {
      return;
    }

    void apiClient
      .recordPostView(selectedNote.id)
      .then(() => {
        patchPostViewCount(queryClient, selectedNote.id);
      })
      .catch(() => {
        // Ignore passive view-record failures to keep the modal responsive.
      });
  }, [queryClient, selectedNote]);

  function openNote(id: string) {
    setSelectedNoteId(id);
    syncNoteIdToURL(id);
  }

  function closeNote() {
    setSelectedNoteId(null);
    syncNoteIdToURL(null);
    setCommentContent("");
    setActionError(null);
  }

  const isFeedLoading = circleFeedQuery.isLoading && !circleFeedQuery.data;
  const isFeedRefetching = circleFeedQuery.isRefetching;
  const isFeedError = circleFeedQuery.isError && !circleFeedQuery.data;
  const isFeedNextPageError = circleFeedQuery.isFetchNextPageError && posts.length > 0;
  const feedErrorMessage = circleFeedQuery.error instanceof Error ? circleFeedQuery.error.message : undefined;
  const hasMoreFeedItems = Boolean(circleFeedQuery.hasNextPage);
  const isFetchingNextFeedPage = circleFeedQuery.isFetchingNextPage;

  const isFollowingPendingRef = useRef(false);

  function handleToggleFollow() {
    if (!selectedNote || isFollowingPendingRef.current) {
      return;
    }

    if (
      !promptLogin({
        title: "登录后才能关注作者",
        description: "关注前请先登录。"
      })
    ) {
      return;
    }

    const nextIsFollowing = !selectedNote.engagement.viewer.isFollowingAuthor;
    setActionError(null);
    isFollowingPendingRef.current = true;
    // 乐观更新: 立即反映 UI 状态
    patchPostAuthorFollowState(queryClient, selectedNote.author.id, nextIsFollowing);

    void apiClient
      .toggleFollow(selectedNote.author.id)
      .then(() => {
        startTransition(() => {
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        });
      })
      .catch((reason: unknown) => {
        // 回滚乐观更新
        patchPostAuthorFollowState(queryClient, selectedNote.author.id, !nextIsFollowing);
        setActionError(
          reason instanceof Error ? reason.message : "操作失败，请稍后重试。"
        );
      })
      .finally(() => {
        isFollowingPendingRef.current = false;
      });
  }

  function handleCommentSubmit() {
    if (!selectedNote || !commentContent.trim() || isSubmitting) {
      return;
    }

    setActionError(null);
    setIsSubmitting(true);
    void apiClient
      .createPostComment(selectedNote.id, {
        content: commentContent
      })
      .then((payload) => {
        patchPostCommentCreated(queryClient, selectedNote.id, payload.item);
        setCommentContent("");
      })
      .catch((reason: unknown) => {
        setActionError(
          reason instanceof Error ? reason.message : "操作失败，请稍后重试。"
        );
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  function handleNavigateToLogin() {
    void navigate(
      buildLoginRedirectUrl(APP_ROUTES.webLogin, {
        pathname: resolveSafeRedirectPath({
          candidate: window.location.pathname + window.location.search,
          fallbackPath: APP_ROUTES.feedHome,
          blockedPaths: [APP_ROUTES.webLogin]
        })
      })
    );
  }

  return (
    <SitePage className="gap-4">
      <CirclePageFeed
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        posts={posts}
        openNote={openNote}
        selectedNoteId={selectedNoteId}
        isLoading={isFeedLoading}
        isRefetching={isFeedRefetching}
        isFetchingNextPage={isFetchingNextFeedPage}
        isError={isFeedError}
        errorMessage={feedErrorMessage}
        isLoadMoreError={isFeedNextPageError}
        loadMoreErrorMessage={isFeedNextPageError ? feedErrorMessage : undefined}
        hasMore={hasMoreFeedItems}
        onLoadMore={() => {
          void circleFeedQuery.fetchNextPage();
        }}
        formatCount={formatCount}
        authStatus={authStatus}
        onNavigateToLogin={handleNavigateToLogin}
      />

      {selectedNoteId ? (
        <Suspense fallback={null}>
          <CirclePageDetail
            key={selectedNoteId}
            selectedNoteId={selectedNoteId}
            selectedNote={selectedNote}
            displayNote={displayNote}
            noteQuery={noteQuery}
            authStatus={authStatus}
            currentUser={currentUser}
            promptLogin={promptLogin}
            commentContent={commentContent}
            onCommentContentChange={setCommentContent}
            commentSort={commentSort}
            onCommentSortChange={setCommentSort}
            isSubmitting={isSubmitting}
            actionError={actionError}
            onCommentSubmit={handleCommentSubmit}
            onClose={closeNote}
            onToggleFollow={handleToggleFollow}
            formatCount={formatCount}
          />
        </Suspense>
      ) : null}
    </SitePage>
  );
}
