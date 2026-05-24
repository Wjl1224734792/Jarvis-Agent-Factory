import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageCircleIcon,
  RefreshCwIcon,
  UserCheckIcon,
  UserPlusIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '@feijia/shared';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { InlineCommentComposer } from '@/features/posts/inline-comment-composer';
import { PostCommentThread } from '@/features/posts/post-comment-thread';
import { PostInteractionBar } from '@/features/posts/post-interaction-bar';
import { ProfileLink } from '@/components/profile-link';
import { DetailMoreActions } from '@/components/detail-more-actions';
import { IpLocationText } from '@/components/ip-location-text';
import { normalizeMediaSrc } from '@/lib/media-url';
import { resolveUserAvatarSrc } from '@/lib/avatar-url';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/auth-store';
import { useLoginPrompt } from '@/features/auth/use-login-prompt';
import { useSlidePanelStore } from '@/features/circles/use-slide-panel-store';
import {
  buildCircleMediaItems,
  getLoopedNextIndex,
  getLoopedPrevIndex,
} from './circle-page-helpers';

// ── 类型 ──

type PostDetailResponse = Awaited<ReturnType<typeof apiClient.getPostDetail>>;
type PostDetail = PostDetailResponse['item'];

// ── 圈子帖子 API 适配 ──

/**
 * 从圈子帖子的专属 API 获取帖子详情，并将响应映射为 PostDetail 兼容格式。
 *
 * 圈子帖子存储在独立的 circlePostsTable 中，其 API 响应结构与全局 postsTable
 * 不同（缺少 engagement、comments 等）。此函数桥接该差异。
 */
async function fetchCirclePostDetail(
  circleId: string,
  postId: string,
): Promise<{ item: Record<string, unknown> }> {
  const url = `/api/v1/circles/${encodeURIComponent(circleId)}/posts/${encodeURIComponent(postId)}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = await res.json().catch(() => ({
      message: '请求的内容不存在或已被移除',
    }));
    throw new Error(
      (body as Record<string, unknown>).message as string ??
        '请求的内容不存在或已被移除',
    );
  }
  return res.json() as Promise<{ item: Record<string, unknown> }>;
}

/**
 * 将圈子帖子 API 原始响应适配为 PostDetail 数据类型。
 *
 * 圈子帖子缺少 comment 列表、engagement/viewer 状态、declaration/source 等字段，
 * 本函数提供安全的默认值，确保组件渲染不崩溃。
 *
 * @param rawItem - 圈子帖子 API 返回的原始数据
 * @param currentUserId - 当前登录用户 ID，用于判断是否为帖子作者
 */
function mapCirclePostToPostDetail(
  rawItem: Record<string, unknown>,
  currentUserId?: string,
): PostDetailResponse {
  const author = (rawItem.author ?? {}) as Record<string, unknown>;

  // 圈子帖子 API 返回 images/videos 可能为 string[]（URL 列表）
  // 或 {url: string}[]（对象数组），需兼容两种格式并适配为
  // postImageSchema/postVideoSchema 要求的完整 File 对象形状。
  const images = Array.isArray(rawItem.images)
    ? (rawItem.images as Array<string | { url?: string | null }>)
        .map((item, idx) => {
          const src = typeof item === 'string' ? item : item?.url;
          if (!src) return null;
          return {
            id: `circle-img-${idx}`,
            url: src,
            fileName: src.split('/').pop() ?? 'image',
            mimeType: 'image/jpeg',
            byteSize: 0,
          };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null)
    : [];
  const videos = Array.isArray(rawItem.videos)
    ? (rawItem.videos as Array<string | { url?: string | null }>)
        .map((item, idx) => {
          const src = typeof item === 'string' ? item : item?.url;
          if (!src) return null;
          return {
            id: `circle-vid-${idx}`,
            url: src,
            fileName: src.split('/').pop() ?? 'video',
            mimeType: 'video/mp4',
            byteSize: 0,
          };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null)
    : [];

  const authorRole =
    (author.role as 'user' | 'admin' | undefined) ?? 'user';

  return {
    item: {
      id: (rawItem.id as string) ?? '',
      type: 'moment',
      title: (rawItem.title as string) ?? '',
      content: (rawItem.content as string) ?? '',
      contentHtml: null,
      status: 'published',
      rejectionReason: null,
      commentCount: Number(rawItem.commentCount) || 0,
      viewCount: 0,
      reportCount: 0,
      createdAt: (rawItem.createdAt as string) ?? new Date().toISOString(),
      updatedAt:
        (rawItem.updatedAt as string) ?? (rawItem.createdAt as string) ?? new Date().toISOString(),
      publishedAt: (rawItem.createdAt as string) ?? null,
      author: {
        id: (author.id as string) ?? '',
        displayName: (author.displayName as string) ?? '',
        avatarUrl: (author.avatarUrl as string) ?? null,
        ipLocationLabel: null,
        role: authorRole,
      },
      source: null,
      declaration: null,
      cover: null,
      images,
      videos,
      contentCategory: null,
      engagement: {
        likeCount: Number(rawItem.likeCount) || 0,
        favoriteCount: 0,
        shareCount: 0,
        viewer: {
          isAuthor:
            Boolean(currentUserId) &&
            currentUserId === ((author.id as string) ?? ''),
          isFollowingAuthor: false,
          hasLiked: false,
          hasFavorited: false,
          hasShared: false,
        },
      },
      comments: [],
    },
  };
}

// ── 工具函数 ──

function formatCount(value: number): string {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1).replace(/\.0$/, '')}w`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(value);
}

