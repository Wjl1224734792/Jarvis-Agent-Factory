import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, lazy, startTransition, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SitePage } from "@/components/site-shell";
import { useAuthStore } from "@/features/auth/auth-store";
import { useLoginPrompt } from "@/features/auth/use-login-prompt";
import {
  patchPostAuthorFollowState,
  patchPostCommentCreated,
  patchPostViewCount
} from "@/features/posts/post-query-cache";
import { apiClient } from "@/lib/api-client";
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
  const authStatus = useAuthStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.user);
  const promptLogin = useLoginPrompt();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<FeedTab>("recommended");
  const [commentContent, setCommentContent] = useState("");
  const [commentSort, setCommentSort] = useState<"latest" | "hot">("latest");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const isRecommendedFeed = activeTab === "recommended";

  const selectedNoteId = searchParams.get("note");
  const recommendedFeedQuery = useInfiniteQuery({
    queryKey: ["circle-feed", "recommended"],
    enabled: isRecommendedFeed,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiClient.listCircleFeed("recommended", {
        cursor: pageParam,
        limit: 20
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined
  });
  const feedQuery = useQuery({
    queryKey: ["circle-feed", activeTab],
    enabled: !isRecommendedFeed,
    placeholderData: keepPreviousData,
    queryFn: () => apiClient.listCircleFeed(activeTab, { page: 1, limit: 20 })
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
    () =>
      isRecommendedFeed
        ? recommendedFeedQuery.data?.pages.flatMap((feedPage) => feedPage.items) ?? []
        : feedQuery.data?.items ?? [],
    [feedQuery.data?.items, isRecommendedFeed, recommendedFeedQuery.data?.pages]
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
    const next = new URLSearchParams(searchParams);
    next.set("note", id);
    setSearchParams(next);
  }

  function closeNote() {
    const next = new URLSearchParams(searchParams);
    next.delete("note");
    setSearchParams(next);
    setCommentContent("");
    setActionError(null);
  }

  const isFeedLoading = isRecommendedFeed
    ? recommendedFeedQuery.isLoading && !recommendedFeedQuery.data
    : feedQuery.isLoading && !feedQuery.data;
  const isFeedRefetching = isRecommendedFeed ? recommendedFeedQuery.isRefetching : feedQuery.isRefetching;
  const isFeedError = isRecommendedFeed ? recommendedFeedQuery.isError : feedQuery.isError;
  const feedErrorMessage = isRecommendedFeed
    ? recommendedFeedQuery.error instanceof Error
      ? recommendedFeedQuery.error.message
      : undefined
    : feedQuery.error?.message;
  const hasMoreRecommendedItems = isRecommendedFeed ? recommendedFeedQuery.hasNextPage : false;
  const isFetchingNextRecommendedPage = isRecommendedFeed ? recommendedFeedQuery.isFetchingNextPage : false;

  function handleToggleFollow() {
    if (!selectedNote) {
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
    void apiClient
      .toggleFollow(selectedNote.author.id)
      .then(() => {
        patchPostAuthorFollowState(queryClient, selectedNote.author.id, nextIsFollowing);
        startTransition(() => {
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        });
      })
      .catch((reason: unknown) => {
        setActionError(
          reason instanceof Error ? reason.message : "操作失败，请稍后重试。"
        );
      });
  }

  function handleCommentSubmit() {
    if (!selectedNote || !commentContent.trim()) {
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
        isFetchingNextPage={isFetchingNextRecommendedPage}
        isError={isFeedError}
        errorMessage={feedErrorMessage}
        hasMore={hasMoreRecommendedItems}
        onLoadMore={() => {
          if (!isRecommendedFeed) {
            return;
          }
          void recommendedFeedQuery.fetchNextPage();
        }}
        formatCount={formatCount}
      />

      {selectedNoteId ? (
        <Suspense fallback={null}>
          <CirclePageDetail
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
