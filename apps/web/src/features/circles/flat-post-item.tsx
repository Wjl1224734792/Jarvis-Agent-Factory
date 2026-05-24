import { MessageCircleIcon, PlayIcon } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ProfileLink } from '@/components/profile-link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PostInteractionBar } from '@/features/posts/post-interaction-bar';
import { normalizeMediaSrc } from '@/lib/media-url';
import { resolveUserAvatarSrc } from '@/lib/avatar-url';

// ── 帖子 Feed 项类型（从 API 响应映射后的完整结构） ──

/** 圈子帖子 Feed 项——列表扁平化展示所需的精简字段 */
export interface CircleFeedItem {
  id: string;
  title: string;
  contentPreview?: string | null;
  source?: {
    label: string;
    url?: string | null;
  } | null;
  cover?: { url?: string | null } | null;
  images: Array<{ url?: string | null }>;
  videos: Array<{ url?: string | null }>;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    ipLocationLabel?: string | null;
  };
  engagement: {
    likeCount: number;
    favoriteCount: number;
    shareCount: number;
    commentCount?: number;
    viewer: {
      isAuthor: boolean;
      isFollowingAuthor: boolean;
      hasLiked: boolean;
      hasFavorited: boolean;
      hasShared: boolean;
    };
  };
  /** 圈子 ID */
  circleId?: string;
  /** 圈子信息——推荐/关注 Feed 时填充 */
  circle?: {
    id: string;
    slug: string;
    name: string;
  } | null;
  createdAt?: string | null;
}

/**
 * TASK-001 冻结接口：CirclePostFeedItem 类型别名。
 * 与 CircleFeedItem 等价，供后续 TASK 按 DDD 文档引用。
 */
export type CirclePostFeedItem = CircleFeedItem;

// ── FlatPostItem Props（冻结接口，后续任务不得修改） ──

interface FlatPostItemProps {
  /** 帖子数据 */
  post: CircleFeedItem;
  /** 是否显示来源圈子标记（默认 true） */
  showSourceCircle?: boolean;
  /** 点击回调（TASK-004 SlidePanel 使用） */
  onPostClick?: (postId: string) => void;
  /** 隐藏顶部圈子头行（用于连续同一圈子帖子去重） */
  hideCircleHeader?: boolean;
}

// ── 工具函数 ──

function relativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return '刚刚';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}个月前`;
  return `${Math.floor(months / 12)}年前`;
}

function formatCount(value: number): string {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1).replace(/\.0$/, '')}w`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(value);
}

// ── 可折叠文本 ──

/**
 * 支持超过指定行数后折叠的文本组件。
 *
 * 初始状态下使用 CSS line-clamp 限制行数，如果文本实际高度超过限制，
 * 显示"展开"按钮；展开后不再截断并显示"收起"按钮。
 */
function CollapsibleText({
  text,
  maxLines = 3,
}: {
  text: string;
  maxLines?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      const style = getComputedStyle(el);
      const lineHeight = parseFloat(style.lineHeight);
      // 比较展开态的实际高度与行高限制，确定是否需要折叠
      const fullHeight = el.scrollHeight;
      setNeedsCollapse(fullHeight > lineHeight * maxLines + 1);
    }
  }, [text, maxLines]);

  return (
    <div>
      <p
        ref={textRef}
        className="text-sm text-muted-foreground mt-0.5 leading-[1.35rem]"
        style={
          !expanded && needsCollapse
            ? {
                display: '-webkit-box',
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
            : undefined
        }
      >
        {text}
      </p>
      {needsCollapse ? (
        <button
          className="mt-0.5 text-xs text-primary hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          type="button"
        >
          {expanded ? '收起' : '展开'}
        </button>
      ) : null}
    </div>
  );
}

// ── 组件 ──

/**
 * 贴吧式扁平列表帖子项。
 *
 * 渲染结构：圈子头行（图标+圈子名，hideCircleHeader=true 时隐藏）
 * → 作者头像+标题 → 正文截断 → 图片/视频缩略图 → 底部互动栏
 *
 * 无卡片包裹，使用 border-b 分隔。
 */
