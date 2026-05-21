import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, lazy, startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { APP_ROUTES, buildLoginRedirectUrl, resolveSafeRedirectPath } from "@feijia/shared";
import { SitePage } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon } from "lucide-react";
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
import { CirclePageFeed, feedTabs, mapCirclePostToFeedItem, type CircleFeedItem, type FeedTab } from "./circle-page-feed";

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
  const [activeTab, setActiveTab] = useState<FeedTab>(() => {
    const tab = readTabFromURL();
    return tab && feedTabs.some(t => t.id === tab) ? (tab as FeedTab) : "recommended";
  });
  const [commentContent, setCommentContent] = useState("");
  const [commentSort, setCommentSort] = useState<"latest" | "hot">("latest");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function readNoteIdFromURL(): string | null {
    return new URLSearchParams(window.location.search).get("note");
  }

  function readTabFromURL(): string | null {
    return new URLSearchParams(window.location.search).get("tab");
  }

  function syncURLParams(updates: { tab?: string | null; note?: string | null }) {
    const params = new URLSearchParams(window.location.search);
    if (updates.tab !== undefined) {
      updates.tab ? params.set("tab", updates.tab) : params.delete("tab");
    }
    if (updates.note !== undefined) {
      updates.note ? params.set("note", updates.note) : params.delete("note");
    }
    const search = params.toString();
    const url = search
      ? `${window.location.pathname}?${search}`
      : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(() =>
    readNoteIdFromURL()
  );

  // 响应浏览器前进/后退时同步 URL 状态
  useEffect(() => {
    function handlePopState() {
      const tabFromURL = readTabFromURL();
      if (tabFromURL && feedTabs.some(t => t.id === tabFromURL)) {
        setActiveTab(tabFromURL as FeedTab);
      }
      const noteIdFromURL = readNoteIdFromURL();
      setSelectedNoteId(noteIdFromURL ?? null);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  const circlesQuery = useQuery({
    queryKey: ["circles-list"],
    queryFn: () => apiClient.listCircles({ sort: "hot" }),
  });
  const circles = (circlesQuery.data?.items ?? []) as Array<{ id: string; slug: string; name: string; description?: string | null; memberCount: number; postCount: number; coverImageUrl: string | null }>;

  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);

  const circlePostsQuery = useQuery({
    queryKey: ["circle-posts", selectedCircleId],
    queryFn: () => apiClient.listCirclePosts(selectedCircleId!, { tab: "latest" }),
    enabled: Boolean(selectedCircleId),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");
  const [newCircleSlug, setNewCircleSlug] = useState("");
  const [newCircleDesc, setNewCircleDesc] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [coverFileId, setCoverFileId] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [isCoverUploading, setIsCoverUploading] = useState(false);

  async function handleCoverUpload(file: File) {
    setIsCoverUploading(true);
    setCreateError(null);
    try {
      const init = await apiClient.initUpload({
        bizType: "circle-cover-image",
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
      });
      if (init.upload.mode === "presigned-put") {
        await fetch(init.upload.url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
      }
      const complete = await apiClient.completeUpload(init.fileId);
      setCoverFileId(complete.item.id);
      setCoverPreviewUrl(complete.item.url);
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "封面上传失败");
    } finally {
      setIsCoverUploading(false);
    }
  }

  async function handleCreateCircle() {
    setCreateError(null);
    if (!newCircleName.trim() || !newCircleSlug.trim()) {
      setCreateError("名称和Slug不能为空");
      return;
    }
    if (!coverFileId) {
      setCreateError("请上传圈子封面图");
      return;
    }
    try {
      await apiClient.createCircle({ name: newCircleName.trim(), slug: newCircleSlug.trim(), description: newCircleDesc.trim() || undefined, coverImageFileId: coverFileId });
      setShowCreate(false);
      setNewCircleName("");
      setNewCircleSlug("");
      setNewCircleDesc("");
      setCoverFileId(null);
      setCoverPreviewUrl(null);
      void circlesQuery.refetch();
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      if (err.code === "SPAM_BLOCKED") {
        setCreateError((err.message as string) ?? "暂不满足创建条件");
      } else {
        setCreateError((err.message as string) ?? "创建失败");
      }
    }
  }

  const feedApiTab = activeTab === "circles" ? "recommended" : activeTab;
  const circleFeedQuery = useInfiniteQuery({
    queryKey: ["circle-feed", feedApiTab],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiClient.listCircleFeed(feedApiTab, {
        cursor: pageParam,
        limit: 20
      }),
    getNextPageParam: (lastPage) => resolveFeedNextCursor(lastPage),
    enabled: true
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
    syncURLParams({ note: id });
  }

  function closeNote() {
    setSelectedNoteId(null);
    syncURLParams({ note: null });
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">飞友圈</h2>
        {authStatus === "authenticated" ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowCreate(!showCreate)}>
              <PlusIcon className="size-3.5 mr-1" />
              创建圈子
            </Button>
          </div>
        ) : null}
      </div>

      {showCreate ? (
        <div className="rounded-xl border border-border/60 bg-white p-4 space-y-3">
          <Input
            onChange={(e) => setNewCircleName(e.target.value)}
            placeholder="圈子名称"
            value={newCircleName}
          />
          <Input
            onChange={(e) => setNewCircleSlug(e.target.value)}
            placeholder="Slug（英文标识）"
            value={newCircleSlug}
          />
          <Input
            onChange={(e) => setNewCircleDesc(e.target.value)}
            placeholder="圈子简介（选填）"
            value={newCircleDesc}
          />
          <div>
            <label className="text-sm font-medium text-foreground">圈子封面图 *</label>
            <div className="mt-1.5">
              {coverPreviewUrl ? (
                <div className="relative inline-block">
                  <img
                    alt="圈子封面预览"
                    className="h-28 w-28 rounded-lg object-cover border border-border/60"
                    src={coverPreviewUrl}
                  />
                  <button
                    className="absolute -top-2 -right-2 size-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                    disabled={isCoverUploading}
                    onClick={() => { setCoverFileId(null); setCoverPreviewUrl(null); }}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <input
                  accept="image/*"
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
                  disabled={isCoverUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleCoverUpload(file);
                  }}
                  type="file"
                />
              )}
              {isCoverUploading ? (
                <div className="mt-1 text-xs text-muted-foreground">上传中...</div>
              ) : null}
            </div>
          </div>
          {createError ? <div className="text-xs text-red-500">{createError}</div> : null}
          <div className="flex gap-2">
            <Button disabled={isCoverUploading} size="sm" onClick={handleCreateCircle}>确认创建</Button>
            <Button size="sm" variant="outline" onClick={() => { setShowCreate(false); setCoverFileId(null); setCoverPreviewUrl(null); }}>取消</Button>
          </div>
        </div>
      ) : null}

      <CirclePageFeed
        activeTab={activeTab}
        onChangeTab={(tab) => { setActiveTab(tab); syncURLParams({ tab }); }}
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
        circlesTabProps={{
          circles: circles.map(c => ({ id: c.id, slug: c.slug, name: c.name, memberCount: c.memberCount, postCount: c.postCount, coverImageUrl: c.coverImageUrl })),
          selectedCircleId,
          onSelectCircle: setSelectedCircleId,
          circlePosts: circlePostsQuery.data ? circlePostsQuery.data.items.map(mapCirclePostToFeedItem) : [],
          isCirclePostsLoading: circlePostsQuery.isLoading,
          circlePostsError: circlePostsQuery.error,
          feedPosts: posts,
          isFeedPostsLoading: isFeedLoading,
          feedPostsError: circleFeedQuery.error instanceof Error ? circleFeedQuery.error : null,
        }}
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