// ── 骨架屏 ──

function PostDetailSkeleton() {
  return (
    <div className="px-4 py-4 space-y-4">
      {/* 作者区骨架 */}
      <div className="flex items-center gap-3">
        <div className="size-10 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-3 w-36 animate-pulse rounded bg-muted" />
        </div>
      </div>
      {/* 媒体区骨架 */}
      <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-muted" />
      {/* 正文骨架 */}
      <div className="space-y-2">
        <div className="h-5 w-3/5 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
      {/* 评论区骨架 */}
      <div className="border-t border-border pt-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div className="flex items-start gap-3" key={i}>
            <div className="size-8 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 主组件 ──

interface CirclePostDetailContentProps {
  postId: string;
  /** 圈子标识（slug 或 id）。传入时使用圈子帖子专属 API，否则回退到全局帖子 API。 */
  circleId?: string | null;
}

/**
 * SlidePanel 内的帖子详情内容组件。
 *
 * 自包含数据获取、媒体轮播、作者信息、互动栏、评论列表和评论输入框。
 * 作为 x-slide-panel.tsx 的 children 内容注入。
 *
 * 当 circleId 不为空时，通过圈子帖子专属 API (/api/v1/circles/:circleId/posts/:postId)
 * 获取数据；否则使用全局帖子 API。圈子帖子的响应会被适配为 PostDetail 格式。
 */
export function CirclePostDetailContent({
  postId,
  circleId,
}: CirclePostDetailContentProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const authStatus = useAuthStore((s) => s.status);
  const currentUser = useAuthStore((s) => s.user);
  const promptLogin = useLoginPrompt();
  const closeSlidePanel = useSlidePanelStore((s) => s.close);

  const [commentSort, setCommentSort] = useState<'latest' | 'hot'>('latest');
  const [commentContent, setCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  // ── 数据获取 ──
  const noteQuery = useQuery({
    queryKey: ['circle-post', postId, commentSort, circleId],
    queryFn: async () => {
      if (circleId) {
        const raw = await fetchCirclePostDetail(circleId, postId);
        return mapCirclePostToPostDetail(raw.item, currentUser?.id);
      }
      return apiClient.getPostDetail(postId, { commentSort });
    },
  });

  const selectedNote: PostDetail | null = noteQuery.data?.item ?? null;

  // ── 媒体处理 ──
  const mediaItems = useMemo(
    () =>
      buildCircleMediaItems({
        title: selectedNote?.title ?? '飞友圈详情',
        images: (selectedNote?.images ?? [])
          .filter((item) => Boolean(item.url))
          .map((item) => ({ url: item.url ?? '' })),
        videos: (selectedNote?.videos ?? [])
          .filter((item) => Boolean(item.url))
          .map((item) => ({ url: item.url ?? '' })),
      }),
    [selectedNote]
  );

  const activeMedia = mediaItems[selectedMediaIndex] ?? mediaItems[0] ?? null;

  // 帖子切换时重置媒体索引
  useEffect(() => {
    setSelectedMediaIndex(0);
  }, [postId]);

  useEffect(() => {
    if (selectedMediaIndex >= mediaItems.length) {
      setSelectedMediaIndex(0);
    }
  }, [mediaItems.length, selectedMediaIndex]);

  // ── 评论提交 ──
  const handleCommentSubmit = useCallback(() => {
    if (!commentContent.trim() || !selectedNote) {
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    void apiClient
      .createPostComment(postId, { content: commentContent.trim() })
      .then((payload) => {
        // 乐观更新：将新评论插入到本地缓存
        queryClient.setQueryData<PostDetailResponse>(
          ['circle-post', postId, commentSort, circleId],
          (old) => {
            if (!old) return old;
            return {
              ...old,
              item: {
                ...old.item,
                commentCount: old.item.commentCount + 1,
                comments: [
                  {
                    ...payload.item,
                    replies: [],
                    replyCount: 0,
                    viewer: {
                      canEdit: true,
                      canDelete: true,
                      hasLiked: false,
                      hasReported: false,
                    },
                  },
                  ...old.item.comments,
                ],
              },
            };
          }
        );
        toast.success('评论已发表');
        setCommentContent('');
      })
      .catch((err: unknown) => {
        setActionError(
          err instanceof Error ? err.message : '评论发送失败，请稍后重试。'
        );
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [commentContent, postId, selectedNote, queryClient]);

  // ── 关注切换 ──
  const handleToggleFollow = useCallback(() => {
    if (authStatus !== 'authenticated') {
      promptLogin({
        title: '登录后才能关注',
        description: '关注作者前请先登录。',
      });
      return;
    }
    if (!selectedNote) {
      return;
    }

    const nextIsFollowing = !selectedNote.engagement.viewer.isFollowingAuthor;

    queryClient.setQueryData<PostDetailResponse>(
      ['circle-post', postId, commentSort, circleId],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          item: {
            ...old.item,
            engagement: {
              ...old.item.engagement,
              viewer: {
                ...old.item.engagement.viewer,
                isFollowingAuthor: nextIsFollowing,
              },
            },
          },
        };
      }
    );

    toast.success(nextIsFollowing ? '已关注' : '已取消关注');
    void apiClient.toggleFollow(selectedNote.author.id).catch(() => {
      toast.error('操作失败');
      // 回滚
      queryClient.setQueryData<PostDetailResponse>(
        ['circle-post', postId, commentSort, circleId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            item: {
              ...old.item,
              engagement: {
                ...old.item.engagement,
                viewer: {
                  ...old.item.engagement.viewer,
                  isFollowingAuthor: !nextIsFollowing,
                },
              },
            },
          };
        }
      );
    });
  }, [postId, selectedNote, queryClient, authStatus, promptLogin]);

  // ── 重试 ──
  const handleRetry = useCallback(() => {
    void noteQuery.refetch();
  }, [noteQuery]);

  // ── 权限判断 ──
  const canComment =
    authStatus === 'authenticated' &&
    selectedNote?.status === 'published';

  // ── 加载态 ──
  if (noteQuery.isLoading) {
    return <PostDetailSkeleton />;
  }

  // ── 错误态 ──
  if (noteQuery.isError) {
    const errorMessage =
      noteQuery.error instanceof Error
        ? noteQuery.error.message
        : '帖子详情加载失败';

    return (
      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <Alert variant="destructive" className="w-full">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
        <Button
          className="mt-4"
          onClick={handleRetry}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCwIcon className="mr-1.5 size-3" />
          重试
        </Button>
      </div>
    );
  }

  // ── 空态（理论上不会出现，postId 有效时一定有数据） ──
  if (!selectedNote) {
    return null;
  }

  // ── 正文渲染 ──
  return (
    <div className="flex flex-col">
      {/* 作者信息区 */}
      <div className="shrink-0 border-b border-border/70 px-4 pb-3.5 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ProfileLink userId={selectedNote.author.id}>
              <Avatar size="lg">
                <AvatarImage
                  alt={selectedNote.author.displayName}
                  src={resolveUserAvatarSrc(selectedNote.author.avatarUrl)}
                />
                <AvatarFallback>
                  {selectedNote.author.displayName.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
            </ProfileLink>
            <div className="min-w-0">
              <ProfileLink
                className="truncate text-sm font-semibold text-foreground hover:text-primary"
                userId={selectedNote.author.id}
              >
                {selectedNote.author.displayName}
              </ProfileLink>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] text-muted-foreground">
                {new Date(
                  selectedNote.publishedAt ?? selectedNote.createdAt
                ).toLocaleDateString('zh-CN')}
                <IpLocationText
                  label={selectedNote.author.ipLocationLabel}
                  variant="plain"
                />
              </div>
            </div>
          </div>

          {!selectedNote.engagement.viewer.isAuthor ? (
            <Button
              className="rounded-full"
              onClick={handleToggleFollow}
              size="sm"
              type="button"
              variant={
                selectedNote.engagement.viewer.isFollowingAuthor
                  ? 'outline'
                  : 'hero'
              }
            >
              {selectedNote.engagement.viewer.isFollowingAuthor ? (
                <UserCheckIcon data-icon="inline-start" />
              ) : (
                <UserPlusIcon data-icon="inline-start" />
              )}
              {selectedNote.engagement.viewer.isFollowingAuthor
                ? '已关注'
                : '关注'}
            </Button>
          ) : null}

          <DetailMoreActions
            isOwner={selectedNote.engagement.viewer.isAuthor}
            canEdit={selectedNote.engagement.viewer.isAuthor}
            canDelete={selectedNote.engagement.viewer.isAuthor}
            canReport={!selectedNote.engagement.viewer.isAuthor}
            isAuthenticated={authStatus === 'authenticated'}
            report={{
              title: '举报帖子',
              description: '请填写举报理由，并至少上传 1 张证据图。',
              onSubmit: async (input) => {
                if (!circleId) return;
                await apiClient.reportCirclePost(circleId, selectedNote.id, {
                  reason: input.reason,
                  imageFileIds: input.imageIds,
                });
                toast.success('举报已提交，感谢反馈');
              },
            }}
            onEdit={() => {
              navigate(APP_ROUTES.publishArticle + '?edit=' + selectedNote.id);
            }}
            onDelete={async () => {
              if (!circleId) return;
              if (!window.confirm('删除后无法恢复，确定要删除这篇文章吗？')) return;
              try {
                await apiClient.deleteCirclePost(circleId, selectedNote.id);
                toast.success('已删除');
                closeSlidePanel();
                queryClient.invalidateQueries({ queryKey: ['circle-feed'] });
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : '删除失败');
              }
            }}
            onRequireLogin={() => {
              promptLogin({
                title: '登录后才能操作',
                description: '请先登录后再进行操作。',
              });
            }}
          />
        </div>
      </div>

      {/* 可滚动内容区 */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {/* 媒体轮播 */}
        {mediaItems.length > 0 ? (
          <div className="relative mb-4 overflow-hidden rounded-xl">
            {activeMedia?.kind === 'video' ? (
              <video
                className="w-full max-h-[50vh] object-contain"
                controls
                preload="metadata"
                src={normalizeMediaSrc(activeMedia.url)}
              />
            ) : activeMedia ? (
              <img
                alt={activeMedia.label}
                className="w-full max-h-[50vh] object-contain"
                src={normalizeMediaSrc(activeMedia.url)}
              />
            ) : null}

            {mediaItems.length > 1 ? (
              <>
                <div className="absolute right-3 top-3 z-20 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white">
                  {selectedMediaIndex + 1}/{mediaItems.length}
                </div>
                <button
                  className="absolute left-2 top-1/2 z-20 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/38 text-white transition hover:bg-black/55"
                  onClick={() => {
                    setSelectedMediaIndex((current) =>
                      getLoopedPrevIndex(current, mediaItems.length)
                    );
                  }}
                  type="button"
                >
                  <ChevronLeftIcon className="size-4" />
                </button>
                <button
                  className="absolute right-2 top-1/2 z-20 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/38 text-white transition hover:bg-black/55"
                  onClick={() => {
                    setSelectedMediaIndex((current) =>
                      getLoopedNextIndex(current, mediaItems.length)
                    );
                  }}
                >
                  <ChevronRightIcon className="size-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/28 px-2.5 py-1.5">
                  {mediaItems.map((item, index) => (
                    <button
                      aria-label={`查看第 ${index + 1} 张${item.kind === 'video' ? '视频' : '图片'}`}
                      className={cn(
                        'size-1.5 rounded-full bg-white/45 transition',
                        selectedMediaIndex === index && 'bg-white'
                      )}
                      key={`${item.kind}-${item.url}-${index}`}
                      onClick={() => setSelectedMediaIndex(index)}
                      type="button"
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {/* 帖子正文 */}
        <div className="space-y-3">
          <h1 className="text-[1.15rem] leading-[1.3] font-semibold text-foreground">
            {selectedNote.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.78rem] text-muted-foreground">
            {selectedNote.declaration ? (
              <span>{selectedNote.declaration.label}</span>
            ) : null}
            {selectedNote.source ? (
              <span>来源：{selectedNote.source.label}</span>
            ) : null}
          </div>
          <p className="text-[0.86rem] leading-6 text-foreground/72 whitespace-pre-wrap">
            {selectedNote.content}
          </p>
        </div>

        {selectedNote.source?.url ? (
          <div className="mt-3">
            <a
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              href={selectedNote.source.url}
              rel="noreferrer"
              target="_blank"
            >
              原文链接
            </a>
          </div>
        ) : null}

        {/* 互动栏 */}
        <div className="mt-4 border-t border-border pt-3.5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[0.84rem] font-semibold text-foreground">
              评论区 {selectedNote.commentCount}
            </div>
            <div className="flex items-center gap-2">
              {(['latest', 'hot'] as const).map((item) => (
                <button
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition',
                    commentSort === item
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/70 text-muted-foreground hover:text-foreground'
                  )}
                  key={item}
                  onClick={() => setCommentSort(item)}
                  type="button"
                >
                  {item === 'latest' ? '最新' : '热门'}
                </button>
              ))}
            </div>
          </div>

          {selectedNote.comments.length > 0 ? (
            <PostCommentThread
              canInteract={canComment}
              comments={selectedNote.comments}
              currentUserId={currentUser?.id}
              postId={selectedNote.id}
              sortOrder={commentSort}
            />
          ) : (
            <div className="text-[0.82rem] text-muted-foreground">
              还没有评论。
            </div>
          )}
        </div>
      </div>

      {/* 底部固定区：评论输入 + 互动栏 */}
      <div className="shrink-0 border-t border-border bg-white px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
        {actionError ? (
          <Alert className="mb-3" variant="destructive">
            <AlertTitle>评论失败</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        {canComment ? (
          <InlineCommentComposer
            busy={isSubmitting}
            disabled={false}
            onChange={setCommentContent}
            onSubmit={handleCommentSubmit}
            placeholder="说点什么..."
            value={commentContent}
          />
        ) : (
          <Button
            className="w-full"
            onClick={() => {
              promptLogin({
                title: '登录后才能评论',
                description: '评论前请先登录。',
              });
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            登录后评论
          </Button>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <PostInteractionBar
              compact
              hideFollow
              iconOnly
              plain
              authorId={selectedNote.author.id}
              favoriteCount={selectedNote.engagement.favoriteCount}
              isPublished={selectedNote.status === 'published'}
              likeCount={selectedNote.engagement.likeCount}
              postId={selectedNote.id}
              shareCount={selectedNote.engagement.shareCount}
              sharePath={APP_ROUTES.postDetail.replace(
                ':id',
                selectedNote.id
              )}
              viewer={selectedNote.engagement.viewer}
            />
            <span className="inline-flex items-center gap-1.5 text-[0.82rem] text-foreground/62">
              <MessageCircleIcon className="size-4" />
              {formatCount(selectedNote.commentCount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