const FlatPostItem = memo(function FlatPostItem({
  post,
  showSourceCircle: _showSourceCircle = true,
  onPostClick,
  hideCircleHeader,
}: FlatPostItemProps) {
  /** 键盘事件处理：Enter/Space 触发点击，保持无障碍可访问性 */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPostClick?.(post.id);
      }
    },
    [onPostClick, post.id],
  );

  /** 阻止 ProfileLink 点击冒泡到父级 div，避免同时触发帖子详情打开 */
  const handleProfileLinkClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
    },
    [],
  );

  return (
    <div className="w-full border-b border-border/40">
      {/* 圈子头行——仅在 post.circle 存在且未隐藏时显示 */}
      {post.circle && !hideCircleHeader ? (
        <div
          className="flex items-center gap-2 px-4 pt-3 pb-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Avatar className="size-5 shrink-0">
            <AvatarFallback>
              {post.circle.name?.slice(0, 1) ?? ''}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-muted-foreground truncate">
            {post.circle.name}
          </span>
        </div>
      ) : null}

      {/* 帖子内容区 */}
      <div
        className="flex w-full gap-3 px-4 py-3 text-left cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => onPostClick?.(post.id)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        {/* 作者头像 */}
        <Avatar className="size-10 shrink-0 mt-0.5" size="sm">
          <AvatarImage
            alt={post.author.displayName}
            src={resolveUserAvatarSrc(post.author.avatarUrl)}
          />
          <AvatarFallback>
            {post.author.displayName?.slice(0, 1) ?? ''}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* 帖子标题：始终完整显示 */}
          <h2 className="font-semibold text-[0.92rem] leading-[1.35rem] text-foreground">
            {post.title}
          </h2>

          {/* 正文预览：超过 3 行折叠，显示"展开/收起" */}
          {post.contentPreview ? (
            <CollapsibleText maxLines={3} text={post.contentPreview} />
          ) : null}

          {/* 视频：只显示第一个（上传时限制为一个视频） */}
          {post.videos[0]?.url ? (
            <div className="mt-2 overflow-hidden rounded-xl">
              <div className="relative">
                <video
                  className="w-full max-h-64 object-cover"
                  controls
                  muted
                  onClick={() => onPostClick?.(post.id)}
                  playsInline
                  preload="metadata"
                  src={normalizeMediaSrc(post.videos[0].url ?? '')}
                />
                <span className="pointer-events-none absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full bg-black/55 text-white">
                  <PlayIcon className="size-4 fill-current" />
                </span>
              </div>
            </div>
          ) : null}

          {/* 图片：2 列网格布局 */}
          {post.images.length > 0 ? (
            <div
              className={`mt-2 overflow-hidden rounded-xl ${
                post.images.length > 1 ? 'grid grid-cols-2 gap-1' : ''
              }`}
            >
              {post.images.map((img, idx) => (
                <img
                  key={img.url ?? idx}
                  alt={`${post.title} ${idx + 1}`}
                  className="w-full max-h-64 object-cover"
                  loading="lazy"
                  onClick={() => onPostClick?.(post.id)}
                  src={normalizeMediaSrc(img.url ?? '')}
                />
              ))}
            </div>
          ) : null}

          {/* 底部信息栏：作者 | 来源 | 评论数 | 时间 */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span onClick={handleProfileLinkClick}>
              <ProfileLink className="truncate hover:text-foreground" userId={post.author.id}>
                {post.author.displayName}
              </ProfileLink>
            </span>
            {post.source ? (
              <span className="truncate text-muted-foreground/70">
                来自{post.source.label}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 shrink-0">
              <MessageCircleIcon className="size-3" />
              {formatCount(post.engagement.commentCount ?? 0)}
            </span>
            <span className="shrink-0">{relativeTime(post.createdAt)}</span>
          </div>

          {/* 互动操作栏：点赞 | 收藏 | 分享 */}
          <PostInteractionBar
            authorId={post.author.id}
            compact
            favoriteCount={post.engagement.favoriteCount}
            hideFollow
            iconOnly
            isPublished
            likeCount={post.engagement.likeCount}
            plain
            postId={post.id}
            shareCount={post.engagement.shareCount}
            viewer={post.engagement.viewer}
          />
        </div>
      </div>
    </div>
  );
});

FlatPostItem.displayName = 'FlatPostItem';

export { FlatPostItem };
